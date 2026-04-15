

## Plano: Filtro de período com persistência global

### O que será feito

1. **Criar hook reutilizável `usePersistedState`** (`src/hooks/use-persisted-state.ts`)
   - Hook genérico que salva/lê estado do `localStorage`
   - Assinatura: `usePersistedState<T>(key: string, defaultValue: T)`
   - Será usado para persistir TODOS os filtros do sistema (busca, status, período, aba, etc.)

2. **Criar componente `PeriodFilter`** (`src/components/PeriodFilter.tsx`)
   - Dropdown estilizado como no print: ícone de calendário + texto do filtro selecionado + seta
   - Opções: "Todo o Período", "Hoje", "Esta Semana", "Este Mês" (default), "Este Ano", "Últimos 30 dias", "Personalizado"
   - Ao selecionar "Personalizado": exibe dois campos de data (dd/mm/aaaa) com DatePicker usando o Calendar do shadcn
   - Retorna `{ startDate: Date | null, endDate: Date | null }` para o componente pai

3. **Integrar em `Movimentacoes.tsx`**
   - Colocar `PeriodFilter` ao lado do campo de busca, na toolbar superior
   - Filtrar a lista `movs` pelo período selecionado (usando `data_vencimento`)
   - Os KPIs (totalPendente, totalRecebidoPago, totalAtrasado) serão recalculados com base nos dados filtrados
   - Substituir `useState` por `usePersistedState` em: `search`, `statusFilter`, `tab`, e o novo filtro de período

4. **Integrar em `ContasPagar.tsx` e `ContasReceber.tsx`**
   - Mesmo componente `PeriodFilter` ao lado da busca
   - Mesma lógica de filtragem e recálculo de KPIs
   - Persistência dos filtros com `usePersistedState`

### Persistência (regra global)
- Cada filtro terá uma key única no localStorage (ex: `movimentacoes_tab`, `movimentacoes_period`, `contas_pagar_search`)
- O estado sobrevive a troca de aba, refresh e fechamento do navegador

### Arquivos
- `src/hooks/use-persisted-state.ts` — novo
- `src/components/PeriodFilter.tsx` — novo
- `src/pages/Movimentacoes.tsx` — adicionar filtro + persistência
- `src/pages/ContasPagar.tsx` — adicionar filtro + persistência
- `src/pages/ContasReceber.tsx` — adicionar filtro + persistência

