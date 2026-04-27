
-- 1) Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone text,
  ADD COLUMN IF NOT EXISTS plano_saude text;

-- 2) usuario_contratos
CREATE TABLE IF NOT EXISTS public.usuario_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'CLT',
  cargo text,
  data_inicio date NOT NULL,
  data_fim date,
  salario numeric(14,2),
  observacoes text,
  anexo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uc_user ON public.usuario_contratos(user_id);
ALTER TABLE public.usuario_contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uc_select ON public.usuario_contratos;
CREATE POLICY uc_select ON public.usuario_contratos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS uc_insert ON public.usuario_contratos;
CREATE POLICY uc_insert ON public.usuario_contratos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS uc_update ON public.usuario_contratos;
CREATE POLICY uc_update ON public.usuario_contratos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS uc_delete ON public.usuario_contratos;
CREATE POLICY uc_delete ON public.usuario_contratos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS uc_updated_at ON public.usuario_contratos;
CREATE TRIGGER uc_updated_at BEFORE UPDATE ON public.usuario_contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) tenant_settings (single-row)
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text,
  nome_fantasia text,
  cnpj text,
  iata text,
  email text,
  telefone text,
  logo_url text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_select ON public.tenant_settings;
CREATE POLICY ts_select ON public.tenant_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ts_admin ON public.tenant_settings;
CREATE POLICY ts_admin ON public.tenant_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS ts_updated_at ON public.tenant_settings;
CREATE TRIGGER ts_updated_at BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tenant_settings (razao_social, nome_fantasia)
SELECT 'Minha Agência', 'Minha Agência'
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_settings);

-- 4) system_audit_logs (separate from existing audit_logs)
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome text,
  acao text NOT NULL,
  modulo text,
  tabela text,
  registro_id uuid,
  resumo text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sal_created ON public.system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_user ON public.system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sal_acao ON public.system_audit_logs(acao);
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sal_admin_read ON public.system_audit_logs;
CREATE POLICY sal_admin_read ON public.system_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sal_auth_insert ON public.system_audit_logs;
CREATE POLICY sal_auth_insert ON public.system_audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
