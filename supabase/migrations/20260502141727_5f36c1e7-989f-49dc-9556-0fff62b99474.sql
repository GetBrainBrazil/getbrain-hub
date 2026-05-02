-- 1) Colunas qualitativas no lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pain_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pain_cost_brl_monthly numeric,
  ADD COLUMN IF NOT EXISTS pain_hours_monthly numeric,
  ADD COLUMN IF NOT EXISTS current_solution text,
  ADD COLUMN IF NOT EXISTS urgency text,
  ADD COLUMN IF NOT EXISTS fit text,
  ADD COLUMN IF NOT EXISTS business_context text,
  ADD COLUMN IF NOT EXISTS triagem_summary text,
  ADD COLUMN IF NOT EXISTS triagem_channel text,
  ADD COLUMN IF NOT EXISTS triagem_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS next_step_date date;

-- 2) Validação leve via trigger (em vez de CHECK p/ permitir evolução)
CREATE OR REPLACE FUNCTION public.validate_lead_qualifiers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.urgency IS NOT NULL AND NEW.urgency NOT IN ('baixa','media','alta','critica') THEN
    RAISE EXCEPTION 'urgency inválida: %', NEW.urgency;
  END IF;
  IF NEW.fit IS NOT NULL AND NEW.fit NOT IN ('bom','medio','ruim') THEN
    RAISE EXCEPTION 'fit inválido: %', NEW.fit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lead_qualifiers ON public.leads;
CREATE TRIGGER trg_validate_lead_qualifiers
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_lead_qualifiers();

-- 3) Substitui convert_lead_to_deal mantendo retorno (uuid → text exige DROP)
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

  INSERT INTO public.deals (
    organization_id, title, company_id, contact_person_id, owner_actor_id,
    origin_lead_id, stage, estimated_value, project_type, expected_close_date,
    pain_description, pain_categories, pain_cost_brl_monthly, pain_hours_monthly,
    current_solution, business_context, notes
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
    v_lead.pain_description,
    COALESCE(v_lead.pain_categories, '{}'::text[]),
    v_lead.pain_cost_brl_monthly,
    v_lead.pain_hours_monthly,
    v_lead.current_solution,
    v_lead.business_context,
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