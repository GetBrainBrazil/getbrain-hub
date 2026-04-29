UPDATE public.deals SET stage = 'descoberta_marcada' WHERE stage = 'presencial_agendada';
UPDATE public.deals SET stage = 'descobrindo'        WHERE stage = 'presencial_feita';
UPDATE public.deals SET stage = 'proposta_na_mesa'   WHERE stage = 'orcamento_enviado';
UPDATE public.deals SET stage = 'ajustando'          WHERE stage = 'em_negociacao';
UPDATE public.deals SET stage = 'ganho'              WHERE stage = 'fechado_ganho';
UPDATE public.deals SET stage = 'perdido'            WHERE stage = 'fechado_perdido';

ALTER TABLE public.deals ALTER COLUMN stage SET DEFAULT 'descoberta_marcada'::deal_stage;

DROP FUNCTION IF EXISTS public.close_deal_as_won(uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.close_deal_as_won(
  p_deal_id uuid,
  p_project_data jsonb,
  p_installments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deal              public.deals%ROWTYPE;
  v_org_id            uuid;
  v_project_id        uuid;
  v_project_code      text;
  v_cliente_id        uuid;
  v_company_cnpj      text;
  v_company_legal     text;
  v_company_trade     text;
  v_categoria_id      uuid := NULLIF((p_project_data->>'categoria_id')::text, '')::uuid;
  v_centro_custo_id   uuid := NULLIF((p_project_data->>'centro_custo_id')::text, '')::uuid;
  v_conta_bancaria_id uuid := NULLIF((p_project_data->>'conta_bancaria_id')::text, '')::uuid;
  v_meio_pagamento_id uuid := NULLIF((p_project_data->>'meio_pagamento_id')::text, '')::uuid;
  v_mrr_value         numeric := NULLIF((p_project_data->>'mrr_value')::text, '')::numeric;
  v_mrr_start         date    := NULLIF((p_project_data->>'mrr_start_date')::text, '')::date;
  v_mrr_months        integer := NULLIF((p_project_data->>'mrr_duration_months')::text, '')::integer;
  v_mrr_disc_months   integer := NULLIF((p_project_data->>'mrr_discount_months')::text, '')::integer;
  v_mrr_disc_value    numeric := NULLIF((p_project_data->>'mrr_discount_value')::text, '')::numeric;
  v_inst              jsonb;
  v_extra             jsonb;
  v_dep               record;
  v_recurrence_id     uuid;
  v_notes_combined    text;
  v_existing_notes    text;
  v_project_type_v2   text[];
  v_scope_bullets     jsonb;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal % não encontrado', p_deal_id; END IF;
  IF v_deal.stage IN ('ganho','perdido','fechado_ganho','fechado_perdido') THEN
    RAISE EXCEPTION 'Deal já está fechado';
  END IF;

  v_org_id := v_deal.organization_id;

  SELECT cnpj, legal_name, trade_name
    INTO v_company_cnpj, v_company_legal, v_company_trade
    FROM public.companies WHERE id = v_deal.company_id;

  IF v_company_cnpj IS NOT NULL AND length(trim(v_company_cnpj)) > 0 THEN
    SELECT id INTO v_cliente_id FROM public.clientes
      WHERE cpf_cnpj = v_company_cnpj LIMIT 1;
  END IF;
  IF v_cliente_id IS NULL THEN
    INSERT INTO public.clientes (nome, razao_social, nome_empresa, cpf_cnpj, tipo_pessoa, ativo)
    VALUES (
      COALESCE(v_company_trade, v_company_legal),
      v_company_legal,
      COALESCE(v_company_trade, v_company_legal),
      v_company_cnpj,
      'PJ',
      true
    )
    RETURNING id INTO v_cliente_id;
  END IF;

  v_project_type_v2 := COALESCE(v_deal.project_type_v2, '{}'::text[]);
  v_scope_bullets   := COALESCE(v_deal.scope_bullets, '[]'::jsonb);

  v_existing_notes := COALESCE(v_deal.notes, '');
  IF length(trim(v_existing_notes)) > 0 THEN
    v_notes_combined := v_existing_notes || E'\n\n— Importado do deal ' || v_deal.code;
  ELSE
    v_notes_combined := NULL;
  END IF;

  INSERT INTO public.projects (
    organization_id, code, name, status, project_type, project_type_v2,
    scope_in, scope_out, scope_bullets, business_context,
    company_id, owner_actor_id, source_deal_id, origin_lead_id,
    mrr_value, notes,
    estimated_hours_total, estimated_complexity,
    commercial_context
  ) VALUES (
    v_org_id,
    'PRJ-' || lpad(nextval('project_code_seq')::text, 4, '0'),
    COALESCE(p_project_data->>'name', v_deal.title),
    'planning',
    v_deal.project_type,
    v_project_type_v2,
    v_deal.scope_in, v_deal.scope_out, v_scope_bullets, v_deal.business_context,
    v_deal.company_id, v_deal.owner_actor_id, v_deal.id, v_deal.origin_lead_id,
    v_mrr_value, v_notes_combined,
    v_deal.estimated_hours_total, v_deal.estimated_complexity,
    jsonb_build_object(
      'pain_description',     v_deal.pain_description,
      'pain_categories',      v_deal.pain_categories,
      'pain_cost_brl_monthly',v_deal.pain_cost_brl_monthly,
      'pain_hours_monthly',   v_deal.pain_hours_monthly,
      'current_solution',     v_deal.current_solution,
      'competitors',          v_deal.competitors,
      'decision_makers',      v_deal.decision_makers,
      'pricing_rationale',    v_deal.pricing_rationale,
      'budget_range_min',     v_deal.budget_range_min,
      'budget_range_max',     v_deal.budget_range_max,
      'desired_start_date',   v_deal.desired_start_date,
      'desired_delivery_date',v_deal.desired_delivery_date,
      'estimation_confidence',v_deal.estimation_confidence,
      'deliverables',         v_deal.deliverables,
      'premises',             v_deal.premises,
      'identified_risks',     v_deal.identified_risks,
      'technical_stack',      v_deal.technical_stack,
      'acceptance_criteria',  v_deal.acceptance_criteria
    )
  )
  RETURNING id, code INTO v_project_id, v_project_code;

  UPDATE public.anexos SET projeto_id = v_project_id
   WHERE deal_id = v_deal.id AND projeto_id IS NULL;

  FOR v_dep IN
    SELECT * FROM public.deal_dependencies
     WHERE deal_id = v_deal.id AND deleted_at IS NULL
  LOOP
    INSERT INTO public.tasks (
      organization_id, project_id, title, description, status, priority, due_date
    ) VALUES (
      v_org_id, v_project_id,
      'Dependência: ' || COALESCE(v_dep.description, v_dep.dependency_type::text),
      COALESCE(v_dep.notes, ''),
      'todo',
      CASE v_dep.priority
        WHEN 'critica' THEN 'urgent'
        WHEN 'alta'    THEN 'high'
        WHEN 'media'   THEN 'medium'
        ELSE 'low'
      END,
      v_dep.agreed_deadline
    );
  END LOOP;

  FOR v_inst IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
    INSERT INTO public.financial_recurrences (
      organization_id, type, direction, description, amount,
      frequency, start_date, total_installments,
      cliente_id, projeto_id,
      categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      source_module, source_entity_type, source_entity_id, status
    ) VALUES (
      v_org_id, 'parcelado', 'entrada',
      COALESCE(v_inst->>'description', 'Implementação ' || v_project_code),
      (v_inst->>'amount')::numeric,
      'monthly',
      COALESCE((v_inst->>'date')::date, CURRENT_DATE),
      1,
      v_cliente_id, v_project_id,
      v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
      'crm', 'deal', v_deal.id, 'ativa'
    );
  END LOOP;

  IF v_mrr_value IS NOT NULL AND v_mrr_value > 0 THEN
    INSERT INTO public.financial_recurrences (
      organization_id, type, direction, description, amount,
      frequency, start_date,
      total_installments,
      cliente_id, projeto_id,
      categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      source_module, source_entity_type, source_entity_id, status
    ) VALUES (
      v_org_id, 'recorrente', 'entrada',
      'MRR ' || v_project_code,
      v_mrr_value,
      'monthly',
      COALESCE(v_mrr_start, CURRENT_DATE),
      v_mrr_months,
      v_cliente_id, v_project_id,
      v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
      'crm', 'deal', v_deal.id, 'ativa'
    ) RETURNING id INTO v_recurrence_id;

    INSERT INTO public.maintenance_contracts (
      organization_id, project_id, monthly_fee,
      monthly_fee_discount_percent, discount_duration_months,
      start_date, status
    ) VALUES (
      v_org_id, v_project_id, v_mrr_value,
      COALESCE(v_mrr_disc_value, 0), v_mrr_disc_months,
      COALESCE(v_mrr_start, CURRENT_DATE), 'active'
    );
  END IF;

  FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(v_deal.extra_costs, '[]'::jsonb)) LOOP
    INSERT INTO public.financial_recurrences (
      organization_id, type, direction, description, amount,
      frequency, start_date,
      cliente_id, projeto_id,
      source_module, source_entity_type, source_entity_id, status
    ) VALUES (
      v_org_id,
      CASE WHEN v_extra->>'recurrence' = 'once' THEN 'unica' ELSE 'recorrente' END,
      'saida',
      COALESCE(v_extra->>'description', 'Custo extra'),
      (v_extra->>'amount')::numeric,
      CASE v_extra->>'recurrence'
        WHEN 'monthly' THEN 'monthly'
        WHEN 'yearly'  THEN 'yearly'
        ELSE 'monthly'
      END,
      CURRENT_DATE,
      v_cliente_id, v_project_id,
      'crm', 'deal', v_deal.id, 'ativa'
    );
  END LOOP;

  UPDATE public.deals
     SET stage = 'ganho', probability_pct = 100, closed_at = now(),
         stage_changed_at = now(), generated_project_id = v_project_id, updated_at = now()
   WHERE id = v_deal.id;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'project_code', v_project_code,
    'cliente_id', v_cliente_id
  );
END;
$function$;