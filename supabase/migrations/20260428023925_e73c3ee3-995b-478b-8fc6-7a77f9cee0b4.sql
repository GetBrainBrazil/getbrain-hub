-- =========================================================================
-- Prompt 11 — Fase 1: Módulo de Integrações (schema + Vault)
-- =========================================================================

-- 1) Vault já está habilitado (extensão supabase_vault). Confirmação no-op:
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- 2) Enums
CREATE TYPE public.integration_scope_type AS ENUM ('per_user', 'per_organization');
CREATE TYPE public.integration_status AS ENUM ('connected', 'expired', 'revoked', 'error');
CREATE TYPE public.integration_event_type AS ENUM (
  'connected', 'token_refreshed', 'refresh_failed',
  'used', 'rate_limited', 'revoked', 'reconnected', 'error'
);

-- 3) Catálogo de provedores
CREATE TABLE public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  oauth_revoke_url TEXT,
  available_capabilities TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.integration_providers
  (code, name, description, oauth_authorize_url, oauth_token_url, oauth_revoke_url, available_capabilities)
VALUES (
  'google',
  'Google',
  'Conecte sua conta Google para sincronizar Calendar e (em breve) Gmail.',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  'https://oauth2.googleapis.com/revoke',
  ARRAY['calendar', 'gmail', 'drive']
);

-- 4) Conexões ativas
CREATE TABLE public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  provider_id UUID NOT NULL REFERENCES public.integration_providers(id),
  scope_type public.integration_scope_type NOT NULL,
  owner_actor_id UUID NOT NULL REFERENCES public.actors(id),

  external_account_id TEXT NOT NULL,
  external_account_label TEXT,

  enabled_capabilities TEXT[] NOT NULL DEFAULT '{}',
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',

  access_token_secret_id UUID,
  refresh_token_secret_id UUID,
  access_token_expires_at TIMESTAMPTZ,

  status public.integration_status NOT NULL DEFAULT 'connected',
  status_message TEXT,
  last_used_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.actors(id),
  updated_by UUID REFERENCES public.actors(id),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_per_user_provider_account UNIQUE NULLS NOT DISTINCT (
    organization_id, provider_id, owner_actor_id, external_account_id, scope_type
  )
);

CREATE INDEX idx_integration_connections_org
  ON public.integration_connections(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_integration_connections_actor
  ON public.integration_connections(owner_actor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_integration_connections_status
  ON public.integration_connections(status) WHERE deleted_at IS NULL;

-- 5) Eventos / audit log de integrações
CREATE TABLE public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  event_type public.integration_event_type NOT NULL,
  capability TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.actors(id)
);

CREATE INDEX idx_integration_events_connection ON public.integration_events(connection_id);
CREATE INDEX idx_integration_events_type ON public.integration_events(event_type);

-- 6) Trigger updated_at (reusa função padrão se existir; se não, cria)
CREATE OR REPLACE FUNCTION public.set_updated_at_integrations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_integration_providers_updated_at
  BEFORE UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_integrations();

CREATE TRIGGER trg_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_integrations();

-- 7) RLS
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_select_authenticated" ON public.integration_providers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "connections_all_authenticated" ON public.integration_connections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "events_all_authenticated" ON public.integration_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8) Helpers de Vault (SECURITY DEFINER, search_path fixo)
CREATE OR REPLACE FUNCTION public.integration_save_token(
  p_token TEXT,
  p_label TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_secret_id UUID;
BEGIN
  v_secret_id := vault.create_secret(p_token, p_label);
  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_get_token(
  p_secret_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_token TEXT;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_update_token(
  p_secret_id UUID,
  p_new_token TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  PERFORM vault.update_secret(p_secret_id, p_new_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_delete_token(
  p_secret_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_secret_id;
END;
$$;

-- Restringe execução das helpers ao role authenticated (frontend nunca chama get/update/delete diretamente,
-- mas authorize/refresh/revoke nas edge functions usarão service_role, que sempre tem acesso).
REVOKE ALL ON FUNCTION public.integration_save_token(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_get_token(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_update_token(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_delete_token(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.integration_save_token(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_get_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_update_token(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_delete_token(UUID) TO service_role;