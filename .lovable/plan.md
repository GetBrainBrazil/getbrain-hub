

## Objetivo
Substituir o drawer lateral de detalhes em "Contas a Pagar / Receber" por uma **página dedicada** que abre já em **modo de edição** ao clicar em uma transação.

## Fluxo proposto

1. Clicar em uma linha da tabela → navega para `/financeiro/movimentacoes/:id` (em vez de abrir o `Sheet`)
2. Nova página carrega a movimentação pelo ID e renderiza um formulário completo já editável
3. Botão "Voltar" no topo retorna para `/financeiro/movimentacoes` preservando a aba/filtros (já persistidos via `usePersistedState`)
4. Ações disponíveis na nova página: **Salvar**, **Cancelar/Voltar**, **Registrar Pagamento/Recebimento**, **Excluir**

## Mudanças

### 1. Nova página `src/pages/MovimentacaoDetalhe.tsx`
- Carrega movimentação + listas de referência (clientes, fornecedores, categorias, contas, projetos, meios de pagamento, centros de custo) em paralelo
- Header com breadcrumb/voltar, tipo (A Pagar / A Receber), `StatusBadge` e valor em destaque
- Formulário em cards organizados por seções:
  - **Informações principais**: Descrição, Valor previsto, Valor realizado, Datas (competência, vencimento, pagamento)
  - **Vinculações**: Cliente OU Fornecedor (conforme tipo), Projeto, Categoria, Centro de Custo, Conta Bancária, Meio de pagamento
  - **Observações**
- Todos os campos já editáveis ao abrir (não precisa clicar em "Editar")
- Botões fixos no rodapé: `Salvar Alterações`, `Registrar Pagamento/Recebimento` (se ainda pendente), `Excluir`

### 2. `src/App.tsx`
- Adicionar rota `<Route path="/financeiro/movimentacoes/:id" element={<ProtectedRoute><MovimentacaoDetalhe /></ProtectedRoute>} />`

### 3. `src/pages/Movimentacoes.tsx`
- Remover o bloco do `Sheet` de detalhes (linhas 775–908) e o estado `detailMov`
- Trocar `onClick={() => setDetailMov(m)}` na `TableRow` por `navigate(\`/financeiro/movimentacoes/${m.id}\`)`
- Manter o modal de **criar** novo lançamento intacto
- Manter o diálogo de "Dar Baixa" (pode ser disparado tanto da página de detalhe quanto da listagem se necessário — na listagem não é mais necessário, então remover seu acionamento via drawer)

### Persistência de filtros
Filtros e aba já usam `usePersistedState`, então ao voltar da página de detalhe a listagem permanece exatamente como estava.

### Consistência visual
- Reutilizar `KPICard`/cards, `StatusBadge`, `formatCurrency`, `formatDate`, mesma tipografia e cores (vermelho saídas, verde entradas, navy destaques)
- Layout responsivo igual às outras páginas internas do módulo

### Arquivos
- **Criado**: `src/pages/MovimentacaoDetalhe.tsx`
- **Editado**: `src/App.tsx` (nova rota), `src/pages/Movimentacoes.tsx` (remover Sheet, navegar ao clicar)

