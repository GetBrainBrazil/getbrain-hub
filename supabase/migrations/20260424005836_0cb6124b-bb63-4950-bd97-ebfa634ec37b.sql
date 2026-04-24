CREATE OR REPLACE FUNCTION public.convert_lead_to_deal(p_lead_id uuid, p_deal_data jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_deal_id uuid;
  v_stage public.deal_stage := COALESCE((p_deal_data->>'stage')::public.deal_stage, 'presencial_agendada');
  v_probability integer := COALESCE((p_deal_data->>'probability_pct')::integer,
    CASE v_stage
      WHEN 'presencial_agendada' THEN 20
      WHEN 'presencial_feita' THEN 40
      WHEN 'orcamento_enviado' THEN 60
      WHEN 'em_negociacao' THEN 75
      WHEN 'fechado_ganho' THEN 100
      WHEN 'fechado_perdido' THEN 0
      ELSE 20
    END
  );
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;
  IF v_lead.status <> 'triagem_feita' THEN
    RAISE EXCEPTION 'Lead precisa estar com triagem feita para conversão';
  END IF;

  INSERT INTO public.deals (
    organization_id, title, company_id, contact_person_id, owner_actor_id,
    origin_lead_id, stage, estimated_value, probability_pct, expected_close_date,
    project_type, scope_summary, notes, created_by
  ) VALUES (
    v_lead.organization_id,
    COALESCE(NULLIF(p_deal_data->>'title', ''), v_lead.title),
    v_lead.company_id,
    v_lead.contact_person_id,
    COALESCE(NULLIF(p_deal_data->>'owner_actor_id', '')::uuid, v_lead.owner_actor_id),
    v_lead.id,
    v_stage,
    COALESCE(NULLIF(p_deal_data->>'estimated_value', '')::numeric, v_lead.estimated_value),
    v_probability,
    NULLIF(p_deal_data->>'expected_close_date', '')::date,
    NULLIF(p_deal_data->>'project_type', '')::public.project_type,
    COALESCE(NULLIF(p_deal_data->>'scope_summary', ''), v_lead.pain_description),
    NULLIF(p_deal_data->>'notes', ''),
    COALESCE(NULLIF(p_deal_data->>'owner_actor_id', '')::uuid, v_lead.owner_actor_id)
  ) RETURNING id INTO v_deal_id;

  UPDATE public.deal_activities
  SET deal_id = v_deal_id,
      lead_id = NULL,
      updated_at = now()
  WHERE lead_id = v_lead.id
    AND deleted_at IS NULL;

  UPDATE public.leads
  SET status = 'convertido',
      converted_to_deal_id = v_deal_id,
      converted_at = now(),
      updated_by = COALESCE(NULLIF(p_deal_data->>'owner_actor_id', '')::uuid, v_lead.owner_actor_id)
  WHERE id = v_lead.id;

  UPDATE public.companies
  SET relationship_status = 'lead', updated_at = now()
  WHERE id = v_lead.company_id
    AND relationship_status = 'prospect';

  RETURN v_deal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_deal_as_won(
  p_deal_id uuid,
  p_project_data jsonb DEFAULT '{}'::jsonb,
  p_installments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deal public.deals%ROWTYPE;
  v_project_id uuid;
  v_project_code text;
  v_installment jsonb;
  v_i integer := 1;
  v_total integer;
  v_project_name text;
  v_project_type public.project_type;
  v_start_date date;
  v_owner_actor_id uuid;
  v_scope text;
  v_amount numeric;
  v_due_date date;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal não encontrado';
  END IF;
  IF v_deal.stage IN ('fechado_ganho', 'fechado_perdido') THEN
    RAISE EXCEPTION 'Deal já está fechado';
  END IF;
  IF p_installments IS NULL OR jsonb_typeof(p_installments) <> 'array' OR jsonb_array_length(p_installments) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela';
  END IF;

  v_total := jsonb_array_length(p_installments);
  v_project_name := COALESCE(NULLIF(p_project_data->>'name', ''), v_deal.title);
  v_project_type := COALESCE(NULLIF(p_project_data->>'project_type', '')::public.project_type, v_deal.project_type);
  IF v_project_type IS NULL THEN
    RAISE EXCEPTION 'Tipo de projeto é obrigatório';
  END IF;
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

  FOR v_installment IN SELECT * FROM jsonb_array_elements(p_installments)
  LOOP
    v_amount := NULLIF(v_installment->>'amount', '')::numeric;
    v_due_date := NULLIF(v_installment->>'due_date', '')::date;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Valor inválido na parcela %', v_i;
    END IF;
    IF v_due_date IS NULL THEN
      RAISE EXCEPTION 'Vencimento inválido na parcela %', v_i;
    END IF;

    INSERT INTO public.movimentacoes (
      tipo, status, descricao, valor_previsto, valor_realizado,
      data_vencimento, data_competencia, cliente_id, projeto_id,
      source_module, source_entity_type, source_entity_id, is_automatic
    ) VALUES (
      'receita', 'pendente',
      'Parcela ' || v_i || '/' || v_total || ' — ' || v_project_name,
      v_amount, 0, v_due_date, date_trunc('month', v_due_date)::date,
      NULL, v_project_id, 'crm', 'deal', p_deal_id, true
    );
    v_i := v_i + 1;
  END LOOP;

  UPDATE public.deals
  SET stage = 'fechado_ganho',
      probability_pct = 100,
      closed_at = now(),
      generated_project_id = v_project_id,
      updated_by = v_owner_actor_id
  WHERE id = p_deal_id;

  UPDATE public.companies
  SET relationship_status = 'active_client', updated_at = now()
  WHERE id = v_deal.company_id
    AND relationship_status <> 'active_client';

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'project_code', v_project_code,
    'installments_created', v_total
  );
END;
$$;