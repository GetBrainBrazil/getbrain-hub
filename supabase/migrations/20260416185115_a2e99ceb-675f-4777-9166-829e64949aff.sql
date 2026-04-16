ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS emails text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS telefones text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS complemento text;

UPDATE public.fornecedores
SET emails = ARRAY[email]
WHERE email IS NOT NULL AND email <> '' AND (emails IS NULL OR array_length(emails, 1) IS NULL);

UPDATE public.fornecedores
SET telefones = ARRAY[telefone]
WHERE telefone IS NOT NULL AND telefone <> '' AND (telefones IS NULL OR array_length(telefones, 1) IS NULL);