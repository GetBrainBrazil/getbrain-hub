
-- ============================================================================
-- 1. ADICIONAR ESTÁGIO orcamento_aceito_verbal AO ENUM deal_stage
-- ============================================================================
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'orcamento_aceito_verbal' BEFORE 'fechado_ganho';

-- ============================================================================
-- 2. ENUMS NOVOS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE proposal_ai_generation_type AS ENUM (
    'full_content',
    'executive_summary',
    'pain_context',
    'solution_overview',
    'item_description'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_chat_role AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_faq_category AS ENUM (
    'pagamento','prazo','manutencao','tecnico','comercial','outros'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_faq_status AS ENUM ('ativo','inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. TABELA: proposal_ai_generations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  generation_type proposal_ai_generation_type NOT NULL,
  model text NOT NULL,
  prompt_used text NOT NULL,
  output_raw text,
  output_used text,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  was_filtered boolean NOT NULL DEFAULT false,
  filter_reasons text[] DEFAULT '{}',
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_proposal_ai_gen_proposal ON public.proposal_ai_generations(proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_ai_gen_org ON public.proposal_ai_generations(organization_id, created_at DESC);

ALTER TABLE public.proposal_ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_gen_authenticated_all" ON public.proposal_ai_generations
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 4. TABELA: proposal_chat_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  message_count integer NOT NULL DEFAULT 0,
  escalated_to_whatsapp boolean NOT NULL DEFAULT false,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (proposal_id, session_token)
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_proposal ON public.proposal_chat_sessions(proposal_id, started_at DESC);

ALTER TABLE public.proposal_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_sessions_authenticated_read" ON public.proposal_chat_sessions
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "chat_sessions_authenticated_all" ON public.proposal_chat_sessions
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. TABELA: proposal_chat_messages (log imutável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.proposal_chat_sessions(id) ON DELETE CASCADE,
  role proposal_chat_role NOT NULL,
  content text NOT NULL,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  was_filtered boolean DEFAULT false,
  filter_reasons text[] DEFAULT '{}',
  was_escalation_suggested boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.proposal_chat_messages(session_id, created_at);

ALTER TABLE public.proposal_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_authenticated_read" ON public.proposal_chat_messages
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 6. TABELA: proposal_views
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text,
  duration_seconds integer DEFAULT 0,
  sections_viewed jsonb DEFAULT '[]'::jsonb,
  pdf_downloaded boolean NOT NULL DEFAULT false,
  UNIQUE (proposal_id, session_token)
);
CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal ON public.proposal_views(proposal_id, viewed_at DESC);

ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposal_views_authenticated_read" ON public.proposal_views
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 7. TABELA: proposal_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  session_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON public.proposal_events(proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_events_type ON public.proposal_events(proposal_id, event_type, created_at DESC);

ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposal_events_authenticated_read" ON public.proposal_events
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 8. TABELA: proposal_faqs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category proposal_faq_category NOT NULL DEFAULT 'outros',
  status proposal_faq_status NOT NULL DEFAULT 'ativo',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_faqs_org_status ON public.proposal_faqs(organization_id, status) WHERE deleted_at IS NULL;

ALTER TABLE public.proposal_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_authenticated_all" ON public.proposal_faqs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 9. TABELA: proposal_ai_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  chat_enabled boolean NOT NULL DEFAULT true,
  generation_enabled boolean NOT NULL DEFAULT true,
  max_messages_per_session integer NOT NULL DEFAULT 20,
  chat_model text NOT NULL DEFAULT 'openai/gpt-5-mini',
  generation_model text NOT NULL DEFAULT 'openai/gpt-5',
  monthly_budget_usd numeric(10,2) NOT NULL DEFAULT 50.00,
  current_month_spend_usd numeric(10,2) NOT NULL DEFAULT 0,
  current_month_started_at date NOT NULL DEFAULT date_trunc('month', now())::date,
  notify_on_first_view boolean NOT NULL DEFAULT true,
  notify_on_pdf_download boolean NOT NULL DEFAULT false,
  notify_on_high_engagement boolean NOT NULL DEFAULT true,
  notify_on_manifested_interest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.proposal_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_settings_authenticated_read" ON public.proposal_ai_settings
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "ai_settings_admin_write" ON public.proposal_ai_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default row para a organization existente (pega a primeira)
INSERT INTO public.proposal_ai_settings (organization_id)
SELECT DISTINCT organization_id FROM public.proposals WHERE organization_id IS NOT NULL
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- 10. TRIGGERS DE updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_ai_gen_updated ON public.proposal_ai_generations;
CREATE TRIGGER trg_ai_gen_updated BEFORE UPDATE ON public.proposal_ai_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chat_sessions_updated ON public.proposal_chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated BEFORE UPDATE ON public.proposal_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_faqs_updated ON public.proposal_faqs;
CREATE TRIGGER trg_faqs_updated BEFORE UPDATE ON public.proposal_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_settings_updated ON public.proposal_ai_settings;
CREATE TRIGGER trg_ai_settings_updated BEFORE UPDATE ON public.proposal_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
