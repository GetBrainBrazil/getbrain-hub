-- ============================================================
-- 10B - Mudança 2: Migração defensiva idempotente do template_key
-- ============================================================
-- No-op no estado atual, mas registra a decisão e protege contra
-- estado divergente futuro (imports, restores, propostas legadas)

UPDATE public.proposals
SET template_key = 'inovacao_tecnologica'
WHERE template_key = 'anbi';

-- Reafirmar default (idempotente)
ALTER TABLE public.proposals
  ALTER COLUMN template_key SET DEFAULT 'inovacao_tecnologica';

-- ============================================================
-- 10B - Mudança 3: Estender proposal_versions p/ ARCHITECTURE v2.0
-- ============================================================

ALTER TABLE public.proposal_versions
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS pdf_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Backfill organization_id a partir da proposta-pai
UPDATE public.proposal_versions v
SET organization_id = p.organization_id
FROM public.proposals p
WHERE v.proposal_id = p.id
  AND v.organization_id IS NULL;

-- Backfill template_key/version a partir da proposta-pai
UPDATE public.proposal_versions v
SET template_key = COALESCE(v.template_key, p.template_key),
    template_version = COALESCE(v.template_version, p.template_version)
FROM public.proposals p
WHERE v.proposal_id = p.id
  AND (v.template_key IS NULL OR v.template_version IS NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_proposal_versions_updated_at ON public.proposal_versions;
CREATE TRIGGER trg_proposal_versions_updated_at
  BEFORE UPDATE ON public.proposal_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de auto-incremento de version_number por proposal_id
CREATE OR REPLACE FUNCTION public.set_proposal_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.version_number IS NULL OR NEW.version_number = 0 THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM public.proposal_versions
    WHERE proposal_id = NEW.proposal_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_proposal_version_number ON public.proposal_versions;
CREATE TRIGGER trg_set_proposal_version_number
  BEFORE INSERT ON public.proposal_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_proposal_version_number();

-- Index em organization_id
CREATE INDEX IF NOT EXISTS idx_proposal_versions_org
  ON public.proposal_versions(organization_id);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_deleted_at
  ON public.proposal_versions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- RLS já está habilitada com policies authenticated_all_*
-- Mantém o padrão do projeto (single-tenant na prática)
-- ============================================================

-- ============================================================
-- Storage policies p/ bucket 'proposals' (privado)
-- Usuários autenticados podem ler/escrever; signed URLs p/ público
-- ============================================================

DROP POLICY IF EXISTS "proposals_auth_select" ON storage.objects;
CREATE POLICY "proposals_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'proposals');

DROP POLICY IF EXISTS "proposals_auth_insert" ON storage.objects;
CREATE POLICY "proposals_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proposals');

DROP POLICY IF EXISTS "proposals_auth_update" ON storage.objects;
CREATE POLICY "proposals_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'proposals');

DROP POLICY IF EXISTS "proposals_auth_delete" ON storage.objects;
CREATE POLICY "proposals_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'proposals');