

## Filtros de tempo no Dashboard Financeiro

Vou portar a mesma lógica de período de Contas a Pagar/Receber (`PeriodFilter` + presets "Hoje, Esta Semana, Este Mês, Este Ano, Últimos 30 dias, Personalizado") para o Dashboard Financeiro principal, persistindo a seleção no `usePersistedState` (sobrevive a refresh/troca de aba — segue a regra global do projeto).

### O que o filtro vai controlar

Os KPIs e rankings hoje são travados em "mês corrente vs mês anterior" pela view SQL. Para que o filtro funcione de verdade:

1. **KPI Linha 1 (Receita / Despesa / Resultado / Margem)** — calculados pelo período escolhido, com comparativo automático contra o **período anterior de mesma duração** (ex: filtro "Últimos 30 dias" compara contra os 30 dias anteriores; "Este Mês" compara contra o mês anterior).
2. **Top 5 Categorias / Top 5 Clientes** — recortados pelo mesmo período.
3. **Gráfico "Evolução por Competência"** — mantém os 12 meses fixos (visão histórica longa, não faz sentido recortar).
4. **Cards de situação atual** (Saldo total, A receber, A pagar, Inadimplência, Próximos vencimentos, Top Atrasos, Saldo por conta, Fluxo projetado 90d) — **não mudam com o filtro de período** porque representam fotografia atual / projeção futura. Vão ficar agrupados visualmente sob um rótulo "Situação atual" para deixar claro.

### Mudanças

**Backend (1 migration)**
- Substituir a view `financeiro_dashboard` por **função** `financeiro_dashboard(p_inicio date, p_fim date)` que calcula receita/despesa/resultado/margem do período recebido + mesmos números do período anterior de mesma duração. Mantém saldo_total / a receber / a pagar / vencido / inadimplência como hoje (independentes do filtro).
- Adicionar função `financeiro_top_rankings(p_inicio date, p_fim date)` retornando topCategorias e topClientes do período (move a lógica do front, hoje em `useTopRankings`, para SQL).

**Frontend**
- `src/pages/FinanceiroVisaoGeral.tsx`:
  - Adicionar `<PeriodFilter>` ao lado do filtro de conta no header, default `"month"`, persistido em `dashboard_financeiro_period` / `dashboard_financeiro_period_custom`.
  - Calcular `periodRange` via `getDateRange()` e passar para os hooks.
  - Reorganizar layout em 2 seções com títulos: **"Resultado do período"** (KPIs linha 1 + Top 5 Categorias/Clientes) e **"Situação atual"** (KPIs linha 2 + Próximos vencimentos + Top Atrasos + Saldo por conta + Fluxo projetado).
  - Subtítulos dos KPIs viram dinâmicos: "vs período anterior" em vez de "Anterior: ...".
- `src/hooks/useFinanceiroDashboard.ts`:
  - `useFinanceiroKPIs(inicio, fim)` — chama RPC nova em vez de `.from("financeiro_dashboard")`.
  - `useTopRankings(inicio, fim)` — chama nova RPC.
  - Outros hooks (saldos, vencimentos, fluxo, série mensal) sem mudança.

### Detalhes técnicos

- `PeriodFilter` é reusado tal como está (mesmo componente já usado em ContasPagar/Receber/Movimentacoes — comportamento de teclado, custom range, "Limpar" idênticos).
- Persistência: `usePersistedState` com chaves `dashboard_financeiro_period` e `dashboard_financeiro_period_custom` (segue regra `mem://preference/filter-persistence`).
- Quando preset = `"all"` (Todo o Período), passa `null` nas datas e a função SQL ignora o filtro de competência para os KPIs do período.
- Comparativo "período anterior": duração = `fim - inicio + 1`, anterior = `[inicio - duração, inicio - 1]`. Para `"all"`, comparativo fica zerado e o KPI esconde o delta.
- Todos os hooks dependentes do período recebem `[inicio, fim]` no `queryKey` para invalidação automática do React Query.

### Arquivos
- **Migration nova**: substitui view por função `financeiro_dashboard(date,date)` + cria `financeiro_top_rankings(date,date)`.
- **Editado**: `src/pages/FinanceiroVisaoGeral.tsx`, `src/hooks/useFinanceiroDashboard.ts`.

