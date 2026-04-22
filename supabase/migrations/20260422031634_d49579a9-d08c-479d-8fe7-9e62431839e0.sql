-- ============================================================
-- CAMADA 1.1: 7 campos de texto em projects
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS business_context text,
  ADD COLUMN IF NOT EXISTS scope_in text,
  ADD COLUMN IF NOT EXISTS scope_out text,
  ADD COLUMN IF NOT EXISTS premises text,
  ADD COLUMN IF NOT EXISTS deliverables text,
  ADD COLUMN IF NOT EXISTS technical_stack text,
  ADD COLUMN IF NOT EXISTS identified_risks text;

-- ============================================================
-- CAMADA 1.2: 7 enums novos
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.project_dependency_status AS ENUM
    ('pendente','solicitado','em_andamento','recebido','atrasado','bloqueante','resolvido','cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_dependency_type AS ENUM
    ('acesso_api','credenciais','dados_cliente','aprovacao','documentacao','homologacao','infraestrutura','outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_milestone_status AS ENUM
    ('planejado','em_andamento','concluido','atrasado','cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_integration_status AS ENUM
    ('planejada','em_desenvolvimento','testando','ativa','com_erro','descontinuada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_risk_severity AS ENUM ('baixa','media','alta','critica');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_risk_probability AS ENUM ('baixa','media','alta');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_risk_status AS ENUM
    ('identificado','em_mitigacao','mitigado','materializado','aceito');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- CAMADA 1.3: 4 novas tabelas
-- ============================================================

-- project_dependencies
CREATE TABLE IF NOT EXISTS public.project_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  dependency_type public.project_dependency_type NOT NULL,
  status public.project_dependency_status NOT NULL DEFAULT 'pendente',
  requested_from text,
  responsible_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  requested_at date,
  expected_at date,
  received_at date,
  is_blocking boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  updated_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dependencies_project ON public.project_dependencies(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dependencies_status ON public.project_dependencies(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dependencies_blocking ON public.project_dependencies(project_id)
  WHERE is_blocking = true
  AND status IN ('pendente','solicitado','em_andamento','atrasado','bloqueante')
  AND deleted_at IS NULL;

-- project_milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sequence_order int NOT NULL,
  target_date date NOT NULL,
  actual_date date,
  status public.project_milestone_status NOT NULL DEFAULT 'planejado',
  acceptance_notes text,
  triggers_billing boolean NOT NULL DEFAULT false,
  billing_amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  updated_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_order ON public.project_milestones(project_id, sequence_order) WHERE deleted_at IS NULL;

-- project_integrations
CREATE TABLE IF NOT EXISTS public.project_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text,
  purpose text,
  documentation_url text,
  credentials_location text,
  status public.project_integration_status NOT NULL DEFAULT 'planejada',
  estimated_cost_monthly_brl numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  updated_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_integrations_project ON public.project_integrations(project_id) WHERE deleted_at IS NULL;

-- project_risks
CREATE TABLE IF NOT EXISTS public.project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity public.project_risk_severity NOT NULL DEFAULT 'media',
  probability public.project_risk_probability NOT NULL DEFAULT 'media',
  status public.project_risk_status NOT NULL DEFAULT 'identificado',
  mitigation_plan text,
  responsible_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  identified_at date NOT NULL DEFAULT current_date,
  resolved_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  updated_by_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_risks_project ON public.project_risks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risks_severity ON public.project_risks(severity) WHERE deleted_at IS NULL;

-- ============================================================
-- CAMADA 1.4: Triggers de updated_at
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_project_dependencies ON public.project_dependencies;
CREATE TRIGGER set_updated_at_project_dependencies
  BEFORE UPDATE ON public.project_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_project_milestones ON public.project_milestones;
CREATE TRIGGER set_updated_at_project_milestones
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_project_integrations ON public.project_integrations;
CREATE TRIGGER set_updated_at_project_integrations
  BEFORE UPDATE ON public.project_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_project_risks ON public.project_risks;
CREATE TRIGGER set_updated_at_project_risks
  BEFORE UPDATE ON public.project_risks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CAMADA 1.4: RLS
-- ============================================================
ALTER TABLE public.project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;

-- project_dependencies
DROP POLICY IF EXISTS "auth select project_dependencies" ON public.project_dependencies;
CREATE POLICY "auth select project_dependencies" ON public.project_dependencies
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth insert project_dependencies" ON public.project_dependencies;
CREATE POLICY "auth insert project_dependencies" ON public.project_dependencies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update project_dependencies" ON public.project_dependencies;
CREATE POLICY "auth update project_dependencies" ON public.project_dependencies
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- project_milestones
DROP POLICY IF EXISTS "auth select project_milestones" ON public.project_milestones;
CREATE POLICY "auth select project_milestones" ON public.project_milestones
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth insert project_milestones" ON public.project_milestones;
CREATE POLICY "auth insert project_milestones" ON public.project_milestones
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update project_milestones" ON public.project_milestones;
CREATE POLICY "auth update project_milestones" ON public.project_milestones
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- project_integrations
DROP POLICY IF EXISTS "auth select project_integrations" ON public.project_integrations;
CREATE POLICY "auth select project_integrations" ON public.project_integrations
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth insert project_integrations" ON public.project_integrations;
CREATE POLICY "auth insert project_integrations" ON public.project_integrations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update project_integrations" ON public.project_integrations;
CREATE POLICY "auth update project_integrations" ON public.project_integrations
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- project_risks
DROP POLICY IF EXISTS "auth select project_risks" ON public.project_risks;
CREATE POLICY "auth select project_risks" ON public.project_risks
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth insert project_risks" ON public.project_risks;
CREATE POLICY "auth insert project_risks" ON public.project_risks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update project_risks" ON public.project_risks;
CREATE POLICY "auth update project_risks" ON public.project_risks
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- CAMADA 3.1: Rastreabilidade na tabela movimentacoes
-- ============================================================
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS source_module text,
  ADD COLUMN IF NOT EXISTS source_entity_type text,
  ADD COLUMN IF NOT EXISTS source_entity_id uuid,
  ADD COLUMN IF NOT EXISTS is_automatic boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_source
  ON public.movimentacoes (source_module, source_entity_id)
  WHERE source_entity_id IS NOT NULL;

-- ============================================================
-- CAMADA 3.3: Trigger SQL — registrar bloqueante em audit_logs
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_blocking_dependency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_blocking = true
     AND NEW.status IN ('pendente','solicitado','em_andamento','atrasado','bloqueante')
     AND (TG_OP = 'INSERT' OR OLD.is_blocking IS DISTINCT FROM NEW.is_blocking OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    INSERT INTO public.audit_logs (organization_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (
      NEW.organization_id,
      NEW.created_by_actor_id,
      'project',
      NEW.project_id,
      'custom',
      jsonb_build_object(
        'event', 'blocking_dependency',
        'dependency_id', NEW.id,
        'dependency_title', NEW.title,
        'dependency_status', NEW.status::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_blocking_dependency ON public.project_dependencies;
CREATE TRIGGER trg_log_blocking_dependency
  AFTER INSERT OR UPDATE ON public.project_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.log_blocking_dependency();