-- Add commercial fields to proposals to mirror CRM deal pricing model
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS implementation_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS mrr_start_trigger text,
  ADD COLUMN IF NOT EXISTS mrr_start_date date,
  ADD COLUMN IF NOT EXISTS mrr_duration_months integer,
  ADD COLUMN IF NOT EXISTS mrr_discount_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS mrr_discount_months integer;

-- Backfill implementation_value from existing scope_items totals (legacy data)
UPDATE public.proposals p
SET implementation_value = COALESCE((
  SELECT SUM((item->>'value')::numeric)
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.scope_items) = 'array' THEN p.scope_items
      ELSE '[]'::jsonb
    END
  ) AS item
), 0)
WHERE p.implementation_value IS NULL;