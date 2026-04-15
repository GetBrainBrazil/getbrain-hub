

## Plano: Submódulo "Extratos Bancários" no módulo Financeiro

### O que será feito

Criar uma nova página de Extratos Bancários (`/financeiro/extratos`) que permite visualizar o extrato de movimentações por conta bancária, com filtros de período e conta, saldo acumulado e exportação.

### Funcionalidades

- **Seletor de conta bancária** no topo (dropdown com as contas cadastradas em `contas_bancarias`)
- **Filtro de período** reutilizando o componente `PeriodFilter` existente
- **Tabela de extrato** com colunas: Data, Descrição, Categoria, Entrada, Saída, Saldo
- **KPIs no topo**: Saldo Inicial, Total Entradas, Total Saídas, Saldo Final
- **Dados**: consulta a tabela `movimentacoes` filtrando por `conta_bancaria_id` e período, ordenando por data
- **Cálculo de saldo**: saldo inicial da conta + acumulado linha a linha
- Tab ativa persistida com `usePersistedState`

### Mudanças

1. **Criar `src/pages/ExtratosBancarios.tsx`**
   - Dropdown de conta bancária (busca de `contas_bancarias`)
   - PeriodFilter para filtro de datas
   - 4 KPI cards (Saldo Inicial, Entradas, Saídas, Saldo Final)
   - Tabela com saldo acumulado calculado linha a linha
   - Cabeçalhos ordenáveis com `SortableTableHead`

2. **Atualizar `src/components/AppSidebar.tsx`**
   - Adicionar `{ title: "Extratos Bancários", url: "/financeiro/extratos" }` após "Relatórios" no array `financeiroItems`

3. **Atualizar `src/App.tsx`**
   - Importar `ExtratosBancarios`
   - Adicionar rota `/financeiro/extratos`

### Arquivos
- `src/pages/ExtratosBancarios.tsx` — novo
- `src/components/AppSidebar.tsx` — adicionar item no menu
- `src/App.tsx` — adicionar rota

