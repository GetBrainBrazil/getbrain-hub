CREATE OR REPLACE VIEW public.crm_funnel_metrics AS
WITH lead_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days')::integer AS leads_created_30d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '90 days')::integer AS leads_created_90d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'convertido' AND converted_at >= now() - interval '30 days')::integer AS leads_converted_30d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'convertido' AND converted_at >= now() - interval '90 days')::integer AS leads_converted_90d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'descartado')::integer AS leads_discarded_total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'novo')::integer AS leads_novo_current,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'triagem_agendada')::integer AS leads_triagem_agendada_current,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'triagem_feita')::integer AS leads_triagem_feita_current,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'triagem_feita' AND updated_at < now() - interval '7 days')::integer AS leads_ready_stale
  FROM public.leads
),
deal_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days')::integer AS deals_created_30d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '90 days')::integer AS deals_created_90d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'fechado_ganho' AND closed_at >= now() - interval '30 days')::integer AS deals_won_30d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'fechado_ganho' AND closed_at >= now() - interval '90 days')::integer AS deals_won_90d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'fechado_perdido' AND closed_at >= now() - interval '90 days')::integer AS deals_lost_90d,
    COALESCE(SUM(estimated_value) FILTER (WHERE deleted_at IS NULL AND stage = 'fechado_ganho' AND closed_at >= now() - interval '30 days'), 0)::numeric AS revenue_won_30d,
    COALESCE(SUM(estimated_value) FILTER (WHERE deleted_at IS NULL AND stage = 'fechado_ganho' AND closed_at >= now() - interval '90 days'), 0)::numeric AS revenue_won_90d,
    COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/86400) FILTER (WHERE deleted_at IS NULL AND stage IN ('fechado_ganho','fechado_perdido') AND closed_at >= now() - interval '90 days'), 0)::numeric AS avg_deal_cycle_days,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage NOT IN ('fechado_ganho','fechado_perdido') AND stage_changed_at < now() - interval '14 days')::integer AS deals_stalled_14d,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage NOT IN ('fechado_ganho','fechado_perdido') AND expected_close_date IS NOT NULL AND expected_close_date < current_date)::integer AS deals_overdue,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'presencial_agendada')::integer AS deals_presencial_agendada_current,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'presencial_feita')::integer AS deals_presencial_feita_current,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'orcamento_enviado')::integer AS deals_orcamento_enviado_current,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND stage = 'em_negociacao')::integer AS deals_em_negociacao_current
  FROM public.deals
),
activity_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND scheduled_at < now() AND happened_at IS NULL)::integer AS overdue_activities
  FROM public.deal_activities
)
SELECT
  ls.*,
  ds.*,
  ast.overdue_activities,
  CASE WHEN ls.leads_created_30d = 0 THEN 0 ELSE ROUND(ls.leads_converted_30d::numeric / ls.leads_created_30d * 100, 2) END AS lead_conversion_rate_30d,
  CASE WHEN ds.deals_created_30d = 0 THEN 0 ELSE ROUND(ds.deals_won_30d::numeric / ds.deals_created_30d * 100, 2) END AS deal_win_rate_30d
FROM lead_stats ls
CROSS JOIN deal_stats ds
CROSS JOIN activity_stats ast;

CREATE OR REPLACE FUNCTION public.get_crm_source_performance(p_days_back integer DEFAULT 90)
RETURNS TABLE (
  source text,
  leads_total integer,
  leads_converted integer,
  leads_discarded integer,
  conversion_rate_pct numeric,
  deals_won integer,
  revenue_generated numeric,
  avg_ticket numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(l.source, '(sem origem)') AS source,
    COUNT(l.id)::integer AS leads_total,
    COUNT(l.id) FILTER (WHERE l.status = 'convertido')::integer AS leads_converted,
    COUNT(l.id) FILTER (WHERE l.status = 'descartado')::integer AS leads_discarded,
    CASE WHEN COUNT(l.id) = 0 THEN 0 ELSE ROUND(COUNT(l.id) FILTER (WHERE l.status = 'convertido')::numeric / COUNT(l.id) * 100, 2) END AS conversion_rate_pct,
    COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'fechado_ganho')::integer AS deals_won,
    COALESCE(SUM(d.estimated_value) FILTER (WHERE d.stage = 'fechado_ganho'), 0)::numeric AS revenue_generated,
    CASE WHEN COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'fechado_ganho') = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(d.estimated_value) FILTER (WHERE d.stage = 'fechado_ganho'), 0) / COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'fechado_ganho'))::numeric, 2)
    END AS avg_ticket
  FROM public.leads l
  LEFT JOIN public.deals d ON d.origin_lead_id = l.id AND d.deleted_at IS NULL
  WHERE l.deleted_at IS NULL
    AND l.created_at >= now() - (p_days_back || ' days')::interval
  GROUP BY COALESCE(l.source, '(sem origem)')
  ORDER BY revenue_generated DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_crm_owner_performance(p_days_back integer DEFAULT 90)
