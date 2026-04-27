-- ============================================================
-- MIGRATION v2.0 — CRM como funil de conversão
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 SECTORS (hierarquia 2 níveis)
-- ------------------------------------------------------------
CREATE TABLE public.sectors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name            TEXT NOT NULL,
  parent_sector_id UUID REFERENCES public.sectors(id) ON DELETE RESTRICT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public.actors(id),
  updated_by      UUID REFERENCES public.actors(id),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT sector_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_sectors_org_active ON public.sectors(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_sectors_parent ON public.sectors(parent_sector_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_sectors_unique_name_per_parent
  ON public.sectors(organization_id, COALESCE(parent_sector_id, '00000000-0000-0000-0000-000000000000'::UUID), LOWER(name))
  WHERE deleted_at IS NULL;

-- Trigger para reforçar profundidade máxima de 2 níveis
CREATE OR REPLACE FUNCTION public.enforce_sector_max_depth()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  parent_has_parent BOOLEAN;
BEGIN
  IF NEW.parent_sector_id IS NOT NULL THEN
    SELECT (parent_sector_id IS NOT NULL) INTO parent_has_parent
    FROM public.sectors WHERE id = NEW.parent_sector_id;
    IF parent_has_parent THEN
      RAISE EXCEPTION 'Setor não pode ter mais de 2 níveis (sub-sub-setor não permitido)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sectors_max_depth
  BEFORE INSERT OR UPDATE OF parent_sector_id ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sector_max_depth();

CREATE TRIGGER trg_sectors_updated_at
  BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY sectors_authenticated ON public.sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 1.2 SEED setores
-- ------------------------------------------------------------
DO $$
DECLARE
  org_id UUID;
  saude_id UUID;
  rh_id UUID;
BEGIN
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  IF org_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.sectors (organization_id, name, parent_sector_id) VALUES
    (org_id, 'Saúde', NULL),
    (org_id, 'Educação', NULL),
    (org_id, 'Recursos Humanos', NULL),
    (org_id, 'Jurídico', NULL),
    (org_id, 'Contabilidade', NULL),
    (org_id, 'Tecnologia', NULL),
    (org_id, 'Indústria', NULL),
    (org_id, 'Varejo', NULL),
    (org_id, 'Serviços', NULL),
    (org_id, 'Financeiro', NULL),
    (org_id, 'Imobiliário', NULL),
    (org_id, 'Alimentação', NULL),
    (org_id, 'Logística', NULL),
    (org_id, 'Marketing & Publicidade', NULL),
    (org_id, 'Outro', NULL);

  SELECT id INTO saude_id FROM public.sectors WHERE organization_id = org_id AND name = 'Saúde' AND parent_sector_id IS NULL;
  SELECT id INTO rh_id FROM public.sectors WHERE organization_id = org_id AND name = 'Recursos Humanos' AND parent_sector_id IS NULL;

  INSERT INTO public.sectors (organization_id, name, parent_sector_id) VALUES
    (org_id, 'Clínicas', saude_id),
    (org_id, 'Odontologia', saude_id),
    (org_id, 'Hospitais', saude_id),
    (org_id, 'Estética', saude_id),
    (org_id, 'Recrutamento', rh_id),
    (org_id, 'Treinamento', rh_id);
END $$;

-- ------------------------------------------------------------
-- 1.3 + 1.4 COMPANIES — sector_id + client_type + revenue_range + digital_maturity
-- ------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN sector_id UUID REFERENCES public.sectors(id);

UPDATE public.companies c
SET sector_id = s.id
FROM public.sectors s
WHERE LOWER(TRIM(c.industry)) = LOWER(s.name)
  AND s.parent_sector_id IS NULL
  AND s.deleted_at IS NULL;

UPDATE public.companies
SET sector_id = (SELECT id FROM public.sectors WHERE name = 'Outro' AND parent_sector_id IS NULL LIMIT 1)
WHERE sector_id IS NULL;

COMMENT ON COLUMN public.companies.industry IS 'DEPRECATED v2.0: usar sector_id. Remover em v2.2 após validação.';

CREATE TYPE public.company_client_type AS ENUM ('b2b', 'b2c', 'b2b_b2c');
ALTER TABLE public.companies ADD COLUMN client_type public.company_client_type;

CREATE TYPE public.company_revenue_range AS ENUM (
  'ate_360k', 'de_360k_a_4_8m', 'de_4_8m_a_30m', 'acima_30m'
);
ALTER TABLE public.companies ADD COLUMN revenue_range public.company_revenue_range;

ALTER TABLE public.companies ADD COLUMN digital_maturity SMALLINT
  CHECK (digital_maturity BETWEEN 1 AND 5);

-- ------------------------------------------------------------
-- 1.5 COMPANY_CONTACT_ROLES
-- ------------------------------------------------------------
CREATE TYPE public.contact_role AS ENUM (
  'decisor', 'usuario_final', 'tecnico', 'financeiro', 'outro'
);

CREATE TABLE public.company_contact_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id),
  company_person_id UUID NOT NULL REFERENCES public.company_people(id) ON DELETE CASCADE,
  role              public.contact_role NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.actors(id),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (company_person_id, role)
);

