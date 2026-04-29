-- 1) Restrict profiles SELECT to self or admin (PII protection)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- 2) Create a public-safe view with only non-sensitive identity columns
-- so the app can still display names/avatars across users.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  email,
  avatar_url,
  ativo,
  ultimo_acesso,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Note: security_invoker means the view runs with the caller's permissions,
-- but since the view only selects safe columns, we add a permissive SELECT
-- policy on the base table scoped to those needs via a helper. Simpler:
-- expose the view through a SECURITY DEFINER function for cross-user reads.

CREATE OR REPLACE FUNCTION public.get_profiles_public()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  ativo boolean,
  ultimo_acesso timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, email, avatar_url, ativo, ultimo_acesso, created_at
  FROM public.profiles;
$$;

REVOKE ALL ON FUNCTION public.get_profiles_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_public() TO authenticated;

-- 3) Lock down integration_connections: owner or admin only
DROP POLICY IF EXISTS connections_all_authenticated ON public.integration_connections;

CREATE POLICY "integration_connections_select_owner_or_admin"
ON public.integration_connections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_actor_id IN (SELECT actor_id FROM public.humans WHERE auth_user_id = auth.uid())
);

CREATE POLICY "integration_connections_insert_owner_or_admin"
ON public.integration_connections
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_actor_id IN (SELECT actor_id FROM public.humans WHERE auth_user_id = auth.uid())
);

CREATE POLICY "integration_connections_update_owner_or_admin"
ON public.integration_connections
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_actor_id IN (SELECT actor_id FROM public.humans WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_actor_id IN (SELECT actor_id FROM public.humans WHERE auth_user_id = auth.uid())
);

CREATE POLICY "integration_connections_delete_owner_or_admin"
ON public.integration_connections
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_actor_id IN (SELECT actor_id FROM public.humans WHERE auth_user_id = auth.uid())
);