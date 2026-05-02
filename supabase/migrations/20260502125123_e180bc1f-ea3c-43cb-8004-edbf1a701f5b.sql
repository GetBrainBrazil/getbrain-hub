-- Limpa estimated_value legado nos deals onde o valor foi inflado pela
-- fórmula antiga (implementação + MRR × 12). Mantém valores manuais que
-- não casam com essa fórmula.
UPDATE public.deals
SET estimated_value = NULL
WHERE deleted_at IS NULL
  AND estimated_value IS NOT NULL
  AND estimated_value = (
    COALESCE(estimated_implementation_value, 0)
    + COALESCE(estimated_mrr_value, 0) * 12
  )
  AND (
    COALESCE(estimated_implementation_value, 0) > 0
    OR COALESCE(estimated_mrr_value, 0) > 0
  );