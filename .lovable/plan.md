## Diagnóstico

**1. "Tipo" no modal não bate com o card.**
O `DealWonDialog` mostra um `<Select>` legado (single, baseado em enum hard-coded `PROJECT_TYPE_OPTIONS`), enquanto o card usa `project_type_v2` (lista, com cores customizadas vindas de `crm_project_types`). Como o usuário pode ter configurado tipos novos no CRM (ex.: "Software", "Sustentação"), eles **não aparecem** no modal — daí o "Escolha…" vazio.

**2. "Dores" não aparecem no modal.** Hoje só existem `project_type` e datas. As categorias de dor do deal (`pain_categories`) ficam ocultas.

**3. Em "Projetos" já existe dores?** Sim:
- `projects.project_type_v2` é coluna real, e o `close_deal_as_won` já copia `v_deal.project_type_v2` para lá. ✅
- `pain_categories` vai dentro de `projects.commercial_context` (jsonb) e o `CommercialContextCard` já as exibe (como texto, sem chips coloridos).

Ou seja: o backend já está pronto. Falta refletir no **modal** e melhorar a apresentação no **projeto**.

## O que vai mudar

### A. Modal "Fechar deal como ganho" (`DealWonDialog`)

- **"Tipo de projeto"** vira um `ProjectTypeSelect` (mesmo componente do CRM, multi-seleção, com chips coloridos), pré-preenchido com `deal.project_type_v2` do deal.
- **Novo campo "Dores"** logo abaixo, usando `PainCategoriesMultiSelect` (mesmo componente do CRM), pré-preenchido com `deal.pain_categories`.
- Visual idêntico ao card: chips com cor de fundo derivada da cor da categoria/tipo, igual `chipStyleFromHex`.
- A validação atual ("Selecione o tipo de projeto") passa a aceitar "ao menos 1 tipo".
- Ao salvar:
  - Se o usuário alterou os tipos/dores no modal, persiste no deal (`deals.project_type_v2`, `deals.pain_categories`) **antes** de chamar `close_deal_as_won`. Como o backend já lê esses campos do deal e os copia para o projeto, nenhuma mudança de RPC é necessária.
  - O campo legado `project_type` (single) deixa de ser exigido. Se o deal ainda tiver, mantém; se não, fica nulo (a coluna nova `project_type_v2` é a fonte de verdade).

### B. Card "Contexto comercial" do projeto (`CommercialContextCard`)

- Renderizar `pain_categories` como **chips coloridos** (mesmo visual do card do deal), em vez de string concatenada com vírgula.
- Acima dos campos textuais, mostrar uma linha "Tipos do projeto" com chips coloridos baseados em `projects.project_type_v2` (consultando `useCrmProjectTypes`).
- Ambos reaproveitam `chipStyleFromHex` + `resolveHex`.

## Como vai ser feito (técnico)

Arquivos a editar:

- `src/components/crm/DealWonDialog.tsx`
  - Trocar `useState<string>` de `projectType` por `useState<string[]>` de `projectTypeSlugs`, inicializado com `deal.project_type_v2 ?? []`.
  - Adicionar `useState<string[]>` de `painCategorySlugs`, inicializado com `deal.pain_categories ?? (deal.pain_category ? [deal.pain_category] : [])`.
  - Substituir o `<Select>` de Tipo pelo `<ProjectTypeSelect value={projectTypeSlugs} onChange={setProjectTypeSlugs} />` e adicionar bloco "Dores" com `<PainCategoriesMultiSelect value={painCategorySlugs} onChange={setPainCategorySlugs} />` na grid de "Dados do projeto".
  - No `handleConfirm`, antes de chamar a RPC, fazer `update` em `deals` setando `project_type_v2: projectTypeSlugs` e `pain_categories: painCategorySlugs` (se mudaram em relação ao deal). Validação muda para `if (projectTypeSlugs.length === 0)`.
  - Remover dependência de `PROJECT_TYPE_OPTIONS`/`PROJECT_TYPE_LABEL` (import).

- `src/components/projetos/CommercialContextCard.tsx`
  - Carregar `useCrmPainCategories()` e `useCrmProjectTypes()` para resolver slug→{name,color}.
  - Receber via prop (ou ler de `projects.project_type_v2`) os slugs de tipo. Decidir: aceitar nova prop `projectTypeSlugs?: string[]` para evitar acoplar o componente à query do project.
  - Renderizar `pain_categories` (já vindas em `commercialContext.pain_categories`) como chips com `chipStyleFromHex(color)`, exatamente como o `DealCard`.
  - Renderizar uma seção "Tipos do projeto" no topo do card com chips dos `project_type_v2`.

- `src/pages/projetos/ProjetoDetalhe.tsx` (ou equivalente que renderiza `CommercialContextCard`)
  - Passar a nova prop `projectTypeSlugs={project.project_type_v2 ?? []}`.

## Diagrama do modal

```text
Dados do projeto
┌─────────────────────────────────────────────────────┐
│ Nome do projeto: [_____________________________]    │
│                                                     │
│ Tipo de projeto                                     │
│ [Software] [Sustentação] [+]                        │
│                                                     │
│ Dores                                               │
│ [● Operacional] [● Comercial] [+]                   │
│                                                     │
│ Início: [29/04/2026]    Entrega: [dd/mm/aaaa]       │
└─────────────────────────────────────────────────────┘
```
