-- 1) Novos campos em projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS mrr_value         numeric,
  ADD COLUMN IF NOT EXISTS origin_lead_id    uuid,
  ADD COLUMN IF NOT EXISTS project_type_v2   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope_bullets     jsonb  NOT NULL DEFAULT '[]'::jsonb;

-- 2) Drop versão anterior
DROP FUNCTION IF EXISTS public.close_deal_as_won(uuid, jsonb, jsonb);

-- 3) v5
CREATE OR REPLACE FUNCTION public.close_deal_as_won(
  p_deal_id      uuid,
  p_project_data jsonb DEFAULT '{}'::jsonb,
  p_installments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deal               public.deals%ROWTYPE;
  v_company            public.companies%ROWTYPE;
  v_project_id         uuid;
  v_project_code       text;
  v_first              jsonb;
  v_total              integer;
  v_project_name       text;
  v_project_type       public.project_type;
  v_start_date         date;
  v_owner_actor_id     uuid;
  v_scope              text;
  v_amount             numeric;
  v_first_due          date;
  v_recurrence_id      uuid;
  v_mrr_recurrence_id  uuid;
  v_cliente_id         uuid;
  v_company_name       text;
  v_dep                RECORD;
  v_mapped_type        public.project_dependency_type;
  v_mapped_status      public.project_dependency_status;
  v_requested_from     text;
  v_dep_description    text;
  v_estimated_delivery date;
  v_proposals_linked   integer := 0;
  v_anexos_moved       integer := 0;
  v_origin_lead_source_id uuid;
  v_commercial_context jsonb;
  v_categoria_id       uuid;
  v_centro_custo_id    uuid;
  v_conta_bancaria_id  uuid;
  v_meio_pagamento_id  uuid;
  v_primary_contact_id uuid;
  v_lead_source_text   text;
  v_implementation_total numeric := 0;
  v_combined_notes     text;
  v_mrr_value          numeric;
  v_mrr_start          date;
  v_mrr_duration       integer;
  v_mrr_discount_months integer;
  v_mrr_discount_value numeric;
  v_mrr_count          integer := 0;
  v_extra_costs        jsonb;
  v_extra              jsonb;
  v_extras_recurring   integer := 0;
  v_extras_once        integer := 0;
  v_extra_rec_id       uuid;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal não encontrado'; END IF;
  IF v_deal.stage IN ('fechado_ganho','fechado_perdido') THEN RAISE EXCEPTION 'Deal já está fechado'; END IF;
  IF p_installments IS NULL OR jsonb_typeof(p_installments) <> 'array' OR jsonb_array_length(p_installments) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela';
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = v_deal.company_id;

  v_total := jsonb_array_length(p_installments);
  v_project_name := COALESCE(NULLIF(p_project_data->>'name',''), v_deal.title);
  v_project_type := COALESCE(NULLIF(p_project_data->>'project_type','')::public.project_type, v_deal.project_type);
  IF v_project_type IS NULL THEN RAISE EXCEPTION 'Tipo de projeto é obrigatório'; END IF;
  v_start_date := COALESCE(NULLIF(p_project_data->>'start_date','')::date, v_deal.desired_start_date, CURRENT_DATE);
  v_owner_actor_id := COALESCE(NULLIF(p_project_data->>'owner_actor_id','')::uuid, v_deal.owner_actor_id);
  v_scope := COALESCE(NULLIF(p_project_data->>'scope',''), v_deal.scope_summary);
  v_estimated_delivery := COALESCE(NULLIF(p_project_data->>'estimated_delivery_date','')::date, v_deal.desired_delivery_date);

  v_categoria_id      := NULLIF(p_project_data->>'categoria_id','')::uuid;
  v_centro_custo_id   := NULLIF(p_project_data->>'centro_custo_id','')::uuid;
  v_conta_bancaria_id := NULLIF(p_project_data->>'conta_bancaria_id','')::uuid;
  v_meio_pagamento_id := NULLIF(p_project_data->>'meio_pagamento_id','')::uuid;

  v_origin_lead_source_id := NULLIF(p_project_data->>'origin_lead_source_id','')::uuid;
  IF v_origin_lead_source_id IS NULL AND v_deal.origin_lead_id IS NOT NULL THEN
    SELECT source INTO v_lead_source_text FROM public.leads WHERE id = v_deal.origin_lead_id;
    IF v_lead_source_text IS NOT NULL THEN
      SELECT id INTO v_origin_lead_source_id FROM public.crm_lead_sources
       WHERE LOWER(slug) = LOWER(v_lead_source_text) OR LOWER(name) = LOWER(v_lead_source_text) LIMIT 1;
    END IF;
  END IF;

  v_primary_contact_id := COALESCE(NULLIF(p_project_data->>'primary_contact_person_id','')::uuid, v_deal.contact_person_id);

  v_commercial_context := jsonb_strip_nulls(jsonb_build_object(
    'pain_description',       v_deal.pain_description,
    'pain_category',          v_deal.pain_category,
    'pain_categories',        to_jsonb(v_deal.pain_categories),
    'pain_cost_brl_monthly',  v_deal.pain_cost_brl_monthly,
    'pain_hours_monthly',     v_deal.pain_hours_monthly,
    'current_solution',       v_deal.current_solution,
    'competitors',            v_deal.competitors,
    'decision_makers',        v_deal.decision_makers,
    'pricing_rationale',      v_deal.pricing_rationale,
    'budget_range_min',       v_deal.budget_range_min,
    'budget_range_max',       v_deal.budget_range_max,
    'estimation_confidence',  v_deal.estimation_confidence,
    'next_step',              v_deal.next_step,
    'next_step_date',         v_deal.next_step_date,
    'discount_amount',        v_deal.discount_amount,
    'discount_kind',          v_deal.discount_kind,
    'discount_valid_until',   v_deal.discount_valid_until,
    'discount_notes',         v_deal.discount_notes,
    'extra_costs',            v_deal.extra_costs
  ));

  SELECT COALESCE(SUM((i->>'amount')::numeric), 0) INTO v_implementation_total
    FROM jsonb_array_elements(p_installments) AS i;

  -- Notas combinadas: deal.notes + referência do código do deal
  v_combined_notes := NULLIF(TRIM(COALESCE(v_deal.notes, '')), '');
  IF v_combined_notes IS NOT NULL THEN
    v_combined_notes := v_combined_notes || E'\n\n— originado do deal ' || v_deal.code;
  END IF;

  INSERT INTO public.projects (
    organization_id, company_id, owner_actor_id, name, project_type, status,
    contract_value, installments_count, start_date, estimated_delivery_date,
    description, scope_in, scope_out, business_context,
    acceptance_criteria, deliverables, premises, identified_risks, technical_stack,
    estimated_hours_baseline, complexity_baseline, source_deal_id,
    organograma_url, mockup_url, mockup_screenshots,
    primary_contact_person_id, origin_lead_source_id, commercial_context,
    notes, origin_lead_id, project_type_v2, scope_bullets,
    created_by_actor_id
  ) VALUES (
    v_deal.organization_id, v_deal.company_id, v_owner_actor_id, v_project_name,
    v_project_type, 'aceito', v_implementation_total, v_total,
    v_start_date, v_estimated_delivery,
    COALESCE(v_scope, 'Projeto criado automaticamente a partir do CRM: ' || v_deal.code),
    COALESCE(v_deal.scope_in, v_scope), v_deal.scope_out, v_deal.business_context,
    COALESCE(v_deal.acceptance_criteria, '[]'::jsonb),
    COALESCE(v_deal.deliverables, '{}'::text[]),
    COALESCE(v_deal.premises, '{}'::text[]),
    COALESCE(v_deal.identified_risks, '{}'::text[]),
    COALESCE(v_deal.technical_stack, '{}'::text[]),
    v_deal.estimated_hours_total, v_deal.estimated_complexity, p_deal_id,
    v_deal.organograma_url, v_deal.mockup_url, COALESCE(v_deal.mockup_screenshots, '{}'::text[]),
    v_primary_contact_id, v_origin_lead_source_id, COALESCE(v_commercial_context, '{}'::jsonb),
    v_combined_notes,
    v_deal.origin_lead_id,
    COALESCE(v_deal.project_type_v2, '{}'::text[]),
    COALESCE(v_deal.scope_bullets, '[]'::jsonb),
    v_owner_actor_id
  ) RETURNING id, code INTO v_project_id, v_project_code;

  IF v_primary_contact_id IS NOT NULL THEN
    UPDATE public.company_people SET is_primary_contact = true
     WHERE company_id = v_deal.company_id AND person_id = v_primary_contact_id;
  END IF;

  -- Dependências
  FOR v_dep IN SELECT * FROM public.deal_dependencies WHERE deal_id = p_deal_id AND deleted_at IS NULL
  LOOP
    v_mapped_type := CASE v_dep.dependency_type
      WHEN 'acesso_sistema'    THEN 'acesso_api'::public.project_dependency_type
      WHEN 'dado'              THEN 'dados_cliente'::public.project_dependency_type
      WHEN 'pessoa'            THEN 'outro'::public.project_dependency_type
      WHEN 'hardware'          THEN 'infraestrutura'::public.project_dependency_type
      WHEN 'autorizacao_legal' THEN 'aprovacao'::public.project_dependency_type
      ELSE                          'outro'::public.project_dependency_type
    END;
    v_mapped_status := CASE v_dep.status
      WHEN 'aguardando_combinar' THEN 'pendente'::public.project_dependency_status
      WHEN 'combinado'           THEN 'solicitado'::public.project_dependency_status
      WHEN 'liberado'            THEN 'recebido'::public.project_dependency_status
      WHEN 'atrasado'            THEN 'atrasado'::public.project_dependency_status
    END;
    v_requested_from := CASE
      WHEN v_dep.responsible_person_name IS NOT NULL AND v_dep.responsible_person_role IS NOT NULL
        THEN v_dep.responsible_person_name || ' (' || v_dep.responsible_person_role || ')'
      ELSE v_dep.responsible_person_name
    END;
    v_dep_description := v_dep.description;
    IF v_dep.notes IS NOT NULL AND LENGTH(TRIM(v_dep.notes)) > 0 THEN
      v_dep_description := v_dep_description || E'\n\nNotas do deal: ' || v_dep.notes;
    END IF;
    INSERT INTO public.project_dependencies (
      organization_id, project_id, title, description,
      dependency_type, status, requested_from, expected_at,
      source_deal_dependency_id, created_by_actor_id
    ) VALUES (
      v_deal.organization_id, v_project_id, LEFT(v_dep.description, 80), v_dep_description,
      v_mapped_type, v_mapped_status, v_requested_from, v_dep.agreed_deadline, v_dep.id, v_owner_actor_id
    );
  END LOOP;

  -- Cliente (CNPJ → nome → criar)
  v_company_name := COALESCE(v_company.trade_name, v_company.legal_name);
  IF v_company.cnpj IS NOT NULL AND LENGTH(TRIM(v_company.cnpj)) > 0 THEN
    SELECT id INTO v_cliente_id FROM public.clientes
     WHERE REGEXP_REPLACE(COALESCE(cpf_cnpj,''),'[^0-9]','','g') = REGEXP_REPLACE(v_company.cnpj,'[^0-9]','','g')
       AND COALESCE(ativo, true) = true LIMIT 1;
  END IF;
  IF v_cliente_id IS NULL AND v_company_name IS NOT NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(TRIM(nome)) = LOWER(TRIM(v_company_name)) LIMIT 1;
  END IF;
  IF v_cliente_id IS NULL AND v_company_name IS NOT NULL THEN
    INSERT INTO public.clientes (nome, razao_social, cpf_cnpj, tipo_pessoa, ativo)
    VALUES (v_company_name, v_company.legal_name, v_company.cnpj, 'PJ', true) RETURNING id INTO v_cliente_id;
  END IF;

  -- Recorrência implementação
  v_first := p_installments->0;
  v_amount := NULLIF(v_first->>'amount','')::numeric;
  v_first_due := NULLIF(v_first->>'due_date','')::date;
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Valor inválido na primeira parcela'; END IF;
  IF v_first_due IS NULL THEN RAISE EXCEPTION 'Vencimento inválido na primeira parcela'; END IF;

  INSERT INTO public.financial_recurrences (
    organization_id, description, type, direction, amount, frequency,
    start_date, total_installments, cliente_id, projeto_id,
    categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
    status, source_module, source_entity_type, source_entity_id, created_by
  ) VALUES (
    v_deal.organization_id, 'Implementação — ' || v_project_name,
    CASE WHEN v_total > 1 THEN 'installment' ELSE 'recurrence' END,
    'receita', v_amount, 'mensal', v_first_due,
    CASE WHEN v_total > 1 THEN v_total ELSE NULL END,
    v_cliente_id, v_project_id,
    v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
    'ativa', 'crm', 'deal', p_deal_id, NULL
  ) RETURNING id INTO v_recurrence_id;

  PERFORM public.generate_recurrence_installments(v_recurrence_id, GREATEST(v_total, 12));

  UPDATE public.movimentacoes
     SET categoria_id      = COALESCE(categoria_id, v_categoria_id),
         centro_custo_id   = COALESCE(centro_custo_id, v_centro_custo_id),
         conta_bancaria_id = COALESCE(conta_bancaria_id, v_conta_bancaria_id),
         meio_pagamento_id = COALESCE(meio_pagamento_id, v_meio_pagamento_id),
         cliente_id        = COALESCE(cliente_id, v_cliente_id)
   WHERE recurrence_id = v_recurrence_id;

  -- MRR
  v_mrr_value := COALESCE(NULLIF(p_project_data->>'mrr_value','')::numeric, v_deal.estimated_mrr_value);
  v_mrr_start := COALESCE(NULLIF(p_project_data->>'mrr_start_date','')::date, v_deal.mrr_start_date, v_first_due);
  v_mrr_duration := COALESCE(NULLIF(p_project_data->>'mrr_duration_months','')::integer, v_deal.mrr_duration_months);
  v_mrr_discount_months := COALESCE(NULLIF(p_project_data->>'mrr_discount_months','')::integer, v_deal.mrr_discount_months, 0);
  v_mrr_discount_value := COALESCE(NULLIF(p_project_data->>'mrr_discount_value','')::numeric, v_deal.mrr_discount_value, v_mrr_value);

  IF v_mrr_value IS NOT NULL AND v_mrr_value > 0 THEN
    INSERT INTO public.financial_recurrences (
      organization_id, description, type, direction, amount, frequency,
      start_date, total_installments, cliente_id, projeto_id,
      categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
      status, source_module, source_entity_type, source_entity_id, created_by
    ) VALUES (
      v_deal.organization_id, 'Manutenção (MRR) — ' || v_project_name,
      'recurrence', 'receita', v_mrr_value, 'mensal',
      v_mrr_start, v_mrr_duration, v_cliente_id, v_project_id,
      v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
      'ativa', 'crm', 'deal_mrr', p_deal_id, NULL
    ) RETURNING id INTO v_mrr_recurrence_id;

    PERFORM public.generate_recurrence_installments(v_mrr_recurrence_id, COALESCE(v_mrr_duration, 12));

    IF v_mrr_discount_months > 0 AND v_mrr_discount_value <> v_mrr_value THEN
      UPDATE public.movimentacoes m
         SET valor_previsto = v_mrr_discount_value,
             observacoes    = COALESCE(m.observacoes || E'\n', '') ||
                              'Desconto promocional aplicado (mês ' || m.installment_number || '/' || v_mrr_discount_months || ')'
       WHERE recurrence_id = v_mrr_recurrence_id AND installment_number <= v_mrr_discount_months;
    END IF;

    UPDATE public.movimentacoes
       SET categoria_id      = COALESCE(categoria_id, v_categoria_id),
           centro_custo_id   = COALESCE(centro_custo_id, v_centro_custo_id),
           conta_bancaria_id = COALESCE(conta_bancaria_id, v_conta_bancaria_id),
           meio_pagamento_id = COALESCE(meio_pagamento_id, v_meio_pagamento_id),
           cliente_id        = COALESCE(cliente_id, v_cliente_id)
     WHERE recurrence_id = v_mrr_recurrence_id;

    SELECT COUNT(*) INTO v_mrr_count FROM public.movimentacoes WHERE recurrence_id = v_mrr_recurrence_id;

    INSERT INTO public.maintenance_contracts (
      organization_id, project_id, monthly_fee,
      monthly_fee_discount_percent, discount_duration_months,
      start_date, end_date, status, created_by_actor_id
    ) VALUES (
      v_deal.organization_id, v_project_id, v_mrr_value,
      CASE WHEN v_mrr_discount_months > 0 AND v_mrr_value > 0
           THEN ROUND(((v_mrr_value - v_mrr_discount_value) / v_mrr_value) * 100, 2)
           ELSE 0 END,
      NULLIF(v_mrr_discount_months, 0), v_mrr_start,
      CASE WHEN v_mrr_duration IS NOT NULL THEN (v_mrr_start + (v_mrr_duration || ' months')::interval)::date ELSE NULL END,
      'active', v_owner_actor_id
    );

    -- Persiste mrr_value na coluna dedicada do projeto
    UPDATE public.projects SET mrr_value = v_mrr_value WHERE id = v_project_id;
  END IF;

  -- Custos extras
  v_extra_costs := COALESCE(p_project_data->'extra_costs', v_deal.extra_costs, '[]'::jsonb);
  IF jsonb_typeof(v_extra_costs) = 'array' THEN
    FOR v_extra IN SELECT * FROM jsonb_array_elements(v_extra_costs)
    LOOP
      DECLARE
        v_e_desc text := v_extra->>'description';
        v_e_amount numeric := NULLIF(v_extra->>'amount','')::numeric;
        v_e_recurrence text := COALESCE(v_extra->>'recurrence', 'once');
        v_e_notes text := v_extra->>'notes';
        v_e_freq text;
      BEGIN
        IF v_e_amount IS NULL OR v_e_amount <= 0 OR v_e_desc IS NULL OR LENGTH(TRIM(v_e_desc)) = 0 THEN CONTINUE; END IF;
        IF v_e_recurrence IN ('monthly','yearly') THEN
          v_e_freq := CASE v_e_recurrence WHEN 'monthly' THEN 'mensal' ELSE 'anual' END;
          INSERT INTO public.financial_recurrences (
            organization_id, description, type, direction, amount, frequency,
            start_date, projeto_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
            status, source_module, source_entity_type, source_entity_id, created_by
          ) VALUES (
            v_deal.organization_id, 'Custo extra: ' || v_e_desc || ' — ' || v_project_name,
            'recurrence', 'despesa', v_e_amount, v_e_freq,
            v_first_due, v_project_id,
            v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
            'ativa', 'crm', 'deal_extra_cost', p_deal_id, NULL
          ) RETURNING id INTO v_extra_rec_id;
          PERFORM public.generate_recurrence_installments(v_extra_rec_id, 12);
          v_extras_recurring := v_extras_recurring + 1;
        ELSE
          INSERT INTO public.movimentacoes (
            descricao, tipo, valor_previsto, data_competencia, data_vencimento,
            status, observacoes, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
            source_module, source_entity_type, source_entity_id, is_automatic
          ) VALUES (
            'Custo extra: ' || v_e_desc || ' — ' || v_project_name,
            'despesa', v_e_amount, v_first_due, v_first_due,
            'pendente', v_e_notes, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
            'crm', 'deal_extra_cost', p_deal_id, true
          );
          v_extras_once := v_extras_once + 1;
        END IF;
      END;
    END LOOP;
  END IF;

  -- Anexos
  UPDATE public.anexos SET projeto_id = v_project_id, deal_id = NULL WHERE deal_id = p_deal_id;
  GET DIAGNOSTICS v_anexos_moved = ROW_COUNT;

  -- Marca deal
  UPDATE public.deals
     SET stage = 'fechado_ganho', probability_pct = 100, closed_at = now(),
         generated_project_id = v_project_id, updated_by = v_owner_actor_id
   WHERE id = p_deal_id;

  -- Vincula propostas aceitas
  UPDATE public.proposals SET project_id = v_project_id, updated_at = now()
   WHERE deal_id = p_deal_id AND deleted_at IS NULL AND status = 'aceito' AND project_id IS NULL;
  GET DIAGNOSTICS v_proposals_linked = ROW_COUNT;

  -- Atualiza lead se havia
  IF v_deal.origin_lead_id IS NOT NULL THEN
    UPDATE public.leads SET converted_to_deal_id = p_deal_id, converted_at = COALESCE(converted_at, now())
     WHERE id = v_deal.origin_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'project_code', v_project_code,
    'recurrence_id', v_recurrence_id,
    'mrr_recurrence_id', v_mrr_recurrence_id,
    'cliente_id', v_cliente_id,
    'installments_created', v_total,
    'mrr_installments_created', v_mrr_count,
    'extras_recurring', v_extras_recurring,
    'extras_once', v_extras_once,
    'anexos_moved', v_anexos_moved,
    'proposals_linked', v_proposals_linked
  );
END;
$function$;
