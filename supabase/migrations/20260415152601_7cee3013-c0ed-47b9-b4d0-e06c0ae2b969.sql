ALTER TABLE public.contas_bancarias
ADD COLUMN chaves_pix text[] DEFAULT '{}',
ADD COLUMN observacoes text;