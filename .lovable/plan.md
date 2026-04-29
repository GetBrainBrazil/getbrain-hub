## Diagnóstico

A proposta **foi criada com sucesso** (verifiquei no banco: `PROP-0005`, status `rascunho`, deal vinculado, escopo + MRR corretos). O problema não é a criação. O que aconteceu foi:

1. O `navigate('/financeiro/orcamentos/{id}/editar')` rodou normalmente.
2. A página de edição **renderizou só o skeleton** e ficou travada — por isso o usuário viu "tela em branco" e clicou manualmente em "Propostas" no sidebar (o session replay confirma esse caminho).

**Causa raiz da tela travada**: `OrcamentoEditarDetalhe` mostra skeleton enquanto `isLoading || !data` for verdade. O hook `useProposalDetail`:

- Usa `.single()` (que lança erro se não vier exatamente 1 linha — risco quando RLS demora a propagar logo após o INSERT).
- Não tem tratamento de erro: quando o query falha, `isLoading` vira `false` e `data` permanece `undefined`, então a tela fica eternamente em skeleton (sem mensagem, sem retry, sem navegação).
- Adicionalmente, o detalhe seleciona `*` e estende `ProposalRow` esperando campos que estavam em refactor. Pequenos descompassos não derrubam a query, mas não há fallback visual.

**Causa raiz secundária (UX)**: o `CreateProposalForStageDialog` não tem `try/catch` visível para o usuário quando algo falha pós-INSERT (ex: erro no `commitStage` do deal), e o handler `handleCreateProposalForDeal` faz `commitStage → invalidate → navigate` em sequência: se uma dessas etapas der throw entre o INSERT e o navigate, a proposta fica órfã (criada, mas sem redirect). Foi exatamente esse cenário no PROP-0005.

Há também 2 ruídos menores que não causam o bug, mas convém limpar:

- `normalizeProposalStatus` em `calculateTotal.ts` tem cases duplicados no `switch` (`enviada`, `expirada`, `convertida`, `recusada` aparecem 2x). TS aceita, mas é dead code confuso.
- Warning de `forwardRef` no `NovoOrcamentoModal` — apenas warning, não quebra.

---

## Plano de correção

### 1. Tornar a tela de edição resiliente

`src/hooks/orcamentos/useProposalDetail.ts`
- Trocar `.single()` por `.maybeSingle()`.
- Expor `error` e tratar "não encontrado" como estado distinto (retornar `null`).

`src/pages/financeiro/OrcamentoEditarDetalhe.tsx`
- Distinguir 3 estados: carregando (skeleton atual), erro/não-encontrado (card com mensagem + botão "Voltar para propostas") e sucesso.
- Garantir que `!isLoading && !data` nunca caia em loop de skeleton.

### 2. Tornar o fluxo do pipeline atômico/seguro

`src/pages/crm/CrmPipeline.tsx → handleCreateProposalForDeal`
- Envolver a sequência pós-`createDraftProposal` em try/catch específico: se o `commitStage` falhar **depois** que a proposta já foi criada, ainda assim navegar para a tela de edição (a proposta existe; usuário não fica perdido) e mostrar toast warning explicando que o estágio não avançou.
- Logar `console.error` com o ID da proposta criada para facilitar debug futuro.

### 3. Limpar ruído

`src/lib/orcamentos/calculateTotal.ts`
- Remover os cases duplicados de `normalizeProposalStatus` (manter só os mapeamentos de legado + default).

`src/components/orcamentos/NovoOrcamentoModal.tsx`
- Remover ou substituir o uso que está gerando o warning de `forwardRef` (provavelmente um filho do `Dialog` recebendo ref via composição). Investigar e ajustar para não passar ref por componente function-based.

### 4. Validar visualmente

- Abrir `PROP-0005` (que ficou orfão no banco) em `/financeiro/orcamentos/30d5a7c8-578d-42ca-a053-7fb437b8be4e/editar` — deve abrir normal após o fix.
- Refazer o fluxo: arrastar um deal para "Proposta na Mesa", preencher implementação + MRR, confirmar que abre direto a tela de edição (sem skeleton infinito).

---

## Resultado esperado

- Arrastar card → modal → "Criar e abrir" → cai direto na tela de edição da proposta nova com os valores pré-preenchidos. Sem tela em branco. Sem redirect inesperado para a lista.
- Em qualquer falha pós-INSERT, o usuário ainda chega à proposta (não fica órfã invisível) e vê um toast explicando o que falhou.
