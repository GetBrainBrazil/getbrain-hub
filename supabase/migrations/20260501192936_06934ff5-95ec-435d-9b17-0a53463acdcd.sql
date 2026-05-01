-- 1. Adicionar coluna logo_url em companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Criar bucket público company-logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies do bucket
CREATE POLICY "Company logos publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Authenticated can update company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated can delete company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');