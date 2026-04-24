ALTER TABLE public.maintenance_contracts
ADD COLUMN IF NOT EXISTS discount_duration_months INTEGER NULL;

COMMENT ON COLUMN public.maintenance_contracts.discount_duration_months IS
'Duração do desconto em meses a partir de start_date. NULL = desconto por tempo indefinido. Aplicável apenas quando monthly_fee_discount_percent > 0.';