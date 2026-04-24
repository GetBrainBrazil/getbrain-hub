## Problema

Os botões de filtro em **Movimentações** (Status, Vinculado, Categoria, Projeto, Conta bancária, Meio de pagamento, Recorrência, Conciliação) usam `min-w-[180px]` e `h-9`, ocupando muito espaço horizontal mesmo quando vazios — forçam o conjunto a quebrar em duas linhas.

## Solução

Ajustar o componente `MultiSelectFilter` em `src/pages/Movimentacoes.tsx` (linha 124) para que os botões cresçam só o necessário pelo conteúdo:

- Remover `min-w-[180px]` → usar `w-auto` (largura pelo texto).
- Reduzir altura de `h-9` para `h-8`.
- Reduzir padding horizontal (`px-2.5`) e gap (`gap-1.5`).
- Aliviar peso visual: `font-normal` no label.

Resultado: cada chip de filtro fica do tamanho do próprio título (Status, Categoria etc.), com o contador entre parênteses quando há seleção, e tudo cabe em uma linha só na maioria das resoluções.

**Arquivo alterado:** `src/pages/Movimentacoes.tsx` (apenas a className do `Button` dentro de `MultiSelectFilter`).
