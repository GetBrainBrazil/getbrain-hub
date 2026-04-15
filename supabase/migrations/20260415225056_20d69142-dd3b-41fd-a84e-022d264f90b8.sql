
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_empresa text,
  ADD COLUMN IF NOT EXISTS emails text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS telefones text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS complemento text;

-- Migrate existing single email/telefone to arrays
UPDATE public.clientes SET emails = ARRAY[email] WHERE email IS NOT NULL AND (emails IS NULL OR emails = '{}');
UPDATE public.clientes SET telefones = ARRAY[telefone] WHERE telefone IS NOT NULL AND (telefones IS NULL OR telefones = '{}');
