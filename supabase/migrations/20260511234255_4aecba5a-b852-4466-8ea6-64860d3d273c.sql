-- =========================================================
-- Catálogo: arquétipos de produto + campos de preço duais
-- =========================================================

-- Novo enum de arquétipo (substitui semanticamente sale_type para o cadastro novo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catalog_archetype') THEN
    CREATE TYPE public.catalog_archetype AS ENUM (
      'one_shot',         -- serviço one-shot
      'with_maintenance', -- serviço com setup + manutenção mensal
      'saas',             -- assinatura sem setup
      'hybrid',           -- saas com setup
      'aggregator'        -- preço calculado a partir da cesta
    );
  END IF;
END $$;

-- Categoria "Serviços de suporte" (idempotente)
INSERT INTO public.catalog_categories (name, slug, color, display_order, is_active)
SELECT 'Serviços de suporte', 'servicos-suporte', '#F59E0B', 50, true
WHERE NOT EXISTS (SELECT 1 FROM public.catalog_categories WHERE slug = 'servicos-suporte');

-- Novos campos no produto
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS archetype public.catalog_archetype NOT NULL DEFAULT 'one_shot',
  -- Setup / pagamento único
  ADD COLUMN IF NOT EXISTS setup_value numeric,
  ADD COLUMN IF NOT EXISTS setup_adjustable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS setup_payment_terms text NOT NULL DEFAULT 'a_vista',
  -- Preço único (one-shot)
  ADD COLUMN IF NOT EXISTS oneshot_value numeric,
  ADD COLUMN IF NOT EXISTS oneshot_adjustable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS oneshot_payment_terms text NOT NULL DEFAULT 'a_vista',
  -- Recorrente (mensalidade ou manutenção mensal sugerida)
  ADD COLUMN IF NOT EXISTS recurring_value numeric,
  ADD COLUMN IF NOT EXISTS recurring_adjustable boolean NOT NULL DEFAULT false,
  -- Apenas para with_maintenance
  ADD COLUMN IF NOT EXISTS maintenance_required text NOT NULL DEFAULT 'client_decides';

-- Substituir trigger de validação para refletir os arquétipos
CREATE OR REPLACE FUNCTION public.catalog_products_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar campos por arquétipo
  IF NEW.archetype = 'one_shot' THEN
    IF NEW.oneshot_value IS NULL OR NEW.oneshot_value < 0 THEN
      RAISE EXCEPTION 'Preço único é obrigatório para arquétipo one_shot';
    END IF;
  ELSIF NEW.archetype = 'with_maintenance' THEN
    IF NEW.recurring_value IS NULL OR NEW.recurring_value < 0 THEN
      RAISE EXCEPTION 'Manutenção mensal é obrigatória para arquétipo with_maintenance';
    END IF;
    IF NEW.maintenance_required NOT IN ('client_decides', 'mandatory') THEN
      RAISE EXCEPTION 'maintenance_required inválido';
    END IF;
  ELSIF NEW.archetype = 'saas' THEN
    IF NEW.recurring_value IS NULL OR NEW.recurring_value < 0 THEN
      RAISE EXCEPTION 'Mensalidade é obrigatória para arquétipo saas';
    END IF;
  ELSIF NEW.archetype = 'hybrid' THEN
    IF NEW.setup_value IS NULL OR NEW.setup_value < 0 THEN
      RAISE EXCEPTION 'Setup é obrigatório para arquétipo hybrid';
    END IF;
    IF NEW.recurring_value IS NULL OR NEW.recurring_value < 0 THEN
      RAISE EXCEPTION 'Mensalidade é obrigatória para arquétipo hybrid';
    END IF;
  END IF;
  -- aggregator: nenhum campo de valor obrigatório
  RETURN NEW;
END;
$$;

-- Migração de dados existentes
UPDATE public.catalog_products
SET
  archetype = CASE sale_type
    WHEN 'saas' THEN 'saas'::public.catalog_archetype
    WHEN 'recurring_service' THEN 'with_maintenance'::public.catalog_archetype
    WHEN 'one_shot' THEN 'one_shot'::public.catalog_archetype
    WHEN 'custom' THEN 'one_shot'::public.catalog_archetype
    ELSE 'one_shot'::public.catalog_archetype
  END,
  oneshot_value = CASE
    WHEN sale_type IN ('one_shot', 'custom') THEN COALESCE(price_value, oneshot_value, 0)
    ELSE oneshot_value
  END,
  oneshot_adjustable = CASE
    WHEN sale_type = 'custom' THEN true
    WHEN sale_type = 'one_shot' THEN (price_mode = 'suggested')
    ELSE oneshot_adjustable
  END,
  recurring_value = CASE
    WHEN sale_type = 'saas' THEN COALESCE(price_value, recurring_value, 0)
    WHEN sale_type = 'recurring_service' THEN COALESCE(price_value, recurring_value, 0)
    ELSE recurring_value
  END,
  recurring_adjustable = CASE
    WHEN sale_type = 'recurring_service' THEN (price_mode = 'suggested')
    WHEN sale_type = 'saas' THEN false
    ELSE recurring_adjustable
  END,
  internal_notes = CASE
    WHEN sale_type = 'custom' THEN
      COALESCE(internal_notes || E'\n\n', '') ||
      'Item migrado de "sob medida". Considere recriar como Solicitação de Orçamento (fase futura).'
    ELSE internal_notes
  END
WHERE archetype = 'one_shot' AND (oneshot_value IS NULL OR recurring_value IS NULL OR sale_type <> 'one_shot');

-- Seed do produto Agregador "Manutenção mensal"
INSERT INTO public.catalog_products (
  name, pitch, description, category_id, archetype, sale_type, price_mode,
  status, tags
)
SELECT
  'Manutenção mensal',
  'Equipe da GetBrain mantém seus produtos rodando, com SLA de resposta, ajustes mensais e plantão técnico.',
  'Inclui monitoramento, atualizações mensais, ajustes de configuração conforme demanda do cliente, plantão para incidentes. Cálculo: somatório do valor de manutenção mensal sugerida de cada produto da cesta que tiver manutenção configurada; cliente pode optar por não incluir manutenção em itens específicos.',
  (SELECT id FROM public.catalog_categories WHERE slug = 'servicos-suporte' LIMIT 1),
  'aggregator'::public.catalog_archetype,
  'recurring_service',
  'on_request',
  'active',
  ARRAY['manutencao','suporte','agregador']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalog_products WHERE archetype = 'aggregator' AND name = 'Manutenção mensal'
);
