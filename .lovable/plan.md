## Problema

No `DealWonDialog` (modal "Fechar deal como ganho"), o `DialogContent` está com largura fixa:

```
w-[96vw] sm:max-w-[1200px] max-h-[94vh]
```

O Radix Dialog é centralizado no viewport **inteiro** (ignora a sidebar). Em monitores menores (~1280–1366px de largura CSS), os 1200px estouram para a esquerda e ficam atrás da sidebar fixa de 256px — exatamente o que aparece no print, com a coluna esquerda do conteúdo cortada.

Em telas maiores (≥1600px) o tamanho atual é confortável e deve ser preservado.

## Solução

Trocar a largura fixa por uma largura **fluida com teto**, respeitando a viewport real e deixando uma folga lateral mínima para nunca colidir com a sidebar:

- Em telas grandes: continua até 1200px (tamanho oficial que você gosta).
- Em telas médias: encolhe proporcionalmente (`min(1200px, calc(100vw - 3rem))`).
- Em telas pequenas/mobile: ocupa quase toda a largura como hoje.
- Altura mantém `max-h-[94vh]` com scroll interno.

## Alteração

Arquivo único: `src/components/crm/DealWonDialog.tsx`, linha 1128.

De:
```tsx
<DialogContent className="w-[96vw] sm:max-w-[1200px] max-h-[94vh] overflow-y-auto">
```

Para:
```tsx
<DialogContent className="w-[calc(100vw-2rem)] max-w-[min(1200px,calc(100vw-3rem))] max-h-[94vh] overflow-y-auto p-4 sm:p-6">
```

O que isso faz:
- `w-[calc(100vw-2rem)]`: largura base sempre cabe na viewport, com 1rem de folga de cada lado.
- `max-w-[min(1200px,calc(100vw-3rem))]`: nunca passa de 1200px e nunca encosta nas bordas (mantém ~1.5rem de respiro).
- `p-4 sm:p-6`: reduz padding interno em telas pequenas para ganhar área útil, sem prejudicar o desktop.

## QA

Após aplicar, validar nas larguras: 1280, 1366, 1440, 1600, 1920 — em todas o modal deve ficar inteiramente visível, centralizado, sem ser cortado pela sidebar e sem perder o tamanho atual em monitores grandes.

Nenhuma outra mudança é necessária — sem impacto no fluxo de "dar como ganho", apenas ajuste visual responsivo.