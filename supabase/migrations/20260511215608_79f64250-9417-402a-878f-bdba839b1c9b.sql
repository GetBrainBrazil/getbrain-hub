-- Seed: categoria Agentes de IA + produto Agente SDR
INSERT INTO public.catalog_categories (name, slug, color, display_order, is_active)
VALUES ('Agentes de IA', 'agentes-de-ia', '#22D3EE', 1, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.catalog_products (
  name, pitch, description, tags, category_id,
  sale_type, price_mode, price_value, billing_unit,
  default_payment_terms, default_quantity, status, internal_notes
)
SELECT
  'Agente SDR',
  'SDR de IA que qualifica leads 24/7 no WhatsApp e agenda reuniões direto na agenda do time comercial.',
  E'Agente conversacional treinado para atuar como SDR da operação:\n\n• Qualificação automática (BANT) via WhatsApp Cloud API\n• Roteamento e handoff humano quando lead atinge score-alvo\n• Agendamento direto no Google Calendar dos closers\n• Painel de conversões e funis em tempo real\n• Treinamento contínuo do agente com base no histórico do time\n\nInclui suporte L2 e ajustes de prompt mensais. Setup técnico cobrado à parte.',
  ARRAY['ia','sdr','whatsapp','comercial','automação']::text[],
  (SELECT id FROM public.catalog_categories WHERE slug = 'agentes-de-ia'),
  'recurring_service'::catalog_sale_type,
  'suggested'::catalog_price_mode,
  2500,
  'mes',
  'mensal'::catalog_payment_terms,
  1,
  'active'::catalog_product_status,
  'Exige setup inicial separado (criar PRD-Setup IA). Margem alvo 60%. Preço sugerido — vendedor pode ajustar para cima conforme volume de leads.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalog_products WHERE name = 'Agente SDR'
);