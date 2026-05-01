-- 1. Expandir proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS executive_summary text,
  ADD COLUMN IF NOT EXISTS pain_context text,
  ADD COLUMN IF NOT EXISTS solution_overview text,
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS client_brand_color text;

-- Validar formato hex se preenchido
ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_client_brand_color_hex;
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_client_brand_color_hex
  CHECK (client_brand_color IS NULL OR client_brand_color ~* '^#[0-9a-f]{6}$');

-- 2. Expandir proposal_items
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS detailed_description text,
  ADD COLUMN IF NOT EXISTS deliverables text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS acceptance_criteria text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_dependencies text[] NOT NULL DEFAULT '{}'::text[];

-- 3. Tabela de tentativas de acesso (rate limiting)
CREATE TABLE IF NOT EXISTS public.proposal_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_access_attempts_lookup
  ON public.proposal_access_attempts (proposal_id, ip_hash, attempted_at DESC);

ALTER TABLE public.proposal_access_attempts ENABLE ROW LEVEL SECURITY;

-- Bloqueia acesso pelo client; apenas service_role (edge functions) escreve/lê
DROP POLICY IF EXISTS proposal_access_attempts_no_client ON public.proposal_access_attempts;
CREATE POLICY proposal_access_attempts_no_client
  ON public.proposal_access_attempts
  FOR SELECT TO authenticated
  USING (false);

-- 4. Bucket público para logos do cliente
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals-public-assets', 'proposals-public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies do bucket
DROP POLICY IF EXISTS "proposals_public_assets_read" ON storage.objects;
CREATE POLICY "proposals_public_assets_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposals-public-assets');

DROP POLICY IF EXISTS "proposals_public_assets_insert" ON storage.objects;
CREATE POLICY "proposals_public_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proposals-public-assets');

DROP POLICY IF EXISTS "proposals_public_assets_update" ON storage.objects;
CREATE POLICY "proposals_public_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'proposals-public-assets')
  WITH CHECK (bucket_id = 'proposals-public-assets');

DROP POLICY IF EXISTS "proposals_public_assets_delete" ON storage.objects;
CREATE POLICY "proposals_public_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'proposals-public-assets');