

## KPIs do topo reagindo à seleção de movimentações

Hoje, em `src/pages/Movimentacoes.tsx`:
- As **bolinhas de seleção** (linhas 981, 1022-1025) são apenas visuais — são `<input type="checkbox" />` sem `checked`, sem `onChange`, sem estado. Clicar nelas não faz nada (o "marcado" que você vê é o browser lembrando localmente até a próxima renderização).
- Os KPIs **Total Pendente / Total Pago / Total em Atraso** (linhas 553-557, 898-900) são calculados sobre `periodFiltered` (tudo que passou nos filtros), ignorando seleção.

Você quer que, ao marcar linhas, os 3 indicadores do topo passem a refletir **apenas a seleção**.

### Mudanças em `src/pages/Movimentacoes.tsx`

**1. Estado de seleção**
- `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
- Limpar seleção sempre que mudar `tipo` (tab A Pagar / A Receber), filtros, período ou busca — para evitar IDs "fantasmas" de linhas que não estão mais visíveis.

**2. Checkbox de cada linha (linha 1022)**
- `checked={selectedIds.has(m.id)}`
- `onChange` alterna o ID no Set.
- `onClick={e => e.stopPropagation()}` já existe no `<TableCell>` pai, mantido.

**3. Checkbox do header (linha 981)**
- Deixar de ser `disabled`.
- `checked` = todas as linhas filtradas selecionadas; `indeterminate` quando parcial.
- `onChange` seleciona/desseleciona todas as linhas atualmente filtradas (`filtered`).

**4. KPIs dinâmicos (linhas 553-557)**
- Se `selectedIds.size > 0`: calcular `totalPendente/totalRecebidoPago/totalAtrasado` apenas sobre `periodFiltered.filter(m => selectedIds.has(m.id))`.
- Se nada selecionado: comportamento atual (todas as filtradas).

**5. Indicador visual do modo "seleção"**
- Quando houver seleção, adicionar subtítulo discreto aos 3 `KPICard` ("N selecionadas") e um botão "Limpar seleção" sutil próximo aos KPIs para o usuário voltar ao modo padrão. Sem mudar o layout principal.

**6. Acessibilidade**
- Adicionar `aria-label` nos checkboxes ("Selecionar movimentação X" / "Selecionar todas").

### Comportamento final
- Nada selecionado → KPIs mostram o total do período filtrado (como hoje).
- 1+ selecionadas → KPIs mostram apenas a soma das selecionadas, com indicação "N selecionadas" e botão para limpar.
- Trocar tab / filtros / período / busca → seleção é descartada automaticamente.

### Arquivo
- **Editado**: `src/pages/Movimentacoes.tsx` (único arquivo).

