DROP POLICY IF EXISTS "Authenticated full access colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated can view colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Admins can create colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Admins and owners can update colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Admins can delete colaboradores" ON public.colaboradores;

CREATE POLICY "Authenticated can view colaboradores"
ON public.colaboradores
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create colaboradores"
ON public.colaboradores
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and owners can update colaboradores"
ON public.colaboradores
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR lower(auth.email()) = ANY(COALESCE(emails, ARRAY[]::text[]))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR lower(auth.email()) = ANY(COALESCE(emails, ARRAY[]::text[]))
);

CREATE POLICY "Admins can delete colaboradores"
ON public.colaboradores
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
