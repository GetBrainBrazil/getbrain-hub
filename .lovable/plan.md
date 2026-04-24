## Objetivo

Em `/projetos/:id` (aba Operacional), tornar cada um dos 4 blocos (Financeiro, Tarefas, Suporte, Tokens) **clicável**, abrindo uma tela detalhada e organizada — no padrão visual e denso dos dashboards 09A/09B — porém com escopo restrito ao projeto atual.

A tela detalhada do **Financeiro** servirá como referência arquitetural; as demais (Tarefas, Suporte, Tokens) seguem a mesma estrutura adaptada ao seu domínio. Suporte e Tokens, cujos módulos ainda não estão plugados, mostram a estrutura da tela com banner "em breve" e dados zerados (princípio 2.15 — sem mock).

## Navegação e rotas

Adicionar 4 rotas filhas, sob o detalhe do projeto:

```
/projetos/:id/financeiro
/projetos/:id/tarefas
/projetos/:id/suporte
/projetos/:id/tokens
```

Cada bloco da aba Operacional vira `<Link>` para a rota correspondente. O cabeçalho do projeto (título + badges + voltar) é reutilizado nas telas detalhadas.

## Estrutura comum das telas detalhadas

Todas seguem o mesmo esqueleto (espelho dos dashboards):

```text
┌──────────────────────────────────────────────────────────┐
│ ← Voltar  •  PROJ-001 — Nome do Projeto    [badges]     │
│ Mini-KPIs em strip horizontal (4 indicadores chave)      │
├──────────────────────────────────────────────────────────┤
│ Bloco 1 (gráfico de saúde + timeline)                    │
├──────────────────────────────────────────────────────────┤
│ Bloco 2 (listas + ações "+ Novo ...")                    │
├──────────────────────────────────────────────────────────┤
│ Bloco 3 (custos / detalhes)                              │
├──────────────────────────────────────────────────────────┤
│ Bloco 4 (análise / margem / projeção)                    │
└──────────────────────────────────────────────────────────┘
```

## Tela 1 — `/projetos/:id/financeiro` (referência completa)

**Cabeçalho denso**
- Voltar + código + nome do projeto + cliente + status
- Mini-KPIs: Contratado · Recebido (% e R$) · Pendente · Margem real (com tom)

**Bloco 1 — Saúde financeira**
- Donut de recebimento (recebido / pendente / atrasado)
- Timeline horizontal de movimentações no tempo: cada parcela vira um ponto colorido (verde recebido, azul previsto, vermelho atrasado), eixo X = data de vencimento

**Bloco 2 — Parcelas & Recorrências**
- Lista de **recorrências ativas** vinculadas ao projeto (de `maintenance_contracts` e/ou `recurring_movimentacoes` do projeto): MRR, status, próximas execuções
- Lista de **parcelas individuais** (movimentacoes do projeto, tipo receita): valor, vencimento, status, badge "atrasado"
- Ações: `+ Nova parcela` (deep link em `/financeiro/movimentacoes/novo/receita?projectId=...`), `+ Nova recorrência` (deep link em `/financeiro/contratos?projectId=...&new=1`)

**Bloco 3 — Custos do projeto**
- Despesas vinculadas (movimentacoes despesa com `source_entity_id=project`): infra, APIs, freelancers
- Custos de integrações (`project_integrations.estimated_cost_monthly_brl`)
- Custo estimado de horas (alocações × custo/hora — quando disponível)
- Ação: `+ Registrar custo` → deep link em `/financeiro/movimentacoes/novo/despesa?projectId=...`

**Bloco 4 — Análise**
- Margem simples (Receita realizada − Despesa realizada)
- Margem estimada (incluindo custo de horas e custos recorrentes até entrega prevista)
- Comparação com projeção inicial (`contract_value` × `estimated_delivery_date` vs realidade)
- Indicador "vale continuar este cliente?": semáforo (saudável / atenção / prejuízo) com explicação textual

