
-- =========================================================================
-- Função auxiliar: saldo de uma conta bancária até determinada data
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calculate_account_balance(
  p_conta_id uuid,
  p_ate_data date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_saldo_inicial numeric := 0;
  v_movs numeric := 0;
BEGIN
  SELECT COALESCE(saldo_inicial, 0) INTO v_saldo_inicial
  FROM contas_bancarias WHERE id = p_conta_id;

  SELECT COALESCE(SUM(
    CASE WHEN tipo = 'receita' THEN COALESCE(valor_realizado, valor_previsto)
         ELSE -COALESCE(valor_realizado, valor_previsto) END
  ), 0) INTO v_movs
  FROM movimentacoes
  WHERE conta_bancaria_id = p_conta_id
    AND status = 'pago'
    AND data_pagamento <= p_ate_data;

  RETURN COALESCE(v_saldo_inicial, 0) + COALESCE(v_movs, 0);
END;
$$;

-- =========================================================================
-- get_financial_summary
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start_date date,
  p_end_date date,
  p_regime text DEFAULT 'competencia',
  p_account_ids uuid[] DEFAULT NULL,
  p_project_ids uuid[] DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  receita_bruta numeric,
  despesa_total numeric,
  resultado numeric,
  margem_pct numeric,
  receita_realizada numeric,
  despesa_realizada numeric,
  receita_pendente numeric,
  despesa_pendente numeric,
  count_movimentacoes integer
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_rec numeric := 0;
  v_desp numeric := 0;
  v_rec_pago numeric := 0;
  v_desp_pago numeric := 0;
  v_rec_pend numeric := 0;
  v_desp_pend numeric := 0;
  v_count integer := 0;
BEGIN
  WITH filtered AS (
    SELECT m.*
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE NOT COALESCE(c.is_transferencia, false)
      AND (
        CASE p_regime
          WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
          ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
        END
      )
      AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids))
      AND (p_project_ids IS NULL OR m.projeto_id = ANY(p_project_ids))
      AND (p_category_ids IS NULL OR m.categoria_id = ANY(p_category_ids))
  )
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'receita'
      THEN CASE WHEN p_regime = 'caixa' THEN COALESCE(valor_realizado, valor_previsto)
                ELSE CASE WHEN status = 'pago' THEN COALESCE(valor_realizado, valor_previsto)
                          ELSE valor_previsto END END
      ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'despesa'
      THEN CASE WHEN p_regime = 'caixa' THEN COALESCE(valor_realizado, valor_previsto)
                ELSE CASE WHEN status = 'pago' THEN COALESCE(valor_realizado, valor_previsto)
                          ELSE valor_previsto END END
      ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN COALESCE(valor_realizado, valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN COALESCE(valor_realizado, valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' AND status != 'pago' THEN valor_previsto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status != 'pago' THEN valor_previsto ELSE 0 END), 0),
    COUNT(*)::int
  INTO v_rec, v_desp, v_rec_pago, v_desp_pago, v_rec_pend, v_desp_pend, v_count
  FROM filtered;

  RETURN QUERY SELECT
    v_rec,
    v_desp,
    v_rec - v_desp,
    -- Margem corrigida: NULL se receita = 0 ou se margem extrapola limite razoável (-999% / +999%)
    CASE
      WHEN v_rec <= 0 THEN NULL
      WHEN ABS((v_rec - v_desp) / v_rec * 100) > 999 THEN NULL
      ELSE ROUND(((v_rec - v_desp) / v_rec) * 100, 2)
    END,
    v_rec_pago, v_desp_pago, v_rec_pend, v_desp_pend, v_count;
END;
$$;

-- =========================================================================
-- get_cash_projection — projeção dia-a-dia com cenários
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_cash_projection(
  p_days_ahead integer DEFAULT 90,
  p_scenario text DEFAULT 'realista',
  p_account_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  projection_date date,
  saldo_projetado numeric,
  entradas_dia numeric,
  saidas_dia numeric
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_saldo_inicial numeric := 0;
  v_inadimp numeric := 0;
BEGIN
  -- Saldo atual: contas_bancarias.saldo_inicial + movimentações pagas
  SELECT
    COALESCE(SUM(saldo_inicial), 0) INTO v_saldo_inicial
  FROM contas_bancarias cb
  WHERE COALESCE(cb.ativo, true)
    AND (p_account_ids IS NULL OR cb.id = ANY(p_account_ids));

  SELECT v_saldo_inicial + COALESCE(SUM(
    CASE WHEN m.tipo = 'receita' THEN COALESCE(m.valor_realizado, m.valor_previsto)
         ELSE -COALESCE(m.valor_realizado, m.valor_previsto) END
  ), 0) INTO v_saldo_inicial
  FROM movimentacoes m
  LEFT JOIN categorias c ON c.id = m.categoria_id
  WHERE m.status = 'pago'
    AND NOT COALESCE(c.is_transferencia, false)
    AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids));

  -- Taxa histórica de inadimplência (últimos 90d)
  SELECT COALESCE(
    SUM(CASE WHEN m.status != 'pago' AND m.data_vencimento < CURRENT_DATE
             THEN m.valor_previsto ELSE 0 END) /
    NULLIF(SUM(m.valor_previsto), 0) * 100, 0
  ) INTO v_inadimp
  FROM movimentacoes m
  LEFT JOIN categorias c ON c.id = m.categoria_id
  WHERE m.tipo = 'receita'
    AND NOT COALESCE(c.is_transferencia, false)
    AND m.data_vencimento BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + p_days_ahead, '1 day'::interval)::date AS d
  ),
  daily_flows AS (
    SELECT
      m.data_vencimento AS d,
      SUM(CASE WHEN m.tipo = 'receita' THEN
        CASE p_scenario
          WHEN 'otimista'   THEN m.valor_previsto
          WHEN 'pessimista' THEN m.valor_previsto * 0.7
          ELSE m.valor_previsto * (1 - COALESCE(v_inadimp, 0) / 100)
        END
      ELSE 0 END) AS entradas,
      SUM(CASE WHEN m.tipo = 'despesa' THEN m.valor_previsto ELSE 0 END) AS saidas
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE m.status != 'pago'
      AND NOT COALESCE(c.is_transferencia, false)
      AND m.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
      AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids))
    GROUP BY m.data_vencimento
  )
  SELECT
    ds.d,
    v_saldo_inicial + COALESCE(SUM(COALESCE(df.entradas, 0) - COALESCE(df.saidas, 0))
                               OVER (ORDER BY ds.d), 0),
    COALESCE(df.entradas, 0),
    COALESCE(df.saidas, 0)
  FROM date_series ds
  LEFT JOIN daily_flows df ON df.d = ds.d
  ORDER BY ds.d;
