

## Submódulo de Vendas em `/financeiro/vendas`

### Conceito

Hoje uma "venda" não existe como entidade — ela está implícita em `projects` (one-shot) + `maintenance_contracts` (recorrente) + parcelas em `movimentacoes`. Vou criar a entidade **Venda** que **conecta esses três módulos** numa única tela operacional, sem duplicar dado: cada venda referencia um projeto e gera (ou anexa) suas parcelas em `contas a receber`.

Tipos de venda suportados:
- **Implementação (one-shot)** — N parcelas geradas a partir do `contract_value` e `installments_count` do projeto.
- **Recorrente (manutenção)** — vincula a um `maintenance_contracts` existente.
- **Avulso** — venda extra para um projeto/cliente já existente (ex.: módulo adicional, hora extra).

### Backend (1 migration de schema + 1 função SQL)

**Tabela nova `vendas`** (referencia projects e gera movimentações):
- `id`, `organization_id` (default GetBrain), `numero` text único auto (`VND-001`, `VND-002`...) via sequence.
- `project_id` (FK lógica para `projects`, nullable não — toda venda pertence a um projeto).
- `cliente_id` (FK lógica para `clientes`, derivado mas armazenado para histórico).
- `tipo_venda` text: `implementacao` | `recorrente` | `avulso`.
- `descricao` text, `valor_total` numeric, `quantidade_parcelas` int default 1, `data_venda` date default hoje, `data_primeira_parcela` date.
- `categoria_id`, `centro_custo_id`, `conta_bancaria_id`, `meio_pagamento_id` (defaults para as parcelas geradas).
- `maintenance_contract_id` nullable (quando `tipo_venda='recorrente'`).
- `status` text: `rascunho` | `confirmada` | `cancelada`.
- `observacoes` text, `created_at`, `updated_at`, `created_by`, `deleted_at`.
- RLS: `auth.uid() IS NOT NULL` (mesmo padrão das outras tabelas financeiras).

**Função `vendas_gerar_parcelas(p_venda_id uuid)`** — quando a venda é confirmada:
- Para `implementacao`: cria N linhas em `movimentacoes` (`tipo='receita'`, `status='pendente'`, vencimento mensal a partir de `data_primeira_parcela`, valor = `valor_total / quantidade_parcelas`, com `source_module='vendas'`, `source_entity_type='venda'`, `source_entity_id=p_venda_id`).
- Para `avulso`: 1 linha em `movimentacoes`.
- Para `recorrente`: não gera (o trigger de `maintenance_contracts` já cuida).
- Idempotente: ignora se já existem parcelas com mesmo `source_entity_id`.

**Reaproveitamento de dados existentes**: na primeira execução, oferecer um botão "Importar vendas dos projetos atuais" que cria 1 venda por projeto agrupando as receitas órfãs por `projeto_id` (`source_module IS NULL`), preservando IDs originais via `source_entity_id` da venda criada — sem duplicar movimentação. PRJ-001 vira `VND-001` com 12 parcelas, PRJ-003 vira `VND-002` com 2 parcelas.

**Função RPC `vendas_dashboard(p_inicio, p_fim)`** — agrega para a página:
- Total vendido no período (sum `valor_total` confirmadas).
- Total recebido (sum movimentações `pago` originadas de vendas).
- Total a receber e atrasado (mesmas regras do dashboard financeiro, escopo vendas).
- Ticket médio, qtd de vendas, top 5 clientes por valor vendido.

### Frontend

**Nova rota** `/financeiro/vendas` adicionada em `src/App.tsx` e `AppSidebar.tsx` (logo abaixo de Dashboard, dentro de Financeiro). Submenu fica: Dashboard → **Vendas** → Contas a Pagar/Receber → ...

**Página `src/pages/Vendas.tsx`** — segue o padrão visual de `Movimentacoes.tsx`/`ContasReceber.tsx`:
- **Header**: título + botão "Nova Venda" + `PeriodFilter` (presets, persistido em `vendas_period`).
- **KPIs (4 cards)**: Total Vendido · Total Recebido · A Receber · Ticket Médio (com Δ vs período anterior).
- **Filtros**: tipo de venda (multi), status (rascunho/confirmada/cancelada), cliente (select), projeto (select), busca textual. Persistidos via `usePersistedState` (regra `mem://preference/filter-persistence`).
- **Tabela**: número · data · cliente · projeto (chip clicável → `/projetos/:id`) · tipo · valor total · parcelas (`pagas/total` + barra de progresso) · status · ações.
- Linha clicável abre **Drawer de detalhe** lateral com: dados gerais editáveis, linha do tempo das parcelas (link para cada movimentação), botões "Confirmar venda" (gera parcelas), "Cancelar venda" (marca `cancelada` + cancela parcelas pendentes).
- Empty state com botão "Importar vendas existentes dos projetos" (chama uma RPC `vendas_importar_existentes()` que faz a operação descrita acima).

