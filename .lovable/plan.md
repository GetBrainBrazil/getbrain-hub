## Padronizar trilha da proposta + linkar criação CRM ↔ Financeiro

Três pontos a resolver:

### 1. Por que tem "duas Sunbright"?

Confirmado no banco: as duas (`PROP-0005` e `PROP-0006`) **estão sim ligadas** ao mesmo deal `DEAL-988`. Isto é, **elas já aparecem hoje** dentro da aba Proposta do card no CRM (a query usa `where deal_id = deal.id`). A "duplicação" é dado real — alguém clicou em **"Criar proposta a partir do deal"** mais de uma vez (via diálogo de conflito) ou criou uma direto no `/financeiro/orcamentos` apontando para o mesmo deal. **Não é bug de visibilidade.**

> Se você quiser de fato ter só uma, basta excluir a antiga (PROP-0005) — faço isso depois se confirmar.

### 2. Trilha do kanban (board) ≠ trilha do card (stage pipeline)

Hoje:

- **Kanban em `/financeiro/orcamentos`** mostra 5 colunas: `Rascunho · Enviada · Convertida · Recusada · Expirada`.
- **Pipeline dentro do card** (`ProposalStagePipeline`) mostra 7: `Rascunho → Enviada → Visualizada → Com interesse | Convertida · Recusada` (mais o aviso de Expirada quando aplicável).

Pelo seu pedido, vou **alinhar os dois** assim:

- Adicionar duas colunas ao kanban entre "Enviada" e "Convertida":
  - **Visualizada** (`status = visualizada`)
  - **Com interesse** (`status = interesse_manifestado`)
- Manter a coluna **Expirada** só como "derivada" (não aceita drop manual — o sistema marca pela data).
- **Resultado**: o board fica `Rascunho · Enviada · Visualizada · Com interesse · Convertida · Recusada · Expirada`, idêntico à trilha do card.

Implementação técnica:

- `src/components/orcamentos/OrcamentoKanban.tsx`
  - Estender o tipo `ColumnId` com `visualizada` e `interesse_manifestado`.
  - Atualizar o reducer `columns = { rascunho, enviada, visualizada, interesse_manifestado, convertida, recusada, expirada }` e o agrupamento.
  - Renderizar as duas colunas novas (com `accentClass` neutro / accent da marca).
  - Atualizar o `LABEL` map.
- `src/hooks/orcamentos/useUpdateProposal.ts` ou validador equivalente — garantir que o drag aceite os novos valores (`canMoveTo`).
- `src/components/orcamentos/OrcamentoStatusBadge.tsx` — já cobre os 7 estados, sem mudança.
- KPIs do topo (`useProposalKPIs`) seguem agregando os mesmos status, sem mudança.

### 3. Sincronização real CRM ↔ Financeiro

Já está tecnicamente sincronizado (mesma tabela `proposals`, ligada por `deal_id`). O que **falta** é a recíproca: ao criar uma proposta direto em `/financeiro/orcamentos`, hoje **não há campo para vincular ao deal**, então ela nasce com `deal_id = null` (ex.: PROP-0001 da "Equipe Certa").

Vou adicionar:

- **No diálogo "Nova proposta" (`/financeiro/orcamentos`)**: campo opcional **"Vincular ao deal do CRM"** com combobox que busca deals abertos (mesmo padrão do `ComboboxCreate`/`Combobox` já usado em outras telas). Mostra `code · company · stage`. Sem deal selecionado, segue criando avulsa como hoje.
- Quando o deal é escolhido, pre-popula `client_company_name` e demais campos do CNPJ a partir do `deals → companies` (mesmo lookup já usado por `createProposalFromDeal`).
- **Na aba Proposta do deal (CRM)**: já lista corretamente — sem mudança.
- **Indicador de "deal vinculado" no card do kanban**: pequeno chip `DEAL-XXX` clicável (vai pra `/crm/deals/{id}`), reaproveitando o relacionamento `deal:deals!proposals_deal_id_fkey` que `useProposals` já traz.

Arquivos:

- `src/components/orcamentos/NovaPropostaDialog.tsx` (ou nome equivalente — confirmar pelo `Orcamentos.tsx`) — adicionar combobox de deals.
- `src/hooks/crm/useDealsLookup.ts` (novo) — query enxuta `select id, code, title, stage, company:companies(name)` filtrando deals não-fechados.
- `src/components/orcamentos/OrcamentoKanbanCard.tsx` — chip `DEAL-XXX` no header do card.

### Fora de escopo

- Mudar o destino do drop "Expirada" (continua sendo derivado por data).
- Mover múltiplas propostas em massa.
- Auto-merge de propostas duplicadas para o mesmo deal — preciso de UX explícita pra isso (você confirma qual fica).

Aprova que eu siga?
