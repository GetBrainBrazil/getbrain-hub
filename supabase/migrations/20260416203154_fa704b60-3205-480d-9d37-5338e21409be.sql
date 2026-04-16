-- 1. Remover CHECK constraint antigo
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;

-- 2. Renomear tipos antigos
UPDATE public.categorias SET tipo = 'receitas' WHERE tipo = 'receita';
UPDATE public.categorias SET tipo = 'despesas' WHERE tipo = 'despesa';

-- 3. Adicionar novo CHECK constraint com os 5 tipos fixos
ALTER TABLE public.categorias ADD CONSTRAINT categorias_tipo_check
  CHECK (tipo IN ('receitas', 'despesas', 'impostos', 'retirada', 'transferencias'));

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_categorias_pai ON public.categorias(categoria_pai_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON public.categorias(tipo);

-- 5. Popular subcategorias e contas do seed
DO $$
DECLARE
  sub_id UUID;
BEGIN
  -- ============ RECEITAS ============
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Vendas' AND tipo = 'receitas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Vendas', 'receitas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('Implementação', 'receitas', sub_id, true),
      ('Manutenção', 'receitas', sub_id, true),
      ('Assinaturas', 'receitas', sub_id, true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Financeiras' AND tipo = 'receitas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Financeiras', 'receitas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('Investimentos', 'receitas', sub_id, true);
  END IF;

  -- ============ DESPESAS ============
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Administrativo' AND tipo = 'despesas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Administrativo', 'despesas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('Custo Operacional', 'despesas', sub_id, true),
      ('Contabilidade', 'despesas', sub_id, true),
      ('Manutenção Web', 'despesas', sub_id, true),
      ('Certificações', 'despesas', sub_id, true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Educação' AND tipo = 'despesas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Educação', 'despesas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('Cursos', 'despesas', sub_id, true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'SAAS' AND tipo = 'despesas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('SAAS', 'despesas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('CRM', 'despesas', sub_id, true),
      ('Coda.io', 'despesas', sub_id, true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Salários' AND tipo = 'despesas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Salários', 'despesas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('Desenvolvedores', 'despesas', sub_id, true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Taxas' AND tipo = 'despesas' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Taxas', 'despesas', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES
      ('Taxas', 'despesas', sub_id, true);
  END IF;

  -- Marketing já existe como subcategoria sem filhos — só adicionar conta
  SELECT id INTO sub_id FROM public.categorias WHERE nome = 'Marketing' AND tipo = 'despesas' AND categoria_pai_id IS NULL LIMIT 1;
  IF sub_id IS NULL THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Marketing', 'despesas', NULL, true) RETURNING id INTO sub_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Mídias Sociais' AND categoria_pai_id = sub_id) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Mídias Sociais', 'despesas', sub_id, true);
  END IF;

  -- ============ IMPOSTOS ============
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Impostos' AND tipo = 'impostos' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Impostos', 'impostos', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Impostos', 'impostos', sub_id, true);
  END IF;

  -- ============ RETIRADA ============
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Retirada' AND tipo = 'retirada' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Retirada', 'retirada', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Retirada Sócios', 'retirada', sub_id, true);
  END IF;

  -- ============ TRANSFERÊNCIAS ============
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Transferência' AND tipo = 'transferencias' AND categoria_pai_id IS NULL) THEN
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Transferência', 'transferencias', NULL, true) RETURNING id INTO sub_id;
    INSERT INTO public.categorias (nome, tipo, categoria_pai_id, ativo) VALUES ('Transferência', 'transferencias', sub_id, true);
  END IF;
END $$;