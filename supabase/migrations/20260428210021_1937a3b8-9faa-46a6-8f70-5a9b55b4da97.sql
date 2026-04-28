-- 1) Catálogo de papéis de contato
CREATE TABLE IF NOT EXISTS public.crm_contact_roles (
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

CREATE INDEX IF NOT EXISTS idx_crm_contact_roles_active_order
  ON public.crm_contact_roles (is_active, display_order);

ALTER TABLE public.crm_contact_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_contact_roles_select_auth ON public.crm_contact_roles;
CREATE POLICY crm_contact_roles_select_auth
  ON public.crm_contact_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS crm_contact_roles_insert_admin ON public.crm_contact_roles;
CREATE POLICY crm_contact_roles_insert_admin
  ON public.crm_contact_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS crm_contact_roles_update_admin ON public.crm_contact_roles;
CREATE POLICY crm_contact_roles_update_admin
  ON public.crm_contact_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS crm_contact_roles_delete_admin_non_system ON public.crm_contact_roles;
CREATE POLICY crm_contact_roles_delete_admin_non_system
  ON public.crm_contact_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_system = false);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_crm_contact_roles_updated_at ON public.crm_contact_roles;
CREATE TRIGGER trg_crm_contact_roles_updated_at
  BEFORE UPDATE ON public.crm_contact_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Seed dos 5 papéis atuais
INSERT INTO public.crm_contact_roles (name, slug, color, display_order, is_active, is_system)
VALUES
  ('Decisor',      'decisor',       '#10B981', 1, true, true),
  ('Usuário final','usuario_final', '#22D3EE', 2, true, true),
  ('Técnico',      'tecnico',       '#A855F7', 3, true, true),
  ('Financeiro',   'financeiro',    '#F59E0B', 4, true, true),
  ('Outro',        'outro',         '#94A3B8', 5, true, true)
ON CONFLICT (slug) DO NOTHING;

-- 3) Adicionar role_id em company_contact_roles
ALTER TABLE public.company_contact_roles
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.crm_contact_roles(id) ON DELETE RESTRICT;

-- Backfill: mapear enum -> slug -> id
UPDATE public.company_contact_roles ccr
SET role_id = cr.id
FROM public.crm_contact_roles cr
WHERE ccr.role_id IS NULL
  AND cr.slug = ccr.role::text;

-- Tornar role_id obrigatório
ALTER TABLE public.company_contact_roles
  ALTER COLUMN role_id SET NOT NULL;

-- Trocar a unique antiga
ALTER TABLE public.company_contact_roles
  DROP CONSTRAINT IF EXISTS company_contact_roles_company_person_id_role_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_contact_roles_company_person_id_role_id_key'
  ) THEN
    ALTER TABLE public.company_contact_roles
      ADD CONSTRAINT company_contact_roles_company_person_id_role_id_key
      UNIQUE (company_person_id, role_id);
  END IF;
END $$;

-- Tornar `role` (enum) opcional para permitir papéis customizados (slug fora do enum)
ALTER TABLE public.company_contact_roles
  ALTER COLUMN role DROP NOT NULL;

-- 4) Trigger para preencher `role` (enum) a partir do role_id quando o slug existir no enum,
-- mantendo compatibilidade com código legado que ainda lê a coluna.
CREATE OR REPLACE FUNCTION public.sync_company_contact_role_enum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
BEGIN
  SELECT slug INTO v_slug FROM public.crm_contact_roles WHERE id = NEW.role_id;
  BEGIN
    NEW.role := v_slug::contact_role;
  EXCEPTION WHEN invalid_text_representation THEN
    NEW.role := NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_contact_role_enum ON public.company_contact_roles;
CREATE TRIGGER trg_sync_company_contact_role_enum
  BEFORE INSERT OR UPDATE OF role_id ON public.company_contact_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_company_contact_role_enum();