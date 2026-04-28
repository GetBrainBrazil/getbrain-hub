-- Tabela de origens de leads gerenciável
CREATE TABLE public.crm_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  color text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_lead_sources_active_order ON public.crm_lead_sources (is_active, display_order);

ALTER TABLE public.crm_lead_sources ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer autenticado
CREATE POLICY "crm_lead_sources_select_auth"
ON public.crm_lead_sources FOR SELECT
TO authenticated
USING (true);

-- INSERT: só admin
CREATE POLICY "crm_lead_sources_insert_admin"
ON public.crm_lead_sources FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: só admin
CREATE POLICY "crm_lead_sources_update_admin"
ON public.crm_lead_sources FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE: só admin e só se NÃO for is_system
CREATE POLICY "crm_lead_sources_delete_admin_non_system"
ON public.crm_lead_sources FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND is_system = false);

-- Trigger updated_at
CREATE TRIGGER trg_crm_lead_sources_updated_at
BEFORE UPDATE ON public.crm_lead_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de proteção: bloqueia DELETE de presets como camada extra
CREATE OR REPLACE FUNCTION public.protect_system_lead_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system lead source: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_protect_system_lead_sources
BEFORE DELETE ON public.crm_lead_sources
FOR EACH ROW
EXECUTE FUNCTION public.protect_system_lead_sources();

-- Seed dos 10 presets
INSERT INTO public.crm_lead_sources (name, slug, icon, color, display_order, is_system) VALUES
  ('Instagram',         'instagram',    'Instagram', '#E1306C', 10, true),
  ('LinkedIn',          'linkedin',     'Linkedin',  '#0A66C2', 20, true),
  ('Indicação',         'indicacao',    'Users',     '#22D3EE', 30, true),
  ('Site / Formulário', 'site',         'Globe',     '#10B981', 40, true),
  ('WhatsApp',          'whatsapp',     'MessageCircle', '#25D366', 50, true),
  ('E-mail',            'email',        'Mail',      '#6366F1', 60, true),
  ('Evento',            'evento',       'CalendarDays', '#F59E0B', 70, true),
  ('Google Ads',        'google-ads',   'Search',    '#4285F4', 80, true),
  ('Outbound (cold)',   'outbound',     'Send',      '#94A3B8', 90, true),
  ('Parceria',          'parceria',     'Handshake', '#A855F7', 100, true);