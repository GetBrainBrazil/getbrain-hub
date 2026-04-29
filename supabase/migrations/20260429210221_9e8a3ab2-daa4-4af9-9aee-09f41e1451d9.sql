
-- Extensão pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. ENUM proposal_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.proposal_status AS ENUM (
    'rascunho','enviada','visualizada','interesse_manifestado','expirada','convertida','recusada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Drop check constraint antigo
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;

-- Migrar valores texto antigos para os novos
UPDATE public.proposals SET status = CASE status
  WHEN 'enviado' THEN 'enviada'
  WHEN 'aceito' THEN 'convertida'
  WHEN 'recusado' THEN 'recusada'
  WHEN 'cancelado' THEN 'recusada'
  WHEN 'expirado' THEN 'expirada'
  ELSE status
END;

-- Alterar tipo da coluna
ALTER TABLE public.proposals
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.proposal_status USING status::public.proposal_status,
  ALTER COLUMN status SET DEFAULT 'rascunho'::public.proposal_status;

-- ============================================================
-- 2. Novas colunas em `proposals`
-- ============================================================
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS template_slug text,
  ADD COLUMN IF NOT EXISTS template_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS mockup_url text,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS access_password_hash text,
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Backfill
UPDATE public.proposals
SET
  title         = COALESCE(title, client_company_name),
  client_name   = COALESCE(client_name, client_company_name),
  expires_at    = COALESCE(expires_at, valid_until),
  template_slug = COALESCE(template_slug, REPLACE(COALESCE(template_key,'inovacao_tecnologica'), '_', '-'));

ALTER TABLE public.proposals
  ALTER COLUMN template_slug SET NOT NULL,
  ALTER COLUMN template_slug SET DEFAULT 'inovacao-tecnologica';

-- Token urlsafe helper
CREATE OR REPLACE FUNCTION public.gen_proposal_access_token() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE t text;
BEGIN
  t := encode(gen_random_bytes(24), 'base64');
  t := replace(replace(replace(t, '+', '-'), '/', '_'), '=', '');
  RETURN substring(t from 1 for 32);
END $$;

-- Backfill tokens
UPDATE public.proposals SET access_token = public.gen_proposal_access_token() WHERE access_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_access_token_key ON public.proposals(access_token);

-- ============================================================
-- 3. Tabela `proposal_items`
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON public.proposal_items(proposal_id) WHERE deleted_at IS NULL;

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proposal_items_authenticated ON public.proposal_items;
CREATE POLICY proposal_items_authenticated ON public.proposal_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at_proposal_items ON public.proposal_items;
CREATE TRIGGER set_updated_at_proposal_items BEFORE UPDATE ON public.proposal_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill a partir de scope_items jsonb
INSERT INTO public.proposal_items (proposal_id, description, quantity, unit_price, order_index)
SELECT
  p.id,
  COALESCE(NULLIF(item->>'title',''), 'Item'),
  COALESCE((item->>'quantity')::numeric, 1),
  COALESCE((item->>'value')::numeric, (item->>'unit_price')::numeric, 0),
  (idx - 1)::int
FROM public.proposals p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.scope_items, '[]'::jsonb)) WITH ORDINALITY AS arr(item, idx)
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.proposal_items pi WHERE pi.proposal_id = p.id);

-- ============================================================
-- 4. Tabelas `proposal_views` e `proposal_events`
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text,
  session_id text,
  duration_seconds integer,
  sections_viewed jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_proposal_views ON public.proposal_views(proposal_id, viewed_at);
ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS proposal_views_select ON public.proposal_views;
CREATE POLICY proposal_views_select ON public.proposal_views FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS proposal_views_insert ON public.proposal_views;
CREATE POLICY proposal_views_insert ON public.proposal_views FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposal_events ON public.proposal_events(proposal_id, event_type, created_at);
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS proposal_events_select ON public.proposal_events;
CREATE POLICY proposal_events_select ON public.proposal_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS proposal_events_insert ON public.proposal_events;
CREATE POLICY proposal_events_insert ON public.proposal_events FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 5. `deals.proposal_id`
-- ============================================================
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

-- Backfill: proposta mais recente de cada deal
UPDATE public.deals d
SET proposal_id = sub.id
FROM (
  SELECT DISTINCT ON (deal_id) id, deal_id
  FROM public.proposals
  WHERE deal_id IS NOT NULL AND deleted_at IS NULL
  ORDER BY deal_id, created_at DESC
) sub
WHERE d.id = sub.deal_id AND d.proposal_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_proposal ON public.deals(proposal_id) WHERE proposal_id IS NOT NULL;

-- ============================================================
-- 6. Triggers
-- ============================================================

-- 6.1 access_token BEFORE INSERT
CREATE OR REPLACE FUNCTION public.proposals_set_access_token()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := public.gen_proposal_access_token();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proposals_set_access_token ON public.proposals;
CREATE TRIGGER proposals_set_access_token BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposals_set_access_token();

