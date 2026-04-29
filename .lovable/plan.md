# Categoria da Dor → tabela editável + combobox criável

## Problema

Hoje "Categoria da dor" é um enum fixo no código (`pain_category` com 6 valores: operacional, comercial, estratégica, compliance, experiência, outra), renderizado como chips. Para adicionar/editar/remover categorias, precisa mudar código e migration. Você quer:

1. UI igual ao "tipo de cliente" não — você quer **mais leve**: um combobox (select) com busca onde, se digitar algo que não existe, oferece "Criar nova".
2. Categorias viram **dado editável**: nova página em Configurações → Pessoas & Empresas → "Categorias de dor" com listagem, criar/editar/excluir/reordenar/ativar-desativar.
3. Padrão idêntico ao já usado em **Origens de lead** (`crm_lead_sources` + `LeadSourcesManager`) — manter consistência.

## Solução

### 1. Banco de dados (migration)

Criar tabela `crm_pain_categories` espelhando `crm_lead_sources`:

```text
crm_pain_categories
├── id uuid pk
├── name text         -- "Operacional"
├── slug text unique  -- "operacional"
├── color text        -- classe Tailwind ou hex
├── display_order int
├── is_active bool
├── is_system bool    -- true para as 6 padrão (não permite delete)
├── created_at, updated_at
```

- Seed das 6 categorias atuais com `is_system=true`, mantendo os mesmos slugs do enum.
- Mudar coluna `deals.pain_category` de enum → `text` referenciando `slug` (mantém compatibilidade total — slugs idênticos).
- RLS: leitura pra todo autenticado; escrita só admin.
- Trigger `updated_at`.

### 2. Hook `useCrmPainCategories`

Cópia do `useCrmLeadSources` com queries `list / create / update / delete / reorder`. Invalida cache de deals quando muda.

### 3. Combobox no DealDetail

Substituir `<ChipGroup>` por um novo componente `PainCategoryCombobox`:

- Baseado em shadcn `Command` + `Popover` (mesmo padrão do `ComboboxCreate.tsx` já existente no projeto).
- Mostra categorias **ativas** ordenadas por `display_order`.
- Busca por nome.
- Quando o termo digitado não bate com nenhuma → mostra opção destacada **"+ Criar 'Texto digitado'"** (apenas pra usuários que podem criar — todos podem, mas só admin edita).
- Selecionar grava o `slug` em `deals.pain_category`.
- Mostra a categoria selecionada como chip colorido (mesma cor da config) dentro do botão do combobox.

### 4. Página de Configurações

Nova página em `/configuracoes/pessoas/categorias-dor` (`PainCategoriesPage.tsx`) usando um manager espelhado de `LeadSourcesManager`:

- Tabela com: drag-handle (reordenar), nome editável inline, cor (color picker), ativo (switch), ações (excluir).
- Botão "Nova categoria" no topo.
- Categorias `is_system=true` mostram badge "padrão" e não podem ser excluídas, só desativadas/renomeadas.
- Adicionar item ao menu lateral de Configurações → Pessoas & Empresas, ao lado de "Origens de lead" e "Papéis de contato".

### 5. Limpeza

- Remover `PAIN_CATEGORY_LABEL/OPTIONS/COLOR` de `dealEnumLabels.ts` (ou deixar como fallback inicial enquanto não carrega).
- Onde mostrar a categoria em outros lugares (`isDiscoveryComplete`, eventuais badges), buscar do hook em vez do enum.

## Arquivos

**Novos:**
- `supabase/migrations/<ts>_crm_pain_categories.sql`
- `src/hooks/crm/useCrmPainCategories.ts`
- `src/components/crm/PainCategoryCombobox.tsx`
- `src/components/crm/settings/PainCategoriesManager.tsx`
- `src/pages/configuracoes/pessoas/CategoriasDorPage.tsx`

**Editados:**
- `src/pages/crm/CrmDealDetail.tsx` — trocar `ChipGroup` por `PainCategoryCombobox` em `ZoneDor`.
- `src/components/AppSidebar.tsx` ou onde estiver o submenu de Configurações → Pessoas & Empresas — adicionar link.
- `src/App.tsx` — registrar rota `/configuracoes/pessoas/categorias-dor`.
- `src/components/crm/DealCard.tsx` — `isDiscoveryComplete` continua válido (testa só `!!deal.pain_category`).

## Compatibilidade

- Slugs são preservados: deals existentes com `pain_category='operacional'` continuam funcionando sem migração de dados.
- Caso a coluna seja enum no Postgres, a migration faz `ALTER COLUMN pain_category TYPE text USING pain_category::text` antes de remover o enum (se enum não for usado em outro lugar).
