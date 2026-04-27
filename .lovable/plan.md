## Objetivo

Adicionar **drag-and-drop** ao Kanban da aba Cards de `/projetos`, permitindo arrastar um card de uma coluna (etapa) para outra e atualizar o status do projeto no banco. Hoje as colunas existem mas os cards não são arrastáveis.

## Como vai funcionar

- Biblioteca: **`@dnd-kit/core`** (já instalada e usada no Kanban de Orçamentos — mesmo padrão).
- Cada **card** vira `useDraggable` (id = project id, data = row).
- Cada **coluna** vira `useDroppable` (id = status).
- Sensor: `PointerSensor` com `activationConstraint: { distance: 6 }` — assim o `onClick` que abre o detalhe do projeto continua funcionando sem disparar drag.
- `DragOverlay` mostra um clone "fantasma" do card seguindo o cursor, com leve rotação (igual Orçamentos).
- Ao soltar em outra coluna: abrir `useConfirm` ("Mover X para Y?"). Se confirmar, `UPDATE projects.status` e recarregar.
- Soltar na própria coluna ou fora: ignora.
- Feedback visual: coluna alvo recebe `ring-2 ring-primary/30 bg-primary/5` enquanto está sendo "hovered".
- Card durante drag: `opacity: 0.35` no original, cursor `grabbing`, `touchAction: none`.

## Arquivos

**Novo**: `src/components/projetos/ProjetosKanban.tsx`
- Componente isolado com toda a lógica D&D (DndContext, colunas, cards, overlay).
- Recebe `rows`, `visibleStatuses`, `onCardClick`, `onChanged` (callback de reload) por props.
- Usa `useConfirm` interno para o diálogo de mudança de status.
- Usa `supabase.from("projects").update({ status })` direto.

**Editado**: `src/pages/Projetos.tsx`
- Remove o JSX inline da grade de colunas Kanban (~80 linhas atuais).
- Substitui por `<ProjetosKanban rows={filtered} visibleStatuses={statusFilter} onCardClick={openDrawer} onChanged={load} />`.
- Mantém todo o resto (KPIs, filtros, Tabela, mobile cards, paginação) intocado.

## Detalhes técnicos

- O `onClick` do card (abrir detalhe) é preservado dentro do wrapper draggable — graças à `activationConstraint.distance: 6`, clicks simples não viram drag.
- Mobile (`md:hidden`) **não usa** o componente Kanban, segue como grid vertical de cards (drag horizontal não faz sentido em telas pequenas).
- Status `"arquivado"` e `"cancelado"` continuam sendo colunas válidas se o usuário marcá-los no filtro — soltar lá funciona como mover para essa etapa (substituindo a ação "arquivar" do menu, mas o menu segue existindo).
- Sem reordenação dentro da mesma coluna nesta entrega (a ordenação do banco é por `code`).

## Fora do escopo

- Reordenação manual dentro da coluna.
- Salvar uma "ordem" customizada por status.
- D&D no mobile.
