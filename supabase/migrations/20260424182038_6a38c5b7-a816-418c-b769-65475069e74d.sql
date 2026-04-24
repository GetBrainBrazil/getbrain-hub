
-- =========================================================
-- 1. get_project_profitability
-- =========================================================
CREATE OR REPLACE FUNCTION get_project_profitability(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_regime TEXT DEFAULT 'competencia'
)
RETURNS TABLE (
  project_id UUID,
  project_code TEXT,
  project_name TEXT,
  project_status TEXT,
  company_name TEXT,
  receita_total NUMERIC,
  receita_realizada NUMERIC,
  receita_pendente NUMERIC,
  despesa_total NUMERIC,
  despesa_realizada NUMERIC,
  resultado NUMERIC,
  margem_pct NUMERIC,
  pct_recebido NUMERIC,
  tasks_hours_actual NUMERIC,
  count_receitas INTEGER,
  count_despesas INTEGER
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH movs AS (
    SELECT m.*
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE NOT COALESCE(c.is_transferencia, FALSE)
      AND m.projeto_id IS NOT NULL
      AND (p_start_date IS NULL OR
        CASE p_regime
          WHEN 'competencia' THEN m.data_competencia >= p_start_date
          WHEN 'caixa' THEN m.data_pagamento >= p_start_date
        END)
      AND (p_end_date IS NULL OR
        CASE p_regime
          WHEN 'competencia' THEN m.data_competencia <= p_end_date
          WHEN 'caixa' THEN m.data_pagamento <= p_end_date
        END)
  ),
  agg AS (
    SELECT
      p.id AS project_id,
      p.code AS project_code,
      p.name AS project_name,
      p.status::TEXT AS project_status,
      COALESCE(comp.trade_name, comp.legal_name, 'Sem cliente') AS company_name,
      COALESCE(SUM(CASE
        WHEN m.tipo = 'receita' THEN
          CASE WHEN p_regime = 'competencia' AND m.status = 'pago' THEN m.valor_realizado
               WHEN p_regime = 'competencia' THEN m.valor_previsto
               ELSE m.valor_realizado
          END
        ELSE 0
      END), 0) AS receita_total,
      COALESCE(SUM(CASE WHEN m.tipo = 'receita' AND m.status = 'pago' THEN m.valor_realizado ELSE 0 END), 0) AS receita_realizada,
      COALESCE(SUM(CASE WHEN m.tipo = 'receita' AND m.status <> 'pago' THEN m.valor_previsto ELSE 0 END), 0) AS receita_pendente,
      COALESCE(SUM(CASE
        WHEN m.tipo = 'despesa' THEN
          CASE WHEN p_regime = 'competencia' AND m.status = 'pago' THEN m.valor_realizado
               WHEN p_regime = 'competencia' THEN m.valor_previsto
               ELSE m.valor_realizado
          END
        ELSE 0
      END), 0) AS despesa_total,
      COALESCE(SUM(CASE WHEN m.tipo = 'despesa' AND m.status = 'pago' THEN m.valor_realizado ELSE 0 END), 0) AS despesa_realizada,
      COALESCE(SUM(CASE WHEN m.tipo = 'receita' THEN m.valor_previsto ELSE 0 END), 0) AS receita_previsto_total,
      COUNT(*) FILTER (WHERE m.tipo = 'receita')::INTEGER AS count_receitas,
      COUNT(*) FILTER (WHERE m.tipo = 'despesa')::INTEGER AS count_despesas
    FROM projects p
    LEFT JOIN companies comp ON comp.id = p.company_id
    LEFT JOIN movs m ON m.projeto_id = p.id
    WHERE p.deleted_at IS NULL
      AND p.status::TEXT NOT IN ('cancelado', 'arquivado')
    GROUP BY p.id, p.code, p.name, p.status, comp.trade_name, comp.legal_name
  )
  SELECT
    a.project_id,
    a.project_code,
    a.project_name,
    a.project_status,
    a.company_name,
    a.receita_total,
    a.receita_realizada,
    a.receita_pendente,
    a.despesa_total,
    a.despesa_realizada,
    (a.receita_total - a.despesa_total) AS resultado,
    CASE
      WHEN a.receita_total <= 0 THEN NULL
      ELSE
        CASE
          WHEN ABS(((a.receita_total - a.despesa_total) / a.receita_total) * 100) > 999 THEN NULL
          ELSE ROUND(((a.receita_total - a.despesa_total) / a.receita_total) * 100, 2)
        END
    END AS margem_pct,
    CASE
      WHEN a.receita_previsto_total <= 0 THEN NULL
      ELSE ROUND((a.receita_realizada / a.receita_previsto_total) * 100, 2)
    END AS pct_recebido,
    COALESCE((SELECT pm.hours_actual FROM project_metrics pm WHERE pm.project_id = a.project_id LIMIT 1), 0) AS tasks_hours_actual,
    a.count_receitas,
    a.count_despesas
  FROM agg a
  WHERE a.receita_total > 0 OR a.despesa_total > 0 OR a.receita_pendente > 0
  ORDER BY (a.receita_total - a.despesa_total) DESC NULLS LAST;
END;
$$;

-- =========================================================
-- 2. get_client_financial_summary
-- =========================================================
CREATE OR REPLACE FUNCTION get_client_financial_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  relationship_status TEXT,
  ltv_total NUMERIC,
  recebido_periodo NUMERIC,
  a_receber_futuro NUMERIC,
  atrasado NUMERIC,
  atrasado_mais_30d NUMERIC,
  dias_atraso_max INTEGER,
  count_projetos INTEGER,
  count_projetos_ativos INTEGER,
  ultimo_pagamento DATE
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS company_id,
    COALESCE(c.trade_name, c.legal_name) AS company_name,
    c.relationship_status::TEXT,
    COALESCE(SUM(m.valor_realizado) FILTER (
      WHERE m.tipo = 'receita' AND m.status = 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
    ), 0) AS ltv_total,
    COALESCE(SUM(m.valor_realizado) FILTER (
      WHERE m.tipo = 'receita' AND m.status = 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
        AND (p_start_date IS NULL OR m.data_pagamento >= p_start_date)
        AND (p_end_date IS NULL OR m.data_pagamento <= p_end_date)
    ), 0) AS recebido_periodo,
    COALESCE(SUM(m.valor_previsto) FILTER (
      WHERE m.tipo = 'receita' AND m.status <> 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
        AND m.data_vencimento >= CURRENT_DATE
    ), 0) AS a_receber_futuro,
    COALESCE(SUM(m.valor_previsto) FILTER (
      WHERE m.tipo = 'receita' AND m.status <> 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
        AND m.data_vencimento < CURRENT_DATE
    ), 0) AS atrasado,
    COALESCE(SUM(m.valor_previsto) FILTER (
      WHERE m.tipo = 'receita' AND m.status <> 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
        AND m.data_vencimento < CURRENT_DATE - INTERVAL '30 days'
    ), 0) AS atrasado_mais_30d,
    COALESCE(MAX(CURRENT_DATE - m.data_vencimento) FILTER (
      WHERE m.tipo = 'receita' AND m.status <> 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
        AND m.data_vencimento < CURRENT_DATE
    ), 0)::INTEGER AS dias_atraso_max,
    COUNT(DISTINCT p.id)::INTEGER AS count_projetos,
    COUNT(DISTINCT p.id) FILTER (
      WHERE p.status::TEXT IN ('aceito','em_desenvolvimento','em_homologacao','em_manutencao')
    )::INTEGER AS count_projetos_ativos,
    MAX(m.data_pagamento) FILTER (
      WHERE m.tipo = 'receita' AND m.status = 'pago'
        AND NOT COALESCE(cat.is_transferencia, FALSE)
    ) AS ultimo_pagamento
  FROM companies c
  LEFT JOIN projects p ON p.company_id = c.id AND p.deleted_at IS NULL
  LEFT JOIN movimentacoes m ON m.projeto_id = p.id
  LEFT JOIN categorias cat ON cat.id = m.categoria_id
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.trade_name, c.legal_name, c.relationship_status
  HAVING COALESCE(SUM(m.valor_previsto) FILTER (WHERE m.tipo = 'receita'), 0) > 0
  ORDER BY ltv_total DESC NULLS LAST;
END;
$$;

-- =========================================================
-- 3. get_monthly_evolution
-- =========================================================
CREATE OR REPLACE FUNCTION get_monthly_evolution(
  p_months INTEGER DEFAULT 12,
  p_regime TEXT DEFAULT 'competencia'
)
RETURNS TABLE (
  mes DATE,
  mes_label TEXT,
  receita NUMERIC,
  despesa NUMERIC,
  resultado NUMERIC,
  margem_pct NUMERIC,
  saldo_fim_mes NUMERIC
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  v_saldo_inicial NUMERIC;
BEGIN
  SELECT COALESCE(SUM(saldo_inicial), 0) INTO v_saldo_inicial FROM contas_bancarias WHERE ativo IS NOT FALSE;

  RETURN QUERY
  WITH meses AS (
    SELECT date_trunc('month', CURRENT_DATE - (INTERVAL '1 month' * gs))::DATE AS mes
    FROM generate_series(0, p_months - 1) AS gs
  ),
  fluxos AS (
    SELECT
      date_trunc('month',
        CASE p_regime WHEN 'competencia' THEN m.data_competencia ELSE m.data_pagamento END
      )::DATE AS mes,
      SUM(CASE WHEN m.tipo = 'receita' THEN
        CASE WHEN p_regime = 'competencia' AND m.status = 'pago' THEN m.valor_realizado
             WHEN p_regime = 'competencia' THEN m.valor_previsto
             ELSE m.valor_realizado
        END ELSE 0 END) AS receita,
      SUM(CASE WHEN m.tipo = 'despesa' THEN
        CASE WHEN p_regime = 'competencia' AND m.status = 'pago' THEN m.valor_realizado
             WHEN p_regime = 'competencia' THEN m.valor_previsto
             ELSE m.valor_realizado
        END ELSE 0 END) AS despesa
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE NOT COALESCE(c.is_transferencia, FALSE)
      AND (
        CASE p_regime
          WHEN 'competencia' THEN m.data_competencia
          ELSE m.data_pagamento
        END
      ) IS NOT NULL
    GROUP BY 1
  ),
  saldos AS (
    SELECT
      m.mes,
      v_saldo_inicial + COALESCE((
        SELECT SUM(CASE WHEN mv.tipo = 'receita' THEN mv.valor_realizado ELSE -mv.valor_realizado END)
        FROM movimentacoes mv
        LEFT JOIN categorias cv ON cv.id = mv.categoria_id
        WHERE mv.status = 'pago'
          AND mv.data_pagamento IS NOT NULL
          AND mv.data_pagamento <= (m.mes + INTERVAL '1 month - 1 day')::DATE
          AND NOT COALESCE(cv.is_transferencia, FALSE)
      ), 0) AS saldo_fim_mes
    FROM meses m
  )
  SELECT
    m.mes,
    TO_CHAR(m.mes, 'Mon/YY') AS mes_label,
    COALESCE(f.receita, 0) AS receita,
    COALESCE(f.despesa, 0) AS despesa,
    COALESCE(f.receita, 0) - COALESCE(f.despesa, 0) AS resultado,
    CASE
      WHEN COALESCE(f.receita, 0) <= 0 THEN NULL
      ELSE
        CASE
          WHEN ABS(((COALESCE(f.receita, 0) - COALESCE(f.despesa, 0)) / f.receita) * 100) > 999 THEN NULL
          ELSE ROUND(((COALESCE(f.receita, 0) - COALESCE(f.despesa, 0)) / f.receita) * 100, 2)
        END
    END AS margem_pct,
    s.saldo_fim_mes
  FROM meses m
  LEFT JOIN fluxos f ON f.mes = m.mes
  LEFT JOIN saldos s ON s.mes = m.mes
  ORDER BY m.mes ASC;
END;
$$;

-- =========================================================
-- 4. get_upcoming_movements
-- =========================================================
CREATE OR REPLACE FUNCTION get_upcoming_movements(
  p_days_ahead INTEGER DEFAULT 7,
  p_include_overdue BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  tipo TEXT,
  descricao TEXT,
  categoria_nome TEXT,
  valor NUMERIC,
  data_vencimento DATE,
  dias_ate_vencimento INTEGER,
  status TEXT,
  project_code TEXT,
  company_name TEXT,
  is_overdue BOOLEAN
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.tipo::TEXT,
    m.descricao,
    c.nome AS categoria_nome,
    m.valor_previsto AS valor,
    m.data_vencimento,
    (m.data_vencimento - CURRENT_DATE)::INTEGER AS dias_ate_vencimento,
    m.status::TEXT,
    p.code AS project_code,
    COALESCE(comp.trade_name, comp.legal_name) AS company_name,
    (m.data_vencimento < CURRENT_DATE) AS is_overdue
  FROM movimentacoes m
  LEFT JOIN categorias c ON c.id = m.categoria_id
  LEFT JOIN projects p ON p.id = m.projeto_id
  LEFT JOIN companies comp ON comp.id = p.company_id
  WHERE m.status <> 'pago'
    AND NOT COALESCE(c.is_transferencia, FALSE)
    AND (
      (m.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead)
      OR (p_include_overdue AND m.data_vencimento < CURRENT_DATE)
    )
  ORDER BY m.data_vencimento ASC;
END;
$$;
