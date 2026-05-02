
-- 1. Public slugs para URLs amigáveis das propostas
CREATE TABLE public.proposal_public_slugs (
  slug text PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_proposal_public_slugs_proposal ON public.proposal_public_slugs(proposal_id);

ALTER TABLE public.proposal_public_slugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_slugs_read_anon"
  ON public.proposal_public_slugs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public_slugs_write_auth"
  ON public.proposal_public_slugs FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Mockups interativos
CREATE TABLE public.proposal_mockups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.proposals(id) ON DELETE CASCADE,
  brand_color text NOT NULL DEFAULT '#06b6d4',
  logo_url text,
  client_company_name text,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_profiles jsonb NOT NULL DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_proposal_mockups_proposal ON public.proposal_mockups(proposal_id);

ALTER TABLE public.proposal_mockups ENABLE ROW LEVEL SECURITY;

-- O renderer do mockup é público; o conteúdo nunca tem dado real do cliente.
CREATE POLICY "mockups_read_public"
  ON public.proposal_mockups FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

CREATE POLICY "mockups_write_auth"
  ON public.proposal_mockups FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_proposal_mockups_updated_at
  BEFORE UPDATE ON public.proposal_mockups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Anexos da proposta
CREATE TABLE public.proposal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'documento',
  display_order integer NOT NULL DEFAULT 0,
  show_in_pdf boolean NOT NULL DEFAULT true,
  show_in_web boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposal_attachments_proposal ON public.proposal_attachments(proposal_id, display_order);

ALTER TABLE public.proposal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_auth_all"
  ON public.proposal_attachments FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Senha visível para o operador
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS access_password_plain text;

-- 5. Bucket privado para anexos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('proposal-attachments', 'proposal-attachments', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "proposal_attachments_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'proposal-attachments');

CREATE POLICY "proposal_attachments_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proposal-attachments');

CREATE POLICY "proposal_attachments_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'proposal-attachments');

CREATE POLICY "proposal_attachments_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'proposal-attachments');
