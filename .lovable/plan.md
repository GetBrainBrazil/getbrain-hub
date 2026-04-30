## Problema

Os 4 KPIs no topo de `/crm/pipeline` ("Pipeline total", "Forecast ponderado", "Deals ativos", "Deps atrasadas") têm dois problemas:

1. **Não respondem aos filtros** — são calculados a partir de `rawDeals.filter(active)`, ignorando os filtros de Estágio, Tipo, Dono, Origem, Valor e Busca aplicados na página.
2. **Pouco acionáveis** — "Deals ativos" é só uma contagem repetida das colunas; "Deps atrasadas" é um indicador secundário que faz mais sentido por card do que como KPI agregado.

## Novos KPIs (mais práticos para análise diária do CRM)

Manter 4 cards (mesmo grid `md:grid-cols-4`), trocando a composição:

1. **Pipeline** — soma de `estimated_value` dos deals **visíveis** (após filtros).
2. **Forecast ponderado** — `Σ(estimated_value × probability_pct/100)` dos visíveis. Tom `accent` (cyan) — métrica chave de previsão.
3. **Ticket médio** — `pipeline / nº de deals visíveis com valor > 0`. Substitui "Deals ativos" — mais útil para entender o porte da carteira filtrada.
4. **Próximo passo atrasado** — quantos deals visíveis têm `next_step_date < hoje`. Substitui "Deps atrasadas" — é um alerta acionável que aparece no próprio dia a dia (qual deal está parado). Tom `destructive` quando > 0.

Cada card mostra também um sub-rótulo discreto com o **nº total de deals visíveis** (ex.: "12 deals" abaixo do valor de Pipeline) para dar contexto, especialmente quando o usuário aplica filtros.

## Reatividade aos filtros

O `useMemo` `homeKpis` passa a depender de:
- `listDeals` quando `viewMode === 'lista'` (já respeita o comportamento de ocultar fechados quando não há filtro de estágio).
- `filteredDeals` quando `viewMode === 'kanban'` (representa o que está visível nas colunas, incluindo ganhos/perdidos se filtrados).

Assim, ao alternar Estágio / Tipo / Dono / Origem / faixa de Valor / Busca, os 4 KPIs recalculam em tempo real para refletir exatamente o que está na tela.

## Arquivos afetados

- `src/pages/crm/CrmPipeline.tsx`:
  - Reescrever `homeKpis` (linhas ~229–240) para usar `listDeals`/`filteredDeals` e calcular os 4 novos KPIs.
  - Atualizar a grid de KPIs (linhas ~524–529) com os novos rótulos, tons e sub-rótulos.
  - Estender `HomeKpi` (linha 142) para aceitar `hint?: string` opcional renderizado em fonte menor abaixo do valor.

## Fora do escopo

- Não remover `useDealsIndicators` — ainda é usado por `DealsList` para mostrar deps atrasadas por card.
- Não alterar a lógica de filtros nem a estrutura do Kanban/Lista.
