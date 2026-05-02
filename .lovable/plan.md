## Mudança

Substituir o `Textarea` de descrição em `NotionItemsEditor.tsx` por uma versão **auto-grow**, que ajusta a altura para caber todo o conteúdo sem scroll interno. Isso vale tanto para a renderização inicial (descrições já preenchidas pela IA, como no print) quanto durante a digitação.

## Implementação

Em `src/components/orcamentos/NotionItemsEditor.tsx`:

1. Criar um componente local `AutoGrowTextarea` que:
   - Usa um `ref` para o `<textarea>`.
   - Em `useLayoutEffect`, define `el.style.height = "auto"` e depois `el.style.height = el.scrollHeight + "px"` sempre que `value` muda (e no mount).
   - Reusa o mesmo styling do textarea atual: `border-0 bg-transparent px-1 text-sm shadow-none focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-hidden`.
   - Mantém `min-h` mínimo (≈40px) só pra não colapsar quando vazio.
   - Aceita `value`, `onChange(val: string)`, `placeholder`.

2. Trocar o uso do `<Textarea …>` dentro do bloco `expanded` (linhas 205-219) pelo `<AutoGrowTextarea …>`.

3. Disparar o re-cálculo também quando o item é expandido (o `useLayoutEffect` já cobre isso porque o componente monta no momento em que `expanded` vira `true`).

## Resultado

- Sem scroll bar dentro de cada caixa de descrição.
- A caixa acompanha o tamanho do texto (curto → baixinha; longo → alta).
- Funciona ao colar texto, ao digitar e ao receber descrições geradas pela IA.
