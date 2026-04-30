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
  v_company_cnpj      text;
  v_company_legal     text;
  v_company_trade     text;
  v_cliente_id        uuid;
  v_categoria_id      uuid    := NULLIF(p_project_data->>'categoria_id','')::uuid;
  v_centro_custo_id   uuid    := NULLIF(p_project_data->>'centro_custo_id','')::uuid;
  v_conta_bancaria_id uuid    := NULLIF(p_project_data->>'conta_bancaria_id','')::uuid;
  v_meio_pagamento_id uuid    := NULLIF(p_project_data->>'meio_pagamento_id','')::uuid;
  v_mrr_value         numeric := NULLIF((p_project_data->>'mrr_value')::text, '')::numeric;
  v_mrr_months        integer := NULLIF((p_project_data->>'mrr_months')::text, '')::integer;
  v_mrr_start         date    := NULLIF((p_project_data->>'mrr_start_date')::text, '')::date;
  v_mrr_disc_value    numeric := NULLIF((p_project_data->>'mrr_discount_value')::text,'')::numeric;
  v_mrr_disc_months   integer := NULLIF((p_project_data->>'mrr_discount_months')::text,'')::integer;
  v_mrr_disc_kind     text    := NULLIF(p_project_data->>'mrr_discount_kind','');
  v_mrr_disc_date     date    := NULLIF((p_project_data->>'mrr_discount_until_date')::text,'')::date;
  v_mrr_disc_stage    public.project_status := NULLIF(p_project_data->>'mrr_discount_until_stage','')::public.project_status;
  v_mrr_trigger       text    := NULLIF(p_project_data->>'mrr_start_trigger','');
  v_inst              jsonb;
  v_dep               public.deal_dependencies%ROWTYPE;
  v_notes_combined    text;
  v_existing_notes    text;
  v_project_type_v2   text[];
  v_scope_bullets     jsonb;
  v_mrr_amount_now    numeric;
  v_disc_active       boolean := false;
  v_mrr_status        text;
  v_project_type      public.project_type;
  v_first_type_slug   text;
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
      v_company_cnpj, 'PJ', true
    )
    RETURNING id INTO v_cliente_id;
  END IF;

  v_project_type_v2 := COALESCE(v_deal.project_type_v2, '{}'::text[]);
  v_scope_bullets   := COALESCE(v_deal.scope_bullets, '[]'::jsonb);

  v_project_type := v_deal.project_type;
  IF v_project_type IS NULL AND array_length(v_project_type_v2, 1) > 0 THEN
    v_first_type_slug := v_project_type_v2[1];
    BEGIN
      v_project_type := v_first_type_slug::public.project_type;
    EXCEPTION WHEN OTHERS THEN
      v_project_type := NULL;
    END;
  END IF;
  IF v_project_type IS NULL THEN
    v_project_type := 'sistema_personalizado'::public.project_type;
  END IF;

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
    estimated_hours_baseline, complexity_baseline,
    commercial_context
  ) VALUES (
    v_org_id,
    'PRJ-' || lpad(nextval('project_code_seq')::text, 4, '0'),
    COALESCE(p_project_data->>'name', v_deal.title),
    'aceito',
    v_project_type,
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
      'acceptance_criteria',  v_deal.acceptance_criteria,
      'mrr_start_trigger',    v_mrr_trigger,
      'mrr_discount_kind',    v_mrr_disc_kind,
      'mrr_discount_until_date',  v_mrr_disc_date,
      'mrr_discount_until_stage', v_mrr_disc_stage
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

  -- Parcelas de implementação (type='installment', direction='receita', frequency='mensal')
  FOR v_inst IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
    INSERT INTO public.financial_recurrences (
      organization_id, type, direction, description, amount,
      frequency, start_date, total_installments,
      cliente_id, projeto_id,
      categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      source_module, source_entity_type, source_entity_id, status
    ) VALUES (
      v_org_id, 'installment', 'receita',
      COALESCE(v_inst->>'description', 'Implementação ' || v_project_code),
      (v_inst->>'amount')::numeric,
      'mensal',
      COALESCE(NULLIF(v_inst->>'due_date','')::date, NULLIF(v_inst->>'date','')::date, CURRENT_DATE),
      1,
      v_cliente_id, v_project_id,
      v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
      'crm', 'deal', v_deal.id, 'ativa'
    );
  END LOOP;

  -- MRR (type='recurrence', direction='receita', frequency='mensal')
  IF v_mrr_value IS NOT NULL AND v_mrr_value > 0 THEN
    v_disc_active := (v_mrr_disc_value IS NOT NULL AND v_mrr_disc_value > 0
                      AND v_mrr_disc_value < v_mrr_value);
    v_mrr_amount_now := CASE WHEN v_disc_active THEN v_mrr_disc_value ELSE v_mrr_value END;

    v_mrr_status := CASE WHEN v_mrr_trigger = 'on_delivery' THEN 'pausada' ELSE 'ativa' END;

    INSERT INTO public.financial_recurrences (
      organization_id, type, direction, description, amount,
      frequency, start_date, total_installments,
      cliente_id, projeto_id,
      categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      source_module, source_entity_type, source_entity_id, status,
      discount_active, discount_kind, discount_value, discount_full_amount,
      discount_months, discount_until_date, discount_until_stage, discount_started_at
    ) VALUES (
      v_org_id, 'recurrence', 'receita',
      'MRR ' || v_project_code,
      v_mrr_amount_now,
      'mensal',
      COALESCE(v_mrr_start, CURRENT_DATE),
      v_mrr_months,
      v_cliente_id, v_project_id,
      v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
      'crm', 'deal', v_deal.id, v_mrr_status,
      v_disc_active,
      CASE WHEN v_disc_active THEN COALESCE(v_mrr_disc_kind, 'months') ELSE NULL END,
      CASE WHEN v_disc_active THEN v_mrr_disc_value ELSE NULL END,
      CASE WHEN v_disc_active THEN v_mrr_value ELSE NULL END,
      CASE WHEN v_disc_active THEN v_mrr_disc_months ELSE NULL END,
      CASE WHEN v_disc_active THEN v_mrr_disc_date ELSE NULL END,
      CASE WHEN v_disc_active THEN v_mrr_disc_stage ELSE NULL END,
      CASE WHEN v_disc_active THEN COALESCE(v_mrr_start, CURRENT_DATE) ELSE NULL END
    );
  END IF;

  UPDATE public.deals
     SET stage = 'ganho',
         closed_at = now(),
         generated_project_id = v_project_id,
         updated_at = now()
   WHERE id = p_deal_id;

  RETURN jsonb_build_object('project_id', v_project_id, 'project_code', v_project_code);
END;
$function$;