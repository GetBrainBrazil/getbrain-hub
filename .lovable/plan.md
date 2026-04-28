## Objetivo

Adicionar seleção múltipla na tabela de Leads (incluindo "selecionar todos") com ações em lote (excluir em grupo) e fazer os KPIs do topo refletirem dinamicamente os leads selecionados.

## Comportamento

**Seleção (apenas modo Tabela):**
- Nova coluna inicial com `Checkbox` por linha + checkbox no header (selecionar todos os filtrados, com estado indeterminate quando seleção parcial)
- Clicar no checkbox NÃO navega para o detalhe (stopPropagation)
- Versão mobile (cards): toggle de "modo seleção" com checkbox no canto de cada card
- Seleção persiste apenas em memória; é resetada ao trocar filtros que removam itens selecionados (limpa ids ausentes da lista filtrada) e ao trocar para Kanban

**Barra de ações em lote (aparece quando `selected.size > 0`):**
- Mostra "N leads selecionados"
- Botão "Limpar seleção"
- Botão "Excluir selecionados" (destructive) → abre `ConfirmDialog` (`useConfirm` de `@/components/ConfirmDialog`) listando quantos serão excluídos. Após confirmar, executa exclusão em lote e mostra `toast` (sonner) de sucesso/erro
- Posicionada acima da tabela (sticky no topo do conteúdo, abaixo da toolbar) para ficar sempre visível

**KPIs dinâmicos:**
- Quando há seleção: KPIs recalculam com base nos leads selecionados:
  - "Leads selecionados" (substitui "Leads abertos") — total selecionado
  - "Convertidos / Selecionados" — % de selecionados com status `convertido`
  - "Valor selecionado" — soma de `estimated_value` dos selecionados
- Quando não há seleção: comportamento atual (Leads abertos, Taxa conversão global, Valor dos filtrados)
- Indicador visual sutil (badge "seleção") nos KPIs em modo seleção para deixar claro que o número mudou de contexto

## Implementação técnica

**Arquivo principal:** `src/pages/crm/CrmLeads.tsx`
- Novo state: `const [selected, setSelected] = useState<Set<string>>(new Set())`
- Effect que poda `selected` removendo ids fora de `filtered` quando os filtros mudam
- Helpers: `toggleOne(id)`, `toggleAll()`, `clearSelection()`
- Derivar `selectedLeads = filtered.filter(l => selected.has(l.id))`
- Renderização condicional dos KPIs com base em `selected.size > 0`

**Hook de exclusão em lote:** estender `src/hooks/crm/useLeads.ts`
- Novo hook `useBulkDeleteLeads()` que faz:
  ```ts
  await sb.from('deal_activities').delete().in('lead_id', ids);
  await sb.from('leads').delete().in('id', ids);
  ```
- `onSettled`: invalidar `crm-leads`, `crm-leads-full`, `crm-metrics`, `crm-dashboard-exec` (mesmo padrão de `useDeleteLead`)
- Considerar bloqueio: leads com `converted_to_deal_id` não devem ser excluídos diretamente — filtrar antes e avisar via toast quantos foram pulados (mantém consistência com regra atual de exclusão individual; a trigger `lead_revert_on_deal_delete` cuida do caso reverso)

**UI:**
- Usar `Checkbox` de `@/components/ui/checkbox` (já existente em shadcn)
- `useConfirm()` de `@/components/ConfirmDialog` para confirmação destrutiva (regra do projeto: nunca usar `confirm()` nativo)
- `toast` de `sonner` para feedback
- Manter responsividade: barra de ações vira full-width no mobile; checkbox de seleção em cards mobile aparece apenas com botão "Selecionar" ativo na toolbar

## Fora do escopo
- Outras ações em lote (mudar status, atribuir dono) — apenas exclusão neste passo
- Seleção persistida entre sessões
- Modo Kanban (seleção só em Tabela/Cards)
