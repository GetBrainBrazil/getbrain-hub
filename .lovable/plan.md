# Módulo Catálogo — Plano de Implementação

Fonte única dos produtos/serviços vendáveis da GetBrain. Esta fase entrega só o cadastro (CRUD + categorias). Integração com propostas/CRM fica para fase posterior.

## Estrutura de navegação

- Novo item na sidebar: **Catálogo** (ícone `Package`), entre Vendas e Financeiro
- Rotas:
  - `/catalogo` — lista de produtos
  - `/catalogo/novo` — cadastro
  - `/catalogo/:id` — edição (tela cheia, padrão das outras fichas)
  - `/catalogo/categorias` — gerenciamento de categorias (modal/dialog acessado pelo botão "Gerenciar categorias")

## Banco de dados

Duas tabelas novas, RLS = qualquer autenticado pode ler/escrever (sem permissões granulares nesta fase, conforme pedido).

### `catalog_categories`
- `id`, `name`, `slug`, `display_order`, `is_active` (false = arquivada), `color` (opcional p/ badge), `created_at`, `updated_at`

### `catalog_products`
Identificação:
- `id`, `code` (auto: `PRD-0001`), `name`, `pitch` (text curto), `description` (text longo), `tags` (text[]), `category_id` (FK), `image_url`

Tipo de venda (enum `catalog_sale_type`):
- `saas` | `recurring_service` | `one_shot` | `custom`

Modo de preço (enum `catalog_price_mode`):
- `fixed` | `suggested` | `range` | `on_request`
- `price_value` (numeric, usado em fixed/suggested)
- `price_min`, `price_max` (numeric, usado em range)
- `billing_unit` (text: `mes`, `hora`, `usuario`, `projeto`, `unica`)
- `default_payment_terms` (enum: `unica` | `mensal` | `anual` | `parcelada`)
- `default_quantity` (numeric, default 1)

Controle interno:
- `status` (enum: `active` | `in_review` | `archived`, default `active`)
- `owner_actor_id` (FK actors, opcional)
- `internal_notes` (text)
- `created_at`, `updated_at`, `created_by`, `updated_by`

Validação por trigger (não CHECK): se `price_mode IN (fixed, suggested)` então `price_value` obrigatório; se `range` então `price_min` e `price_max` obrigatórios e `min <= max`.

## Hooks (`src/hooks/catalogo/`)
- `useCatalogProducts.ts` — list + filtros (search, tipo, categoria, mostrar arquivados), CRUD, archive/unarchive, duplicate
- `useCatalogCategories.ts` — list + CRUD + archive
- `useCatalogProduct.ts` — detalhe por id

Cache invalidation: helper `invalidateCatalogCaches` em `src/lib/cacheInvalidation.ts`.

## Componentes (`src/components/catalogo/`)
- `ProductsTable.tsx` — tabela desktop (nome, tipo badge, preço formatado, status badge, atualizado em, ações rápidas)
- `ProductMobileCard.tsx` — card para mobile (mobile-first, conforme regra do projeto)
- `ProductFilters.tsx` — busca + selects + toggle "mostrar arquivados"
- `SaleTypeBadge.tsx` — cores por tipo (saas=cyan, recurring=purple, one_shot=amber, custom=slate)
- `PriceDisplay.tsx` — formata conforme `price_mode` ("R$ 199/mês", "R$ 5k–R$ 15k", "Sob consulta", "A partir de R$…")
- `ProductFormSections/` — 4 sub-componentes (`IdentificationSection`, `SaleTypeSection`, `PricingSection`, `InternalControlSection`) usando `Collapsible`
- `CategoriesManagerDialog.tsx` — dialog com lista, criar, renomear inline, arquivar
- `ArchiveProductConfirm.tsx` — usa `useConfirm()` (regra do projeto, sem confirm nativo)

## Páginas (`src/pages/catalogo/`)
- `CatalogoLista.tsx` — header com "Novo Produto" + "Gerenciar categorias", filtros, tabela/cards responsivos
- `ProdutoDetalhe.tsx` — formulário tela cheia com 4 seções colapsáveis, autosave on blur (regra de inline edit do projeto), botão "Duplicar" e "Arquivar" no header
- `ProdutoNovo.tsx` — mesma forma do detalhe, mas começa vazio; ao salvar redireciona p/ `/catalogo/:id` e a lista destaca o novo produto via query param `?highlight=`

## Sidebar / App.tsx
- Adicionar item "Catálogo" em `AppSidebar.tsx`
- Adicionar 4 rotas em `App.tsx`

## Validações de formulário (zod)
- `name`: obrigatório, max 120
- `category_id`: obrigatório
- `sale_type`: obrigatório
- `price_mode`: obrigatório
- `price_value`: obrigatório se `fixed`/`suggested`
- `price_min`/`price_max`: obrigatórios e coerentes se `range`
- `tags`: array de strings, max 20

## Critérios de aceite (matching o pedido)
- Cadastrar produto de cada um dos 4 tipos de venda ✅
- Cadastrar com cada um dos 4 modos de preço ✅
- Busca por nome / tag / categoria ✅
- Filtros por tipo, categoria, mostrar arquivados ✅
- Arquivar (soft, mantém dados) e duplicar ✅
- Edição reflete imediato na lista (invalidate query) ✅
- CRUD de categorias com arquivar (não remove de produtos antigos) ✅

## Fora de escopo (conforme pedido)
- Conexão com CRM/Propostas
- Marcação "vendido"
- Histórico de preço / relatórios
- Permissões granulares
