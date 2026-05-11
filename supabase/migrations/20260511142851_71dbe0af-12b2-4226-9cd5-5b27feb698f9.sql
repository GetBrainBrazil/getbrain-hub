
-- ============ ENUMS ============
CREATE TYPE public.catalog_sale_type AS ENUM ('saas','recurring_service','one_shot','custom');
CREATE TYPE public.catalog_price_mode AS ENUM ('fixed','suggested','range','on_request');
CREATE TYPE public.catalog_product_status AS ENUM ('active','in_review','archived');
CREATE TYPE public.catalog_payment_terms AS ENUM ('unica','mensal','anual','parcelada');

-- ============ CATEGORIES ============
CREATE TABLE public.catalog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_categories_auth_all"
  ON public.catalog_categories FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============ PRODUCT CODE SEQUENCE ============
CREATE SEQUENCE IF NOT EXISTS public.catalog_product_code_seq START 1;

-- ============ PRODUCTS ============
CREATE TABLE public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT ('PRD-' || lpad(nextval('public.catalog_product_code_seq')::text, 4, '0')),
  -- identification
  name text NOT NULL,
  pitch text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  category_id uuid REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  image_url text,
  -- sale type
  sale_type public.catalog_sale_type NOT NULL,
  -- pricing
  price_mode public.catalog_price_mode NOT NULL,
  price_value numeric,
  price_min numeric,
  price_max numeric,
  billing_unit text NOT NULL DEFAULT 'unica',
  default_payment_terms public.catalog_payment_terms NOT NULL DEFAULT 'unica',
  default_quantity numeric NOT NULL DEFAULT 1,
  -- internal control
  status public.catalog_product_status NOT NULL DEFAULT 'active',
  owner_actor_id uuid,
  internal_notes text,
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE INDEX idx_catalog_products_status ON public.catalog_products(status);
CREATE INDEX idx_catalog_products_category ON public.catalog_products(category_id);
CREATE INDEX idx_catalog_products_sale_type ON public.catalog_products(sale_type);
CREATE INDEX idx_catalog_products_tags ON public.catalog_products USING GIN(tags);

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_products_auth_all"
  ON public.catalog_products FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============ VALIDATION TRIGGER ============
CREATE OR REPLACE FUNCTION public.catalog_products_validate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price_mode IN ('fixed','suggested') AND NEW.price_value IS NULL THEN
    RAISE EXCEPTION 'price_value is required when price_mode is %', NEW.price_mode;
  END IF;
  IF NEW.price_mode = 'range' THEN
    IF NEW.price_min IS NULL OR NEW.price_max IS NULL THEN
      RAISE EXCEPTION 'price_min and price_max are required for range pricing';
    END IF;
    IF NEW.price_min > NEW.price_max THEN
      RAISE EXCEPTION 'price_min must be <= price_max';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER catalog_products_validate_trigger
  BEFORE INSERT OR UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.catalog_products_validate();

-- ============ CATEGORY UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.catalog_categories_touch()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER catalog_categories_touch_trigger
  BEFORE UPDATE ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.catalog_categories_touch();
