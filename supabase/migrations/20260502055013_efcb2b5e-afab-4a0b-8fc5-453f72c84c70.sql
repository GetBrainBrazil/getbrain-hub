ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS installments_count int,
  ADD COLUMN IF NOT EXISTS first_installment_date date;