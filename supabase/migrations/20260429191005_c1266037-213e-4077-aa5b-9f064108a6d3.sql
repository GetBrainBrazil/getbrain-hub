CREATE OR REPLACE FUNCTION public.auto_create_deal_on_triagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_deal_id uuid;
  v_new_code    text;
BEGIN
  -- Só dispara quando status passa para 'triagem_agendada'
  IF NEW.status <> 'triagem_agendada' THEN RETURN NEW; END IF;
  IF OLD.status = 'triagem_agendada' THEN RETURN NEW; END IF;
  -- Já tem deal vinculado: pula
  IF NEW.converted_to_deal_id IS NOT NULL THEN RETURN NEW; END IF;

  v_new_code := 'DEAL-' || lpad((floor(random() * 9000)::int + 1000)::text, 4, '0');

  INSERT INTO public.deals (
    organization_id, code, title,
    company_id, contact_person_id, owner_actor_id,
    origin_lead_id, stage,
    estimated_value, pain_description, notes,
    created_by
  ) VALUES (
    NEW.organization_id,
    v_new_code,
    NEW.title,
    NEW.company_id, NEW.contact_person_id, NEW.owner_actor_id,
    NEW.id, 'descoberta_marcada',
    NEW.estimated_value, NEW.pain_description, NEW.notes,
    NEW.updated_by
  )
  RETURNING id INTO v_new_deal_id;

  -- Vincula o deal de volta ao lead (sem disparar o trigger de novo: status fica igual)
  NEW.converted_to_deal_id := v_new_deal_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_deal_on_triagem ON public.leads;
CREATE TRIGGER trg_auto_create_deal_on_triagem
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.auto_create_deal_on_triagem();