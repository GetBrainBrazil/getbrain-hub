
## Problema

A área superior do CRM hoje tem **três faixas empilhadas** com responsabilidades misturadas:

1. Header com título "CRM" + busca solta no topo da página + filtros globais (Dono / Origem / Valor / Limpar) jogados à direita, longe das tabs.
2. Tabs (Dashboard / Pipeline / Leads...).
3. Cards de KPI.
4. Outra toolbar com filtros de página (Estágio / Tipo) + Novo Deal + ordenação + toggle Lista/Kanban.

Resultado: dois lugares com filtros, dois lugares com ações, busca distante das tabs, hierarquia visual quebrada e muito ruído.

## Objetivo

Uma única **toolbar de comando** logo abaixo das tabs, organizada em zonas claras (esquerda = busca/filtros, direita = ações/visualização), com filtros consolidados num único botão e visual mais leve.

## Layout proposto

```text
┌────────────────────────────────────────────────────────────────────────┐
│  CRM                                                                   │
│  Funil comercial e relacionamento com clientes                         │
├────────────────────────────────────────────────────────────────────────┤
│  Dashboard  [Pipeline]  Leads & Empresas  Calendário  Configurações    │
├────────────────────────────────────────────────────────────────────────┤
│  [🔍 Buscar deals, empresas, contatos...]   [⚙ Filtros •3] [↕ Ordenar] │
│                                              [+ Novo Deal] [≡ ▢]       │
├────────────────────────────────────────────────────────────────────────┤
│  Pipeline total   Forecast   Deals ativos   Deps atrasadas             │
└────────────────────────────────────────────────────────────────────────┘
```

Mudanças-chave:

- **Busca** vira um campo grande à esquerda da toolbar única (ocupa a largura disponível), sem moldura externa redundante.
- **Filtros consolidados**: um único botão `Filtros` abre um popover com Dono, Origem, Valor, Estágio e Tipo. Badge mostra a contagem de filtros ativos. Botão "Limpar tudo" dentro do popover.
- **Ordenar** vira um botão dropdown discreto (só aparece em modo Lista).
- **Novo Deal** com destaque (cor accent), à direita.
- **Toggle Lista/Kanban** como segmented control compacto (só ícones com tooltip), no extremo direito.
- **KPIs descem** para baixo da toolbar, ainda visíveis mas sem competir com os controles.
- Em **mobile**: busca em linha cheia; abaixo, linha com `Filtros`, `Ordenar`, `Novo Deal` e o toggle de visualização — tudo em altura 40px tocável.

## Arquivos a alterar

- `src/pages/crm/CrmLayout.tsx`
  - Remover a faixa de filtros global (Dono/Origem/Valor) que aparece só no Pipeline. Esses filtros migram para o popover unificado dentro do Pipeline.
  - Manter só: título, tabs e (em "Leads & Empresas") botão Novo Lead.
  - A busca também deixa de morar no layout — vai para a toolbar do Pipeline (e pode ser reaproveitada em Leads quando fizer sentido). Por ora, mantemos só no Pipeline.

- `src/pages/crm/CrmPipeline.tsx`
  - Substituir as duas toolbars atuais por uma única toolbar de comando.
  - Criar `<UnifiedFiltersPopover>` (componente local ou em `src/components/crm/UnifiedFiltersPopover.tsx`) que recebe owner/source/value/stage/projectType e expõe um único botão com badge.
  - KPIs renderizados depois da toolbar, usando o mesmo grid atual mas com leve redução de peso visual (opcional: 1 linha discreta de chips em vez de cards). Vamos manter cards, só repassando para baixo da toolbar.
  - Toggle Lista/Kanban → segmented control só com ícones + `aria-label` e tooltip.
  - Ordenar → `Button` + `DropdownMenu` (mais leve que `Select` cheio).

- (opcional, mesmo arquivo) Pequenos ajustes de espaçamento para reduzir o "ar" entre as faixas e consolidar a hierarquia.

## Comportamento

- Filtros globais (Dono/Origem/Valor/Search) **continuam persistindo** via `useCrmHubStore` — só mudam de lugar visual.
- Filtros de página (Estágio/Tipo) **continuam locais** ao Pipeline (resetam ao sair) — mas convivem no mesmo popover.
- Botão "Limpar" do popover chama `store.resetFilters()` **e** zera os filtros locais, em uma ação só.
- Badge no botão Filtros = soma de owner + source + (valueRange ativo ? 1 : 0) + stage + projectType.

## Não faz parte

- Não vou tocar Dashboard / Leads & Empresas / Calendário neste passo (escopo é a "barra estragada" do Pipeline mostrada no print). Se quiser depois, replico o mesmo padrão lá.
- Não estou mudando paleta nem fontes — só hierarquia/agrupamento.

## Detalhes técnicos

- Novo componente `UnifiedFiltersPopover` usa `Popover` + `Command`/listas existentes; reaproveita `MultiFilter` e `ValueRangeFilter` por dentro para não duplicar lógica.
- Segmented control = dois `<button>` com `aria-pressed`, dentro de um wrapper `inline-flex rounded-md border bg-background p-0.5`, ícone `List` / `LayoutGrid` 16px.
- Toolbar wrapper: `flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2`.
- Mobile: `flex-col gap-2`; busca `w-full`; segunda linha `flex items-center gap-2 justify-between`.
- A11y: cada controle com `aria-label`, popover focável, badge com `aria-label="3 filtros ativos"`.
