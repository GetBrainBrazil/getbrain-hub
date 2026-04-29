
-- 1. Nova coluna array
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pain_categories text[] NOT NULL DEFAULT '{}';

-- 2. Backfill a partir da coluna antiga (ignorando 'outra')
UPDATE public.deals
SET pain_categories = ARRAY[pain_category]
WHERE pain_category IS NOT NULL
  AND pain_category <> 'outra'
  AND (pain_categories IS NULL OR array_length(pain_categories, 1) IS NULL);

-- 3. Desativar "Outra" (não excluir, para preservar histórico)
UPDATE public.crm_pain_categories
SET is_active = false
WHERE slug = 'outra';

-- 4. Atualizar função close_deal_as_won para copiar pain_categories
CREATE OR REPLACE FUNCTION public.close_deal_as_won(
  p_deal_id uuid,
  p_project_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deal               public.deals%ROWTYPE;
  v_project_id         uuid;
  v_project_name       text;
  v_project_type       text;
  v_total              integer;
  v_owner_actor_id     uuid;
  v_primary_contact_id uuid;
  v_commercial_context jsonb;
  v_dep                record;
  v_attachment         record;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal % not found', p_deal_id; END IF;
  IF v_deal.stage <> 'fechado_ganho' THEN
    RAISE EXCEPTION 'Deal must be in fechado_ganho stage (current: %)', v_deal.stage;
  END IF;
  IF v_deal.generated_project_id IS NOT NULL THEN
    RETURN v_deal.generated_project_id;
  END IF;

  v_project_name := COALESCE(NULLIF(p_project_data->>'name', ''), v_deal.title);
  v_project_type := COALESCE(NULLIF(p_project_data->>'project_type', ''), v_deal.project_type, 'outro');
  v_total        := COALESCE((p_project_data->>'installments_count')::int, 1);

  -- Owner mapping
  IF p_project_data ? 'owner_actor_id' THEN
    v_owner_actor_id := NULLIF(p_project_data->>'owner_actor_id', '')::uuid;
  ELSE
    SELECT id INTO v_owner_actor_id
      FROM public.actors
      WHERE organization_id = v_deal.organization_id
        AND user_id = v_deal.owner_user_id
      LIMIT 1;
    IF v_owner_actor_id IS NULL THEN
      SELECT id INTO v_owner_actor_id
        FROM public.actors
        WHERE organization_id = v_deal.organization_id
          AND kind = 'team_member'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
  END IF;

  v_primary_contact_id := COALESCE(
    NULLIF(p_project_data->>'primary_contact_person_id', '')::uuid,
    v_deal.contact_person_id
  );

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
    COALESCE((p_project_data->>'start_date')::date, CURRENT_DATE),
    NULLIF(p_project_data->>'estimated_delivery_date', '')::date,
    v_deal.scope_summary,
    v_deal.scope_in, v_deal.scope_out,
    v_deal.business_context,
    COALESCE(v_deal.acceptance_criteria, '[]'::jsonb),
    COALESCE(v_deal.deliverables, ARRAY[]::text[]),
    COALESCE(v_deal.premises, ARRAY[]::text[]),
    COALESCE(v_deal.identified_risks, ARRAY[]::text[]),
    COALESCE(v_deal.technical_stack, ARRAY[]::text[]),
    v_deal.estimated_hours_total, v_deal.estimated_complexity, v_deal.id,
    v_deal.organograma_url, v_deal.mockup_url, COALESCE(v_deal.mockup_screenshots, ARRAY[]::text[]),
    v_primary_contact_id, v_deal.origin_lead_source_id, v_commercial_context,
    v_owner_actor_id
  ) RETURNING id INTO v_project_id;

  -- Copy dependencies
  FOR v_dep IN SELECT * FROM public.deal_dependencies WHERE deal_id = p_deal_id LOOP
    INSERT INTO public.project_dependencies (
      project_id, dep_type, description, status, owner_user_id, due_date, notes
    ) VALUES (
      v_project_id, v_dep.dep_type, v_dep.description, 'aguardando_combinar',
      v_dep.responsible_user_id, v_dep.due_date, v_dep.notes
    );
  END LOOP;

  -- Copy attachments
  FOR v_attachment IN SELECT * FROM public.deal_attachments WHERE deal_id = p_deal_id LOOP
    INSERT INTO public.project_attachments (
      project_id, file_url, file_name, file_size, mime_type, uploaded_by_user_id, kind, notes
    ) VALUES (
      v_project_id, v_attachment.file_url, v_attachment.file_name, v_attachment.file_size,
      v_attachment.mime_type, v_attachment.uploaded_by_user_id, v_attachment.kind, v_attachment.notes
    );
  END LOOP;

  UPDATE public.deals SET generated_project_id = v_project_id WHERE id = p_deal_id;

  RETURN v_project_id;
END;
$function$;
