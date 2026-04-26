-- =====================================================================
-- 09C-1A: Fundação de Recorrências (retry — fix MIN(uuid))
-- =====================================================================

CREATE SEQUENCE IF NOT EXISTS recurrence_code_seq START 1;

CREATE TABLE IF NOT EXISTS public.financial_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  code text UNIQUE NOT NULL DEFAULT ('REC-' || LPAD(nextval('recurrence_code_seq')::text, 4, '0')),
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('installment', 'recurrence')),
  direction text NOT NULL CHECK (direction IN ('receita', 'despesa')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  frequency text NOT NULL CHECK (frequency IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  start_date date NOT NULL,
  total_installments integer CHECK (total_installments IS NULL OR total_installments > 0),
  end_date date,
  cliente_id uuid REFERENCES public.clientes(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  projeto_id uuid REFERENCES public.projects(id),
  categoria_id uuid REFERENCES public.categorias(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id),
  meio_pagamento_id uuid REFERENCES public.meios_pagamento(id),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'encerrada', 'cancelada')),
  source_module text,
  source_entity_type text,
  source_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CHECK (
    (type = 'installment' AND total_installments IS NOT NULL) OR
    (type = 'recurrence')
  )
);

CREATE INDEX IF NOT EXISTS idx_recurrences_status ON public.financial_recurrences(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurrences_projeto ON public.financial_recurrences(projeto_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurrences_cliente ON public.financial_recurrences(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurrences_fornecedor ON public.financial_recurrences(fornecedor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurrences_source ON public.financial_recurrences(source_module, source_entity_id);

ALTER TABLE public.financial_recurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all" ON public.financial_recurrences;
CREATE POLICY "authenticated_all" ON public.financial_recurrences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at_recurrences ON public.financial_recurrences;
CREATE TRIGGER set_updated_at_recurrences
  BEFORE UPDATE ON public.financial_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS recurrence_id uuid REFERENCES public.financial_recurrences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS installments_total integer,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_recurrence ON public.movimentacoes(recurrence_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_deleted ON public.movimentacoes(deleted_at);

COMMENT ON COLUMN public.movimentacoes.recorrente IS 'DEPRECATED desde 09C-1A. Use recurrence_id. Removido em prompt futuro.';
COMMENT ON COLUMN public.movimentacoes.frequencia_recorrencia IS 'DEPRECATED desde 09C-1A. Use financial_recurrences.frequency.';
COMMENT ON COLUMN public.movimentacoes.movimentacao_pai_id IS 'DEPRECATED desde 09C-1A. Use recurrence_id.';
COMMENT ON COLUMN public.movimentacoes.parcelado IS 'DEPRECATED desde 09C-1A. Use recurrence_id (type=installment).';
COMMENT ON COLUMN public.movimentacoes.parcela_atual IS 'DEPRECATED desde 09C-1A. Use installment_number.';
COMMENT ON COLUMN public.movimentacoes.total_parcelas IS 'DEPRECATED desde 09C-1A. Use installments_total.';

-- ---------- generate_recurrence_installments ------------------------

CREATE OR REPLACE FUNCTION public.generate_recurrence_installments(
  p_recurrence_id uuid, p_horizon_months integer DEFAULT 12
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  r public.financial_recurrences%ROWTYPE;
  v_count integer := 0;
  v_last_date date;
  v_target_date date;
  v_max_iterations integer;
  v_i integer;
  v_installment_number integer;
  v_step interval;
BEGIN
  SELECT * INTO r FROM public.financial_recurrences
   WHERE id = p_recurrence_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recorrência % não encontrada', p_recurrence_id; END IF;
  IF r.status <> 'ativa' THEN RETURN 0; END IF;

  v_step := CASE r.frequency
    WHEN 'mensal' THEN INTERVAL '1 month'
    WHEN 'bimestral' THEN INTERVAL '2 months'
    WHEN 'trimestral' THEN INTERVAL '3 months'
    WHEN 'semestral' THEN INTERVAL '6 months'
    WHEN 'anual' THEN INTERVAL '1 year'
  END;

  SELECT MAX(installment_number), MAX(data_vencimento)
    INTO v_installment_number, v_last_date
    FROM public.movimentacoes
   WHERE recurrence_id = r.id AND deleted_at IS NULL;

  v_installment_number := COALESCE(v_installment_number, 0);

  IF r.type = 'installment' THEN
    v_max_iterations := r.total_installments - v_installment_number;
  ELSIF r.end_date IS NOT NULL THEN
    v_max_iterations := 0;
    v_target_date := COALESCE((v_last_date + v_step)::date, r.start_date);
    WHILE v_target_date <= r.end_date LOOP
      v_max_iterations := v_max_iterations + 1;
      v_target_date := (v_target_date + v_step)::date;
    END LOOP;
  ELSE
    v_max_iterations := p_horizon_months;
  END IF;

  IF v_max_iterations <= 0 THEN RETURN 0; END IF;

  v_target_date := COALESCE((v_last_date + v_step)::date, r.start_date);

  FOR v_i IN 1..v_max_iterations LOOP
    v_installment_number := v_installment_number + 1;
    INSERT INTO public.movimentacoes (
      tipo, descricao, valor_previsto, data_competencia, data_vencimento, status,
      cliente_id, fornecedor_id, projeto_id, categoria_id,
      centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      recurrence_id, installment_number, installments_total,
      source_module, source_entity_type, source_entity_id, is_automatic
    ) VALUES (
      r.direction,
      CASE r.type
        WHEN 'installment' THEN r.description || ' (' || v_installment_number || '/' || r.total_installments || ')'
        ELSE r.description || ' - ' || to_char(v_target_date, 'MM/YYYY')
      END,
      r.amount, v_target_date, v_target_date, 'pendente',
      r.cliente_id, r.fornecedor_id, r.projeto_id, r.categoria_id,
      r.centro_custo_id, r.conta_bancaria_id, r.meio_pagamento_id,
      r.id, v_installment_number,
      CASE r.type WHEN 'installment' THEN r.total_installments ELSE NULL END,
      COALESCE(r.source_module, 'financial_recurrences'),
      COALESCE(r.source_entity_type, 'financial_recurrence'),
      COALESCE(r.source_entity_id, r.id),
      true
    );
    v_count := v_count + 1;
    v_target_date := (v_target_date + v_step)::date;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ---------- propagate_recurrence_changes ----------------------------

CREATE OR REPLACE FUNCTION public.propagate_recurrence_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('cancelada', 'encerrada') AND OLD.status = 'ativa' THEN
    UPDATE public.movimentacoes SET deleted_at = now(), updated_at = now()
     WHERE recurrence_id = NEW.id AND status = 'pendente'
       AND data_vencimento >= CURRENT_DATE AND deleted_at IS NULL;
    RETURN NEW;
  END IF;
  IF NEW.status = 'pausada' AND OLD.status = 'ativa' THEN RETURN NEW; END IF;
  IF NEW.status = 'ativa' AND OLD.status = 'pausada' THEN
    PERFORM public.generate_recurrence_installments(NEW.id);
    RETURN NEW;
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.categoria_id IS DISTINCT FROM OLD.categoria_id
     OR NEW.centro_custo_id IS DISTINCT FROM OLD.centro_custo_id
     OR NEW.conta_bancaria_id IS DISTINCT FROM OLD.conta_bancaria_id
     OR NEW.meio_pagamento_id IS DISTINCT FROM OLD.meio_pagamento_id
     OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.fornecedor_id IS DISTINCT FROM OLD.fornecedor_id
     OR NEW.projeto_id IS DISTINCT FROM OLD.projeto_id THEN
    UPDATE public.movimentacoes
       SET valor_previsto = NEW.amount,
           categoria_id = NEW.categoria_id,
           centro_custo_id = NEW.centro_custo_id,
           conta_bancaria_id = NEW.conta_bancaria_id,
           meio_pagamento_id = NEW.meio_pagamento_id,
           cliente_id = NEW.cliente_id,
           fornecedor_id = NEW.fornecedor_id,
           projeto_id = NEW.projeto_id,
           updated_at = now()
     WHERE recurrence_id = NEW.id AND status = 'pendente'
       AND data_vencimento >= CURRENT_DATE AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recurrence_propagate ON public.financial_recurrences;
CREATE TRIGGER recurrence_propagate
  AFTER UPDATE ON public.financial_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.propagate_recurrence_changes();

-- ---------- RPC create_recurrence_with_installments -----------------

CREATE OR REPLACE FUNCTION public.create_recurrence_with_installments(
  p_payload jsonb, p_horizon_months integer DEFAULT 12
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid; v_id uuid; v_count integer;
  v_total_installments integer; v_type text;
BEGIN
  SELECT id INTO v_org FROM public.organizations LIMIT 1;
  v_type := COALESCE(p_payload->>'type', 'recurrence');
  v_total_installments := NULLIF(p_payload->>'total_installments','')::int;

  INSERT INTO public.financial_recurrences (
    organization_id, description, type, direction, amount, frequency,
    start_date, total_installments, end_date,
    cliente_id, fornecedor_id, projeto_id, categoria_id,
    centro_custo_id, conta_bancaria_id, meio_pagamento_id,
    source_module, source_entity_type, source_entity_id, created_by
  ) VALUES (
    v_org, p_payload->>'description', v_type, p_payload->>'direction',
    (p_payload->>'amount')::numeric, COALESCE(p_payload->>'frequency','mensal'),
    (p_payload->>'start_date')::date,
    CASE WHEN v_type = 'installment' THEN v_total_installments ELSE NULL END,
    NULLIF(p_payload->>'end_date','')::date,
    NULLIF(p_payload->>'cliente_id','')::uuid,
    NULLIF(p_payload->>'fornecedor_id','')::uuid,
    NULLIF(p_payload->>'projeto_id','')::uuid,
    NULLIF(p_payload->>'categoria_id','')::uuid,
    NULLIF(p_payload->>'centro_custo_id','')::uuid,
    NULLIF(p_payload->>'conta_bancaria_id','')::uuid,
    NULLIF(p_payload->>'meio_pagamento_id','')::uuid,
    NULLIF(p_payload->>'source_module',''),
    NULLIF(p_payload->>'source_entity_type',''),
    NULLIF(p_payload->>'source_entity_id','')::uuid,
    auth.uid()
  ) RETURNING id INTO v_id;

  v_count := public.generate_recurrence_installments(v_id, p_horizon_months);
  RETURN jsonb_build_object('recurrence_id', v_id, 'installments_created', v_count);
END;
$$;

-- ---------- MIGRAÇÃO DOS 31 LEGADOS ---------------------------------

DROP TABLE IF EXISTS public._backup_movimentacoes_legacy_recurrence;
CREATE TABLE public._backup_movimentacoes_legacy_recurrence AS
  SELECT * FROM public.movimentacoes
   WHERE recorrente = true OR parcelado = true OR movimentacao_pai_id IS NOT NULL;

DO $$
DECLARE v integer;
BEGIN
  SELECT COUNT(*) INTO v FROM public._backup_movimentacoes_legacy_recurrence;
  IF v <> 31 THEN RAISE EXCEPTION 'Backup deveria ter 31 linhas, tem %', v; END IF;
END $$;

-- 6.2 Migrar maintenance_contracts (agrupado por source_entity_id)
-- Helper inline: usa (array_agg(x ORDER BY data_competencia))[1] para uuids
WITH maintenance_groups AS (
  SELECT
    source_entity_id AS contract_id,
    MAX(tipo) AS tipo,
    AVG(valor_previsto) AS amount,
    MIN(data_competencia) AS start_date,
    MAX(data_vencimento) AS end_date,
    (array_agg(cliente_id ORDER BY data_competencia) FILTER (WHERE cliente_id IS NOT NULL))[1] AS cliente_id,
    (array_agg(fornecedor_id ORDER BY data_competencia) FILTER (WHERE fornecedor_id IS NOT NULL))[1] AS fornecedor_id,
    (array_agg(projeto_id ORDER BY data_competencia) FILTER (WHERE projeto_id IS NOT NULL))[1] AS projeto_id,
    (array_agg(categoria_id ORDER BY data_competencia) FILTER (WHERE categoria_id IS NOT NULL))[1] AS categoria_id,
    (array_agg(centro_custo_id ORDER BY data_competencia) FILTER (WHERE centro_custo_id IS NOT NULL))[1] AS centro_custo_id,
    (array_agg(conta_bancaria_id ORDER BY data_competencia) FILTER (WHERE conta_bancaria_id IS NOT NULL))[1] AS conta_bancaria_id,
    (array_agg(meio_pagamento_id ORDER BY data_competencia) FILTER (WHERE meio_pagamento_id IS NOT NULL))[1] AS meio_pagamento_id,
    MIN(created_at) AS first_created,
    REGEXP_REPLACE(MIN(descricao), ' — \d{2}/\d{4}$', '') AS base_description
  FROM public.movimentacoes
  WHERE source_module = 'maintenance_contracts'
    AND recurrence_id IS NULL AND deleted_at IS NULL
  GROUP BY source_entity_id
)
INSERT INTO public.financial_recurrences (
  organization_id, description, type, direction, amount, frequency,
  start_date, end_date, cliente_id, fornecedor_id, projeto_id, categoria_id,
  centro_custo_id, conta_bancaria_id, meio_pagamento_id,
  status, source_module, source_entity_type, source_entity_id, created_at, updated_at
)
SELECT
  (SELECT id FROM public.organizations LIMIT 1),
  base_description, 'recurrence', tipo, amount, 'mensal',
  start_date, end_date, cliente_id, fornecedor_id, projeto_id, categoria_id,
  centro_custo_id, conta_bancaria_id, meio_pagamento_id,
  'ativa', 'maintenance_contracts', 'maintenance_contract', contract_id,
  first_created, now()
FROM maintenance_groups;

-- 6.3 Migrar manuais (sem source_module)
WITH manual_groups AS (
  SELECT
    descricao,
    COALESCE(frequencia_recorrencia, 'mensal') AS frequencia,
    tipo,
    cliente_id, fornecedor_id, projeto_id, categoria_id,
    centro_custo_id, conta_bancaria_id, meio_pagamento_id,
    MIN(data_competencia) AS start_date,
    AVG(valor_previsto) AS amount,
    MIN(created_at) AS first_created
  FROM public.movimentacoes
  WHERE source_module IS NULL
    AND (recorrente = true OR movimentacao_pai_id IS NOT NULL)
    AND recurrence_id IS NULL AND deleted_at IS NULL
  GROUP BY descricao, frequencia_recorrencia, tipo,
           cliente_id, fornecedor_id, projeto_id, categoria_id,
           centro_custo_id, conta_bancaria_id, meio_pagamento_id
)
INSERT INTO public.financial_recurrences (
  organization_id, description, type, direction, amount, frequency,
  start_date, status, source_module,
  cliente_id, fornecedor_id, projeto_id, categoria_id,
  centro_custo_id, conta_bancaria_id, meio_pagamento_id,
  created_at, updated_at
)
SELECT
  (SELECT id FROM public.organizations LIMIT 1),
  descricao, 'recurrence', tipo, amount, frequencia, start_date,
  'ativa', 'migration_09c1a',
  cliente_id, fornecedor_id, projeto_id, categoria_id,
  centro_custo_id, conta_bancaria_id, meio_pagamento_id,
  first_created, now()
FROM manual_groups;

-- 6.4 Vincular filhas — manutenção
UPDATE public.movimentacoes m
SET recurrence_id = r.id, updated_at = now()
FROM public.financial_recurrences r
WHERE m.recurrence_id IS NULL AND m.deleted_at IS NULL AND r.deleted_at IS NULL
  AND m.source_module = 'maintenance_contracts'
  AND r.source_module = 'maintenance_contracts'
  AND m.source_entity_id = r.source_entity_id;

-- 6.4 Vincular filhas — manuais
UPDATE public.movimentacoes m
SET recurrence_id = r.id, updated_at = now()
FROM public.financial_recurrences r
WHERE m.recurrence_id IS NULL AND m.deleted_at IS NULL AND r.deleted_at IS NULL
  AND r.source_module = 'migration_09c1a'
  AND m.source_module IS NULL
  AND (m.recorrente = true OR m.movimentacao_pai_id IS NOT NULL)
  AND m.descricao = r.description
  AND COALESCE(m.frequencia_recorrencia, 'mensal') = r.frequency
  AND m.tipo = r.direction
  AND COALESCE(m.cliente_id::text, '') = COALESCE(r.cliente_id::text, '')
  AND COALESCE(m.fornecedor_id::text, '') = COALESCE(r.fornecedor_id::text, '')
  AND COALESCE(m.projeto_id::text, '') = COALESCE(r.projeto_id::text, '')
  AND COALESCE(m.categoria_id::text, '') = COALESCE(r.categoria_id::text, '');

-- 6.5 Numerar installment_number
WITH numbered AS (
  SELECT id, recurrence_id,
         ROW_NUMBER() OVER (PARTITION BY recurrence_id ORDER BY data_vencimento, created_at) AS rn
    FROM public.movimentacoes
   WHERE recurrence_id IS NOT NULL AND installment_number IS NULL AND deleted_at IS NULL
)
UPDATE public.movimentacoes m
   SET installment_number = n.rn, updated_at = now()
  FROM numbered n WHERE m.id = n.id;

-- 6.6 Validações
DO $$
DECLARE v integer;
BEGIN
  SELECT COUNT(*) INTO v FROM public.movimentacoes
   WHERE (recorrente = true OR movimentacao_pai_id IS NOT NULL)
     AND recurrence_id IS NULL AND deleted_at IS NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Migração incompleta: % legadas sem recurrence_id', v; END IF;
END $$;

DO $$
DECLARE v integer;
BEGIN
  SELECT COUNT(*) INTO v FROM public.financial_recurrences r
   WHERE r.status = 'ativa' AND r.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.movimentacoes WHERE recurrence_id = r.id);
  IF v > 0 THEN RAISE EXCEPTION 'Migração incompleta: % recurrences ativas sem filhas', v; END IF;
END $$;

DO $$
DECLARE v_recs integer; v_filhas integer;
BEGIN
  SELECT COUNT(*) INTO v_recs FROM public.financial_recurrences
    WHERE source_module IN ('maintenance_contracts', 'migration_09c1a');
  SELECT COUNT(*) INTO v_filhas FROM public.movimentacoes
    WHERE recurrence_id IS NOT NULL AND deleted_at IS NULL;
  IF v_recs <> 3 THEN RAISE EXCEPTION 'Esperado 3 recurrences migradas, encontrado %', v_recs; END IF;
  IF v_filhas <> 31 THEN RAISE EXCEPTION 'Esperado 31 filhas vinculadas, encontrado %', v_filhas; END IF;
END $$;

-- ---------- REFACTOR sync_maintenance_contract_recurrence -----------

CREATE OR REPLACE FUNCTION public.sync_maintenance_contract_recurrence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_project_code text;
  v_client_id uuid;
  v_company_name text;
  v_net_fee numeric;
  v_org uuid;
  v_recurrence_id uuid;
  v_categoria_manutencao uuid := 'fd3b23be-1101-4122-83d1-6b559c64c04b'::uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizations LIMIT 1;

  SELECT id INTO v_recurrence_id FROM public.financial_recurrences
   WHERE source_module = 'maintenance_contracts' AND source_entity_id = NEW.id
     AND deleted_at IS NULL LIMIT 1;

  IF NEW.status <> 'active' OR NEW.deleted_at IS NOT NULL THEN
    IF v_recurrence_id IS NOT NULL THEN
      UPDATE public.financial_recurrences
         SET status = 'cancelada', updated_at = now()
       WHERE id = v_recurrence_id AND status = 'ativa';
    END IF;
    RETURN NEW;
  END IF;

  SELECT p.code INTO v_project_code FROM public.projects p WHERE p.id = NEW.project_id;
  SELECT pj.cliente_id INTO v_client_id FROM public.projetos pj WHERE pj.id = NEW.project_id;
  IF v_client_id IS NULL THEN
    SELECT COALESCE(c.trade_name, c.legal_name) INTO v_company_name
      FROM public.projects p JOIN public.companies c ON c.id = p.company_id
     WHERE p.id = NEW.project_id;
    IF v_company_name IS NOT NULL THEN
      SELECT cl.id INTO v_client_id FROM public.clientes cl
       WHERE LOWER(TRIM(cl.nome)) = LOWER(TRIM(v_company_name)) LIMIT 1;
    END IF;
  END IF;

  v_net_fee := NEW.monthly_fee * (1 - COALESCE(NEW.monthly_fee_discount_percent, 0) / 100.0);

  IF v_recurrence_id IS NULL THEN
    INSERT INTO public.financial_recurrences (
      organization_id, description, type, direction, amount, frequency,
      start_date, end_date, cliente_id, projeto_id, categoria_id,
      status, source_module, source_entity_type, source_entity_id
    ) VALUES (
      v_org, 'Manutenção mensal — ' || COALESCE(v_project_code, 'PRJ'),
      'recurrence', 'receita', v_net_fee, 'mensal',
      NEW.start_date, NEW.end_date, v_client_id, NEW.project_id, v_categoria_manutencao,
      'ativa', 'maintenance_contracts', 'maintenance_contract', NEW.id
    ) RETURNING id INTO v_recurrence_id;
    PERFORM public.generate_recurrence_installments(v_recurrence_id, 12);
  ELSE
    UPDATE public.financial_recurrences
       SET amount = v_net_fee, end_date = NEW.end_date,
           cliente_id = v_client_id, categoria_id = v_categoria_manutencao,
           projeto_id = NEW.project_id, updated_at = now()
     WHERE id = v_recurrence_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- REFACTOR vendas_gerar_parcelas --------------------------

CREATE OR REPLACE FUNCTION public.vendas_gerar_parcelas(p_venda_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_venda public.vendas%ROWTYPE;
  v_parcela_valor numeric;
  v_descricao text;
  v_project_code text;
  v_org uuid;
  v_recurrence_id uuid;
  v_count integer;
BEGIN
  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda % não encontrada', p_venda_id; END IF;

  IF EXISTS (SELECT 1 FROM public.movimentacoes WHERE source_module = 'vendas' AND source_entity_id = p_venda_id)
     OR EXISTS (SELECT 1 FROM public.financial_recurrences WHERE source_module = 'vendas' AND source_entity_id = p_venda_id) THEN
    RETURN 0;
  END IF;

  IF v_venda.tipo_venda = 'recorrente' THEN RETURN 0; END IF;

  SELECT id INTO v_org FROM public.organizations LIMIT 1;
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

  IF v_venda.quantidade_parcelas < 1 THEN RAISE EXCEPTION 'quantidade_parcelas deve ser >= 1'; END IF;
  v_parcela_valor := round((v_venda.valor_total / v_venda.quantidade_parcelas)::numeric, 2);
  v_descricao := COALESCE(v_venda.descricao, 'Venda ' || v_venda.numero || ' — ' || COALESCE(v_project_code, 'PRJ'));

  INSERT INTO public.financial_recurrences (
    organization_id, description, type, direction, amount, frequency,
    start_date, total_installments,
    cliente_id, projeto_id, categoria_id, centro_custo_id,
    conta_bancaria_id, meio_pagamento_id,
    status, source_module, source_entity_type, source_entity_id
  ) VALUES (
    v_org, v_descricao, 'installment', 'receita', v_parcela_valor, 'mensal',
    COALESCE(v_venda.data_primeira_parcela, v_venda.data_venda),
    v_venda.quantidade_parcelas,
    v_venda.cliente_id, v_venda.project_id, v_venda.categoria_id, v_venda.centro_custo_id,
    v_venda.conta_bancaria_id, v_venda.meio_pagamento_id,
    'ativa', 'vendas', 'venda', v_venda.id
  ) RETURNING id INTO v_recurrence_id;

  v_count := public.generate_recurrence_installments(v_recurrence_id, v_venda.quantidade_parcelas);
  RETURN v_count;
END;
$$;

-- ---------- REFACTOR close_deal_as_won ------------------------------

CREATE OR REPLACE FUNCTION public.close_deal_as_won(
  p_deal_id uuid, p_project_data jsonb DEFAULT '{}'::jsonb, p_installments jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_deal public.deals%ROWTYPE;
  v_project_id uuid; v_project_code text;
  v_first jsonb; v_total integer;
  v_project_name text; v_project_type public.project_type;
  v_start_date date; v_owner_actor_id uuid; v_scope text;
  v_amount numeric; v_first_due date;
  v_recurrence_id uuid;
  v_cliente_id uuid; v_company_name text;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal não encontrado'; END IF;
  IF v_deal.stage IN ('fechado_ganho', 'fechado_perdido') THEN RAISE EXCEPTION 'Deal já está fechado'; END IF;
  IF p_installments IS NULL OR jsonb_typeof(p_installments) <> 'array' OR jsonb_array_length(p_installments) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela';
  END IF;

  v_total := jsonb_array_length(p_installments);
  v_project_name := COALESCE(NULLIF(p_project_data->>'name', ''), v_deal.title);
  v_project_type := COALESCE(NULLIF(p_project_data->>'project_type', '')::public.project_type, v_deal.project_type);
  IF v_project_type IS NULL THEN RAISE EXCEPTION 'Tipo de projeto é obrigatório'; END IF;
  v_start_date := COALESCE(NULLIF(p_project_data->>'start_date', '')::date, CURRENT_DATE);
  v_owner_actor_id := COALESCE(NULLIF(p_project_data->>'owner_actor_id', '')::uuid, v_deal.owner_actor_id);
  v_scope := COALESCE(NULLIF(p_project_data->>'scope', ''), v_deal.scope_summary);

  INSERT INTO public.projects (
    organization_id, company_id, owner_actor_id, name, project_type, status,
    contract_value, installments_count, start_date, description, scope_in,
    business_context, created_by_actor_id
  ) VALUES (
    v_deal.organization_id, v_deal.company_id, v_owner_actor_id, v_project_name,
    v_project_type, 'aceito', COALESCE(v_deal.estimated_value, 0), v_total,
    v_start_date, v_scope, v_scope,
    'Projeto criado automaticamente a partir do CRM: ' || v_deal.code,
    v_owner_actor_id
  ) RETURNING id, code INTO v_project_id, v_project_code;

  SELECT COALESCE(c.trade_name, c.legal_name) INTO v_company_name
    FROM public.companies c WHERE c.id = v_deal.company_id;
  IF v_company_name IS NOT NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes
     WHERE LOWER(TRIM(nome)) = LOWER(TRIM(v_company_name)) LIMIT 1;
  END IF;

  v_first := p_installments->0;
  v_amount := NULLIF(v_first->>'amount', '')::numeric;
  v_first_due := NULLIF(v_first->>'due_date', '')::date;
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Valor inválido na primeira parcela'; END IF;
  IF v_first_due IS NULL THEN RAISE EXCEPTION 'Vencimento inválido na primeira parcela'; END IF;

  INSERT INTO public.financial_recurrences (
    organization_id, description, type, direction, amount, frequency,
    start_date, total_installments,
    cliente_id, projeto_id,
    status, source_module, source_entity_type, source_entity_id, created_by
  ) VALUES (
    v_deal.organization_id,
    'Parcelas — ' || v_project_name,
    CASE WHEN v_total > 1 THEN 'installment' ELSE 'recurrence' END,
    'receita', v_amount, 'mensal',
    v_first_due,
    CASE WHEN v_total > 1 THEN v_total ELSE NULL END,
    v_cliente_id, v_project_id,
    'ativa', 'crm', 'deal', p_deal_id, v_owner_actor_id
  ) RETURNING id INTO v_recurrence_id;

  PERFORM public.generate_recurrence_installments(v_recurrence_id, GREATEST(v_total, 12));

  UPDATE public.deals
     SET stage = 'fechado_ganho', probability_pct = 100, closed_at = now(),
         generated_project_id = v_project_id, updated_by = v_owner_actor_id
   WHERE id = p_deal_id;

  UPDATE public.companies
     SET relationship_status = 'active_client', updated_at = now()
   WHERE id = v_deal.company_id AND relationship_status <> 'active_client';

  RETURN jsonb_build_object(
    'project_id', v_project_id, 'project_code', v_project_code,
    'installments_created', v_total, 'recurrence_id', v_recurrence_id
  );
END;
$$;

-- ---------- cron_extend_recurrences ---------------------------------

CREATE OR REPLACE FUNCTION public.cron_extend_recurrences()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r record; v_total integer := 0; v_generated integer;
BEGIN
  FOR r IN
    SELECT id FROM public.financial_recurrences
     WHERE status = 'ativa' AND type = 'recurrence'
       AND end_date IS NULL AND deleted_at IS NULL
  LOOP
    v_generated := public.generate_recurrence_installments(r.id, 1);
    v_total := v_total + v_generated;
  END LOOP;
  RETURN v_total;
END;
$$;
