CREATE OR REPLACE FUNCTION public.sync_maintenance_contract_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code text;
  v_client_id uuid;
  v_company_name text;
  v_net_fee numeric;
  v_start date;
  v_end date;
  v_cursor date;
  v_today date := CURRENT_DATE;
  v_year_end date := (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date;
  v_competencia date;
  v_descricao text;
  v_categoria_manutencao uuid := 'fd3b23be-1101-4122-83d1-6b559c64c04b'::uuid;
BEGIN
  -- Cancelar parcelas futuras pendentes desse contrato (nunca tocar pagas)
  UPDATE public.movimentacoes
  SET status = 'cancelado', updated_at = now()
  WHERE source_module = 'maintenance_contracts'
    AND source_entity_id = NEW.id
    AND status = 'pendente'
    AND data_vencimento >= date_trunc('month', v_today)::date;

  -- Se contrato não está ativo, paramos aqui
  IF NEW.status <> 'active' OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Código do projeto (para descrição)
  SELECT p.code INTO v_project_code FROM public.projects p WHERE p.id = NEW.project_id;

  -- 1ª tentativa: cliente_id via projetos legacy
  SELECT pj.cliente_id INTO v_client_id FROM public.projetos pj WHERE pj.id = NEW.project_id;

  -- 2ª tentativa: resolver via companies → clientes (match por nome)
  IF v_client_id IS NULL THEN
    SELECT COALESCE(c.trade_name, c.legal_name) INTO v_company_name
    FROM public.projects p
    JOIN public.companies c ON c.id = p.company_id
    WHERE p.id = NEW.project_id;

    IF v_company_name IS NOT NULL THEN
      SELECT cl.id INTO v_client_id
      FROM public.clientes cl
      WHERE LOWER(TRIM(cl.nome)) = LOWER(TRIM(v_company_name))
      LIMIT 1;
    END IF;
  END IF;

  v_net_fee := NEW.monthly_fee * (1 - COALESCE(NEW.monthly_fee_discount_percent, 0) / 100.0);
  v_start := GREATEST(NEW.start_date, date_trunc('month', v_today)::date);

  -- Limite de geração: end_date do contrato OU fim do ano corrente, o que vier primeiro
  IF NEW.end_date IS NOT NULL THEN
    v_end := LEAST(NEW.end_date, v_year_end);
  ELSE
    v_end := v_year_end;
  END IF;

  v_cursor := v_start;
  WHILE v_cursor <= v_end LOOP
    v_competencia := date_trunc('month', v_cursor)::date;
    v_descricao := 'Manutenção mensal — ' || COALESCE(v_project_code, 'PRJ') || ' — ' || to_char(v_competencia, 'MM/YYYY');

    IF NOT EXISTS (
      SELECT 1 FROM public.movimentacoes
      WHERE source_module = 'maintenance_contracts'
        AND source_entity_id = NEW.id
        AND data_competencia = v_competencia
        AND status IN ('pendente','pago')
    ) THEN
      INSERT INTO public.movimentacoes (
        tipo, status, descricao, valor_previsto,
        data_vencimento, data_competencia,
        cliente_id, projeto_id, categoria_id,
        recorrente, frequencia_recorrencia,
        is_automatic, source_module, source_entity_type, source_entity_id
      ) VALUES (
        'receita', 'pendente', v_descricao, v_net_fee,
        v_cursor, v_competencia,
        v_client_id, NEW.project_id, v_categoria_manutencao,
        true, 'mensal',
        true, 'maintenance_contracts', 'maintenance_contract', NEW.id
      );
    END IF;

    v_cursor := (v_cursor + interval '1 month')::date;
  END LOOP;

  RETURN NEW;
END;
$$;