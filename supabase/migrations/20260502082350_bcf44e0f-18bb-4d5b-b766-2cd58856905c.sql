ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS investment_layout text DEFAULT 'total_first',
  ADD COLUMN IF NOT EXISTS show_investment_breakdown boolean DEFAULT true;

ALTER TABLE public.public_page_settings
  ADD COLUMN IF NOT EXISTS kpi_labels jsonb DEFAULT '{"investimento":"Investimento","mensalidade":"Mensalidade","implementacao":"Implementação","validade":"Válida até"}'::jsonb;

UPDATE public.public_page_settings SET kpi_labels = '{"investimento":"Investimento","mensalidade":"Mensalidade","implementacao":"Implementação","validade":"Válida até"}'::jsonb WHERE kpi_labels IS NULL;