## Tela 2 — `/projetos/:id/tarefas`

Cabeçalho + mini-KPIs (Conclusão · Em andamento · Bloqueadas · Horas reais/estim.)

- Bloco 1 — Burndown e velocidade (reusar `BurndownChart`/`CompletionsPerDayChart` filtrados pelo projeto, se há dados; placeholder caso contrário)
- Bloco 2 — Distribuição por status (donut) + lista de bloqueadas
- Bloco 3 — Desvio de horas (estimado vs real por tarefa)
- Bloco 4 — Atividade recente das tarefas do projeto + link para `/dev/kanban?projectId=...`

## Tela 3 — `/projetos/:id/suporte`

Estrutura idêntica, mas como módulo Suporte ainda não está plugado:
- Mini-KPIs zerados
- Bloco único informativo "Módulo Suporte em breve" + esqueleto dos blocos previstos (tickets abertos, SLA, top categorias, evolução)

## Tela 4 — `/projetos/:id/tokens`

- Mini-KPIs: Bolsão · Consumido · Restante · % usado
- Bloco 1 — Consumo por dia no mês (área chart)
- Bloco 2 — Por categoria/modelo (donut) — placeholder
- Bloco 3 — Histórico mensal de consumo
- Bloco 4 — Projeção de estouro do bolsão
- Banner "Módulo Tokens em breve" onde não há dados

## Detalhes técnicos

**Novos arquivos**
- `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx`
- `src/pages/projetos/ProjetoTarefasDetalhe.tsx`
- `src/pages/projetos/ProjetoSuporteDetalhe.tsx`
- `src/pages/projetos/ProjetoTokensDetalhe.tsx`
- `src/components/projetos/detalhe/ProjetoDetalheHeader.tsx` — cabeçalho compartilhado (voltar, código, nome, badges, mini-KPIs strip)
- `src/components/projetos/detalhe/DetalheBloco.tsx` — wrapper visual padronizado (título, ações, conteúdo) reaproveitando o estilo de `Panel` da Aba Operacional
- `src/hooks/projetos/useProjectFinanceDetail.ts` — busca movimentacoes (receita/despesa), recorrências e contratos do projeto
- `src/hooks/projetos/useProjectTasksDetail.ts` — busca tasks/sprints filtrados por `project_id`

**Edições**
- `src/App.tsx` — registrar 4 rotas novas
- `src/components/projetos/AbaOperacional.tsx` — envolver cada `Panel` (Financeiro, Tarefas, Suporte, Tokens) em um `Link` para a rota correspondente, mantendo o `PanelFooter` interno como atalho secundário (ou substituindo por "Abrir detalhes →")

**Dados**
- Reusar `useProjectMetrics` já existente para os mini-KPIs.
- Para parcelas/custos: `supabase.from("movimentacoes").select(...).eq("source_entity_type","project").eq("source_entity_id", projectId)`.
- Para recorrências: `maintenance_contracts` filtrado por `project_id`.
- Para tarefas: `tasks` com `project_id = ?`.
- Sem novas migrations nesta etapa — apenas leituras.

**Padrões a seguir**
- `usePersistedState` para qualquer filtro local nas telas detalhadas (regra de filter-persistence).
- Reaproveitar componentes `KpiCard`, `Panel`, `StatusBadge`, `ProgressBar` da `AbaOperacional` (extrair se necessário para `detalhe/`).
- Estilo denso, mono/tabular nos números, hover sutil — alinhado ao restante do app.
- Sem dados mockados: blocos sem dado mostram `EmptyChart`/`ComingSoonBanner`.

## Entrega faseada (dentro do mesmo build)

1. Header + wrapper compartilhados + rotas + blocos clicáveis.
2. Tela Financeiro completa (4 blocos com dados reais).
3. Tela Tarefas (com dados reais quando disponíveis).
4. Telas Suporte e Tokens com esqueleto + banners "em breve".
