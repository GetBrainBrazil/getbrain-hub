-- ============================================================
-- VENDAS MODULE
-- ============================================================

-- Sequence + função para número VND-XXX
CREATE SEQUENCE IF NOT EXISTS public.venda_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_venda_numero()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num int;
BEGIN
  next_num := nextval('public.venda_numero_seq');
  RETURN 'VND-' || lpad(next_num::text, 3, '0');
END;
$$;

-- Tabela vendas
CREATE TABLE IF NOT EXISTS public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.getbrain_org_id(),
  numero text NOT NULL UNIQUE DEFAULT public.generate_venda_numero(),
  project_id uuid NOT NULL,
  cliente_id uuid,
  tipo_venda text NOT NULL CHECK (tipo_venda IN ('implementacao','recorrente','avulso')),
  descricao text,
  valor_total numeric NOT NULL DEFAULT 0,
  quantidade_parcelas integer NOT NULL DEFAULT 1,
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  data_primeira_parcela date,
  categoria_id uuid,
  centro_custo_id uuid,
  conta_bancaria_id uuid,
  meio_pagamento_id uuid,
  maintenance_contract_id uuid,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','confirmada','cancelada')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vendas_project ON public.vendas(project_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON public.vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data_venda);

-- RLS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth full access vendas"
  ON public.vendas
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER vendas_set_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Função: gerar parcelas a partir de uma venda confirmada
-- ============================================================
CREATE OR REPLACE FUNCTION public.vendas_gerar_parcelas(p_venda_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venda public.vendas%ROWTYPE;
  v_parcela_valor numeric;
  v_cursor date;
  v_i int;
  v_inseridas int := 0;
  v_descricao text;
  v_project_code text;
BEGIN
  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda % não encontrada', p_venda_id;
  END IF;

  -- Idempotência
  IF EXISTS (
    SELECT 1 FROM public.movimentacoes
    WHERE source_module = 'vendas' AND source_entity_id = p_venda_id
  ) THEN
    RETURN 0;
  END IF;

  -- Recorrente: parcelas vêm do trigger de maintenance_contracts
  IF v_venda.tipo_venda = 'recorrente' THEN
    RETURN 0;
  END IF;

  SELECT code INTO v_project_code FROM public.projects WHERE id = v_venda.project_id;

  IF v_venda.tipo_venda = 'avulso' THEN
    INSERT INTO public.movimentacoes (
      tipo, status, descricao, valor_previsto,
      data_vencimento, data_competencia,
      cliente_id, projeto_id, categoria_id, centro_custo_id,
      conta_bancaria_id, meio_pagamento_id,
      is_automatic, source_module, source_entity_type, source_entity_id
    ) VALUES (
      'receita', 'pendente',
      COALESCE(v_venda.descricao, 'Venda ' || v_venda.numero || ' — ' || COALESCE(v_project_code, 'PRJ')),
      v_venda.valor_total,
      COALESCE(v_venda.data_primeira_parcela, v_venda.data_venda),
      COALESCE(v_venda.data_primeira_parcela, v_venda.data_venda),
      v_venda.cliente_id, v_venda.project_id, v_venda.categoria_id, v_venda.centro_custo_id,
      v_venda.conta_bancaria_id, v_venda.meio_pagamento_id,
      true, 'vendas', 'venda', v_venda.id
    );
    RETURN 1;
  END IF;

  -- Implementação: N parcelas mensais
  IF v_venda.quantidade_parcelas < 1 THEN
    RAISE EXCEPTION 'quantidade_parcelas deve ser >= 1';
  END IF;
  v_parcela_valor := round((v_venda.valor_total / v_venda.quantidade_parcelas)::numeric, 2);
  v_cursor := COALESCE(v_venda.data_primeira_parcela, v_venda.data_venda);

  FOR v_i IN 1..v_venda.quantidade_parcelas LOOP
    v_descricao := COALESCE(v_venda.descricao, 'Venda ' || v_venda.numero || ' — ' || COALESCE(v_project_code, 'PRJ'))
                || ' (' || v_i || '/' || v_venda.quantidade_parcelas || ')';
    INSERT INTO public.movimentacoes (
      tipo, status, descricao, valor_previsto,
      data_vencimento, data_competencia,
      cliente_id, projeto_id, categoria_id, centro_custo_id,
      conta_bancaria_id, meio_pagamento_id,
      parcelado, parcela_atual, total_parcelas,
      is_automatic, source_module, source_entity_type, source_entity_id
    ) VALUES (
      'receita', 'pendente', v_descricao, v_parcela_valor,
      v_cursor, date_trunc('month', v_cursor)::date,
      v_venda.cliente_id, v_venda.project_id, v_venda.categoria_id, v_venda.centro_custo_id,
      v_venda.conta_bancaria_id, v_venda.meio_pagamento_id,
      true, v_i, v_venda.quantidade_parcelas,
      true, 'vendas', 'venda', v_venda.id
    );
    v_inseridas := v_inseridas + 1;
    v_cursor := (v_cursor + interval '1 month')::date;
  END LOOP;

  RETURN v_inseridas;
END;
$$;

-- ============================================================
-- Função: cancelar venda (cancela parcelas pendentes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.vendas_cancelar(p_venda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.vendas SET status = 'cancelada', updated_at = now() WHERE id = p_venda_id;
  UPDATE public.movimentacoes
    SET status = 'cancelado', updated_at = now()
    WHERE source_module = 'vendas'
      AND source_entity_id = p_venda_id
      AND status IN ('pendente','atrasado');
END;
$$;

-- ============================================================
-- Função: importar vendas a partir de projetos existentes
-- Agrupa receitas órfãs (source_module IS NULL) por projeto
-- ============================================================
CREATE OR REPLACE FUNCTION public.vendas_importar_existentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  v_venda_id uuid;
  v_first_date date;
  v_total numeric;
  v_qtd int;
  v_cliente uuid;
  v_categoria uuid;
  v_centro uuid;
  v_conta uuid;
  v_meio uuid;
  v_criadas int := 0;
BEGIN
  FOR rec IN
    SELECT DISTINCT projeto_id
    FROM public.movimentacoes
    WHERE projeto_id IS NOT NULL
      AND tipo = 'receita'
      AND source_module IS NULL
  LOOP
    -- Já existe venda para esse projeto?
    IF EXISTS (SELECT 1 FROM public.vendas WHERE project_id = rec.projeto_id) THEN
      CONTINUE;
    END IF;

    SELECT
      MIN(data_vencimento), SUM(COALESCE(valor_realizado, valor_previsto)), COUNT(*),
      MAX(cliente_id), MAX(categoria_id), MAX(centro_custo_id),
      MAX(conta_bancaria_id), MAX(meio_pagamento_id)
    INTO v_first_date, v_total, v_qtd, v_cliente, v_categoria, v_centro, v_conta, v_meio
    FROM public.movimentacoes
    WHERE projeto_id = rec.projeto_id
      AND tipo = 'receita'
      AND source_module IS NULL;

    INSERT INTO public.vendas (
      project_id, cliente_id, tipo_venda, descricao,
      valor_total, quantidade_parcelas, data_venda, data_primeira_parcela,
      categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      status, observacoes
    ) VALUES (
      rec.projeto_id, v_cliente,
      CASE WHEN v_qtd > 1 THEN 'implementacao' ELSE 'avulso' END,
      'Venda importada do projeto',
      COALESCE(v_total, 0), GREATEST(v_qtd, 1),
      COALESCE(v_first_date, CURRENT_DATE), v_first_date,
      v_categoria, v_centro, v_conta, v_meio,
      'confirmada',
      'Importada automaticamente das movimentações existentes'
    ) RETURNING id INTO v_venda_id;

    -- Vincula as movimentações órfãs à venda criada (sem duplicar)
    UPDATE public.movimentacoes
      SET source_module = 'vendas',
          source_entity_type = 'venda',
          source_entity_id = v_venda_id
    WHERE projeto_id = rec.projeto_id
      AND tipo = 'receita'
      AND source_module IS NULL;

    v_criadas := v_criadas + 1;
  END LOOP;

  RETURN v_criadas;
END;
$$;

-- ============================================================
-- Função: dashboard de vendas
-- ============================================================
CREATE OR REPLACE FUNCTION public.vendas_dashboard(p_inicio date DEFAULT NULL, p_fim date DEFAULT NULL)
RETURNS TABLE(
  total_vendido numeric,
  total_recebido numeric,
  total_a_receber numeric,
  total_atrasado numeric,
  ticket_medio numeric,
  qtd_vendas bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH vendas_periodo AS (
    SELECT * FROM public.vendas
    WHERE status = 'confirmada'
      AND deleted_at IS NULL
      AND (p_inicio IS NULL OR data_venda >= p_inicio)
      AND (p_fim IS NULL OR data_venda <= p_fim)
  ),
  movs AS (
    SELECT m.* FROM public.movimentacoes m
    WHERE m.source_module = 'vendas'
      AND m.source_entity_id IN (SELECT id FROM vendas_periodo)
  )
  SELECT
    COALESCE((SELECT SUM(valor_total) FROM vendas_periodo), 0),
    COALESCE((SELECT SUM(COALESCE(valor_realizado, valor_previsto)) FROM movs WHERE status = 'pago'), 0),
    COALESCE((SELECT SUM(valor_previsto) FROM movs WHERE status IN ('pendente','atrasado')), 0),
    COALESCE((SELECT SUM(valor_previsto) FROM movs WHERE status IN ('pendente','atrasado') AND data_vencimento < CURRENT_DATE), 0),
    CASE WHEN (SELECT COUNT(*) FROM vendas_periodo) > 0
         THEN ROUND((SELECT SUM(valor_total) FROM vendas_periodo) / (SELECT COUNT(*) FROM vendas_periodo), 2)
         ELSE 0 END,
    (SELECT COUNT(*) FROM vendas_periodo);
$$;