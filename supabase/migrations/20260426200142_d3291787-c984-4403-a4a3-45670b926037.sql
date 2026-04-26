
-- Sequência para code PROP-XXXX
CREATE SEQUENCE IF NOT EXISTS public.proposal_code_seq START 1;

-- Tabela proposals
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  code text UNIQUE NOT NULL DEFAULT ('PROP-' || lpad(nextval('public.proposal_code_seq')::text, 4, '0')),

  -- Vínculos opcionais
  deal_id uuid REFERENCES public.deals(id),
  company_id uuid REFERENCES public.companies(id),
  project_id uuid REFERENCES public.projects(id),

  -- Estado
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviado','aceito','recusado','expirado','cancelado')),

  -- Capa (snapshot)
  client_company_name text NOT NULL,
  client_logo_url text,
  client_city text,

  -- Conteúdo dinâmico
  scope_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  maintenance_monthly_value numeric(14,2),
  maintenance_description text DEFAULT 'Tokens + Servidor + Desenvolvedor',

  -- Prazo
  implementation_days integer DEFAULT 90,
  validation_days integer DEFAULT 30,

  -- Considerações
  considerations jsonb DEFAULT '[
    "O prazo pode sofrer alterações dependendo da disponibilidade do cliente e das ferramentas envolvidas no projeto.",
    "As ferramentas de terceiros deverão ser contratadas a parte pelo cliente e não estão contempladas nesta proposta."
  ]'::jsonb,

  -- Validade e gestão
  valid_until date NOT NULL,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,

  -- PDF cache
  pdf_url text,
  pdf_generated_at timestamptz,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_company ON public.proposals(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON public.proposals(deal_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_valid_until ON public.proposals(valid_until) WHERE deleted_at IS NULL;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all" ON public.proposals;
CREATE POLICY "authenticated_all" ON public.proposals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at_proposals ON public.proposals;
CREATE TRIGGER set_updated_at_proposals
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proposals_authenticated_upload" ON storage.objects;
CREATE POLICY "proposals_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proposals');

DROP POLICY IF EXISTS "proposals_authenticated_update" ON storage.objects;
CREATE POLICY "proposals_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'proposals') WITH CHECK (bucket_id = 'proposals');

DROP POLICY IF EXISTS "proposals_authenticated_delete" ON storage.objects;
CREATE POLICY "proposals_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'proposals');

DROP POLICY IF EXISTS "proposals_public_read" ON storage.objects;
CREATE POLICY "proposals_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'proposals');