RETURNS TABLE (
  owner_actor_id uuid,
  owner_name text,
  leads_handled integer,
  leads_converted integer,
  deals_handled integer,
  deals_won integer,
  deals_lost integer,
  win_rate_pct numeric,
  revenue_generated numeric,
  activities_completed integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS owner_actor_id,
    COALESCE(a.display_name, h.email, 'Sem owner') AS owner_name,
    COUNT(DISTINCT l.id)::integer AS leads_handled,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'convertido')::integer AS leads_converted,
    COUNT(DISTINCT d.id)::integer AS deals_handled,
    COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'fechado_ganho')::integer AS deals_won,
    COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'fechado_perdido')::integer AS deals_lost,
    CASE WHEN COUNT(DISTINCT d.id) FILTER (WHERE d.stage IN ('fechado_ganho','fechado_perdido')) = 0 THEN 0
      ELSE ROUND(COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'fechado_ganho')::numeric / COUNT(DISTINCT d.id) FILTER (WHERE d.stage IN ('fechado_ganho','fechado_perdido')) * 100, 2)
    END AS win_rate_pct,
    COALESCE(SUM(DISTINCT d.estimated_value) FILTER (WHERE d.stage = 'fechado_ganho'), 0)::numeric AS revenue_generated,
    COUNT(DISTINCT act.id) FILTER (WHERE act.happened_at IS NOT NULL)::integer AS activities_completed
  FROM public.actors a
  LEFT JOIN public.humans h ON h.actor_id = a.id
  LEFT JOIN public.leads l ON l.owner_actor_id = a.id AND l.deleted_at IS NULL AND l.created_at >= now() - (p_days_back || ' days')::interval
  LEFT JOIN public.deals d ON d.owner_actor_id = a.id AND d.deleted_at IS NULL AND d.created_at >= now() - (p_days_back || ' days')::interval
  LEFT JOIN public.deal_activities act ON act.owner_actor_id = a.id AND act.deleted_at IS NULL AND act.happened_at >= now() - (p_days_back || ' days')::interval
  WHERE a.id IN (
    SELECT DISTINCT owner_actor_id FROM public.leads WHERE owner_actor_id IS NOT NULL
    UNION
    SELECT DISTINCT owner_actor_id FROM public.deals WHERE owner_actor_id IS NOT NULL
  )
  GROUP BY a.id, a.display_name, h.email
  ORDER BY revenue_generated DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_crm_velocity_by_stage(p_days_back integer DEFAULT 180)
RETURNS TABLE (
  stage deal_stage,
  deals_passed_through integer,
  avg_days_in_stage numeric,
  median_days_in_stage numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH current_stage_age AS (
    SELECT
      d.stage,
      d.id AS deal_id,
      GREATEST(EXTRACT(EPOCH FROM (now() - COALESCE(d.stage_changed_at, d.created_at))) / 86400, 0) AS days_in_stage
    FROM public.deals d
    WHERE d.deleted_at IS NULL
      AND d.created_at >= now() - (p_days_back || ' days')::interval
  )
  SELECT
    c.stage,
    COUNT(DISTINCT c.deal_id)::integer AS deals_passed_through,
    ROUND(AVG(c.days_in_stage)::numeric, 2) AS avg_days_in_stage,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.days_in_stage)::numeric, 2) AS median_days_in_stage
  FROM current_stage_age c
  GROUP BY c.stage
  ORDER BY CASE c.stage
    WHEN 'presencial_agendada' THEN 1
    WHEN 'presencial_feita' THEN 2
    WHEN 'orcamento_enviado' THEN 3
    WHEN 'em_negociacao' THEN 4
    WHEN 'fechado_ganho' THEN 5
    WHEN 'fechado_perdido' THEN 6
  END;
END;
$$;

GRANT SELECT ON public.crm_funnel_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_source_performance(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_owner_performance(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_velocity_by_stage(integer) TO authenticated;