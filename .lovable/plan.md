# Gating de "Proposta na Mesa" no Pipeline

## Comportamento esperado

Quando o usuário arrasta um deal para a coluna **Proposta na Mesa**:

1. **Se o deal já tem ao menos uma proposta vinculada** (`proposals.deal_id = deal.id`, não deletada) → muda o stage direto, como hoje.
2. **Se NÃO tem proposta** → abre um diálogo de confirmação:
   - Texto: "Este deal ainda não tem uma proposta. Deseja criar uma agora?"
   - Botões: **Cancelar** (deal volta para o stage anterior) e **Criar proposta**.
   - Ao confirmar: cria o rascunho de proposta diretamente (mesmo fluxo do `NovoOrcamentoModal.handleCreate`, já com `deal_id` e `company_id` do deal preenchidos), muda o stage do deal para `proposta_na_mesa` e **navega** para `/financeiro/orcamentos/{novoId}/editar`.

A regra de "valor estimado obrigatório" (linha 166 de `CrmPipeline.tsx`) continua valendo e é checada **antes** dessa nova verificação de proposta.

## Mudanças técnicas

### 1. `src/pages/crm/CrmPipeline.tsx`
- No `handleDragEnd`, depois do check de `estimated_value`, adicionar:
  ```ts
  if (stage === 'proposta_na_mesa') {
    const { count } = await supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('deal_id', deal.id)
      .is('deleted_at', null);
    if (!count) { setNeedsProposal({ deal, stage }); return; }
  }
  ```
- Novo state `needsProposal` + `<Dialog>` de confirmação no final do componente, similar aos diálogos de `lost`/`valueRequired`/`won`.
- Handler "Criar proposta" extrai a lógica de criação do `NovoOrcamentoModal.handleCreate` (insert em `proposals` com `deal_id`, `company_id`, `client_company_name`, `valid_until` em D+30, status `rascunho`), chama `commitStage(deal, 'proposta_na_mesa')`, invalida caches via `cacheInvalidation` e faz `navigate(/financeiro/orcamentos/{id}/editar)`.

### 2. `src/components/orcamentos/createDraftProposal.ts` (novo helper)
- Extrai a função `createDraftProposal({ dealId, companyId, companyName })` reutilizada pelo `NovoOrcamentoModal` e pelo novo handler do Pipeline. Evita duplicação.
- `NovoOrcamentoModal` passa a importar esse helper em vez de ter a lógica inline.

### 3. Cache
- Após criar a proposta + mudar stage, invalidar `['proposals']`, `['proposals_kpis']` e os caches de CRM via `invalidateCrmCaches` (já existe em `src/lib/cacheInvalidation.ts`).

## Não faz parte deste escopo
- Mudar o fluxo do botão "+" da coluna Proposta na Mesa (continua abrindo o `NewDealQuickDialog` atual).
- Alterar a tela de edição do orçamento.
- Mudar o comportamento do estágio `ajustando` (que também pode precisar de proposta — pode ser um próximo passo se você quiser).
