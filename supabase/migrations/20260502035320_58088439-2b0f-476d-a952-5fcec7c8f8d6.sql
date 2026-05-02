-- Enums para channel e direction
DO $$ BEGIN
  CREATE TYPE public.proposal_interaction_channel AS ENUM (
    'whatsapp', 'email', 'telefone', 'reuniao_presencial', 'reuniao_video', 'observacao'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.proposal_interaction_direction AS ENUM (
    'inbound', 'outbound', 'internal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.proposal_interactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  proposal_id     uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  channel         public.proposal_interaction_channel NOT NULL,
  direction       public.proposal_interaction_direction NOT NULL,
  interaction_at  timestamptz NOT NULL DEFAULT now(),
  summary         text NOT NULL CHECK (char_length(summary) <= 200),
  details         text,
  recorded_by     uuid,
  auto_generated  boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_by      uuid,
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_proposal_interactions_proposal_id     ON public.proposal_interactions(proposal_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposal_interactions_interaction_at  ON public.proposal_interactions(interaction_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposal_interactions_channel         ON public.proposal_interactions(channel) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposal_interactions_direction       ON public.proposal_interactions(direction) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposal_interactions_organization_id ON public.proposal_interactions(organization_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.proposal_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proposal_interactions_authenticated ON public.proposal_interactions;
CREATE POLICY proposal_interactions_authenticated
  ON public.proposal_interactions
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger updated_at (reusa função genérica do projeto se existir; senão cria)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposal_interactions_updated_at ON public.proposal_interactions;
CREATE TRIGGER trg_proposal_interactions_updated_at
BEFORE UPDATE ON public.proposal_interactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();