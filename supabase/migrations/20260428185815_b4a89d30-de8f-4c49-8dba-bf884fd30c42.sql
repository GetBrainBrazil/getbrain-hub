-- 1) proposals.deal_id : NO ACTION -> SET NULL
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_deal_id_fkey;
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_deal_id_fkey
  FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;

-- 2) leads.converted_to_deal_id : NO ACTION -> SET NULL (ordem correta: ON DELETE antes de DEFERRABLE)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_converted_to_deal_id_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_converted_to_deal_id_fkey
  FOREIGN KEY (converted_to_deal_id) REFERENCES public.deals(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- Trigger: quando lead perde o deal, volta para "novo"
CREATE OR REPLACE FUNCTION public.lead_revert_on_deal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.converted_to_deal_id IS NULL AND OLD.converted_to_deal_id IS NOT NULL THEN
    NEW.status := 'novo'::lead_status;
    NEW.converted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_revert_on_deal_delete ON public.leads;
CREATE TRIGGER trg_lead_revert_on_deal_delete
BEFORE UPDATE OF converted_to_deal_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.lead_revert_on_deal_delete();

-- 3) deals.generated_project_id : NO ACTION -> SET NULL
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_generated_project_id_fkey;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_generated_project_id_fkey
  FOREIGN KEY (generated_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
