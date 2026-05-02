-- 1) Remover colunas do lead que duplicavam o Deal
ALTER TABLE public.leads
  DROP COLUMN IF EXISTS pain_categories,
  DROP COLUMN IF EXISTS pain_cost_brl_monthly,
  DROP COLUMN IF EXISTS pain_hours_monthly,
  DROP COLUMN IF EXISTS current_solution,
  DROP COLUMN IF EXISTS urgency,
  DROP COLUMN IF EXISTS fit,
  DROP COLUMN IF EXISTS business_context,
  DROP COLUMN IF EXISTS next_step,
  DROP COLUMN IF EXISTS next_step_date;

-- 2) Trigger de validação de urgency/fit não faz mais sentido
DROP TRIGGER IF EXISTS trg_validate_lead_qualifiers ON public.leads;
DROP FUNCTION IF EXISTS public.validate_lead_qualifiers();

-- 3) Reescrever convert_lead_to_deal sem os campos removidos
DROP FUNCTION IF EXISTS public.convert_lead_to_deal(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.convert_lead_to_deal(
  p_lead_id uuid,
  p_deal_data jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_deal_id uuid;
  v_deal_code text;
  v_project_type text;
  v_business_context text;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead % não encontrado', p_lead_id;
  END IF;
  IF v_lead.converted_to_deal_id IS NOT NULL THEN
    SELECT code INTO v_deal_code FROM public.deals WHERE id = v_lead.converted_to_deal_id;
    RETURN v_deal_code;
  END IF;

  v_project_type := NULLIF(p_deal_data->>'project_type','');

  -- Concatena sinal inicial + resumo da triagem como ponto de partida do Deal
  v_business_context := NULLIF(
    trim(BOTH E'\n' FROM
      COALESCE(NULLIF(v_lead.pain_description, ''), '') ||
      CASE
        WHEN COALESCE(v_lead.triagem_summary, '') <> '' AND COALESCE(v_lead.pain_description, '') <> ''
          THEN E'\n\n— Resumo da triagem —\n' || v_lead.triagem_summary
        WHEN COALESCE(v_lead.triagem_summary, '') <> ''
          THEN v_lead.triagem_summary
        ELSE ''
      END
    ),
    ''
  );

  INSERT INTO public.deals (
    organization_id, title, company_id, contact_person_id, owner_actor_id,
    origin_lead_id, stage, estimated_value, project_type, expected_close_date,
    business_context, notes
  ) VALUES (
    v_lead.organization_id,
    COALESCE(p_deal_data->>'title', v_lead.title),
    v_lead.company_id,
    v_lead.contact_person_id,
    COALESCE((p_deal_data->>'owner_actor_id')::uuid, v_lead.owner_actor_id),
    v_lead.id,
    COALESCE((p_deal_data->>'stage')::deal_stage, 'descoberta_marcada'::deal_stage),
    COALESCE((p_deal_data->>'estimated_value')::numeric, v_lead.estimated_value),
    CASE WHEN v_project_type IS NULL THEN NULL ELSE v_project_type::project_type END,
    COALESCE((p_deal_data->>'expected_close_date')::date, NULL),
    v_business_context,
    v_lead.notes
  )
  RETURNING id, code INTO v_deal_id, v_deal_code;

  UPDATE public.leads
     SET status = 'convertido',
         converted_to_deal_id = v_deal_id,
         converted_at = now()
   WHERE id = v_lead.id;

  RETURN v_deal_code;
END;
$$;