ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS scope_bullets jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.deals.scope_bullets IS 'Resumo do escopo em bullet points (array de strings). Pode ser preenchido manualmente ou gerado pela edge function organize-scope.';