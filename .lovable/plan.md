Vou interligar 100% o stepper dentro do card do deal com o Kanban, nas duas direções, mantendo as confirmações já existentes (proposta obrigatória, motivo de perda, dialog de "ganho").

## O que já funciona hoje

- **Card → Kanban**: o stepper no `DealHeader` (`StageStepper`) chama `handleStageChange` em `CrmDealDetail`, que usa `useUpdateDealField` e invalida `['crm-deals']` (Kanban) + `['crm-metrics']`. Isso já reflete na hora.
- **Mesmas regras de negócio do Kanban**: ao clicar em "Convertido", abre o `DealWonDialog`; em "Perdido", pede o motivo; em "Qualificado/Proposta" sem proposta vinculada, abre o `NeedsProposalDialog`. Reaproveita os mesmos diálogos do Pipeline.

## O que falta (o gap real)

- **Kanban → Card**: ao arrastar no Kanban, `useUpdateDealStage` faz patch otimista só nas listas `['crm-deals']` e invalida apenas `['crm-deals']` e `['crm-metrics']` — **não invalida `['crm-deal-code', code]`**, que alimenta o stepper do detalhe. Se o card estiver aberto em outra aba/janela ou for aberto logo após a mudança, o stepper só atualiza no próximo refetch (foco/tempo).

## Mudança proposta

Em `src/hooks/crm/useDeals.ts`, dentro de `useUpdateDealStage`:

1. **Patch otimista também no detalhe**: percorrer caches existentes em `['crm-deal-code', *]`, achar o deal pelo `id` e atualizar `stage`, `probability_pct`, `lost_reason`, `estimated_value`.
2. **Invalidação completa no `onSettled`**: além de `crm-deals` e `crm-metrics`, invalidar `['crm-deal-code']` (todos os codes) e `['crm-deal-audit']` para a timeline do deal refletir a mudança.

Resultado: arrastar um card no Kanban atualiza o stepper do detalhe instantaneamente, mesmo se o detalhe já estiver aberto.

## Verificação

- Mover card no Kanban → abrir detalhe → stepper já no estágio novo, sem refresh.
- Clicar no stepper dentro do card → coluna correta no Kanban, com mesma confirmação (won/lost/proposta).
- Tab "Timeline" do deal mostra a transição vinda do Kanban.

## Arquivos editados

- `src/hooks/crm/useDeals.ts` — ajustes no `useUpdateDealStage` (otimista + invalidações).