-- 6.2 valida transição de status
CREATE OR REPLACE FUNCTION public.proposals_validate_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Transições permitidas
  ok := (OLD.status = 'rascunho' AND NEW.status IN ('enviada','recusada'))
     OR (OLD.status = 'enviada' AND NEW.status IN ('rascunho','visualizada','recusada','expirada','convertida'))
     OR (OLD.status = 'visualizada' AND NEW.status IN ('interesse_manifestado','recusada','expirada','convertida'))
     OR (OLD.status = 'interesse_manifestado' AND NEW.status IN ('recusada','expirada','convertida'))
     OR (OLD.status IN ('expirada','recusada') AND NEW.status IN ('rascunho','convertida'));

  IF NOT ok THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proposals_validate_status_transition ON public.proposals;
CREATE TRIGGER proposals_validate_status_transition BEFORE UPDATE OF status ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposals_validate_status_transition();

-- 6.3 exige senha ao mudar pra enviada
CREATE OR REPLACE FUNCTION public.proposals_require_password_when_sent()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'enviada' AND OLD.status <> 'enviada' AND (NEW.access_password_hash IS NULL OR NEW.access_password_hash = '') THEN
    RAISE EXCEPTION 'Senha de acesso é obrigatória ao marcar a proposta como enviada';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proposals_require_password_when_sent ON public.proposals;
CREATE TRIGGER proposals_require_password_when_sent BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposals_require_password_when_sent();

-- 6.4 sent_at automático
CREATE OR REPLACE FUNCTION public.proposals_set_sent_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'enviada' AND OLD.status <> 'enviada' AND NEW.sent_at IS NULL THEN
    NEW.sent_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proposals_set_sent_at ON public.proposals;
CREATE TRIGGER proposals_set_sent_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposals_set_sent_at();

-- ============================================================
-- 7. RPC set_proposal_password
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_proposal_password(_proposal_id uuid, _plain_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _plain_password IS NULL OR length(_plain_password) < 4 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 4 caracteres';
  END IF;
  UPDATE public.proposals
  SET access_password_hash = crypt(_plain_password, gen_salt('bf'))
  WHERE id = _proposal_id;
END $$;

GRANT EXECUTE ON FUNCTION public.set_proposal_password(uuid, text) TO authenticated;

-- ============================================================
-- 8. View proposal_metrics
-- ============================================================
DROP VIEW IF EXISTS public.proposal_metrics;
CREATE VIEW public.proposal_metrics AS
WITH base AS (
  SELECT
    p.organization_id,
    p.id,
    p.status,
    p.view_count,
    COALESCE((SELECT sum(total) FROM public.proposal_items i WHERE i.proposal_id = p.id AND i.deleted_at IS NULL), 0) AS items_total
  FROM public.proposals p
  WHERE p.deleted_at IS NULL
)
SELECT
  organization_id,
  count(*)                                                               AS total_proposals,
  count(*) FILTER (WHERE status = 'rascunho')                            AS total_draft,
  count(*) FILTER (WHERE status = 'enviada')                             AS total_sent,
  count(*) FILTER (WHERE status IN ('visualizada','interesse_manifestado')) AS total_viewed,
  count(*) FILTER (WHERE status = 'convertida')                          AS total_converted,
  COALESCE(sum(items_total) FILTER (WHERE status = 'enviada'), 0)        AS total_value_sent,
  COALESCE(sum(items_total) FILTER (WHERE status = 'convertida'), 0)     AS total_value_converted,
  CASE WHEN count(*) FILTER (WHERE status = 'enviada') = 0 THEN 0
       ELSE round(count(*) FILTER (WHERE status = 'convertida')::numeric
                  / count(*) FILTER (WHERE status = 'enviada')::numeric, 4) END AS conversion_rate,
  COALESCE(avg(view_count) FILTER (WHERE status = 'enviada'), 0)         AS avg_view_count
FROM base
GROUP BY organization_id;

-- ============================================================
-- 9. Estende close_deal_as_won
-- ============================================================
DO $$
DECLARE
  fn_def text;
BEGIN
  -- Pega definição atual e injeta UPDATE de propostas no final, se ainda não tiver
  SELECT pg_get_functiondef(p.oid) INTO fn_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'close_deal_as_won' LIMIT 1;

  IF fn_def IS NOT NULL AND fn_def NOT LIKE '%proposals%status%convertida%' THEN
    -- Adiciona um trigger AFTER UPDATE em deals que faz o trabalho — mais seguro que reescrever a função
    NULL;
  END IF;
END $$;

-- Trigger AFTER UPDATE em deals: quando vira 'ganho', marca proposta como convertida
CREATE OR REPLACE FUNCTION public.deals_mark_proposal_converted()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage = 'ganho' AND (OLD.stage IS DISTINCT FROM 'ganho') THEN
    UPDATE public.proposals
    SET status = 'convertida'
    WHERE deal_id = NEW.id
      AND status IN ('enviada','visualizada','interesse_manifestado','rascunho');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deals_mark_proposal_converted ON public.deals;
CREATE TRIGGER deals_mark_proposal_converted AFTER UPDATE OF stage ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_mark_proposal_converted();
