-- ============================================================================
-- View agregada de métricas por sprint
-- ============================================================================
CREATE OR REPLACE VIEW public.dev_dashboard_metrics AS
SELECT
  s.id                AS sprint_id,
  s.code              AS sprint_code,
  s.name              AS sprint_name,
  s.status            AS sprint_status,
  s.start_date,
  s.end_date,
  s.actual_end_date,

  -- Dias
  (s.end_date - s.start_date + 1) AS sprint_total_days,
  GREATEST(0, LEAST(CURRENT_DATE, s.end_date) - s.start_date + 1) AS sprint_elapsed_days,
  GREATEST(0, s.end_date - CURRENT_DATE) AS sprint_remaining_days,

  -- Contagens de task
  COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL)                              AS tasks_total,
  COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.deleted_at IS NULL)        AS tasks_done,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress' AND t.deleted_at IS NULL) AS tasks_in_progress,
  COUNT(t.id) FILTER (WHERE t.status = 'in_review' AND t.deleted_at IS NULL)   AS tasks_in_review,
  COUNT(t.id) FILTER (WHERE t.status = 'todo' AND t.deleted_at IS NULL)        AS tasks_todo,
  COUNT(t.id) FILTER (WHERE t.status = 'backlog' AND t.deleted_at IS NULL)     AS tasks_backlog,
  COUNT(t.id) FILTER (WHERE t.status = 'cancelled' AND t.deleted_at IS NULL)   AS tasks_cancelled,
  COUNT(t.id) FILTER (
    WHERE t.is_blocked = TRUE
      AND t.status NOT IN ('done','cancelled')
      AND t.deleted_at IS NULL
  ) AS tasks_blocked_now,

  -- Horas
  COALESCE(SUM(t.estimated_hours) FILTER (
    WHERE t.deleted_at IS NULL AND t.status <> 'cancelled'
  ), 0)::numeric AS hours_estimated_total,
  COALESCE(SUM(t.actual_hours) FILTER (
    WHERE t.deleted_at IS NULL AND t.status <> 'cancelled'
  ), 0)::numeric AS hours_actual_total,

  -- Rework
  COALESCE(SUM(t.rework_count) FILTER (WHERE t.deleted_at IS NULL), 0)::int  AS rework_total,
  COUNT(t.id) FILTER (WHERE t.rework_count > 0 AND t.deleted_at IS NULL)     AS tasks_reworked,

  -- Tempo de ciclo (horas)
  COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at))/3600)
    FILTER (
      WHERE t.status = 'done'
        AND t.started_at IS NOT NULL
        AND t.completed_at IS NOT NULL
        AND t.deleted_at IS NULL
    ), 0)::numeric AS avg_cycle_time_hours,

  -- Precisão de estimativa (%)
  COALESCE(AVG(
    CASE
      WHEN t.estimated_hours IS NULL OR t.estimated_hours = 0 OR t.actual_hours = 0 THEN NULL
      ELSE LEAST(t.estimated_hours, t.actual_hours)
           / GREATEST(t.estimated_hours, t.actual_hours) * 100
    END
  ) FILTER (WHERE t.status = 'done' AND t.deleted_at IS NULL), 0)::numeric AS estimation_accuracy_pct,

  -- Conclusão no prazo
  COUNT(t.id) FILTER (
    WHERE t.status = 'done' AND t.deleted_at IS NULL
      AND (t.due_date IS NULL OR t.completed_at::date <= t.due_date)
  ) AS tasks_done_on_time,
  COUNT(t.id) FILTER (
    WHERE t.status = 'done' AND t.deleted_at IS NULL
      AND t.due_date IS NOT NULL AND t.completed_at::date > t.due_date
  ) AS tasks_done_late,

  -- Atrasadas (não-done com due_date passado)
  COUNT(t.id) FILTER (
    WHERE t.status NOT IN ('done','cancelled')
      AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE
      AND t.deleted_at IS NULL
  ) AS tasks_overdue

