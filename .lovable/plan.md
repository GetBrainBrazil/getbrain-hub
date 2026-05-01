## Mini-stepper de etapas no card do Pipeline

Replicar o visual de "abas segmentadas" do modal de Ganho (`Tabs` com ícone + label, fundo cinza claro com pill branca destacando o ativo) dentro do `DealCard` para indicar visualmente em qual dos 5 estágios abertos o deal está.

### Os 5 estágios representados

Os mesmos `OPEN_STAGES` já usados no funil do dashboard (`src/components/crm/dashboard/FunilVisual.tsx`):

1. **Novo Lead** (`descoberta_marcada`)
2. **Primeiro Contato** (`descobrindo`)
3. **Qualificado** (`proposta_na_mesa`)
4. **Proposta Enviada** (`ajustando`)
5. **Negociação** (`gelado`)

Deals em `ganho` ou `perdido` não exibem o stepper (já estão fora do funil ativo).

### Como vai ficar (visual)

Mesma linguagem do modal — `bg-muted` no trilho, pill ativa com `bg-background` + sombra sutil, etapas anteriores em tom secundário, próximas em tom muted, etapa atual com cor do estágio. Sem labels em telas estreitas (só bolinha colorida + barra), igual ao modal usa `hidden sm:inline` no texto.

```text
┌──────────────────────────────────────────────────┐
│ ●─────●─────●─────[● Proposta]─────○─────────── │
│ Lead  Cont. Qual.  ATUAL          Negoc.        │
└──────────────────────────────────────────────────┘
```

Posicionamento: logo **abaixo do título do deal** e antes do bloco de empresa (linha ~117 do `DealCard.tsx`), para ficar visível sem deslocar o footer ou os valores.

### Comportamento

- **Apenas visual** (não clicável). Movimentação entre estágios continua sendo via drag-and-drop entre colunas ou pelo drawer do deal — evita conflito com o `useDraggable` do card e cliques acidentais.
- Tooltip em cada bolinha com o nome completo do estágio (já temos `TooltipProvider` no card).
- Em colunas estreitas/mobile, mostra só os 5 dots conectados por uma linha, sem texto.

### Arquivos afetados

- `src/components/crm/DealCard.tsx` — adiciona o componente `StageMiniStepper` interno e renderiza após o `<h3>` do título, condicional a `deal.stage` estar em `OPEN_STAGES`.

Sem mudanças em hooks, banco ou outros componentes. Reutiliza `DEAL_STAGES`, `DEAL_STAGE_LABEL`, `DEAL_STAGE_DOT` e `DEAL_STAGE_BAR` já exportados de `src/constants/dealStages.ts`.

### Detalhes técnicos

```tsx
const OPEN_STAGES: DealStage[] = ['descoberta_marcada','descobrindo','proposta_na_mesa','ajustando','gelado'];

function StageMiniStepper({ stage }: { stage: DealStage }) {
  const idx = OPEN_STAGES.indexOf(stage);
  if (idx === -1) return null; // ganho/perdido não exibem
  return (
    <div className="mt-2 flex items-center gap-1 rounded-md bg-muted/60 p-1" onClick={(e) => e.stopPropagation()}>
      {OPEN_STAGES.map((s, i) => {
        const isActive = i === idx;
        const isPast = i < idx;
        return (
          <Tooltip key={s}>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-sm py-1 text-[9px] font-semibold uppercase tracking-wide transition',
                isActive && 'bg-background shadow-sm text-foreground',
                isPast && 'text-foreground/60',
                !isActive && !isPast && 'text-muted-foreground/40',
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full',
                  isActive ? DEAL_STAGE_DOT[s] : isPast ? 'bg-foreground/40' : 'bg-muted-foreground/30')} />
                <span className="hidden lg:inline truncate">{DEAL_STAGE_LABEL[s]}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">{DEAL_STAGE_LABEL[s]}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
```

`onClick` com `stopPropagation` para que cliques na barra não disparem a abertura do deal nem interfiram com o `useDraggable` do card no Pipeline.
