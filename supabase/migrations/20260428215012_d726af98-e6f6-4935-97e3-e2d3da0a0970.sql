-- 1) Novas colunas em projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS primary_contact_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_lead_source_id uuid REFERENCES public.crm_lead_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commercial_context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_primary_contact
  ON public.projects(primary_contact_person_id) WHERE deleted_at IS NULL;

-- 2) Novo campo em anexos
ALTER TABLE public.anexos
  ADD COLUMN IF NOT EXISTS deal_id uuid;

CREATE INDEX IF NOT EXISTS idx_anexos_deal_id ON public.anexos(deal_id) WHERE deal_id IS NOT NULL;

-- 3) RPC v3
CREATE OR REPLACE FUNCTION public.close_deal_as_won(
  p_deal_id uuid,
  p_project_data jsonb DEFAULT '{}'::jsonb,
  p_installments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deal public.deals%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_project_id uuid; v_project_code text;
  v_first jsonb; v_total integer;
  v_project_name text; v_project_type public.project_type;
  v_start_date date; v_owner_actor_id uuid; v_scope text;
  v_amount numeric; v_first_due date;
  v_recurrence_id uuid;
  v_cliente_id uuid; v_company_name text;
  v_dep RECORD;
  v_mapped_type public.project_dependency_type;
  v_mapped_status public.project_dependency_status;
  v_requested_from text;
  v_dep_description text;
  v_estimated_delivery date;
  v_proposals_linked integer := 0;
  v_anexos_moved integer := 0;
  v_origin_lead_source_id uuid;
  v_commercial_context jsonb;
  v_categoria_id uuid;
  v_centro_custo_id uuid;
  v_conta_bancaria_id uuid;
  v_meio_pagamento_id uuid;
  v_primary_contact_id uuid;
  v_lead_source_text text;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal não encontrado'; END IF;
  IF v_deal.stage IN ('fechado_ganho', 'fechado_perdido') THEN RAISE EXCEPTION 'Deal já está fechado'; END IF;
  IF p_installments IS NULL OR jsonb_typeof(p_installments) <> 'array' OR jsonb_array_length(p_installments) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela';
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = v_deal.company_id;

  v_total := jsonb_array_length(p_installments);
  v_project_name := COALESCE(NULLIF(p_project_data->>'name', ''), v_deal.title);
  v_project_type := COALESCE(NULLIF(p_project_data->>'project_type', '')::public.project_type, v_deal.project_type);
  IF v_project_type IS NULL THEN RAISE EXCEPTION 'Tipo de projeto é obrigatório'; END IF;
  v_start_date := COALESCE(NULLIF(p_project_data->>'start_date', '')::date, v_deal.desired_start_date, CURRENT_DATE);
  v_owner_actor_id := COALESCE(NULLIF(p_project_data->>'owner_actor_id', '')::uuid, v_deal.owner_actor_id);
  v_scope := COALESCE(NULLIF(p_project_data->>'scope', ''), v_deal.scope_summary);
  v_estimated_delivery := COALESCE(
    NULLIF(p_project_data->>'estimated_delivery_date', '')::date,
    v_deal.desired_delivery_date
  );

  -- Financeiro vindo do diálogo (opcionais)
  v_categoria_id       := NULLIF(p_project_data->>'categoria_id', '')::uuid;
  v_centro_custo_id    := NULLIF(p_project_data->>'centro_custo_id', '')::uuid;
  v_conta_bancaria_id  := NULLIF(p_project_data->>'conta_bancaria_id', '')::uuid;
  v_meio_pagamento_id  := NULLIF(p_project_data->>'meio_pagamento_id', '')::uuid;

  -- Resolve origem do lead (texto livre em leads.source → mapeia pra crm_lead_sources se houver)
  v_origin_lead_source_id := NULLIF(p_project_data->>'origin_lead_source_id', '')::uuid;
  IF v_origin_lead_source_id IS NULL AND v_deal.origin_lead_id IS NOT NULL THEN
    SELECT source INTO v_lead_source_text FROM public.leads WHERE id = v_deal.origin_lead_id;
    IF v_lead_source_text IS NOT NULL THEN
      SELECT id INTO v_origin_lead_source_id
        FROM public.crm_lead_sources
       WHERE LOWER(slug) = LOWER(v_lead_source_text)
          OR LOWER(name) = LOWER(v_lead_source_text)
       LIMIT 1;
    END IF;
  END IF;

  -- Contato principal
  v_primary_contact_id := COALESCE(
    NULLIF(p_project_data->>'primary_contact_person_id', '')::uuid,
    v_deal.contact_person_id
  );

  -- Contexto comercial consolidado
  v_commercial_context := jsonb_strip_nulls(jsonb_build_object(
    'pain_description',       v_deal.pain_description,
    'pain_category',          v_deal.pain_category,
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
    'next_step_date',         v_deal.next_step_date
  ));

  INSERT INTO public.projects (
    organization_id, company_id, owner_actor_id, name, project_type, status,
    contract_value, installments_count, start_date,
    estimated_delivery_date,
    description, scope_in, scope_out,
    business_context,
    acceptance_criteria, deliverables, premises, identified_risks, technical_stack,
    estimated_hours_baseline, complexity_baseline, source_deal_id,
    organograma_url, mockup_url, mockup_screenshots,
    primary_contact_person_id, origin_lead_source_id, commercial_context,
    created_by_actor_id
  ) VALUES (
    v_deal.organization_id, v_deal.company_id, v_owner_actor_id, v_project_name,
    v_project_type, 'aceito', COALESCE(v_deal.estimated_value, 0), v_total,
    v_start_date,
    v_estimated_delivery,
    COALESCE(v_scope, 'Projeto criado automaticamente a partir do CRM: ' || v_deal.code),
    COALESCE(v_deal.scope_in, v_scope),
    v_deal.scope_out,
    v_deal.business_context,
    COALESCE(v_deal.acceptance_criteria, '[]'::jsonb),
    COALESCE(v_deal.deliverables, '{}'::text[]),
    COALESCE(v_deal.premises, '{}'::text[]),
    COALESCE(v_deal.identified_risks, '{}'::text[]),
    COALESCE(v_deal.technical_stack, '{}'::text[]),
    v_deal.estimated_hours_total,
    v_deal.estimated_complexity,
    p_deal_id,
    v_deal.organograma_url,
    v_deal.mockup_url,
    COALESCE(v_deal.mockup_screenshots, '{}'::text[]),
    v_primary_contact_id, v_origin_lead_source_id, COALESCE(v_commercial_context, '{}'::jsonb),
    v_owner_actor_id
  ) RETURNING id, code INTO v_project_id, v_project_code;

  -- Marca o contato como primário na empresa, se ainda não for
  IF v_primary_contact_id IS NOT NULL THEN
    UPDATE public.company_people
       SET is_primary_contact = true
     WHERE company_id = v_deal.company_id
       AND person_id = v_primary_contact_id;
  END IF;

  -- Dependências
  FOR v_dep IN
    SELECT * FROM public.deal_dependencies
    WHERE deal_id = p_deal_id AND deleted_at IS NULL
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
      v_deal.organization_id, v_project_id,
      LEFT(v_dep.description, 80),
      v_dep_description,
      v_mapped_type, v_mapped_status, v_requested_from, v_dep.agreed_deadline,
      v_dep.id, v_owner_actor_id
    );
  END LOOP;

  -- Resolução robusta de cliente: CNPJ → nome → criar
  v_company_name := COALESCE(v_company.trade_name, v_company.legal_name);

  IF v_company.cnpj IS NOT NULL AND LENGTH(TRIM(v_company.cnpj)) > 0 THEN
    SELECT id INTO v_cliente_id
      FROM public.clientes
     WHERE REGEXP_REPLACE(COALESCE(cpf_cnpj,''), '[^0-9]', '', 'g')
         = REGEXP_REPLACE(v_company.cnpj, '[^0-9]', '', 'g')
       AND COALESCE(ativo, true) = true
     LIMIT 1;
  END IF;

  IF v_cliente_id IS NULL AND v_company_name IS NOT NULL THEN
    SELECT id INTO v_cliente_id
      FROM public.clientes
     WHERE LOWER(TRIM(nome)) = LOWER(TRIM(v_company_name))
     LIMIT 1;
  END IF;

  IF v_cliente_id IS NULL AND v_company_name IS NOT NULL THEN
    INSERT INTO public.clientes (
      nome, razao_social, cpf_cnpj, tipo_pessoa, ativo
    ) VALUES (
      v_company_name,
      v_company.legal_name,
      v_company.cnpj,
      CASE WHEN v_company.cnpj IS NOT NULL AND LENGTH(REGEXP_REPLACE(v_company.cnpj,'[^0-9]','','g')) >= 14
           THEN 'PJ' ELSE 'PJ' END,
      true
    ) RETURNING id INTO v_cliente_id;
  END IF;

  -- Recorrência / parcelas
  v_first := p_installments->0;
  v_amount := NULLIF(v_first->>'amount', '')::numeric;
  v_first_due := NULLIF(v_first->>'due_date', '')::date;
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Valor inválido na primeira parcela'; END IF;
  IF v_first_due IS NULL THEN RAISE EXCEPTION 'Vencimento inválido na primeira parcela'; END IF;

  INSERT INTO public.financial_recurrences (
    organization_id, description, type, direction, amount, frequency,
    start_date, total_installments,
    cliente_id, projeto_id,
    categoria_id, centro_custo_id, conta_bancaria_id, meio_pagamento_id,
    status, source_module, source_entity_type, source_entity_id, created_by
  ) VALUES (
    v_deal.organization_id,
    'Parcelas — ' || v_project_name,
    CASE WHEN v_total > 1 THEN 'installment' ELSE 'recurrence' END,
    'receita', v_amount, 'mensal',
    v_first_due,
    CASE WHEN v_total > 1 THEN v_total ELSE NULL END,
    v_cliente_id, v_project_id,
    v_categoria_id, v_centro_custo_id, v_conta_bancaria_id, v_meio_pagamento_id,
    'ativa', 'crm', 'deal', p_deal_id, NULL
  ) RETURNING id INTO v_recurrence_id;

  PERFORM public.generate_recurrence_installments(v_recurrence_id, GREATEST(v_total, 12));

  -- Propaga IDs financeiros para movimentações geradas (caso a função geradora não preencha)
  UPDATE public.movimentacoes
     SET categoria_id      = COALESCE(categoria_id, v_categoria_id),
         centro_custo_id   = COALESCE(centro_custo_id, v_centro_custo_id),
         conta_bancaria_id = COALESCE(conta_bancaria_id, v_conta_bancaria_id),
         meio_pagamento_id = COALESCE(meio_pagamento_id, v_meio_pagamento_id),
         cliente_id        = COALESCE(cliente_id, v_cliente_id)
   WHERE recurrence_id = v_recurrence_id;

  -- Move anexos do deal para o projeto
  UPDATE public.anexos
     SET projeto_id = v_project_id,
         deal_id = NULL
   WHERE deal_id = p_deal_id;
  GET DIAGNOSTICS v_anexos_moved = ROW_COUNT;

  UPDATE public.deals
     SET stage = 'fechado_ganho', probability_pct = 100, closed_at = now(),
         generated_project_id = v_project_id, updated_by = v_owner_actor_id
   WHERE id = p_deal_id;

  -- Vincula propostas aceitas do deal ao projeto criado
  UPDATE public.proposals
     SET project_id = v_project_id, updated_at = now()
   WHERE deal_id = p_deal_id
     AND deleted_at IS NULL
     AND status = 'aceito'
     AND project_id IS NULL;
  GET DIAGNOSTICS v_proposals_linked = ROW_COUNT;

  UPDATE public.companies
     SET relationship_status = 'active_client', updated_at = now()
   WHERE id = v_deal.company_id AND relationship_status <> 'active_client';

  RETURN jsonb_build_object(
    'project_id', v_project_id, 'project_code', v_project_code,
    'installments_created', v_total, 'recurrence_id', v_recurrence_id,
    'cliente_id', v_cliente_id,
    'dependencies_copied', (SELECT COUNT(*) FROM public.deal_dependencies WHERE deal_id = p_deal_id AND deleted_at IS NULL),
    'proposals_linked', v_proposals_linked,
    'anexos_moved', v_anexos_moved
  );
END;
$function$;