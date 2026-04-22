

## Permitir editar e reabrir contas liquidadas

Atualmente, quando uma movimentação está com status "Pago", a interface permite navegar até a tela de edição mas não há ação clara para reverter a liquidação, e a UI desencoraja edições (esconde "Liquidar Conta" sem oferecer alternativa). Vou habilitar dois fluxos: **edição livre** de qualquer conta paga e **reabertura** (volta para "pendente").

### Mudanças

**1. `src/pages/Movimentacoes.tsx` — menu de ações da linha**
- Quando `status === "pago"`, mostrar nova opção **"Reabrir conta"** no `DropdownMenu` (com ícone `RotateCcw` e variante de aviso).
- A ação chama `handleReabrir(m)` que:
  - Pede confirmação via `useConfirm()` ("Reabrir esta conta? Ela voltará para pendente e o pagamento registrado será removido.")
  - Faz `update` em `movimentacoes`: `status: "pendente"`, `valor_realizado: 0`, `data_pagamento: null`, `conciliado: false`.
  - Recarrega a lista e dispara `toast.success("Conta reaberta")`.
- Manter "Editar" sempre visível (já está) — apenas garantir que abre a página de detalhe normalmente.

**2. `src/pages/MovimentacaoDetalhe.tsx` — edição completa de contas pagas**
- Hoje só `podeBaixa` esconde o botão "Dar Baixa" para contas pagas; campos do formulário **já são editáveis**, mas faltam ações claras. Adicionar:
  - Botão **"Reabrir conta"** ao lado de "Excluir" no rodapé, visível apenas quando `mov.status === "pago"`. Mesma lógica de update do item 1, com confirmação. Após sucesso, recarrega `mov` e mostra toast.
  - Botão **"Editar Liquidação"** (também só quando pago) que reabre o modal/seção de baixa pré-preenchido com `valor_realizado`, `data_pagamento`, `conta_bancaria_id` e `meio_pagamento_id` atuais. Ao confirmar, faz `update` mantendo `status: "pago"` mas atualizando os campos da liquidação.
- Garantir que `handleSaveEdit` permite salvar alterações de descrição/categoria/projeto/observações **mesmo com status pago** (já permite — apenas validar que nenhum campo está bloqueado por `disabled`).

**3. Confirmações e feedback**
- Usar `useConfirm()` de `@/components/ConfirmDialog` (regra do projeto — nunca `confirm()` nativo).
- Notificações via `toast` do `sonner`.

### Resumo do comportamento final
- **Liquidada → posso editar campos comuns** direto na tela de detalhe e salvar.
- **Liquidada → posso editar a liquidação** (valor pago, data, conta, meio) sem precisar reabrir.
- **Liquidada → posso reabrir** (volta para pendente, limpa `valor_realizado`/`data_pagamento`/`conciliado`) tanto pelo menu da lista quanto pelo rodapé do detalhe.

### Arquivos modificados
- `src/pages/Movimentacoes.tsx` — nova ação "Reabrir conta" no dropdown.
- `src/pages/MovimentacaoDetalhe.tsx` — botões "Reabrir conta" e "Editar Liquidação" no rodapé quando pago.

