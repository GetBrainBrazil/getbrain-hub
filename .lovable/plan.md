

## Reestruturação completa do Dashboard Financeiro com dados reais

Hoje seu dashboard (`/financeiro`) tem 4 KPIs simples + gráfico de 12 meses + fluxo 60d + saldo por conta + últimas movimentações. Com seus dados reais lançados, identifiquei que ele **não reflete a realidade**:

- **Todos os `data_pagamento` estão em 22/04/2026** (lançamento em massa hoje), então o gráfico "Evolução Mensal" mostra tudo num único mês. O eixo correto é **`data_competencia`** (mês de referência da conta).
- Há **23 receitas atrasadas (R$ 26.448)** e **23 despesas atrasadas (R$ 14.084)** — o card de alerta atual só conta despesas.
- Existe muita categoria **"Transferência"** (32 lançamentos receita + 32 despesa) que **infla receitas e despesas** se não for filtrada.
- Saldos iniciais das 4 contas bancárias estão zerados.
- Não há visão por **categoria**, por **cliente**, por **fornecedor**, nem **comparativo mês a mês**.

### O que vou construir

#### 1. Backend — view SQL `financeiro_dashboard` (cálculos centralizados)
Criar uma view materializada de leitura rápida que entrega tudo o que o dashboard precisa, evitando recalcular no front:
- KPIs do mês corrente (receita realizada, despesa realizada, resultado, margem) **por competência**.
- Mesmos KPIs do mês anterior para comparativo (Δ% automático).
- Saldo total e por conta bancária (`saldo_inicial + Σpagas`).
- Total a receber / a pagar / vencido (atrasado), com contagens.

E uma função SQL `financeiro_serie_mensal(meses int)` retornando 12 meses por **competência** com receita, despesa e resultado — ignorando categorias do tipo "Transferência" via flag.

#### 2. Marcador de categorias de transferência
Migration: adicionar coluna `is_transferencia boolean default false` em `categorias` e marcar as duas categorias "Transferência" existentes. Todas as queries do dashboard, DRE e fluxo passam a excluir esses lançamentos do **resultado**, mas mantêm na movimentação por conta (afetam saldo).

#### 3. Frontend — novo `FinanceiroVisaoGeral` em 4 blocos

**Bloco 1 — Faixa de KPIs (8 cards em 2 linhas)**
- Linha 1 (mês corrente vs mês anterior, com Δ%): Receita Realizada · Despesa Realizada · **Resultado** · **Margem %**
- Linha 2 (situação atual): Saldo Total em Contas · A Receber (com vencido destacado) · A Pagar (com vencido destacado) · Inadimplência (R$ vencido / total faturado)

**Bloco 2 — Gráficos lado a lado**
- **Evolução por Competência (12 meses)**: barras receita/despesa + linha de resultado, eixo = `data_competencia`. Toggle "Realizado / Previsto".
- **Fluxo de Caixa Projetado (90 dias)**: área de saldo acumulado a partir do saldo atual + entradas/saídas pendentes por vencimento. Linha pontilhada de "saldo zero" para alerta visual.

**Bloco 3 — Análises (3 cards)**
- **Top 5 Categorias de Despesa** (mês) — barras horizontais com % do total.
- **Top 5 Clientes por Receita Recebida** (mês) — barras horizontais.
- **Top 5 Atrasos** — clientes/fornecedores com maior valor vencido, link para a movimentação.

**Bloco 4 — Listas operacionais**
- **Saldo por Conta Bancária** (com link para extrato).
- **Próximos Vencimentos (7 dias)** — lista unificada a pagar/receber ordenada por data.
- **Alertas inteligentes** — saldo projetado negativo em X dias, % de inadimplência alta (>10%), categoria estourando média histórica.

#### 4. Filtros globais do dashboard
Barra superior com:
- **Período** (Este mês / Últimos 3m / Este ano / Personalizado) — controla KPIs e Top 5.
- **Conta Bancária** (Todas / específica) — controla saldo, fluxo e KPIs.
- Persistidos em URL via `useURLState` (segue padrão da casa).

#### 5. Saldo inicial das contas
Como as 4 contas estão com `saldo_inicial = 0`, vou adicionar na página de **Configurações Financeiras → Contas Bancárias** um botão "Definir saldo inicial em DD/MM/AAAA" que já existe no schema mas não está exposto. Sem isso, "Saldo Total" só reflete movimentações lançadas. (Confirmar valor com você antes de inserir.)

### Resultado
Dashboard que reflete **fielmente** seus R$ 23.476 de despesas pagas, R$ 16.673 de receitas recebidas, R$ 26.448 a receber em atraso e R$ 14.084 a pagar em atraso — agrupados por competência (não por data de pagamento) e separando transferências entre contas dos resultados reais.

### Detalhes técnicos
- Migration: `is_transferencia` em `categorias` + UPDATE marcando as 2 existentes; view `financeiro_dashboard` (SECURITY INVOKER, agregando movimentacoes por competência do mês corrente/anterior); function `financeiro_serie_mensal(p_meses int, p_conta uuid default null)`.
- Hook novo: `src/hooks/useFinanceiroDashboard.ts` (React Query, staleTime 30s, params: período + conta).
- Refatorar `src/pages/FinanceiroVisaoGeral.tsx` consumindo o hook.
- Componentes novos em `src/components/dashboard/`: `KPIBlock.tsx`, `EvolucaoCompetenciaChart.tsx`, `FluxoProjetadoChart.tsx`, `TopRanking.tsx`, `ProximosVencimentos.tsx`, `AlertasInteligentes.tsx`.
- Tipos em `src/types/database.ts`.
- Sem mudança de RLS — view herda permissões com `security_invoker=on`.

### Arquivos
- **Migration**: `is_transferencia` + view + function.
- **Novos**: `src/hooks/useFinanceiroDashboard.ts`, 6 componentes em `src/components/dashboard/`.
- **Editados**: `src/pages/FinanceiroVisaoGeral.tsx`, `src/types/database.ts`, `src/components/config-financeiras/ContasBancariasTab.tsx` (botão saldo inicial).

