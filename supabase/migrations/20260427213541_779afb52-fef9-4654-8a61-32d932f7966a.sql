
CREATE OR REPLACE FUNCTION public.close_deal_as_won(p_deal_id uuid, p_project_data jsonb DEFAULT '{}'::jsonb, p_installments jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal public.deals%ROWTYPE;
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
  v_start_date := COALESCE(NULLIF(p_project_data->>'start_date', '')::date, v_deal.desired_start_date, CURRENT_DATE);
  v_owner_actor_id := COALESCE(NULLIF(p_project_data->>'owner_actor_id', '')::uuid, v_deal.owner_actor_id);
  v_scope := COALESCE(NULLIF(p_project_data->>'scope', ''), v_deal.scope_summary);
  v_estimated_delivery := COALESCE(
    NULLIF(p_project_data->>'estimated_delivery_date', '')::date,
    v_deal.desired_delivery_date
  );

  INSERT INTO public.projects (
    organization_id, company_id, owner_actor_id, name, project_type, status,
    contract_value, installments_count, start_date,
    estimated_delivery_date,
    description, scope_in, scope_out,
    business_context,
    acceptance_criteria, deliverables, premises, identified_risks, technical_stack,
    estimated_hours_baseline, complexity_baseline, source_deal_id,
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
    v_owner_actor_id
  ) RETURNING id, code INTO v_project_id, v_project_code;

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
    'ativa', 'crm', 'deal', p_deal_id, NULL
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
    'installments_created', v_total, 'recurrence_id', v_recurrence_id,
    'dependencies_copied', (SELECT COUNT(*) FROM public.deal_dependencies WHERE deal_id = p_deal_id AND deleted_at IS NULL)
  );
END;
$function$;
