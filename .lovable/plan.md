## Problema

Hoje, ao mudar de estágio pelo card (stepper dentro do detalhe do deal):

1. As etapas "Convertido" (Ganho) e "Perdido" não aparecem no stepper — só são mostradas como caixa fixa quando o deal já está fechado. Não dá para fechar o deal a partir do stepper.
2. Quando se tenta marcar como "Perdido", aparece só um toast informativo ("chega no próximo loop"), sem o dialog para informar o motivo.
3. Quando se move para "Qualificado" (proposta_na_mesa) pelo stepper, **não há a checagem de proposta vinculada** que o Kanban faz — então a regra de "criar/escolher proposta" é pulada.

Resultado: o stepper do card é menos completo que o arrastar-e-soltar do Kanban.

## O que vai mudar

Tornar o stepper do detalhe do deal funcionalmente equivalente ao Kanban:

- **Mostrar Convertido e Perdido** como duas etapas extras no fim do stepper, com cores próprias (verde / vermelho) e ícones (check / X). Ficam separadas das etapas em progresso por uma divisória visual leve, para que o usuário entenda que são finalizações.
- **Confirmar antes de fechar**: clicar em "Convertido" abre o `DealWonDialog` (parcelas, MRR, descontos, etc.), e clicar em "Perdido" abre o dialog com Textarea para o motivo da perda — exatamente como acontece no Kanban.
- **Aplicar a regra de proposta** ao mover para "Qualificado" pelo stepper: se o deal não tem proposta vinculada, abre o `CreateProposalForStageDialog` (mesmo dialog usado hoje no arrastar-e-soltar). Se já tem, aplica direto.
- **Mostrar o estado fechado de forma consistente**: quando o deal já está em Convertido ou Perdido, o stepper continua mostrando todas as etapas (com a etapa atual destacada), em vez de virar uma caixa única — assim o usuário pode reabrir movendo para outra etapa anterior, se quiser.

## Como vai ser feito (técnico)

Arquivos a editar:

- `src/components/crm/CrmDetailShared.tsx`
  - Estender `PROGRESS_STAGES` para incluir `ganho` e `perdido`, mas renderizar essas duas com estilo distinto (cores success / destructive, ícones Check / X).
  - Remover o early-return "isClosed" que substitui o stepper por uma caixa única — manter o stepper sempre visível.
  - Conector visual antes de Convertido/Perdido vira um separador mais sutil.

- `src/pages/crm/CrmDealDetail.tsx`
  - Estado novo: `lostDialog` ({ deal, reason }) e `needsProposalDialog` ({ deal, stage }).
  - `handleCloseRequest('lost')` passa a abrir o dialog de motivo (Textarea + botão Confirmar) em vez de só mostrar toast.
  - Adicionar handler `handleStageChange` que substitui o atual fluxo do stepper:
    - `ganho` → abre DealWonDialog
    - `perdido` → abre dialog de motivo
    - `proposta_na_mesa` → query rápida em `proposals` por `deal_id`; se `count === 0`, abre `CreateProposalForStageDialog`; senão, persiste direto via `useUpdateDealField`.
    - Outras etapas → persiste direto.
  - Renderizar `CreateProposalForStageDialog` e o Dialog de motivo da perda no JSX (analogamente ao que já existe em `CrmPipeline.tsx`).
  - Reaproveitar `createDraftProposal` + `invalidateProposalCaches` quando o usuário criar a proposta a partir do stepper.

- `src/components/crm/DealHeader.tsx`
  - `stageChange` deixa de chamar diretamente `update.mutate` e passa a delegar tudo para o pai via uma nova prop `onStageChange(stage)`. Mantém a chamada `onCloseRequest` como fallback ou é substituída por `onStageChange` (consolidando as duas props em uma só).
  - Pequena refatoração de tipo no `Props`.

Caches: já cobertos pelos hooks existentes (`useUpdateDealField` invalida CRM; `invalidateProposalCaches` é chamado quando a proposta é criada).

## Diagrama do novo stepper

```text
Novo Lead ── Primeiro Contato ── Qualificado ── Proposta Enviada ── Negociação  ┊  Convertido   Perdido
   ●              ○                  ○               ○                 ○        ┊      ◯           ◯
                                                                                ┊   (verde)     (vermelho)
```

A divisória `┊` separa visualmente "em progresso" de "fechado".
