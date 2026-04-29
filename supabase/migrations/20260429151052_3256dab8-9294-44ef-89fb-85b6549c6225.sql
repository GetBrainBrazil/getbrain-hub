
-- 1) Restrict colaboradores SELECT to admin or the employee themselves (matched by email)
DROP POLICY IF EXISTS "Authenticated can view colaboradores" ON public.colaboradores;

CREATE POLICY "Admins or self can view colaboradores"
ON public.colaboradores
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
  OR lower(auth.email()) = ANY (COALESCE(emails, ARRAY[]::text[]))
);

-- 2) Make proposals bucket private and require authentication for reads
UPDATE storage.buckets SET public = false WHERE id = 'proposals';

DROP POLICY IF EXISTS "proposals_public_read" ON storage.objects;

CREATE POLICY "proposals_authenticated_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'proposals');
