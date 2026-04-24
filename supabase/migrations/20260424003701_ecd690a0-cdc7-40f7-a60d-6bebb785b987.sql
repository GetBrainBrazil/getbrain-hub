DO $$ BEGIN
  CREATE TYPE public.company_relationship_status AS ENUM ('prospect','lead','active_client','former_client','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('novo','triagem_agendada','triagem_feita','descartado','convertido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.deal_stage AS ENUM ('presencial_agendada','presencial_feita','orcamento_enviado','em_negociacao','fechado_ganho','fechado_perdido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.activity_type AS ENUM ('reuniao_presencial','reuniao_virtual','ligacao','email','whatsapp','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS relationship_status public.company_relationship_status NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS employee_count_range text,
  ADD COLUMN IF NOT EXISTS linkedin_url text;

UPDATE public.companies c SET relationship_status = 'active_client'
WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.company_id = c.id AND p.status IN ('aceito','em_desenvolvimento','em_homologacao','em_manutencao') AND p.deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_companies_relationship ON public.companies(relationship_status) WHERE deleted_at IS NULL;
CREATE SEQUENCE IF NOT EXISTS public.lead_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.deal_code_seq START 1;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), code text NOT NULL UNIQUE DEFAULT '', title text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id), contact_person_id uuid REFERENCES public.people(id), owner_actor_id uuid REFERENCES public.actors(id),
  status public.lead_status NOT NULL DEFAULT 'novo', source text, estimated_value numeric(12,2), pain_description text, notes text,
  triagem_scheduled_at timestamptz, triagem_happened_at timestamptz, lost_reason text, converted_to_deal_id uuid, converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES public.actors(id), updated_by uuid REFERENCES public.actors(id), deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), code text NOT NULL UNIQUE DEFAULT '', title text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id), contact_person_id uuid REFERENCES public.people(id), owner_actor_id uuid REFERENCES public.actors(id), origin_lead_id uuid REFERENCES public.leads(id),
  stage public.deal_stage NOT NULL DEFAULT 'presencial_agendada', estimated_value numeric(12,2), probability_pct integer NOT NULL DEFAULT 50 CHECK (probability_pct >= 0 AND probability_pct <= 100), expected_close_date date,
  project_type public.project_type, scope_summary text, proposal_url text, notes text, stage_changed_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz, lost_reason text, generated_project_id uuid REFERENCES public.projects(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES public.actors(id), updated_by uuid REFERENCES public.actors(id), deleted_at timestamptz,
  CONSTRAINT deal_lost_requires_reason CHECK (stage != 'fechado_perdido' OR (lost_reason IS NOT NULL AND length(trim(lost_reason)) > 0))
);
DO $$ BEGIN ALTER TABLE public.leads ADD CONSTRAINT leads_converted_to_deal_id_fkey FOREIGN KEY (converted_to_deal_id) REFERENCES public.deals(id) DEFERRABLE INITIALLY DEFERRED; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE, lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  type public.activity_type NOT NULL, title text NOT NULL, description text, scheduled_at timestamptz, happened_at timestamptz, duration_minutes integer, outcome text,
  owner_actor_id uuid REFERENCES public.actors(id), participants text[] DEFAULT '{}'::text[], created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES public.actors(id), deleted_at timestamptz,
  CONSTRAINT activity_belongs_to_one CHECK ((deal_id IS NOT NULL AND lead_id IS NULL) OR (deal_id IS NULL AND lead_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_actor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org ON public.deals(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_company ON public.deals(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(owner_actor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON public.deals(expected_close_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON public.deal_activities(deal_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deal_activities_lead ON public.deal_activities(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deal_activities_scheduled ON public.deal_activities(scheduled_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.generate_lead_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.code IS NULL OR NEW.code = '' THEN NEW.code := 'LEAD-' || lpad(nextval('public.lead_code_seq')::text, 3, '0'); END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.generate_deal_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.code IS NULL OR NEW.code = '' THEN NEW.code := 'DEAL-' || lpad(nextval('public.deal_code_seq')::text, 3, '0'); END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.update_deal_lifecycle() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.stage IS DISTINCT FROM OLD.stage THEN NEW.stage_changed_at := now(); END IF; IF NEW.stage IN ('fechado_ganho','fechado_perdido') AND OLD.stage NOT IN ('fechado_ganho','fechado_perdido') THEN NEW.closed_at := now(); ELSIF NEW.stage NOT IN ('fechado_ganho','fechado_perdido') AND OLD.stage IN ('fechado_ganho','fechado_perdido') THEN NEW.closed_at := NULL; END IF; RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.crm_audit_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new jsonb := to_jsonb(NEW); v_old jsonb := to_jsonb(OLD); v_row jsonb; v_org uuid; v_actor uuid; v_entity_id uuid;
BEGIN
  v_row := COALESCE(v_new, v_old);
  v_org := COALESCE((v_row->>'organization_id')::uuid, public.getbrain_org_id());
  v_actor := COALESCE((v_row->>'updated_by')::uuid, (v_row->>'created_by')::uuid, (v_row->>'updated_by_actor_id')::uuid, (v_row->>'created_by_actor_id')::uuid, (v_row->>'owner_actor_id')::uuid, (v_row->>'owner_actor_id')::uuid);
  v_entity_id := (v_row->>'id')::uuid;
  INSERT INTO public.audit_logs (organization_id, actor_id, entity_type, entity_id, action, changes, metadata)
  VALUES (v_org, v_actor, TG_TABLE_NAME, v_entity_id, CASE TG_OP WHEN 'INSERT' THEN 'create'::public.audit_action WHEN 'UPDATE' THEN 'update'::public.audit_action ELSE 'delete'::public.audit_action END, jsonb_build_object('old_data', v_old, 'new_data', v_new), jsonb_build_object('source', 'crm_audit_trigger'));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS leads_updated_at ON public.leads; CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS deals_updated_at ON public.deals; CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS deal_activities_updated_at ON public.deal_activities; CREATE TRIGGER deal_activities_updated_at BEFORE UPDATE ON public.deal_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS leads_generate_code ON public.leads; CREATE TRIGGER leads_generate_code BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.generate_lead_code();
DROP TRIGGER IF EXISTS deals_generate_code ON public.deals; CREATE TRIGGER deals_generate_code BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.generate_deal_code();
DROP TRIGGER IF EXISTS deals_lifecycle ON public.deals; CREATE TRIGGER deals_lifecycle BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_deal_lifecycle();
DROP TRIGGER IF EXISTS leads_audit ON public.leads; CREATE TRIGGER leads_audit AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_audit_trigger();
DROP TRIGGER IF EXISTS deals_audit ON public.deals; CREATE TRIGGER deals_audit AFTER INSERT OR UPDATE OR DELETE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.crm_audit_trigger();
DROP TRIGGER IF EXISTS deal_activities_audit ON public.deal_activities; CREATE TRIGGER deal_activities_audit AFTER INSERT OR UPDATE OR DELETE ON public.deal_activities FOR EACH ROW EXECUTE FUNCTION public.crm_audit_trigger();
DROP TRIGGER IF EXISTS companies_crm_audit ON public.companies; CREATE TRIGGER companies_crm_audit AFTER UPDATE OF relationship_status, employee_count_range, linkedin_url ON public.companies FOR EACH ROW EXECUTE FUNCTION public.crm_audit_trigger();

CREATE OR REPLACE FUNCTION public.convert_lead_to_deal(p_lead_id uuid, p_deal_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead public.leads%ROWTYPE; v_deal_id uuid; v_stage public.deal_stage := COALESCE((p_deal_data->>'stage')::public.deal_stage, 'presencial_agendada');
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  IF v_lead.status <> 'triagem_feita' THEN RAISE EXCEPTION 'Lead precisa estar com triagem feita para conversão'; END IF;
  INSERT INTO public.deals (organization_id, title, company_id, contact_person_id, owner_actor_id, origin_lead_id, stage, estimated_value, probability_pct, expected_close_date, project_type, scope_summary, notes, created_by)
  VALUES (v_lead.organization_id, COALESCE(p_deal_data->>'title', v_lead.title), v_lead.company_id, v_lead.contact_person_id, v_lead.owner_actor_id, v_lead.id, v_stage, COALESCE((p_deal_data->>'estimated_value')::numeric, v_lead.estimated_value), COALESCE((p_deal_data->>'probability_pct')::integer, 20), (p_deal_data->>'expected_close_date')::date, (p_deal_data->>'project_type')::public.project_type, COALESCE(p_deal_data->>'scope_summary', v_lead.pain_description), p_deal_data->>'notes', v_lead.owner_actor_id) RETURNING id INTO v_deal_id;
  UPDATE public.leads SET status = 'convertido', converted_to_deal_id = v_deal_id, converted_at = now(), updated_by = v_lead.owner_actor_id WHERE id = v_lead.id;
  UPDATE public.companies SET relationship_status = 'lead' WHERE id = v_lead.company_id AND relationship_status = 'prospect';
  RETURN v_deal_id;
END $$;

CREATE OR REPLACE FUNCTION public.mark_company_as_lead_on_lead() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN UPDATE public.companies SET relationship_status = 'lead' WHERE id = NEW.company_id AND relationship_status = 'prospect'; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS leads_company_relationship ON public.leads; CREATE TRIGGER leads_company_relationship AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.mark_company_as_lead_on_lead();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY; ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY; ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_authenticated ON public.leads; DROP POLICY IF EXISTS deals_authenticated ON public.deals; DROP POLICY IF EXISTS deal_activities_authenticated ON public.deal_activities;
CREATE POLICY leads_authenticated ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY deals_authenticated ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY deal_activities_authenticated ON public.deal_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.crm_pipeline_metrics AS
SELECT COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL AND l.status = 'novo') AS leads_novos,
COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL AND l.status = 'triagem_agendada') AS leads_triagem_agendada,
COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL AND l.status = 'triagem_feita') AS leads_triagem_feita,
COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL AND l.status = 'descartado') AS leads_descartados,
COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL AND l.status = 'convertido') AS leads_convertidos,
COUNT(d.id) FILTER (WHERE d.deleted_at IS NULL AND d.stage NOT IN ('fechado_ganho','fechado_perdido')) AS deals_ativos,
COALESCE(SUM(d.estimated_value) FILTER (WHERE d.deleted_at IS NULL AND d.stage NOT IN ('fechado_ganho','fechado_perdido')), 0) AS pipeline_total_brl,
COALESCE(SUM(d.estimated_value * d.probability_pct / 100.0) FILTER (WHERE d.deleted_at IS NULL AND d.stage NOT IN ('fechado_ganho','fechado_perdido')), 0) AS forecast_ponderado_brl,
COUNT(d.id) FILTER (WHERE d.deleted_at IS NULL AND d.stage = 'fechado_ganho') AS deals_ganhos_total,
COUNT(d.id) FILTER (WHERE d.deleted_at IS NULL AND d.stage = 'fechado_perdido') AS deals_perdidos_total,
COALESCE(SUM(d.estimated_value) FILTER (WHERE d.deleted_at IS NULL AND d.stage = 'fechado_ganho'), 0) AS receita_ganha_total_brl,
CASE WHEN COUNT(d.id) FILTER (WHERE d.deleted_at IS NULL AND d.stage IN ('fechado_ganho','fechado_perdido')) = 0 THEN 0 ELSE ROUND(COUNT(d.id) FILTER (WHERE d.deleted_at IS NULL AND d.stage = 'fechado_ganho')::numeric / COUNT(d.id) FILTER (WHERE d.deleted_at IS NULL AND d.stage IN ('fechado_ganho','fechado_perdido')) * 100, 2) END AS conversion_rate_pct,
COALESCE(AVG(d.estimated_value) FILTER (WHERE d.deleted_at IS NULL AND d.stage = 'fechado_ganho'), 0) AS ticket_medio_brl
FROM public.leads l FULL OUTER JOIN public.deals d ON false;