FROM public.sprints s
LEFT JOIN public.tasks t ON t.sprint_id = s.id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.code, s.name, s.status, s.start_date, s.end_date, s.actual_end_date;

-- ============================================================================
-- Função: precisão de estimativa por dev
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_dev_estimation_accuracy(p_sprint_ids uuid[])
RETURNS TABLE (
  actor_id uuid,
  actor_name text,
  tasks_counted integer,
  avg_accuracy_pct numeric,
  avg_deviation_hours numeric,
  tasks_overestimated integer,
  tasks_underestimated integer,
  tasks_accurate integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS actor_id,
    a.display_name AS actor_name,
    COUNT(t.id)::int AS tasks_counted,
    ROUND(AVG(
      LEAST(t.estimated_hours, t.actual_hours)
        / GREATEST(t.estimated_hours, t.actual_hours) * 100
    )::numeric, 2) AS avg_accuracy_pct,
    ROUND(AVG(ABS(t.actual_hours - t.estimated_hours))::numeric, 2) AS avg_deviation_hours,
    COUNT(t.id) FILTER (WHERE t.actual_hours < t.estimated_hours * 0.9)::int AS tasks_overestimated,
    COUNT(t.id) FILTER (WHERE t.actual_hours > t.estimated_hours * 1.1)::int AS tasks_underestimated,
    COUNT(t.id) FILTER (
      WHERE t.actual_hours BETWEEN t.estimated_hours * 0.9 AND t.estimated_hours * 1.1
    )::int AS tasks_accurate
  FROM public.actors a
  JOIN public.task_assignees ta
    ON ta.actor_id = a.id AND ta.is_primary = TRUE AND ta.deleted_at IS NULL
  JOIN public.tasks t ON t.id = ta.task_id
  WHERE t.sprint_id = ANY(p_sprint_ids)
    AND t.status = 'done'
    AND t.estimated_hours IS NOT NULL AND t.estimated_hours > 0
    AND t.actual_hours > 0
    AND t.deleted_at IS NULL
  GROUP BY a.id, a.display_name
  ORDER BY avg_accuracy_pct DESC NULLS LAST;
END;
$$;

-- ============================================================================
-- Função: capacidade atual por dev em uma sprint
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_dev_capacity(p_sprint_id uuid)
RETURNS TABLE (
  actor_id uuid,
  actor_name text,
  avatar_url text,
  tasks_open integer,
  tasks_in_progress integer,
  tasks_blocked integer,
  hours_remaining numeric,
  hours_actual_sprint numeric,
  hours_planned_sprint numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS actor_id,
    a.display_name AS actor_name,
    a.avatar_url,
    COUNT(t.id) FILTER (WHERE t.status NOT IN ('done','cancelled'))::int AS tasks_open,
    COUNT(t.id) FILTER (WHERE t.status = 'in_progress')::int AS tasks_in_progress,
    COUNT(t.id) FILTER (
      WHERE t.is_blocked = TRUE AND t.status NOT IN ('done','cancelled')
    )::int AS tasks_blocked,
    COALESCE(SUM(GREATEST(0, COALESCE(t.estimated_hours,0) - COALESCE(t.actual_hours,0)))
      FILTER (WHERE t.status NOT IN ('done','cancelled')), 0)::numeric AS hours_remaining,
    COALESCE(SUM(t.actual_hours), 0)::numeric AS hours_actual_sprint,
    COALESCE(SUM(t.estimated_hours) FILTER (WHERE t.status <> 'cancelled'), 0)::numeric
      AS hours_planned_sprint
  FROM public.actors a
  JOIN public.task_assignees ta
    ON ta.actor_id = a.id AND ta.is_primary = TRUE AND ta.deleted_at IS NULL
  JOIN public.tasks t ON t.id = ta.task_id
  WHERE t.sprint_id = p_sprint_id
    AND t.deleted_at IS NULL
  GROUP BY a.id, a.display_name, a.avatar_url
  ORDER BY hours_remaining DESC;
END;
$$;

-- ============================================================================
-- Função: saúde por projeto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_project_health_summary(p_sprint_ids uuid[])
RETURNS TABLE (
  project_id uuid,
  project_code text,
  project_name text,
  tasks_total integer,
  tasks_done integer,
  tasks_bugs integer,
  tasks_rework integer,
  hours_estimated numeric,
  hours_actual numeric,
  consumption_pct numeric,
  bug_rate_pct numeric,
  rework_rate_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS project_id,
    p.code AS project_code,
    p.name AS project_name,
    COUNT(t.id)::int AS tasks_total,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS tasks_done,
    COUNT(t.id) FILTER (WHERE t.type = 'bug')::int AS tasks_bugs,
    COUNT(t.id) FILTER (WHERE t.rework_count > 0)::int AS tasks_rework,
    COALESCE(SUM(t.estimated_hours), 0)::numeric AS hours_estimated,
    COALESCE(SUM(t.actual_hours), 0)::numeric AS hours_actual,
    CASE WHEN COALESCE(SUM(t.estimated_hours),0) = 0 THEN 0
         ELSE ROUND((SUM(t.actual_hours) / NULLIF(SUM(t.estimated_hours),0) * 100)::numeric, 2)
    END AS consumption_pct,
    CASE WHEN COUNT(t.id) = 0 THEN 0
         ELSE ROUND((COUNT(t.id) FILTER (WHERE t.type='bug')::numeric
                     / COUNT(t.id) * 100), 2)
    END AS bug_rate_pct,
    CASE WHEN COUNT(t.id) = 0 THEN 0
         ELSE ROUND((COUNT(t.id) FILTER (WHERE t.rework_count > 0)::numeric
                     / COUNT(t.id) * 100), 2)
    END AS rework_rate_pct
  FROM public.projects p
  JOIN public.tasks t ON t.project_id = p.id
  WHERE t.sprint_id = ANY(p_sprint_ids)
    AND t.deleted_at IS NULL
    AND p.deleted_at IS NULL
  GROUP BY p.id, p.code, p.name
  ORDER BY tasks_total DESC;
END;
$$;

-- ============================================================================
-- Função: burndown diário de uma sprint
-- Reconstrói o estado de cada dia: para cada dia D entre start_date e end_date,
-- conta tasks que ainda NÃO estavam done ao final do dia D.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sprint_burndown(p_sprint_id uuid)
RETURNS TABLE (
  day date,
  remaining_tasks integer,
  ideal_remaining numeric,
  total_tasks integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_total int;
BEGIN
  SELECT s.start_date, s.end_date INTO v_start, v_end
  FROM public.sprints s WHERE s.id = p_sprint_id;

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::int INTO v_total
  FROM public.tasks t
  WHERE t.sprint_id = p_sprint_id
    AND t.deleted_at IS NULL
    AND t.status <> 'cancelled';

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(v_start, v_end, interval '1 day')::date AS day
  ),
  done_per_day AS (
    SELECT d.day,
      COUNT(t.id) FILTER (
        WHERE t.status = 'done'
          AND t.completed_at IS NOT NULL
          AND t.completed_at::date <= d.day
      )::int AS done_so_far
    FROM days d
    LEFT JOIN public.tasks t
      ON t.sprint_id = p_sprint_id
     AND t.deleted_at IS NULL
     AND t.status <> 'cancelled'
    GROUP BY d.day
  )
  SELECT
    dpd.day,
    GREATEST(0, v_total - dpd.done_so_far)::int AS remaining_tasks,
    ROUND(
      v_total::numeric
      * (1 - LEAST(1, GREATEST(0, (dpd.day - v_start)::numeric)
                       / NULLIF((v_end - v_start), 0)))
    , 2) AS ideal_remaining,
    v_total AS total_tasks
  FROM done_per_day dpd
  ORDER BY dpd.day;
END;
$$;