END;
$$;

-- =========================================================================
-- get_revenue_by_category
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_revenue_by_category(
  p_start_date date,
  p_end_date date,
  p_regime text DEFAULT 'competencia',
  p_account_ids uuid[] DEFAULT NULL,
  p_project_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  valor_total numeric,
  valor_realizado numeric,
  valor_pendente numeric,
  count_movimentacoes integer,
  pct_do_total numeric
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  WITH filtered AS (
    SELECT m.*
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE m.tipo = 'receita'
      AND NOT COALESCE(c.is_transferencia, false)
      AND (CASE p_regime
            WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
            ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
           END)
      AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids))
      AND (p_project_ids IS NULL OR m.projeto_id = ANY(p_project_ids))
  )
  SELECT COALESCE(SUM(
    CASE WHEN p_regime = 'caixa' THEN COALESCE(valor_realizado, valor_previsto)
         ELSE CASE WHEN status = 'pago' THEN COALESCE(valor_realizado, valor_previsto)
                   ELSE valor_previsto END END
  ), 0) INTO v_total FROM filtered;

  RETURN QUERY
  SELECT
    c.id,
    c.nome,
    COALESCE(SUM(
      CASE WHEN p_regime = 'caixa' THEN COALESCE(f.valor_realizado, f.valor_previsto)
           ELSE CASE WHEN f.status = 'pago' THEN COALESCE(f.valor_realizado, f.valor_previsto)
                     ELSE f.valor_previsto END END
    ), 0),
    COALESCE(SUM(CASE WHEN f.status = 'pago' THEN COALESCE(f.valor_realizado, f.valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.status != 'pago' THEN f.valor_previsto ELSE 0 END), 0),
    COUNT(f.id)::int,
    CASE WHEN COALESCE(v_total, 0) = 0 THEN 0
         ELSE ROUND(COALESCE(SUM(
           CASE WHEN p_regime = 'caixa' THEN COALESCE(f.valor_realizado, f.valor_previsto)
                ELSE CASE WHEN f.status = 'pago' THEN COALESCE(f.valor_realizado, f.valor_previsto)
                          ELSE f.valor_previsto END END
         ), 0) / v_total * 100, 2) END
  FROM categorias c
  LEFT JOIN (
    SELECT * FROM movimentacoes m
    WHERE m.tipo = 'receita'
      AND (CASE p_regime
            WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
            ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
           END)
      AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids))
      AND (p_project_ids IS NULL OR m.projeto_id = ANY(p_project_ids))
  ) f ON f.categoria_id = c.id
  WHERE c.tipo = 'receitas'
    AND COALESCE(c.ativo, true)
    AND NOT COALESCE(c.is_transferencia, false)
  GROUP BY c.id, c.nome
  HAVING COUNT(f.id) > 0
  ORDER BY 3 DESC;
