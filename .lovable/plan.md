## Integração: Bloco Financeiro do Projeto ↔ Contas a Pagar/Receber

Hoje a tela `/projetos/:id/financeiro` **já lê** as movimentações vinculadas ao projeto (parcelas, recorrências, despesas) via `useProjectFinanceDetail`, mas a integração com **Contas a Pagar/Receber** está incompleta:

- Os botões "Nova parcela", "Nova recorrência" e "Registrar custo" usam slugs **errados** (`/novo/receita` e `/novo/despesa`) — a rota espera `pagar`/`receber`, então o formulário de criação não pré-seleciona o tipo nem o projeto.
- Não há link para abrir a lista filtrada em **Contas a Receber/Pagar** já filtrada por este projeto.
- As linhas de parcelas/despesas mostram só o status visual; não há atalho para "dar baixa" (registrar pagamento) sem sair do projeto.
- Pagamentos feitos em Contas a Pagar/Receber aparecem aqui, mas é preciso reentrar para ver — a integração é "de mão única" hoje.

### O que será feito

#### 1. Corrigir os deep-links de criação
Em `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx`:
```ts
// antes
`/financeiro/movimentacoes/novo/receita?projectId=${projectId}`
`/financeiro/movimentacoes/novo/despesa?projectId=${projectId}`
// depois  (slug que MovimentacaoDetalhe entende)
`/financeiro/movimentacoes/novo/receber?projectId=${projectId}`
`/financeiro/movimentacoes/novo/pagar?projectId=${projectId}`
```

#### 2. Pré-preencher `projeto_id` ao criar via deep-link
Em `src/pages/MovimentacaoDetalhe.tsx`, ler `projectId` da querystring no modo `isCreate` e injetar no `form.projeto_id` do estado inicial — assim qualquer "Nova parcela / Registrar custo" abre já vinculado ao projeto.

#### 3. Aceitar filtro `?projectId=` em Contas a Pagar/Receber
Em `src/pages/ContasPagar.tsx` e `src/pages/ContasReceber.tsx`:
- Ler `projectId` via `useSearchParams`.
- Quando presente, filtrar a lista por `m.projeto_id === projectId` e mostrar um chip "Filtrado por projeto: NOME · limpar" no topo (clicar limpa o filtro removendo o param).
- Pré-selecionar `projeto_id` no diálogo "Novo lançamento" quando aberto com o filtro ativo.

#### 4. Adicionar "Ver em Contas a Receber/Pagar" no bloco do projeto
Adicionar dois links secundários no header dos blocos 2 e 3 da página de finanças do projeto:
- Bloco "Parcelas & Recorrências" → `Ver em Contas a Receber → /financeiro/contas-receber?projectId=:id` (ou rota equivalente — confirmar nome real). *Nota: hoje as rotas reais são `/financeiro/movimentacoes` filtrada; usaremos as rotas de Contas a Pagar/Receber se existirem, senão usaremos `/financeiro/movimentacoes?tipo=receita&projectId=...`.*
- Bloco "Custos do projeto" → `Ver em Contas a Pagar → ...?projectId=:id`.

#### 5. Atalho "Dar baixa" inline em ParcelaRow
Em `ParcelaRow` (mesma página), quando a parcela está `previsto`/`atrasado`, mostrar um botão "✓ Baixar" ao lado do valor. Ao clicar:
- Abre um pequeno `Dialog` com os campos `valor_realizado`, `data_pagamento`, `conta_bancaria_id`, `meio_pagamento_id` (mesmo formulário usado em Contas a Receber/Pagar — extraído para `BaixaPagamentoDialog`).
- Salva via `update` em `movimentacoes` com `status='pago'` e os campos preenchidos.
- Invalida `["project-finance-detail", projectId]` e `useProjectMetrics` → KPIs do projeto e do bloco operacional reagem na hora.

#### 6. Sincronização visual
- O hook `useProjectFinanceDetail` ganha invalidação automática no salvamento (já reagirá ao item 5).
- O componente `Donut`/`Timeline` reflete imediatamente o novo total recebido após a baixa.

### Arquivos afetados
1. `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx` — fix de slugs, links "Ver em Contas a…", botão "Baixar" em `ParcelaRow`, integração com novo `BaixaPagamentoDialog`.
2. `src/pages/MovimentacaoDetalhe.tsx` — leitura de `?projectId=` para pré-preencher form.
3. `src/pages/ContasPagar.tsx` — filtro por `?projectId=`, chip de filtro ativo, prefill no novo lançamento.
4. `src/pages/ContasReceber.tsx` — idem.
5. `src/components/financeiro/BaixaPagamentoDialog.tsx` (**novo**) — extrai o diálogo de baixa para ser reutilizável entre Contas a Pagar, Contas a Receber e o projeto.

### Fora de escopo
- Não vou refatorar a tela de Contas a Pagar/Receber para também usar o `BaixaPagamentoDialog` agora — só o projeto. Isso fica como passo opcional futuro para evitar mudanças amplas em arquivos críticos.
- Não vou alterar o schema do banco; tudo já existe (`movimentacoes.projeto_id`, `status`, `valor_realizado`, etc.).
