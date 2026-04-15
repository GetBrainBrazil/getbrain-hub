ALTER TABLE public.contas_bancarias ADD COLUMN moeda text NOT NULL DEFAULT 'BRL';
ALTER TABLE public.contas_bancarias DROP COLUMN cor;