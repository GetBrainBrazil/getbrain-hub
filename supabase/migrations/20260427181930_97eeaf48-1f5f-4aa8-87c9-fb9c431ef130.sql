-- v1.8 — Campos de descoberta em deals
-- Todos nullable / com default seguro para não quebrar deals existentes.
-- RLS já coberta pela policy `deals_authenticated` (ALL para authenticated) — nenhuma policy nova necessária.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS business_context       TEXT,
  ADD COLUMN IF NOT EXISTS scope_in               TEXT,
  ADD COLUMN IF NOT EXISTS scope_out              TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_criteria    JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deliverables           TEXT[]  NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS premises               TEXT[]  NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS identified_risks       TEXT[]  NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS technical_stack        TEXT[]  NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pricing_rationale      TEXT,
  ADD COLUMN IF NOT EXISTS next_step              TEXT,
  ADD COLUMN IF NOT EXISTS next_step_date         DATE,
  ADD COLUMN IF NOT EXISTS decision_makers        TEXT,
  ADD COLUMN IF NOT EXISTS competitors            TEXT,
  ADD COLUMN IF NOT EXISTS budget_range_min       NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS budget_range_max       NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS desired_start_date     DATE,
  ADD COLUMN IF NOT EXISTS desired_delivery_date  DATE;

-- Sanity check: budget_max >= budget_min quando ambos preenchidos
ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_budget_range_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_budget_range_check
  CHECK (
    budget_range_min IS NULL
    OR budget_range_max IS NULL
    OR budget_range_max >= budget_range_min
  );

-- Índice leve para filtrar deals com next_step_date pendente (usado no Kanban)
CREATE INDEX IF NOT EXISTS idx_deals_next_step_date
  ON public.deals (next_step_date)
  WHERE next_step_date IS NOT NULL AND deleted_at IS NULL;