END;
$$;

-- =========================================================================
-- get_expense_by_category
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_expense_by_category(
  p_start_date date,
  p_end_date date,
  p_regime text DEFAULT 'competencia',
  p_account_ids uuid[] DEFAULT NULL,
  p_project_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  valor_total numeric,
  valor_realizado numeric,
  valor_pendente numeric,
  count_movimentacoes integer,
  pct_do_total numeric
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  WITH filtered AS (
    SELECT m.*
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE m.tipo = 'despesa'
      AND NOT COALESCE(c.is_transferencia, false)
      AND (CASE p_regime
            WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
            ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
           END)
      AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids))
      AND (p_project_ids IS NULL OR m.projeto_id = ANY(p_project_ids))
  )
  SELECT COALESCE(SUM(
    CASE WHEN p_regime = 'caixa' THEN COALESCE(valor_realizado, valor_previsto)
         ELSE CASE WHEN status = 'pago' THEN COALESCE(valor_realizado, valor_previsto)
                   ELSE valor_previsto END END
  ), 0) INTO v_total FROM filtered;

  RETURN QUERY
  SELECT
    c.id,
    c.nome,
    COALESCE(SUM(
      CASE WHEN p_regime = 'caixa' THEN COALESCE(f.valor_realizado, f.valor_previsto)
           ELSE CASE WHEN f.status = 'pago' THEN COALESCE(f.valor_realizado, f.valor_previsto)
                     ELSE f.valor_previsto END END
    ), 0),
    COALESCE(SUM(CASE WHEN f.status = 'pago' THEN COALESCE(f.valor_realizado, f.valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.status != 'pago' THEN f.valor_previsto ELSE 0 END), 0),
    COUNT(f.id)::int,
    CASE WHEN COALESCE(v_total, 0) = 0 THEN 0
         ELSE ROUND(COALESCE(SUM(
           CASE WHEN p_regime = 'caixa' THEN COALESCE(f.valor_realizado, f.valor_previsto)
                ELSE CASE WHEN f.status = 'pago' THEN COALESCE(f.valor_realizado, f.valor_previsto)
                          ELSE f.valor_previsto END END
         ), 0) / v_total * 100, 2) END
  FROM categorias c
  LEFT JOIN (
    SELECT * FROM movimentacoes m
    WHERE m.tipo = 'despesa'
      AND (CASE p_regime
            WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
            ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
           END)
      AND (p_account_ids IS NULL OR m.conta_bancaria_id = ANY(p_account_ids))
      AND (p_project_ids IS NULL OR m.projeto_id = ANY(p_project_ids))
  ) f ON f.categoria_id = c.id
  WHERE c.tipo = 'despesas'
    AND COALESCE(c.ativo, true)
    AND NOT COALESCE(c.is_transferencia, false)
  GROUP BY c.id, c.nome
  HAVING COUNT(f.id) > 0
  ORDER BY 3 DESC;
END;
$$;

-- =========================================================================
-- get_account_balances
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_account_balances(p_days_history integer DEFAULT 90)
RETURNS TABLE (
  conta_id uuid,
  conta_nome text,
  banco text,
  tipo text,
  saldo_atual numeric,
  saldo_anterior numeric,
  variacao_pct numeric
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.id,
    cb.nome,
    cb.banco,
    cb.tipo,
    public.calculate_account_balance(cb.id, CURRENT_DATE),
    public.calculate_account_balance(cb.id, CURRENT_DATE - p_days_history),
    CASE
      WHEN public.calculate_account_balance(cb.id, CURRENT_DATE - p_days_history) = 0 THEN NULL
      ELSE ROUND(
        (public.calculate_account_balance(cb.id, CURRENT_DATE) -
         public.calculate_account_balance(cb.id, CURRENT_DATE - p_days_history)) /
        ABS(public.calculate_account_balance(cb.id, CURRENT_DATE - p_days_history)) * 100, 2)
    END
  FROM contas_bancarias cb
  WHERE COALESCE(cb.ativo, true)
  ORDER BY cb.nome;
END;
$$;

-- =========================================================================
-- get_revenue_by_project
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_revenue_by_project(
  p_start_date date,
  p_end_date date,
  p_regime text DEFAULT 'competencia'
)
RETURNS TABLE (
  project_id uuid,
  project_code text,
  project_name text,
  valor_total numeric,
  valor_recebido numeric,
  valor_pendente numeric,
  has_overdue boolean,
  pct_do_total numeric
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  WITH base AS (
    SELECT m.*
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE m.tipo = 'receita'
      AND NOT COALESCE(c.is_transferencia, false)
      AND m.projeto_id IS NOT NULL
      AND (CASE p_regime
            WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
            ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
           END)
  )
  SELECT COALESCE(SUM(
    CASE WHEN status = 'pago' THEN COALESCE(valor_realizado, valor_previsto) ELSE valor_previsto END
  ), 0) INTO v_total FROM base;

  RETURN QUERY
  SELECT
    p.id,
    p.code,
    p.name,
    COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE b.valor_previsto END), 0),
    COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN b.status != 'pago' THEN b.valor_previsto ELSE 0 END), 0),
    BOOL_OR(b.status != 'pago' AND b.data_vencimento < CURRENT_DATE - INTERVAL '30 days'),
    CASE WHEN COALESCE(v_total, 0) = 0 THEN 0
         ELSE ROUND(COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE b.valor_previsto END), 0) / v_total * 100, 2) END
  FROM projects p
  INNER JOIN base b ON b.projeto_id = p.id
  GROUP BY p.id, p.code, p.name
  ORDER BY 4 DESC;
