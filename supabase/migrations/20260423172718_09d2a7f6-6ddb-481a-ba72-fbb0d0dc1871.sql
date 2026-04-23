-- ENUMS
CREATE TYPE task_status AS ENUM ('backlog','todo','in_progress','in_review','done','cancelled');
CREATE TYPE task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE task_type AS ENUM ('feature','bug','chore','refactor','docs','research');
CREATE TYPE sprint_status AS ENUM ('planned','active','completed','cancelled');

-- SPRINTS
CREATE SEQUENCE public.sprint_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_sprint_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'SPR-' || lpad(nextval('public.sprint_code_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.getbrain_org_id(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  goal text,
  status sprint_status NOT NULL DEFAULT 'planned',
  start_date date NOT NULL,
  end_date date NOT NULL,
  actual_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  CONSTRAINT sprint_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX idx_sprints_org ON public.sprints(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sprints_status ON public.sprints(status) WHERE deleted_at IS NULL;

CREATE TRIGGER sprints_generate_code BEFORE INSERT ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.generate_sprint_code();
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access sprints" ON public.sprints
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TASKS
CREATE SEQUENCE public.task_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_task_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'TASK-' || lpad(nextval('public.task_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.getbrain_org_id(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  project_id uuid NOT NULL,
  sprint_id uuid REFERENCES public.sprints(id),
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  type task_type NOT NULL DEFAULT 'feature',
  estimated_hours numeric(6,2),
  actual_hours numeric(6,2) NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_since timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rework_count integer NOT NULL DEFAULT 0,
  rework_reason text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  CONSTRAINT task_blocked_consistency CHECK (
    (is_blocked = false AND blocked_reason IS NULL AND blocked_since IS NULL)
    OR (is_blocked = true AND blocked_reason IS NOT NULL AND blocked_since IS NOT NULL)
  ),
  CONSTRAINT task_hours_non_negative CHECK (
    (estimated_hours IS NULL OR estimated_hours >= 0) AND actual_hours >= 0
  )
);

CREATE INDEX idx_tasks_project ON public.tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_sprint ON public.tasks(sprint_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON public.tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_org_status ON public.tasks(organization_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER tasks_generate_code BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.generate_task_code();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_task_lifecycle_dates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status <> 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
    NEW.rework_count := OLD.rework_count + 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tasks_lifecycle_dates BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_task_lifecycle_dates();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access tasks" ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TASK_ASSIGNEES
CREATE TABLE public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(task_id, actor_id)
);

CREATE INDEX idx_task_assignees_task ON public.task_assignees(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_assignees_actor ON public.task_assignees(actor_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_task_assignees_one_primary
  ON public.task_assignees(task_id) WHERE is_primary = true AND deleted_at IS NULL;

CREATE TRIGGER task_assignees_updated_at BEFORE UPDATE ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access task_assignees" ON public.task_assignees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- VIEW project_metrics — estende com tarefas reais
DROP VIEW IF EXISTS public.project_metrics;

CREATE VIEW public.project_metrics AS
SELECT
  p.id AS project_id,
  p.code AS project_code,
  p.status AS project_status,
  p.start_date,
  p.estimated_delivery_date,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  COALESCE(p.contract_value, 0::numeric) AS revenue_contracted,
  COALESCE((SELECT SUM(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
            FROM public.movimentacoes m
            WHERE m.source_entity_id = p.id
              AND m.source_entity_type = ANY (ARRAY['project','maintenance_contract'])
              AND m.tipo = 'receita' AND m.status = 'pago'), 0::numeric) AS revenue_received,
  COALESCE((SELECT SUM(m.valor_previsto)
            FROM public.movimentacoes m
            WHERE m.source_entity_id = p.id
              AND m.source_entity_type = ANY (ARRAY['project','maintenance_contract'])
              AND m.tipo = 'receita' AND m.status NOT IN ('pago','cancelado')), 0::numeric) AS revenue_pending,
  COALESCE((SELECT SUM(pi.estimated_cost_monthly_brl)
            FROM public.project_integrations pi
            WHERE pi.project_id = p.id AND pi.status = 'ativa' AND pi.deleted_at IS NULL), 0::numeric) AS cost_integrations_monthly,
  COALESCE((SELECT SUM(m.valor_previsto)
            FROM public.movimentacoes m
            WHERE m.source_entity_id = p.id
              AND m.source_entity_type = ANY (ARRAY['project','maintenance_contract'])
              AND m.tipo = 'despesa'), 0::numeric)
    + COALESCE((SELECT SUM(pi.estimated_cost_monthly_brl)
                FROM public.project_integrations pi
                WHERE pi.project_id = p.id AND pi.status = 'ativa' AND pi.deleted_at IS NULL), 0::numeric) AS cost_total_estimated,
  COALESCE((SELECT SUM(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
            FROM public.movimentacoes m
            WHERE m.source_entity_id = p.id
              AND m.source_entity_type = ANY (ARRAY['project','maintenance_contract'])
              AND m.tipo = 'receita' AND m.status = 'pago'), 0::numeric)
   - COALESCE((SELECT SUM(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
            FROM public.movimentacoes m
            WHERE m.source_entity_id = p.id
              AND m.source_entity_type = ANY (ARRAY['project','maintenance_contract'])
              AND m.tipo = 'despesa' AND m.status = 'pago'), 0::numeric)
   - COALESCE((SELECT SUM(pi.estimated_cost_monthly_brl)
            FROM public.project_integrations pi
            WHERE pi.project_id = p.id AND pi.status = 'ativa' AND pi.deleted_at IS NULL), 0::numeric) AS margin_real,

  COALESCE(t.tasks_total, 0) AS tasks_total,
  COALESCE(t.tasks_backlog, 0) AS tasks_backlog,
  COALESCE(t.tasks_in_progress, 0) AS tasks_in_progress,
  COALESCE(t.tasks_done, 0) AS tasks_done,
  COALESCE(t.tasks_blocked, 0) AS tasks_blocked,
  COALESCE(t.hours_estimated, 0) AS hours_estimated,
  COALESCE(t.hours_actual, 0) AS hours_actual,
  CASE WHEN COALESCE(t.tasks_total, 0) = 0 THEN 0
       ELSE ROUND((t.tasks_done::numeric / t.tasks_total) * 100, 2) END AS tasks_completion_percent,

  COALESCE((SELECT COUNT(*) FROM public.project_milestones pm
            WHERE pm.project_id = p.id AND pm.deleted_at IS NULL), 0) AS milestones_total,
  COALESCE((SELECT COUNT(*) FROM public.project_milestones pm
            WHERE pm.project_id = p.id AND pm.deleted_at IS NULL AND pm.status = 'concluido'), 0) AS milestones_done,
  (SELECT to_jsonb(x) FROM (
     SELECT pm.id, pm.title, pm.target_date, pm.status::text AS status
     FROM public.project_milestones pm
     WHERE pm.project_id = p.id AND pm.deleted_at IS NULL
       AND pm.status NOT IN ('concluido','cancelado')
     ORDER BY pm.target_date NULLS LAST, pm.sequence_order
     LIMIT 1
   ) x) AS next_milestone,

  COALESCE((SELECT COUNT(*) FROM public.project_dependencies pd
            WHERE pd.project_id = p.id AND pd.deleted_at IS NULL), 0) AS total_dependencies,
  COALESCE((SELECT COUNT(*) FROM public.project_dependencies pd
            WHERE pd.project_id = p.id AND pd.deleted_at IS NULL
              AND (pd.is_blocking = true OR pd.status = 'bloqueante')
              AND pd.status NOT IN ('resolvido','cancelado','recebido')), 0) AS blocking_dependencies,

  COALESCE((SELECT COUNT(*) FROM public.project_risks pr
            WHERE pr.project_id = p.id AND pr.deleted_at IS NULL), 0) AS total_risks,
  COALESCE((SELECT COUNT(*) FROM public.project_risks pr
            WHERE pr.project_id = p.id AND pr.deleted_at IS NULL
              AND pr.severity = 'alta' AND pr.status NOT IN ('mitigado','aceito','materializado')), 0) AS high_risks_active,

  COALESCE((SELECT COUNT(*) FROM public.project_integrations pi
            WHERE pi.project_id = p.id AND pi.deleted_at IS NULL), 0) AS integrations_total,
  COALESCE((SELECT COUNT(*) FROM public.project_integrations pi
            WHERE pi.project_id = p.id AND pi.deleted_at IS NULL AND pi.status = 'ativa'), 0) AS integrations_active,

  0::bigint AS tickets_open,
  0::bigint AS tickets_resolved_30d,
  0::numeric AS avg_resolution_hours,

  0::numeric AS tokens_consumed_month_brl,
  COALESCE(p.token_budget_brl, 0::numeric) AS tokens_budget_brl,
  0::numeric AS tokens_consumption_percent,

  COALESCE((SELECT COUNT(*) FROM public.project_actors pa
            WHERE pa.project_id = p.id AND pa.ended_at IS NULL), 0) AS actors_allocated

FROM public.projects p
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS tasks_total,
    COUNT(*) FILTER (WHERE status = 'backlog')::int AS tasks_backlog,
    COUNT(*) FILTER (WHERE status = 'in_progress')::int AS tasks_in_progress,
    COUNT(*) FILTER (WHERE status = 'done')::int AS tasks_done,
    COUNT(*) FILTER (WHERE is_blocked = true AND status <> 'done')::int AS tasks_blocked,
    COALESCE(SUM(estimated_hours) FILTER (WHERE status <> 'cancelled'), 0)::numeric AS hours_estimated,
    COALESCE(SUM(actual_hours) FILTER (WHERE status <> 'cancelled'), 0)::numeric AS hours_actual
  FROM public.tasks
  WHERE deleted_at IS NULL
  GROUP BY project_id
) t ON t.project_id = p.id
WHERE p.deleted_at IS NULL;