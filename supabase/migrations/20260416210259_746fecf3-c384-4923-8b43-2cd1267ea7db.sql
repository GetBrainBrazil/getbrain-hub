ALTER TABLE public.centros_custo
ADD COLUMN IF NOT EXISTS codigo text,
ADD COLUMN IF NOT EXISTS responsavel text;

CREATE UNIQUE INDEX IF NOT EXISTS centros_custo_codigo_unique ON public.centros_custo (codigo) WHERE codigo IS NOT NULL;