-- 1. Drop unused backup tables exposed without RLS
DROP TABLE IF EXISTS public._backup_movimentacoes_legacy_recurrence;
DROP TABLE IF EXISTS public._backup_projects_text_fields_pre_v1_9;

-- 2. Tighten RLS on humans (sensitive employee PII + compensation)
DROP POLICY IF EXISTS "auth full access humans" ON public.humans;

CREATE POLICY "humans_select_self_or_admin"
ON public.humans
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "humans_insert_admin"
ON public.humans
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "humans_update_admin"
ON public.humans
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "humans_delete_admin"
ON public.humans
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));