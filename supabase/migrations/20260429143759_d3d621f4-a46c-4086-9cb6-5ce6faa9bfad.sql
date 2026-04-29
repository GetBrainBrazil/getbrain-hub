-- Enum de prioridade da dependência
DO $$ BEGIN
  CREATE TYPE public.deal_dependency_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.deal_dependencies
  ADD COLUMN IF NOT EXISTS priority public.deal_dependency_priority NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS impact_if_missing text,
  ADD COLUMN IF NOT EXISTS responsible_email text,
  ADD COLUMN IF NOT EXISTS responsible_phone text,
  ADD COLUMN IF NOT EXISTS requested_at date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS internal_owner_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_blocker boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS links text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_deal_deps_internal_owner
  ON public.deal_dependencies(internal_owner_actor_id);
CREATE INDEX IF NOT EXISTS idx_deal_deps_blocker
  ON public.deal_dependencies(deal_id) WHERE is_blocker = true;