END;
$$;

-- =========================================================================
-- get_expense_by_project
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_expense_by_project(
  p_start_date date,
  p_end_date date,
  p_regime text DEFAULT 'competencia'
)
RETURNS TABLE (
  project_id uuid,
  project_code text,
  project_name text,
  valor_total numeric,
  valor_realizado numeric,
  valor_pendente numeric,
  pct_do_total numeric
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  WITH base AS (
    SELECT m.*
    FROM movimentacoes m
    LEFT JOIN categorias c ON c.id = m.categoria_id
    WHERE m.tipo = 'despesa'
      AND NOT COALESCE(c.is_transferencia, false)
      AND (CASE p_regime
            WHEN 'caixa' THEN (m.status = 'pago' AND m.data_pagamento BETWEEN p_start_date AND p_end_date)
            ELSE m.data_competencia BETWEEN p_start_date AND p_end_date
           END)
  )
  SELECT COALESCE(SUM(
    CASE WHEN status = 'pago' THEN COALESCE(valor_realizado, valor_previsto) ELSE valor_previsto END
  ), 0) INTO v_total FROM base;

  RETURN QUERY
  -- Por projeto
  SELECT
    p.id,
    p.code,
    p.name,
    COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE b.valor_previsto END), 0),
    COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN b.status != 'pago' THEN b.valor_previsto ELSE 0 END), 0),
    CASE WHEN COALESCE(v_total, 0) = 0 THEN 0
         ELSE ROUND(COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE b.valor_previsto END), 0) / v_total * 100, 2) END
  FROM projects p
  INNER JOIN base b ON b.projeto_id = p.id
  GROUP BY p.id, p.code, p.name

  UNION ALL

  -- Linha "Sem projeto vinculado"
  SELECT
    NULL::uuid,
    NULL::text,
    'Sem projeto vinculado'::text,
    COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE b.valor_previsto END), 0),
    COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN b.status != 'pago' THEN b.valor_previsto ELSE 0 END), 0),
    CASE WHEN COALESCE(v_total, 0) = 0 THEN 0
         ELSE ROUND(COALESCE(SUM(CASE WHEN b.status = 'pago' THEN COALESCE(b.valor_realizado, b.valor_previsto) ELSE b.valor_previsto END), 0) / v_total * 100, 2) END
  FROM base b WHERE b.projeto_id IS NULL
  HAVING COUNT(b.id) > 0
  ORDER BY 4 DESC;
END;
$$;
