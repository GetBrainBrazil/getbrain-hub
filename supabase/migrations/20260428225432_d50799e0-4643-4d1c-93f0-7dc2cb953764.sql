ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS estimated_implementation_value numeric,
  ADD COLUMN IF NOT EXISTS estimated_mrr_value numeric;

UPDATE public.deals
SET estimated_implementation_value = estimated_value
WHERE estimated_implementation_value IS NULL AND estimated_value IS NOT NULL;

COMMENT ON COLUMN public.deals.estimated_implementation_value IS 'Valor estimado de implementacao (one-time, BRL)';
COMMENT ON COLUMN public.deals.estimated_mrr_value IS 'Valor estimado de receita recorrente mensal/MRR (BRL/mes)';