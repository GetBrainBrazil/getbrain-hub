-- 1. Converter pain_category de enum para text para suportar valores dinâmicos
ALTER TABLE public.deals
  ALTER COLUMN pain_category TYPE text USING pain_category::text;

-- 2. Criar tabela crm_pain_categories
CREATE TABLE public.crm_pain_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.crm_pain_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_pain_categories_select_auth
  ON public.crm_pain_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY crm_pain_categories_insert_admin
  ON public.crm_pain_categories FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY crm_pain_categories_update_admin
  ON public.crm_pain_categories FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY crm_pain_categories_delete_admin_non_system
  ON public.crm_pain_categories FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_system = false);

-- 4. Trigger updated_at
CREATE TRIGGER trg_crm_pain_categories_updated_at
  BEFORE UPDATE ON public.crm_pain_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Seed das 6 categorias padrão (mesmos slugs do enum antigo)
INSERT INTO public.crm_pain_categories (name, slug, color, display_order, is_active, is_system) VALUES
  ('Operacional',           'operacional', 'bg-chart-4/15 text-chart-4 border-chart-4/30',   10, true, true),
  ('Comercial',             'comercial',   'bg-success/15 text-success border-success/30',   20, true, true),
  ('Estratégica',           'estrategica', 'bg-accent/15 text-accent border-accent/30',      30, true, true),
  ('Compliance / Legal',    'compliance',  'bg-warning/15 text-warning border-warning/30',   40, true, true),
  ('Experiência do cliente','experiencia', 'bg-chart-5/15 text-chart-5 border-chart-5/30',   50, true, true),
  ('Outra',                 'outra',       'bg-muted text-muted-foreground border-border',   90, true, true);

-- 6. Drop do enum antigo se não estiver mais em uso
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_pain_category') THEN
    BEGIN
      DROP TYPE public.deal_pain_category;
    EXCEPTION WHEN dependent_objects_still_exist THEN
      NULL; -- algum outro lugar ainda usa, deixa como está
    END;
  END IF;
END$$;