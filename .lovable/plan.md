## Problema

Em `/financeiro/movimentacoes`, ao abrir o card de uma movimentação (página `MovimentacaoDetalhe`) e liquidar pelo modal "Liquidar Conta", o modal fecha mas o usuário continua na tela de detalhe da movimentação. O esperado é voltar para a lista de movimentações junto com o fechamento do modal.

Comportamento análogo já existe em outras ações da mesma página (salvar criação, salvar edição, excluir) — todas chamam `navigate(backUrl)` ao final.

## Causa

Em `src/pages/MovimentacaoDetalhe.tsx`, a função `handleBaixa` (final, ~linha 609-611) faz apenas:

```ts
setOpenBaixa(false);
invalidateFinanceCaches(qc, { projectId: mov.projeto_id || null });
void load();
```

Não há `navigate(backUrl)`, então o usuário fica preso no detalhe.

## Mudança

### `src/pages/MovimentacaoDetalhe.tsx` — função `handleBaixa`

Após o sucesso da liquidação:
1. Fechar o modal (`setOpenBaixa(false)`).
2. Invalidar caches (já existe).
3. **Navegar de volta para a lista** usando o `backUrl` já calculado (`/financeiro/movimentacoes?aba=pagar|receber`).
4. Remover o `void load()` pois a página será desmontada — a lista de destino já será atualizada via cache invalidation.

Resultado: o `Dialog` desmonta naturalmente quando a rota muda e o usuário volta para a aba correta de Movimentações com os dados atualizados.

### Aplicar mesmo comportamento em `handleReabrir`

Por consistência, ao reabrir uma conta a partir do detalhe (botão dentro do mesmo modal), também voltar para a lista após sucesso. Isso evita o mesmo bug se o usuário usar a ação "Reabrir" do modal.

## Escopo

- Apenas `src/pages/MovimentacaoDetalhe.tsx`.
- Sem mudanças em `Movimentacoes.tsx` (lá o modal é aberto por dropdown na própria lista — comportamento atual de só fechar o modal está correto, pois o usuário já está na lista).
- Sem mudanças de schema/backend.
