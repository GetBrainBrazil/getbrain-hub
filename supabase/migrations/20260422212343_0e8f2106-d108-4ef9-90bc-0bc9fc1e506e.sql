-- 1) Flag de transferência em categorias
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS is_transferencia boolean NOT NULL DEFAULT false;

UPDATE public.categorias
   SET is_transferencia = true
 WHERE lower(nome) LIKE '%transfer%';

-- 2) View financeiro_dashboard
DROP VIEW IF EXISTS public.financeiro_dashboard;

CREATE VIEW public.financeiro_dashboard
WITH (security_invoker = on)
AS
WITH base AS (
  SELECT m.*,
         COALESCE(c.is_transferencia, false) AS is_transferencia
    FROM public.movimentacoes m
    LEFT JOIN public.categorias c ON c.id = m.categoria_id
),
mes_atual AS (
  SELECT
    COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' AND NOT is_transferencia THEN COALESCE(valor_realizado, valor_previsto) END),0) AS receita_realizada,
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' AND NOT is_transferencia THEN COALESCE(valor_realizado, valor_previsto) END),0) AS despesa_realizada,
    COALESCE(SUM(CASE WHEN tipo='receita' AND NOT is_transferencia THEN valor_previsto END),0) AS receita_prevista,
    COALESCE(SUM(CASE WHEN tipo='despesa' AND NOT is_transferencia THEN valor_previsto END),0) AS despesa_prevista
  FROM base
  WHERE date_trunc('month', data_competencia) = date_trunc('month', CURRENT_DATE)
),
mes_anterior AS (
  SELECT
    COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' AND NOT is_transferencia THEN COALESCE(valor_realizado, valor_previsto) END),0) AS receita_realizada,
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' AND NOT is_transferencia THEN COALESCE(valor_realizado, valor_previsto) END),0) AS despesa_realizada
  FROM base
  WHERE date_trunc('month', data_competencia) = date_trunc('month', CURRENT_DATE - interval '1 month')
),
saldos AS (
  SELECT
    COALESCE((SELECT SUM(saldo_inicial) FROM public.contas_bancarias WHERE ativo IS NOT FALSE),0)
    + COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' THEN COALESCE(valor_realizado, valor_previsto) END),0)
    - COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' THEN COALESCE(valor_realizado, valor_previsto) END),0)
    AS saldo_total
  FROM public.movimentacoes
),
abertos AS (
  SELECT
    COALESCE(SUM(CASE WHEN tipo='receita' AND status IN ('pendente','atrasado') THEN valor_previsto END),0) AS total_a_receber,
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status IN ('pendente','atrasado') THEN valor_previsto END),0) AS total_a_pagar,
    COALESCE(SUM(CASE WHEN tipo='receita' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE THEN valor_previsto END),0) AS receber_vencido,
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE THEN valor_previsto END),0) AS pagar_vencido,
    COUNT(*) FILTER (WHERE tipo='receita' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE) AS qtd_receber_vencido,
    COUNT(*) FILTER (WHERE tipo='despesa' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE) AS qtd_pagar_vencido
  FROM public.movimentacoes
),
faturado_total AS (
  SELECT COALESCE(SUM(valor_previsto),0) AS total
    FROM public.movimentacoes
   WHERE tipo='receita'
     AND date_trunc('month', data_competencia) = date_trunc('month', CURRENT_DATE)
)
SELECT
  ma.receita_realizada AS mes_receita,
  ma.despesa_realizada AS mes_despesa,
  (ma.receita_realizada - ma.despesa_realizada) AS mes_resultado,
  CASE WHEN ma.receita_realizada > 0
       THEN ((ma.receita_realizada - ma.despesa_realizada) / ma.receita_realizada) * 100
       ELSE 0 END AS mes_margem_percent,
  ma.receita_prevista AS mes_receita_prevista,
  ma.despesa_prevista AS mes_despesa_prevista,
  mp.receita_realizada AS mes_anterior_receita,
  mp.despesa_realizada AS mes_anterior_despesa,
  (mp.receita_realizada - mp.despesa_realizada) AS mes_anterior_resultado,
  s.saldo_total,
  a.total_a_receber,
  a.total_a_pagar,
  a.receber_vencido,
  a.pagar_vencido,
  a.qtd_receber_vencido,
  a.qtd_pagar_vencido,
  CASE WHEN ft.total > 0 THEN (a.receber_vencido / ft.total) * 100 ELSE 0 END AS inadimplencia_percent
FROM mes_atual ma, mes_anterior mp, saldos s, abertos a, faturado_total ft;

-- 3) Série mensal por competência
DROP FUNCTION IF EXISTS public.financeiro_serie_mensal(int, uuid);

