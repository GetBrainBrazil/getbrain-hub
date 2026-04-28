-- 09F-1: 3 views agregadas para Dashboard CRM
-- Usa estimated_value (campo existente) ao invés de budget_estimated
-- Usa happened_at IS NULL como proxy para "atividade não concluída"

CREATE OR REPLACE VIEW public.crm_dashboard_metrics AS
SELECT
  d.organization_id,
  COUNT(*) FILTER (WHERE d.stage NOT IN ('fechado_ganho','fechado_perdido')) AS deals_abertos_total,
  COALESCE(SUM(d.estimated_value) FILTER (WHERE d.stage NOT IN ('fechado_ganho','fechado_perdido')), 0)::numeric AS pipeline_value_total,
  COUNT(*) FILTER (
    WHERE d.stage NOT IN ('fechado_ganho','fechado_perdido')
      AND NOT EXISTS (
        SELECT 1 FROM public.deal_activities da
        WHERE da.deal_id = d.id
          AND da.deleted_at IS NULL
          AND COALESCE(da.happened_at, da.created_at) >= NOW() - INTERVAL '7 days'
      )
  ) AS deals_parados_7d,
  (
    SELECT COUNT(*) FROM public.deal_activities da
    JOIN public.deals d2 ON d2.id = da.deal_id
    WHERE d2.organization_id = d.organization_id
      AND d2.deleted_at IS NULL
      AND da.deleted_at IS NULL
      AND da.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND da.happened_at IS NULL
  ) AS atividades_proximos_7d,
  COUNT(*) FILTER (WHERE d.stage = 'fechado_ganho' AND d.closed_at >= NOW() - INTERVAL '30 days') AS ganhos_30d,
  COUNT(*) FILTER (WHERE d.stage IN ('fechado_ganho','fechado_perdido') AND d.closed_at >= NOW() - INTERVAL '30 days') AS fechados_30d,
  COUNT(*) FILTER (WHERE d.stage = 'fechado_ganho' AND d.closed_at >= NOW() - INTERVAL '60 days' AND d.closed_at < NOW() - INTERVAL '30 days') AS ganhos_30d_anterior
FROM public.deals d
WHERE d.deleted_at IS NULL
GROUP BY d.organization_id;

CREATE OR REPLACE VIEW public.crm_pipeline_by_stage AS
SELECT
  d.organization_id,
  d.stage,
  COUNT(*) AS deals_count,
  COALESCE(SUM(d.estimated_value), 0)::numeric AS stage_value,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - COALESCE(d.stage_changed_at, d.updated_at))) / 86400)::int, 0) AS avg_days_in_stage
FROM public.deals d
WHERE d.deleted_at IS NULL
  AND d.stage NOT IN ('fechado_ganho','fechado_perdido')
GROUP BY d.organization_id, d.stage;

CREATE OR REPLACE VIEW public.crm_dashboard_sparklines AS
WITH dias AS (
  SELECT generate_series((NOW() - INTERVAL '30 days')::date, NOW()::date, '1 day'::interval)::date AS dia
),
orgs AS (
  SELECT DISTINCT organization_id FROM public.deals WHERE deleted_at IS NULL
)
SELECT
  o.organization_id,
  dias.dia,
  (
    SELECT COUNT(DISTINCT d.id)
    FROM public.deals d
    WHERE d.organization_id = o.organization_id
      AND d.deleted_at IS NULL
      AND d.created_at::date <= dias.dia
      AND (d.closed_at IS NULL OR d.closed_at::date > dias.dia)
      AND NOT EXISTS (
        SELECT 1 FROM public.deal_activities da
        WHERE da.deal_id = d.id
          AND da.deleted_at IS NULL
          AND COALESCE(da.happened_at, da.created_at)::date BETWEEN dias.dia - INTERVAL '7 days' AND dias.dia
      )
  ) AS deals_parados,
  (
    SELECT COALESCE(SUM(d.estimated_value), 0)::numeric
    FROM public.deals d
    WHERE d.organization_id = o.organization_id
      AND d.deleted_at IS NULL
      AND d.created_at::date <= dias.dia
      AND (d.closed_at IS NULL OR d.closed_at::date > dias.dia)
      AND d.stage NOT IN ('fechado_ganho','fechado_perdido')
  ) AS pipeline_value
FROM orgs o
CROSS JOIN dias
ORDER BY o.organization_id, dias.dia;

GRANT SELECT ON public.crm_dashboard_metrics TO authenticated;
GRANT SELECT ON public.crm_pipeline_by_stage TO authenticated;
GRANT SELECT ON public.crm_dashboard_sparklines TO authenticated;