
-- 1. Cargos
CREATE TABLE public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  nivel INTEGER NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 5),
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargos_select_auth" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargos_admin_insert" ON public.cargos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cargos_admin_update" ON public.cargos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND NOT is_system) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cargos_admin_delete" ON public.cargos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND NOT is_system);

-- 2. Permissões por cargo
CREATE TABLE public.cargo_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cargo_id, modulo, acao)
);
ALTER TABLE public.cargo_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargo_perm_select" ON public.cargo_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargo_perm_admin" ON public.cargo_permissoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Vínculo usuário ↔ cargo
CREATE TABLE public.usuario_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(user_id, cargo_id)
);
ALTER TABLE public.usuario_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_cargos_select" ON public.usuario_cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuario_cargos_admin" ON public.usuario_cargos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Extensão profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ;

-- Permitir admins atualizarem/deletarem profiles
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Função has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _modulo TEXT, _acao TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_cargos uc
    JOIN public.cargo_permissoes cp ON cp.cargo_id = uc.cargo_id
    WHERE uc.user_id = _user_id
      AND cp.modulo = _modulo
      AND (cp.acao = _acao OR cp.acao = 'admin')
  ) OR public.has_role(_user_id, 'admin');
$$;

-- 6. Sincronizar email do auth para profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- Backfill emails existentes
UPDATE public.profiles p SET email = u.email
FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

-- 7. Updated_at trigger para cargos
CREATE TRIGGER cargos_updated_at BEFORE UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Seed cargos de sistema
INSERT INTO public.cargos (nome, descricao, nivel, cor, is_system)
VALUES
  ('Administrador', 'Acesso total ao sistema', 5, '#DC2626', true),
  ('Membro', 'Acesso de visualização', 1, '#3B82F6', true)
ON CONFLICT (nome) DO NOTHING;

-- Permissões para Administrador (todas)
INSERT INTO public.cargo_permissoes (cargo_id, modulo, acao)
SELECT c.id, m.modulo, 'admin'
FROM public.cargos c
CROSS JOIN (VALUES ('financeiro'),('projetos'),('crm'),('dev'),('vendas'),('configuracoes'),('usuarios'),('relatorios')) AS m(modulo)
WHERE c.nome = 'Administrador'
ON CONFLICT DO NOTHING;

-- Permissões para Membro (view em tudo)
INSERT INTO public.cargo_permissoes (cargo_id, modulo, acao)
SELECT c.id, m.modulo, 'view'
FROM public.cargos c
CROSS JOIN (VALUES ('financeiro'),('projetos'),('crm'),('dev'),('vendas'),('relatorios')) AS m(modulo)
WHERE c.nome = 'Membro'
ON CONFLICT DO NOTHING;

-- 9. Vincular admins existentes ao cargo Administrador
INSERT INTO public.usuario_cargos (user_id, cargo_id)
SELECT ur.user_id, c.id
FROM public.user_roles ur
JOIN public.cargos c ON c.nome = 'Administrador'
WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;

-- 10. Storage bucket avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
