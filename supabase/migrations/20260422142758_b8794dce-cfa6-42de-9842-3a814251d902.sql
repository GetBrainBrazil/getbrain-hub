-- Função que sincroniza parcelas mensais em movimentacoes a partir de um maintenance_contract
CREATE OR REPLACE FUNCTION public.sync_maintenance_contract_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code text;
  v_client_id uuid;
  v_net_fee numeric;
  v_start date;
  v_end date;
  v_cursor date;
  v_today date := CURRENT_DATE;
  v_months_ahead int := 12;
  v_competencia date;
  v_descricao text;
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

  -- Buscar dados do projeto (code + cliente via projetos legacy se houver)
  SELECT p.code INTO v_project_code FROM public.projects p WHERE p.id = NEW.project_id;

  -- Tentar resolver cliente_id via projetos legacy (mesma id) -> clientes
  SELECT pj.cliente_id INTO v_client_id FROM public.projetos pj WHERE pj.id = NEW.project_id;

  v_net_fee := NEW.monthly_fee * (1 - COALESCE(NEW.monthly_fee_discount_percent, 0) / 100.0);
  v_start := GREATEST(NEW.start_date, date_trunc('month', v_today)::date);

  IF NEW.end_date IS NOT NULL THEN
    v_end := NEW.end_date;
  ELSE
    v_end := (date_trunc('month', v_today) + (v_months_ahead || ' months')::interval - interval '1 day')::date;
  END IF;

  v_cursor := v_start;
  WHILE v_cursor <= v_end LOOP
    v_competencia := date_trunc('month', v_cursor)::date;
    v_descricao := 'Manutenção mensal — ' || COALESCE(v_project_code, 'PRJ') || ' — ' || to_char(v_competencia, 'MM/YYYY');

    -- Evita duplicar se já existe parcela pendente nessa competência
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
        cliente_id, projeto_id,
        recorrente, frequencia_recorrencia,
        is_automatic, source_module, source_entity_type, source_entity_id
      ) VALUES (
        'receita', 'pendente', v_descricao, v_net_fee,
        v_cursor, v_competencia,
        v_client_id, NEW.project_id,
        true, 'mensal',
        true, 'maintenance_contracts', 'maintenance_contract', NEW.id
      );
    END IF;

    -- Próximo mês, mesmo dia (clamp natural pelo Postgres)
    v_cursor := (v_cursor + interval '1 month')::date;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintenance_contract_recurrence_sync ON public.maintenance_contracts;

CREATE TRIGGER maintenance_contract_recurrence_sync
AFTER INSERT OR UPDATE OF status, monthly_fee, monthly_fee_discount_percent, start_date, end_date, deleted_at
ON public.maintenance_contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_maintenance_contract_recurrence();