CREATE INDEX idx_contact_roles_company_person ON public.company_contact_roles(company_person_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contact_roles_role ON public.company_contact_roles(role) WHERE deleted_at IS NULL;

ALTER TABLE public.company_contact_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_roles_authenticated ON public.company_contact_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 1.6 DEALS — project_type_v2 (NÃO renomear legacy), pain, estimate
-- ------------------------------------------------------------
CREATE TYPE public.deal_project_type AS ENUM (
  'whatsapp_chatbot', 'ai_sdr', 'sistema_gestao',
  'automacao_processo', 'integracao_sistemas', 'outro'
);

ALTER TABLE public.deals ADD COLUMN project_type_v2 public.deal_project_type;

UPDATE public.deals SET project_type_v2 =
  CASE
    WHEN project_type IS NULL THEN NULL
    WHEN LOWER(project_type::TEXT) LIKE '%whatsapp%' OR LOWER(project_type::TEXT) LIKE '%chatbot%' THEN 'whatsapp_chatbot'::public.deal_project_type
    WHEN LOWER(project_type::TEXT) LIKE '%sdr%' THEN 'ai_sdr'::public.deal_project_type
    WHEN LOWER(project_type::TEXT) LIKE '%sistema%' OR LOWER(project_type::TEXT) LIKE '%gestao%' OR LOWER(project_type::TEXT) LIKE '%gestão%' THEN 'sistema_gestao'::public.deal_project_type
    WHEN LOWER(project_type::TEXT) LIKE '%automa%' THEN 'automacao_processo'::public.deal_project_type
    WHEN LOWER(project_type::TEXT) LIKE '%integra%' THEN 'integracao_sistemas'::public.deal_project_type
    ELSE 'outro'::public.deal_project_type
  END;

COMMENT ON COLUMN public.deals.project_type IS 'DEPRECATED v2.0: substituído por project_type_v2. Remover em v2.2 após renomear v2 → project_type e migrar projects.project_type também.';

ALTER TABLE public.deals ADD COLUMN project_type_custom TEXT;

-- Bloco Dor
CREATE TYPE public.deal_pain_category AS ENUM (
  'operacional', 'comercial', 'estrategica', 'compliance', 'experiencia', 'outra'
);

ALTER TABLE public.deals ADD COLUMN pain_category public.deal_pain_category;
ALTER TABLE public.deals ADD COLUMN pain_description TEXT;
ALTER TABLE public.deals ADD COLUMN pain_cost_brl_monthly NUMERIC(12,2);
ALTER TABLE public.deals ADD COLUMN pain_hours_monthly NUMERIC(8,2);
ALTER TABLE public.deals ADD COLUMN current_solution TEXT;

-- Bloco Estimativa
ALTER TABLE public.deals ADD COLUMN estimated_hours_total NUMERIC(8,2);
ALTER TABLE public.deals ADD COLUMN estimated_complexity SMALLINT
  CHECK (estimated_complexity BETWEEN 1 AND 5);

CREATE TYPE public.estimation_confidence AS ENUM ('alta', 'media', 'baixa');
ALTER TABLE public.deals ADD COLUMN estimation_confidence public.estimation_confidence;

-- ------------------------------------------------------------
-- 1.7 DEAL_DEPENDENCIES (enums novos — mismatch parcial com project_dependency_*)
-- ------------------------------------------------------------
CREATE TYPE public.deal_dependency_type AS ENUM (
  'acesso_sistema', 'dado', 'pessoa', 'hardware', 'autorizacao_legal', 'outro'
);

CREATE TYPE public.deal_dependency_status AS ENUM (
  'aguardando_combinar', 'combinado', 'liberado', 'atrasado'
);

CREATE TABLE public.deal_dependencies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES public.organizations(id),
  deal_id                  UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  dependency_type          public.deal_dependency_type NOT NULL,
  description              TEXT NOT NULL,
  responsible_person_name  TEXT,
  responsible_person_role  TEXT,
  agreed_deadline          DATE,
  status                   public.deal_dependency_status NOT NULL DEFAULT 'aguardando_combinar',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID REFERENCES public.actors(id),
  updated_by               UUID REFERENCES public.actors(id),
  deleted_at               TIMESTAMPTZ,
  CONSTRAINT dependency_description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

CREATE INDEX idx_deal_deps_deal ON public.deal_dependencies(deal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deal_deps_status ON public.deal_dependencies(status) WHERE deleted_at IS NULL;

ALTER TABLE public.deal_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_deps_authenticated ON public.deal_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_deal_deps_updated_at
  BEFORE UPDATE ON public.deal_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 1.8 PROJECTS — baseline herdado do deal + rastreabilidade + source_deal_dependency_id em project_dependencies
-- ------------------------------------------------------------
ALTER TABLE public.projects ADD COLUMN estimated_hours_baseline NUMERIC(8,2);
ALTER TABLE public.projects ADD COLUMN complexity_baseline SMALLINT
  CHECK (complexity_baseline BETWEEN 1 AND 5);
ALTER TABLE public.projects ADD COLUMN source_deal_id UUID REFERENCES public.deals(id);

CREATE INDEX idx_projects_source_deal ON public.projects(source_deal_id) WHERE deleted_at IS NULL;

-- Rastreabilidade dependency origem (decisão 3, ajuste do usuário)
ALTER TABLE public.project_dependencies ADD COLUMN source_deal_dependency_id UUID REFERENCES public.deal_dependencies(id);
CREATE INDEX idx_project_deps_source_deal_dep ON public.project_dependencies(source_deal_dependency_id) WHERE deleted_at IS NULL;