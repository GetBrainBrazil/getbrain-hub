DROP VIEW IF EXISTS public.project_metrics CASCADE;

CREATE VIEW public.project_metrics AS
SELECT p.id AS project_id,
    p.code AS project_code,
    p.status AS project_status,
    p.start_date,
    p.estimated_delivery_date,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    COALESCE(p.contract_value, 0::numeric) AS revenue_contracted,
    COALESCE(( SELECT sum(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND m.tipo = 'receita'::text AND m.status = 'pago'::text), 0::numeric) AS revenue_received,
    COALESCE(( SELECT sum(m.valor_previsto)
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND m.tipo = 'receita'::text
            AND (m.status <> ALL (ARRAY['pago'::text, 'cancelado'::text]))), 0::numeric) AS revenue_pending,
    -- IMPLEMENTAÇÃO (não recorrente E não vinculado a contrato de manutenção)
    COALESCE(( SELECT sum(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = 'project'::text))
            AND COALESCE(m.recorrente, false) = false
            AND COALESCE(m.source_entity_type, '') <> 'maintenance_contract'
            AND m.tipo = 'receita'::text AND m.status = 'pago'::text), 0::numeric) AS revenue_received_implementation,
    COALESCE(( SELECT sum(m.valor_previsto)
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = 'project'::text))
            AND COALESCE(m.recorrente, false) = false
            AND COALESCE(m.source_entity_type, '') <> 'maintenance_contract'
            AND m.tipo = 'receita'::text
            AND (m.status <> ALL (ARRAY['pago'::text, 'cancelado'::text]))), 0::numeric) AS revenue_pending_implementation,
    -- MANUTENÇÃO (recorrente OU vinculado a contrato de manutenção)
    COALESCE(( SELECT sum(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND (COALESCE(m.recorrente, false) = true OR m.source_entity_type = 'maintenance_contract')
            AND m.tipo = 'receita'::text AND m.status = 'pago'::text), 0::numeric) AS revenue_received_maintenance,
    COALESCE(( SELECT sum(m.valor_previsto)
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND (COALESCE(m.recorrente, false) = true OR m.source_entity_type = 'maintenance_contract')
            AND m.tipo = 'receita'::text
            AND (m.status <> ALL (ARRAY['pago'::text, 'cancelado'::text]))), 0::numeric) AS revenue_pending_maintenance,
    COALESCE(( SELECT sum(pi.estimated_cost_monthly_brl)
           FROM project_integrations pi
          WHERE pi.project_id = p.id AND pi.status = 'ativa'::project_integration_status AND pi.deleted_at IS NULL), 0::numeric) AS cost_integrations_monthly,
    COALESCE(( SELECT sum(m.valor_previsto)
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND m.tipo = 'despesa'::text), 0::numeric)
    + COALESCE(( SELECT sum(pi.estimated_cost_monthly_brl)
           FROM project_integrations pi
          WHERE pi.project_id = p.id AND pi.status = 'ativa'::project_integration_status AND pi.deleted_at IS NULL), 0::numeric) AS cost_total_estimated,
    COALESCE(( SELECT sum(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND m.tipo = 'receita'::text AND m.status = 'pago'::text), 0::numeric)
    - COALESCE(( SELECT sum(COALESCE(NULLIF(m.valor_realizado, 0::numeric), m.valor_previsto))
           FROM movimentacoes m
          WHERE (m.projeto_id = p.id
                 OR (m.source_entity_id = p.id AND m.source_entity_type = ANY (ARRAY['project'::text, 'maintenance_contract'::text])))
            AND m.tipo = 'despesa'::text AND m.status = 'pago'::text), 0::numeric)
    - COALESCE(( SELECT sum(pi.estimated_cost_monthly_brl)
           FROM project_integrations pi
          WHERE pi.project_id = p.id AND pi.status = 'ativa'::project_integration_status AND pi.deleted_at IS NULL), 0::numeric) AS margin_real,
    COALESCE(t.tasks_total, 0) AS tasks_total,
    COALESCE(t.tasks_backlog, 0) AS tasks_backlog,
    COALESCE(t.tasks_in_progress, 0) AS tasks_in_progress,
    COALESCE(t.tasks_done, 0) AS tasks_done,
    COALESCE(t.tasks_blocked, 0) AS tasks_blocked,
    COALESCE(t.hours_estimated, 0::numeric) AS hours_estimated,
    COALESCE(t.hours_actual, 0::numeric) AS hours_actual,
    CASE WHEN COALESCE(t.tasks_total, 0) = 0 THEN 0::numeric
         ELSE round(t.tasks_done::numeric / t.tasks_total::numeric * 100::numeric, 2)
    END AS tasks_completion_percent,
    COALESCE(( SELECT count(*) FROM project_milestones pm
          WHERE pm.project_id = p.id AND pm.deleted_at IS NULL), 0::bigint) AS milestones_total,
    COALESCE(( SELECT count(*) FROM project_milestones pm
          WHERE pm.project_id = p.id AND pm.deleted_at IS NULL AND pm.status = 'concluido'::project_milestone_status), 0::bigint) AS milestones_done,
    ( SELECT to_jsonb(x.*)
        FROM ( SELECT pm.id, pm.title, pm.target_date, pm.status::text AS status
                FROM project_milestones pm
               WHERE pm.project_id = p.id AND pm.deleted_at IS NULL
                 AND (pm.status <> ALL (ARRAY['concluido'::project_milestone_status, 'cancelado'::project_milestone_status]))
               ORDER BY pm.target_date, pm.sequence_order LIMIT 1) x) AS next_milestone,
    COALESCE(( SELECT count(*) FROM project_dependencies pd
          WHERE pd.project_id = p.id AND pd.deleted_at IS NULL), 0::bigint) AS total_dependencies,
    COALESCE(( SELECT count(*) FROM project_dependencies pd
          WHERE pd.project_id = p.id AND pd.deleted_at IS NULL
            AND (pd.is_blocking = true OR pd.status = 'bloqueante'::project_dependency_status)
            AND (pd.status <> ALL (ARRAY['resolvido'::project_dependency_status, 'cancelado'::project_dependency_status, 'recebido'::project_dependency_status]))), 0::bigint) AS blocking_dependencies,
    COALESCE(( SELECT count(*) FROM project_risks pr
          WHERE pr.project_id = p.id AND pr.deleted_at IS NULL), 0::bigint) AS total_risks,
    COALESCE(( SELECT count(*) FROM project_risks pr
          WHERE pr.project_id = p.id AND pr.deleted_at IS NULL
            AND pr.severity = 'alta'::project_risk_severity
            AND (pr.status <> ALL (ARRAY['mitigado'::project_risk_status, 'aceito'::project_risk_status, 'materializado'::project_risk_status]))), 0::bigint) AS high_risks_active,
    COALESCE(( SELECT count(*) FROM project_integrations pi
          WHERE pi.project_id = p.id AND pi.deleted_at IS NULL), 0::bigint) AS integrations_total,
    COALESCE(( SELECT count(*) FROM project_integrations pi
          WHERE pi.project_id = p.id AND pi.deleted_at IS NULL AND pi.status = 'ativa'::project_integration_status), 0::bigint) AS integrations_active,
    0::bigint AS tickets_open,
    0::bigint AS tickets_resolved_30d,
    0::numeric AS avg_resolution_hours,
    0::numeric AS tokens_consumed_month_brl,
    COALESCE(p.token_budget_brl, 0::numeric) AS tokens_budget_brl,
    0::numeric AS tokens_consumption_percent,
    COALESCE(( SELECT count(*) FROM project_actors pa
          WHERE pa.project_id = p.id AND pa.ended_at IS NULL), 0::bigint) AS actors_allocated
FROM projects p
LEFT JOIN ( SELECT tasks.project_id,
        count(*) FILTER (WHERE tasks.status <> 'cancelled'::task_status)::integer AS tasks_total,
        count(*) FILTER (WHERE tasks.status = 'backlog'::task_status)::integer AS tasks_backlog,
        count(*) FILTER (WHERE tasks.status = 'in_progress'::task_status)::integer AS tasks_in_progress,
        count(*) FILTER (WHERE tasks.status = 'done'::task_status)::integer AS tasks_done,
        count(*) FILTER (WHERE tasks.is_blocked = true AND tasks.status <> 'done'::task_status)::integer AS tasks_blocked,
        COALESCE(sum(tasks.estimated_hours) FILTER (WHERE tasks.status <> 'cancelled'::task_status), 0::numeric) AS hours_estimated,
        COALESCE(sum(tasks.actual_hours) FILTER (WHERE tasks.status <> 'cancelled'::task_status), 0::numeric) AS hours_actual
       FROM tasks
      WHERE tasks.deleted_at IS NULL
      GROUP BY tasks.project_id) t ON t.project_id = p.id
WHERE p.deleted_at IS NULL;