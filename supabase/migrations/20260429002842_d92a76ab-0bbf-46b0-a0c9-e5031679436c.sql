
-- 1. Tabela crm_project_types (mesmo padrão de crm_pain_categories)
CREATE TABLE IF NOT EXISTS public.crm_project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_project_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_project_types_select_auth
  ON public.crm_project_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY crm_project_types_insert_admin
  ON public.crm_project_types FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY crm_project_types_update_admin
  ON public.crm_project_types FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY crm_project_types_delete_admin_non_system
  ON public.crm_project_types FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_system = false);

CREATE TRIGGER trg_crm_project_types_updated_at
  BEFORE UPDATE ON public.crm_project_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed com os tipos atuais (cores idênticas às de PROJECT_TYPE_V2_COLOR)
INSERT INTO public.crm_project_types (name, slug, color, display_order, is_active, is_system) VALUES
  ('Chatbot WhatsApp',       'whatsapp_chatbot',     'bg-success/15 text-success border-success/30',       10, true,  true),
  ('SDR com IA',              'ai_sdr',               'bg-accent/15 text-accent border-accent/30',          20, true,  true),
  ('Sistema de gestão',       'sistema_gestao',       'bg-chart-4/15 text-chart-4 border-chart-4/30',       30, true,  true),
  ('Automação de processo',   'automacao_processo',   'bg-chart-5/15 text-chart-5 border-chart-5/30',       40, true,  true),
  ('Integração de sistemas',  'integracao_sistemas',  'bg-warning/15 text-warning border-warning/30',       50, true,  true),
  ('Outro',                   'outro',                'bg-muted text-muted-foreground border-border',       90, false, true)
ON CONFLICT (slug) DO NOTHING;

-- 3. Converter project_type_v2 de enum para text
ALTER TABLE public.deals
  ALTER COLUMN project_type_v2 TYPE text USING project_type_v2::text;

COMMENT ON COLUMN public.deals.project_type_v2 IS 'Slug em crm_project_types. Era enum deal_project_type, agora text livre p/ permitir tipos customizados.';

-- 4. Remover project_type_custom (sem dados a preservar — query confirmou 0 linhas)
ALTER TABLE public.deals DROP COLUMN IF EXISTS project_type_custom;

-- 5. Drop do enum antigo se ninguém mais usa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_project_type') THEN
    BEGIN
      DROP TYPE public.deal_project_type;
    EXCEPTION WHEN dependent_objects_still_exist THEN
      -- mantém se ainda houver dependência
      NULL;
    END;
  END IF;
END $$;
