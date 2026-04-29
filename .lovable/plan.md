## Diagnóstico do flicker no Kanban do CRM

Quando você arrasta um card de uma coluna pra outra, por 1 frame ele "pisca" de volta na coluna antiga antes de aparecer na nova. Isso acontece porque:

1. O Pipeline usa `DragOverlay` (uma cópia do card que segue o mouse) **e** o card original continua sendo renderizado na coluna antiga durante o arrasto.
2. Quando você solta, o overlay desaparece imediatamente. O card original ainda está montado na coluna antiga, com o `transform` voltando a `(0,0)` — então ele "snap-back" para a posição inicial.
3. No próximo frame, o React aplica o optimistic update do `useUpdateDealStage` (`onMutate`) e o card aparece na coluna nova. Esse delta de 1 frame é o flash que você vê.

A causa raiz não é a query nem o backend (o optimistic update já está correto): é só o item original do dnd-kit ficando visível durante o arrasto.

## Correção

Em `src/pages/crm/CrmPipeline.tsx`, ajustar o componente `DraggableDeal` para que **enquanto `isDragging` for verdadeiro o card original fique invisível e com altura zero** — quem se move visualmente é só o `DragOverlay`. Quando você solta, o overlay some no mesmo instante em que o React reposiciona o card real na nova coluna (via optimistic update já existente). Sem dois cards na tela ao mesmo tempo, sem snap-back, sem flicker.

Mudança pontual:

```tsx
function DraggableDeal({ deal, onOpen, onCompanyOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });

  if (isDragging) {
    // Item real "colapsa" — visualização fica a cargo do DragOverlay.
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="opacity-0 pointer-events-none"
        style={{ height: 0, margin: 0, overflow: 'hidden' }}
        aria-hidden
      />
    );
  }

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <DealCard deal={deal} onClick={onOpen} onCompanyClick={onCompanyOpen} />
    </div>
  );
}
```

Mantém:
- `DragOverlay` com `dropAnimation={null}` (já está assim — sem animação de retorno).
- `useUpdateDealStage` com optimistic update (já está correto).
- Toda a lógica de drag/drop, gates de proposta/perda/ganho.

## Resultado esperado

Você arrasta o card → ele segue o mouse via overlay → solta na nova coluna → ele aparece direto lá, sem "voltar e ir" visual. Transição suave, sem bug.
