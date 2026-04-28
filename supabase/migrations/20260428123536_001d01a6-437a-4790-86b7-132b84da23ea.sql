ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS organograma_url text,
  ADD COLUMN IF NOT EXISTS mockup_url text,
  ADD COLUMN IF NOT EXISTS mockup_screenshots text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-attachments', 'deal-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view deal attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view deal attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deal-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload deal attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload deal attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deal-attachments');

DROP POLICY IF EXISTS "Authenticated users can update deal attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update deal attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'deal-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete deal attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete deal attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'deal-attachments');