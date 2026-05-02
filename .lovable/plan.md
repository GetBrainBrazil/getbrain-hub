
## O que muda

Transformar a aba **Propostas & Anexos** de `/projetos/:id` num CRUD completo, sem precisar sair pra outra tela pra cada ação.

## 1. Card de proposta — novo comportamento

O card inteiro vira clicável (abre o editor completo). E ganha um menu **⋯** no canto superior direito com tudo que existe na lista de orçamentos:

```text
┌─ PROP-0006  ● Convertida           TOTAL R$ 4.000  MRR 600  ⋯ ┐
│  Sunbright Engenharia                                          │
│  ✓ Aceita 02/05/26  📅 Validade 01/06/26                       │
│  [PDF] [Página pública]            [Editor completo →]         │
└────────────────────────────────────────────────────────────────┘
```

**Menu ⋯ por card:**
- **Abrir** (editor completo) — atalho do clique no card
- **Duplicar como nova versão** (usa `useDuplicateProposal`, vincula ao mesmo deal)
- **Copiar link público** (copia `buildPublicProposalUrl(...)` pro clipboard)
- **Baixar PDF** (signed URL via `openProposalPdf`)
- ─────────
- **Marcar como enviada** (só se `rascunho`)
- **Marcar como aceita** (só se `enviada`) → grava `accepted_at`
- **Marcar como recusada** (só se `enviada`) → grava `rejected_at`
- ─────────
- **Excluir proposta** (vermelho) — usa `useDeleteProposal` (soft delete via `deleted_at`), pede confirmação com `useConfirm`

## 2. Botão "+ Nova proposta" no header da seção

Substitui/complementa o atual "Abrir deal de origem":

- Quando há deal vinculado: dispara `createProposalFromDeal(sourceDealId, true)` direto (já trata conflito de proposta ativa abrindo o diálogo padrão "Já existe proposta…").
- Quando o projeto não tem deal: o botão abre uma nota explicando que propostas sem deal precisam ser criadas em `/financeiro/orcamentos/novo` (mantém o link).

## 3. Clique no card = abrir editor

`onClick` no card todo navega pra `/financeiro/orcamentos/:id/editar`. O menu ⋯ usa `e.stopPropagation()` igual ao padrão de `OrcamentoTabela`.

## 4. Cache cross-módulo

Adicionar `["project_proposals", projectId]` ao `invalidateProjectCaches` em `src/lib/cacheInvalidation.ts`. Os hooks `useDeleteProposal` / `useDuplicateProposal` / `useUpdateProposal` já invalidam `["proposals"]`, mas como nossa chave é própria, precisamos garantir que o card recarregue.

Em todas as ações disparadas daqui, chamar:
```ts
invalidateProposalCaches(qc, { proposalId, dealId: sourceDealId, projectId });
```

## 5. Confirmações e feedback

Seguindo o padrão do projeto:
- `useConfirm()` pra excluir (variant destructive) e pra marcar recusada.
- `toast.success` / `toast.error` do `sonner` em cada ação.
- Estado `loading` por linha durante a mutação (botão menu vira spinner).

## 6. Mobile

O menu ⋯ resolve responsividade: no desktop mostra os botões PDF/Página pública inline + ⋯; no mobile (< 640px) os botões inline somem e só fica o ⋯ (que vira um dropdown nativo do shadcn — já é touch-friendly).

## Arquivos editados

- `src/components/projetos/AbaPropostas.tsx` — adicionar `DropdownMenu`, mutações, botão "Nova proposta", click handler.
- `src/lib/cacheInvalidation.ts` — incluir `["project_proposals", projectId]`.

**Sem migration.** Tudo já existe no schema (`deleted_at` em `proposals`, hooks `useDeleteProposal`/`useDuplicateProposal`/`useUpdateProposal` em `useUpdateProposal.ts`, `createProposalFromDeal` em `lib/orcamentos/`).
