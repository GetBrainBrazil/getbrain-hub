-- Corrigir fórmula da inadimplência:
-- Antes: vencido / faturado_no_mes_corrente (quebra quando mês corrente tem pouca receita ou quando atrasos são antigos)
-- Agora: valor_a_receber_vencido / total_a_receber_em_aberto (% da carteira de recebíveis em atraso — métrica padrão de inadimplência)
CREATE OR REPLACE FUNCTION public.financeiro_dashboard(
  p_inicio date DEFAULT NULL,
  p_fim    date DEFAULT NULL
)
RETURNS TABLE(
  mes_receita numeric,
  mes_despesa numeric,
  mes_resultado numeric,
  mes_margem_percent numeric,
  mes_receita_prevista numeric,
  mes_despesa_prevista numeric,
  mes_anterior_receita numeric,
  mes_anterior_despesa numeric,
  mes_anterior_resultado numeric,
  saldo_total numeric,
  total_a_receber numeric,
  total_a_pagar numeric,
  receber_vencido numeric,
  pagar_vencido numeric,
  qtd_receber_vencido bigint,
  qtd_pagar_vencido bigint,
  inadimplencia_percent numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_inicio_prev date;
  v_fim_prev date;
  v_dur int;
  v_rec numeric := 0;
  v_desp numeric := 0;
  v_rec_prev numeric := 0;
  v_desp_prev numeric := 0;
  v_rec_prevista numeric := 0;
  v_desp_prevista numeric := 0;
  v_saldo numeric := 0;
  v_a_receber numeric := 0;
  v_a_pagar numeric := 0;
  v_rec_vencido numeric := 0;
  v_pag_vencido numeric := 0;
  v_qtd_rec_venc bigint := 0;
  v_qtd_pag_venc bigint := 0;
BEGIN
  IF p_inicio IS NOT NULL AND p_fim IS NOT NULL THEN
    v_dur := (p_fim - p_inicio) + 1;
    v_inicio_prev := p_inicio - v_dur;
    v_fim_prev := p_inicio - 1;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN m.tipo='receita' AND m.status='pago' THEN COALESCE(m.valor_realizado, m.valor_previsto) ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN m.tipo='despesa' AND m.status='pago' THEN COALESCE(m.valor_realizado, m.valor_previsto) ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN m.tipo='receita' THEN m.valor_previsto ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN m.tipo='despesa' THEN m.valor_previsto ELSE 0 END),0)
  INTO v_rec, v_desp, v_rec_prevista, v_desp_prevista
  FROM public.movimentacoes m
  LEFT JOIN public.categorias c ON c.id = m.categoria_id
  WHERE NOT COALESCE(c.is_transferencia, false)
    AND (p_inicio IS NULL OR m.data_competencia >= p_inicio)
    AND (p_fim IS NULL OR m.data_competencia <= p_fim);

  IF v_inicio_prev IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN m.tipo='receita' AND m.status='pago' THEN COALESCE(m.valor_realizado, m.valor_previsto) ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN m.tipo='despesa' AND m.status='pago' THEN COALESCE(m.valor_realizado, m.valor_previsto) ELSE 0 END),0)
    INTO v_rec_prev, v_desp_prev
    FROM public.movimentacoes m
    LEFT JOIN public.categorias c ON c.id = m.categoria_id
    WHERE NOT COALESCE(c.is_transferencia, false)
      AND m.data_competencia BETWEEN v_inicio_prev AND v_fim_prev;
  END IF;

  SELECT
    COALESCE((SELECT SUM(saldo_inicial) FROM public.contas_bancarias WHERE ativo IS NOT FALSE), 0)
    + COALESCE((SELECT SUM(CASE WHEN tipo='receita' THEN COALESCE(valor_realizado, valor_previsto)
                                ELSE -COALESCE(valor_realizado, valor_previsto) END)
                FROM public.movimentacoes WHERE status='pago'), 0)
  INTO v_saldo;

  SELECT
    COALESCE(SUM(CASE WHEN tipo='receita' AND status IN ('pendente','atrasado') THEN valor_previsto ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status IN ('pendente','atrasado') THEN valor_previsto ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN tipo='receita' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE THEN valor_previsto ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE THEN valor_previsto ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN tipo='receita' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE THEN 1 ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN tipo='despesa' AND status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE THEN 1 ELSE 0 END),0)
  INTO v_a_receber, v_a_pagar, v_rec_vencido, v_pag_vencido, v_qtd_rec_venc, v_qtd_pag_venc
  FROM public.movimentacoes;

  RETURN QUERY SELECT
    v_rec,
    v_desp,
    v_rec - v_desp,
    CASE WHEN v_rec > 0 THEN ROUND(((v_rec - v_desp) / v_rec) * 100, 2) ELSE 0 END,
    v_rec_prevista,
    v_desp_prevista,
    v_rec_prev,
    v_desp_prev,
    v_rec_prev - v_desp_prev,
    v_saldo,
    v_a_receber,
    v_a_pagar,
    v_rec_vencido,
    v_pag_vencido,
    v_qtd_rec_venc,
    v_qtd_pag_venc,
    -- Inadimplência = % da carteira de recebíveis em aberto que está vencida
    CASE WHEN v_a_receber > 0 THEN ROUND((v_rec_vencido / v_a_receber) * 100, 2) ELSE 0 END;
END;
$$;