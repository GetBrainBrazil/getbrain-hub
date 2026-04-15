

## Plano: Ordenação por coluna nas tabelas

### O que será feito

1. **Criar componente `SortableTableHead`** (`src/components/SortableTableHead.tsx`)
   - Substitui o `TableHead` padrão nas colunas ordenáveis
   - Exibe ícone ao lado do título: `ArrowUp` (crescente), `ArrowDown` (decrescente), ou `ArrowUpDown` (neutro/sem ordenação)
   - Ciclo ao clicar: neutro → crescente → decrescente → neutro
   - Props: `label`, `sortKey`, `currentSort`, `onSort`

2. **Adicionar estado de ordenação com persistência** em cada página
   - Tipo: `{ key: string | null, direction: "asc" | "desc" | null }`
   - Usar `usePersistedState` com keys únicas (`movimentacoes_sort`, `contas_pagar_sort`, `contas_receber_sort`)
   - Default: `{ key: null, direction: null }` (ordem de lançamento original)

3. **Aplicar sort no array `filtered`** antes de renderizar
   - Criar função genérica `applySorting(items, sortConfig)` que ordena por:
     - Strings (descrição, nome entidade, status, categoria)
     - Números (valor_previsto, valor_realizado)
     - Datas (data_vencimento, data_pagamento, data_competencia)
   - Quando `direction === null`, mantém ordem original (por data de lançamento, vinda do banco)

4. **Integrar nas 3 páginas:**
   - `Movimentacoes.tsx` — colunas: Entidade, Descrição, Categoria, Valor, Vencimento, Pagamento/Recebimento, Status
   - `ContasPagar.tsx` — colunas: Vencimento, Descrição, Fornecedor, Valor Previsto, Valor Pago, Status
   - `ContasReceber.tsx` — colunas: Vencimento, Descrição, Cliente, Valor Previsto, Valor Recebido, Status
   - Coluna "Ações" não terá ordenação

### Arquivos
- `src/components/SortableTableHead.tsx` — novo
- `src/pages/Movimentacoes.tsx` — estado de sort + aplicar sorting + substituir TableHead
- `src/pages/ContasPagar.tsx` — idem
- `src/pages/ContasReceber.tsx` — idem

