# Correções do Kanban de Orçamentos

## Problemas identificados

1. **"Visualização fantasma" seguindo o cursor**: O card original aplica `transform` do `useDraggable` ao mesmo tempo em que o `DragOverlay` renderiza outra cópia. Resultado: dois cards se movem (o original "voa" junto). O padrão dnd-kit é **ou usar `DragOverlay` (e o original fica parado, só com opacity)**, **ou** usar `transform` no item — nunca os dois.

2. **Barra de scroll lateral aparece ao arrastar**: O `transform: translate3d` empurra o card para fora da coluna, e como o container da coluna tem `overflow-y-auto`, o navegador adiciona scrollbars quando o card sai dos limites.

3. **Barra de scroll vertical na coluna ao arrastar**: O `max-h-[calc(100vh-22rem)]` na lista interna combinada com o card "subindo" via transform faz o conteúdo estourar e habilitar scroll.

4. **`touchAction: "none"` no card inteiro** bloqueia scroll natural da página em mobile/trackpad até no clique simples.

## Solução (Kanban padrão)

### `OrcamentoKanbanCard.tsx`
- **Remover `transform` do style** quando há `DragOverlay` ativo. O card original fica no lugar, apenas com `opacity: 0.4` e `pointer-events: none` durante drag.
- Mover `touchAction: "none"` para um **drag handle** (a área inteira do card continua arrastável, mas só ativa quando o pointer realmente arrasta — já temos `activationConstraint: { distance: 6 }`, então ok manter no card, mas sem o transform o scroll volta a funcionar).
- Aplicar `aria-hidden` e visibilidade reduzida no original durante drag.

### `OrcamentoKanbanColumn.tsx`
- Trocar `overflow-y-auto` + `max-h-[calc(100vh-22rem)]` por **altura controlada no container do board** (não na coluna). Coluna usa `flex-1 overflow-y-auto` dentro de um wrapper com altura fixa (`h-[calc(100vh-16rem)]`).
- Remover `min-h-[120px]` e usar área de drop que ocupa toda a coluna (não só a lista). Hoje o `setNodeRef` está no wrapper externo, mas a área visual de drop fica confusa por causa do header. Vamos manter o ref no wrapper mas garantir que o feedback `isOver` cubra a coluna inteira.

### `OrcamentoKanban.tsx`
- Adicionar `collisionDetection={closestCorners}` para drop mais preciso.
- Envolver as colunas em um wrapper com altura fixa para evitar que o board cresça verticalmente:
  ```text
  <div className="h-[calc(100vh-16rem)] overflow-hidden">
    <div className="flex gap-3 h-full overflow-x-auto pb-2">
      [colunas com h-full]
    </div>
  </div>
  ```
- `DragOverlay` mantém o card "fantasma" único que segue o cursor (esse é o correto).

## Resultado esperado

- Apenas **um card "fantasma"** segue o cursor (via `DragOverlay`), o original fica parado e esmaecido.
- **Sem scrollbars** aparecendo durante o drag.
- Coluna com altura fixa, scroll interno só quando há muitos cards (não relacionado ao drag).
- Comportamento idêntico aos Kanbans padrão (Trello/Linear).

## Arquivos alterados

- `src/components/orcamentos/OrcamentoKanbanCard.tsx`
- `src/components/orcamentos/OrcamentoKanbanColumn.tsx`
- `src/components/orcamentos/OrcamentoKanban.tsx`

Nenhuma mudança em DB, hooks ou outras telas.
