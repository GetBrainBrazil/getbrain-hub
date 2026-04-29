# Modal "Criar proposta": campos de Implementação + MRR

## Objetivo

Quando o deal for movido para **Proposta na Mesa** sem proposta vinculada, o modal de criação deve coletar **dois valores**:

- **Valor de implementação (R$)** — obrigatório, vai virar um item de escopo da proposta.
- **MRR mensal (R$)** — opcional, vai virar `maintenance_monthly_value` da proposta.

Ambos também ficam salvos no deal (`estimated_implementation_value`, `estimated_mrr_value`, `estimated_value`).

## Pré-preenchimento

Ao abrir o modal:

- Se `deal.estimated_implementation_value` já existir → preenche o campo de implementação.
- Se `deal.estimated_mrr_value` já existir → preenche o campo de MRR.
- Se nada existir mas `deal.estimated_value` existir → usa como sugestão para implementação.

## Mudanças

### 1. `src/components/crm/CreateProposalForStageDialog.tsx`

- Substituir o input único de "Valor estimado" por **dois campos**:
  - `Valor de implementação (R$)` — obrigatório, com prefixo R$ e auto-foco.
  - `MRR mensal (R$)` — opcional, com helper text "Deixe em branco se não houver mensalidade recorrente.".
- Mostrar os campos sempre (não condicionar a `!deal.estimated_value`), mas pré-preenchidos com os valores já existentes no deal.
- Botão habilita só quando implementação > 0.
- Manter o card de contexto, ícone, aviso final e visual já aprovado.
- Atualizar a callback `onConfirm` para receber `{ implementationValue: number; mrrValue?: number }`.

### 2. `src/pages/crm/CrmPipeline.tsx`

- `handleCreateProposalForDeal({ implementationValue, mrrValue })`:
  1. `update` no deal: `estimated_implementation_value = implementationValue`, `estimated_mrr_value = mrrValue ?? null`, `estimated_value = implementationValue + (mrrValue ?? 0) * 12` (apenas se ainda estava nulo, para não sobrescrever uma estimativa anterior do usuário).
  2. Chama `createDraftProposal` passando os dois valores novos.
  3. Resto do fluxo permanece igual (commit do estágio, invalidação de caches, navegação para `/financeiro/orcamentos/:id/editar`).
- Remover a checagem antiga `if (stage === 'proposta_na_mesa' && !deal.estimated_value)` se ainda existir — agora o modal sempre coleta os valores quando precisa.

### 3. `src/components/orcamentos/createDraftProposal.ts`

Estender o input para aceitar os dois valores:

```ts
interface CreateDraftProposalInput {
  dealId?: string | null;
  companyId: string;
  companyName: string;
  validityDays?: number;
  implementationValue?: number;   // novo
  mrrValue?: number | null;       // novo
  implementationLabel?: string;   // default: "Implementação"
}
```

Comportamento:
- Se `implementationValue` for informado, criar `scope_items: [{ title: implementationLabel, value: implementationValue }]`.
- Se `mrrValue && mrrValue > 0`, gravar `maintenance_monthly_value = mrrValue` (mantém `maintenance_description` no default já existente).

Sem mudança de schema — `proposals.scope_items` (jsonb) e `proposals.maintenance_monthly_value` já existem.

## Arquivos afetados

- `src/components/crm/CreateProposalForStageDialog.tsx` — dois inputs, novo contrato de `onConfirm`.
- `src/pages/crm/CrmPipeline.tsx` — handler atualizado, update no deal com ambos os campos.
- `src/components/orcamentos/createDraftProposal.ts` — aceita e persiste implementação + MRR.

## Resultado

Mover um deal para "Proposta na Mesa" → modal pede (ou confirma) **Valor de implementação** + **MRR opcional** → cria a proposta já com 1 item de escopo "Implementação" (R$ X) e `maintenance_monthly_value` preenchido se houver MRR → leva o usuário direto para a edição.