CREATE OR REPLACE FUNCTION public.financeiro_serie_mensal(p_meses int DEFAULT 12, p_conta uuid DEFAULT NULL)
RETURNS TABLE(
  mes date,
  receita_realizada numeric,
  despesa_realizada numeric,
  receita_prevista numeric,
  despesa_prevista numeric,
  resultado numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH meses AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - ((p_meses - 1) || ' months')::interval,
      date_trunc('month', CURRENT_DATE),
      interval '1 month'
    )::date AS mes
  ),
  agg AS (
    SELECT
      date_trunc('month', m.data_competencia)::date AS mes,
      SUM(CASE WHEN m.tipo='receita' AND m.status='pago' AND NOT COALESCE(c.is_transferencia,false) THEN COALESCE(m.valor_realizado, m.valor_previsto) ELSE 0 END) AS receita_realizada,
      SUM(CASE WHEN m.tipo='despesa' AND m.status='pago' AND NOT COALESCE(c.is_transferencia,false) THEN COALESCE(m.valor_realizado, m.valor_previsto) ELSE 0 END) AS despesa_realizada,
      SUM(CASE WHEN m.tipo='receita' AND NOT COALESCE(c.is_transferencia,false) THEN m.valor_previsto ELSE 0 END) AS receita_prevista,
      SUM(CASE WHEN m.tipo='despesa' AND NOT COALESCE(c.is_transferencia,false) THEN m.valor_previsto ELSE 0 END) AS despesa_prevista
    FROM public.movimentacoes m
    LEFT JOIN public.categorias c ON c.id = m.categoria_id
    WHERE m.data_competencia >= (date_trunc('month', CURRENT_DATE) - ((p_meses - 1) || ' months')::interval)
      AND m.data_competencia < (date_trunc('month', CURRENT_DATE) + interval '1 month')
      AND (p_conta IS NULL OR m.conta_bancaria_id = p_conta)
    GROUP BY 1
  )
  SELECT
    meses.mes,
    COALESCE(agg.receita_realizada, 0),
    COALESCE(agg.despesa_realizada, 0),
    COALESCE(agg.receita_prevista, 0),
    COALESCE(agg.despesa_prevista, 0),
    COALESCE(agg.receita_realizada,0) - COALESCE(agg.despesa_realizada,0)
  FROM meses
  LEFT JOIN agg ON agg.mes = meses.mes
  ORDER BY meses.mes;
$$;

-- 4) Fluxo projetado (próximos N dias)
DROP FUNCTION IF EXISTS public.financeiro_fluxo_projetado(int, uuid);

CREATE OR REPLACE FUNCTION public.financeiro_fluxo_projetado(p_dias int DEFAULT 90, p_conta uuid DEFAULT NULL)
RETURNS TABLE(
  dia date,
  entradas numeric,
  saidas numeric,
  saldo_acumulado numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_saldo_inicial numeric;
BEGIN
  SELECT
    COALESCE((SELECT SUM(saldo_inicial) FROM public.contas_bancarias
              WHERE ativo IS NOT FALSE AND (p_conta IS NULL OR id = p_conta)), 0)
    + COALESCE((SELECT SUM(CASE WHEN tipo='receita' THEN COALESCE(valor_realizado, valor_previsto)
                                ELSE -COALESCE(valor_realizado, valor_previsto) END)
                FROM public.movimentacoes
                WHERE status='pago'
                  AND (p_conta IS NULL OR conta_bancaria_id = p_conta)), 0)
  INTO v_saldo_inicial;

  RETURN QUERY
  WITH dias AS (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + (p_dias || ' days')::interval, interval '1 day')::date AS dia
  ),
  agg AS (
    SELECT
      data_vencimento AS dia,
      SUM(CASE WHEN tipo='receita' THEN valor_previsto ELSE 0 END) AS entradas,
      SUM(CASE WHEN tipo='despesa' THEN valor_previsto ELSE 0 END) AS saidas
    FROM public.movimentacoes
    WHERE status IN ('pendente','atrasado')
      AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_dias || ' days')::interval
      AND (p_conta IS NULL OR conta_bancaria_id = p_conta)
    GROUP BY data_vencimento
  )
  SELECT
    d.dia,
    COALESCE(a.entradas, 0)::numeric AS entradas,
    COALESCE(a.saidas, 0)::numeric AS saidas,
    (v_saldo_inicial + SUM(COALESCE(a.entradas,0) - COALESCE(a.saidas,0)) OVER (ORDER BY d.dia))::numeric AS saldo_acumulado
  FROM dias d
  LEFT JOIN agg a ON a.dia = d.dia
  ORDER BY d.dia;
END;
$$;