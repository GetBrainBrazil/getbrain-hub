-- Função 1: lista mínima de colaboradores (sem PII) para popular dropdowns
CREATE OR REPLACE FUNCTION public.get_colaboradores_minimal()
RETURNS TABLE (
  id uuid,
  nome text,
  cargo text,
  ativo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, cargo, ativo
  FROM public.colaboradores
  ORDER BY nome;
$$;

REVOKE ALL ON FUNCTION public.get_colaboradores_minimal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_colaboradores_minimal() TO authenticated;

-- Função 2: lista mínima de humans (sem PII) para resolver actor_id de outros usuários
CREATE OR REPLACE FUNCTION public.get_humans_minimal()
RETURNS TABLE (
  id uuid,
  actor_id uuid,
  auth_user_id uuid,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, actor_id, auth_user_id, email
  FROM public.humans;
$$;

REVOKE ALL ON FUNCTION public.get_humans_minimal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_humans_minimal() TO authenticated;