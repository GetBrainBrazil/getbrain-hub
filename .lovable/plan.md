## Diagnóstico

As descrições foram geradas pela IA e **estão salvas** em `proposals.scope_items` (JSONB) — confirmei no banco para a proposta `f49118d7…`: todos os 7 módulos têm o texto completo gravado.

O problema é que a UI lê os itens da **tabela canônica** `proposal_items` via `useProposalItems`, e o adapter `canonicalToScopeItems` em `src/components/orcamentos/page/useProposalEditorState.ts:89-97` sempre retorna `description: ""`. Sequência do bug:

1. IA gera → `setItems(updated)` atualiza estado local com descrições, marca `itemsDirty=true`.
2. Após 1,5s o autosave salva o JSONB (com descrições) E reescreve `proposal_items`, mas só com `description=title`, `unit_price=value` — a descrição longa é descartada.
3. `setItemsDirty(false)` libera o efeito da linha 172 que re-hidrata `scopeItems` a partir da tabela canônica → todas as descrições viram `""` na UI.
4. Resultado: ao recarregar (ou após autosave), os módulos voltam ao placeholder "Bullets curtos…".

## Solução

Tornar a tabela `proposal_items` a fonte de verdade também para a descrição longa do módulo, e usá-la nos dois lados (write + read).

### 1. Migração: adicionar coluna `long_description` em `proposal_items`

```sql
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS long_description text;
```

Backfill a partir do JSONB existente, casando por `order_index`:

```sql
UPDATE public.proposal_items pi
SET long_description = (p.scope_items -> pi.order_index ->> 'description')
FROM public.proposals p
WHERE pi.proposal_id = p.id
  AND p.scope_items IS NOT NULL
  AND jsonb_typeof(p.scope_items) = 'array'
  AND (p.scope_items -> pi.order_index ->> 'description') IS NOT NULL
  AND (pi.long_description IS NULL OR pi.long_description = '');
```

### 2. Adapter de leitura (`useProposalEditorState.ts`)

- Atualizar `canonicalToScopeItems` para receber também `long_description` e devolver `description: r.long_description ?? ""`.
- Atualizar a tipagem das `rows` no useEffect (linha 172) para incluir o novo campo.

### 3. Adapter de escrita (`save()`, linhas 253-264)

Incluir `long_description: it.description || null` no payload do `replaceItems.mutateAsync`.

### 4. Hook `useReplaceProposalItems` / serviço de items

Em `src/lib/orcamentos/proposalItemsService.ts` (ou onde estiver `useReplaceProposalItems`/`useProposalItems`):
- Estender o tipo de item aceito para `long_description?: string | null`.
- Garantir que o `select` em `useProposalItems` traga a nova coluna (`select('*')` já cobre, mas conferir se há lista explícita).
- Garantir que o `insert` durante o replace inclua `long_description`.

### 5. `createProposalFromDeal.ts`

Quando a proposta é criada a partir de um deal e a IA gera o escopo inicial, propagar a descrição inicial (se existir) também para `long_description` ao popular `proposal_items`.

### 6. PDF / preview público

Verificar `buildPreviewProposal` (já usa `state.scopeItems`, então OK) e os componentes de preview/PDF que iteram `scope_items` — eles já leem o campo `description` do JSONB, então continuam funcionando. Como o JSONB também é gravado no save, não muda nada para o preview.

## Arquivos afetados

- `supabase/migrations/<timestamp>_proposal_items_long_description.sql` (novo)
- `src/components/orcamentos/page/useProposalEditorState.ts` (adapter read+write)
- `src/lib/orcamentos/proposalItemsService.ts` (ou arquivo equivalente do hook — confirmar no início da implementação)
- `src/lib/orcamentos/createProposalFromDeal.ts` (propagar descrição inicial)
- `src/integrations/supabase/types.ts` é regenerado automaticamente

## Resultado esperado

- Após gerar com IA: descrições aparecem expandidas (auto-expand já funciona) E **persistem** após autosave/reload.
- A proposta `f49118d7…` que você acabou de gerar já tem o texto no JSONB; o backfill da migração vai copiá-lo para a coluna nova, então as descrições aparecerão automaticamente assim que a página recarregar — sem precisar gerar de novo.
