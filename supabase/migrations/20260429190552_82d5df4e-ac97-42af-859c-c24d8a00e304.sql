-- 1. Estender o enum deal_stage com os novos valores (manter os antigos para compat)
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'descoberta_marcada';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'descobrindo';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'proposta_na_mesa';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'ajustando';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'ganho';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'perdido';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'gelado';