**Dialog `NovaVendaDialog.tsx`**:
- Step 1: tipo de venda (radio) → projeto (combobox com `code + name`) → cliente é **derivado e bloqueado** (a partir do `company_id` do projeto via `clientes`).
- Step 2 condicional ao tipo:
  - `implementacao`: valor total, qtd parcelas, data 1ª parcela, intervalo (mensal). Mostra preview "12x R$ X" antes de confirmar.
  - `avulso`: valor, data vencimento, descrição.
  - `recorrente`: select de contrato existente OU botão "Criar contrato" (reusa `NovoContratoDialog`).
- Step 3: defaults financeiros (categoria, centro de custo, conta bancária, meio de pagamento). Categoria sugerida = "Receita de Projeto".
- Ao salvar com status `confirmada`, chama `vendas_gerar_parcelas`.

**Hook `src/hooks/useVendas.ts`** (React Query):
- `useVendas(filters)` — lista paginada com joins de cliente/projeto e contagem de parcelas pagas.
- `useVendaDetail(id)` — venda + parcelas (movimentacoes filtradas por `source_entity_id`).
- `useVendasDashboard(inicio, fim)` — RPC para KPIs.
- Invalidações cruzadas: ao confirmar/cancelar venda, invalidar `["movimentacoes"]`, `["financeiro_dashboard_kpis"]` e `["projetos"]` para refletir em todo o sistema.

**Conexão com Projetos**: na página `ProjetoDetalhe.tsx`, adicionar uma mini-seção "Vendas vinculadas" (lista compacta + botão "Nova Venda" pré-preenchido com o projeto). Sem redesenhar a aba — só um card extra na aba Operacional.

**Conexão com Contas a Pagar/Receber**: cada parcela em `movimentacoes` originada de venda mostra um chip "Venda VND-XXX" clicável (link para o drawer da venda) na coluna descrição. Lógica: se `source_module='vendas'`, render chip.

### Detalhes técnicos

- Migration: `CREATE SEQUENCE venda_numero_seq`, função `generate_venda_numero()`, tabela `vendas` com defaults, RLS, índice em `(project_id)` e `(cliente_id)`. Funções `vendas_gerar_parcelas`, `vendas_importar_existentes`, `vendas_dashboard`.
- Toda parcela carrega `source_module='vendas'` para auditoria — isso permite distinguir vendas, contratos e lançamentos manuais.
- Ao cancelar venda: parcelas `pendente` viram `cancelado` (parcelas `pago` permanecem intactas, regra do projeto).
- Sem alteração em `projects`/`movimentacoes`/`maintenance_contracts` — apenas adição de tabela e funções.
- Reuso integral de `PeriodFilter`, `KPICard`, `usePersistedState`, `useConfirm`, `StatusBadge`, padrões de drawer (`ProjetoDrawer` como referência).

### Arquivos

- **Migration nova**: tabela `vendas` + sequence + funções `vendas_gerar_parcelas`, `vendas_importar_existentes`, `vendas_dashboard`.
- **Novos**: `src/pages/Vendas.tsx`, `src/pages/VendaDetalhe.tsx` (ou drawer dentro de Vendas.tsx), `src/components/vendas/NovaVendaDialog.tsx`, `src/components/vendas/VendaDrawer.tsx`, `src/hooks/useVendas.ts`, `src/lib/vendas-helpers.ts`.
- **Editados**: `src/App.tsx` (rota), `src/components/AppSidebar.tsx` (item de menu), `src/pages/ProjetoDetalhe.tsx` (card "Vendas vinculadas"), `src/pages/Movimentacoes.tsx` (chip "Venda VND-XXX" quando `source_module='vendas'`).

### Resultado em produção

Após aprovar, ao abrir `/financeiro/vendas` você verá imediatamente: PRJ-001 e PRJ-003 já listados como vendas existentes (botão "Importar"), R$ 14.408 em vendas confirmadas, 14 parcelas com status real (todas pagas), e poderá lançar PRJ-002 e novas vendas com fluxo guiado que automaticamente gera as parcelas em Contas a Receber.

