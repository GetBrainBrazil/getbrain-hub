Vou corrigir globalmente o componente único de editor de texto rico usado no CRM e em Projetos para que a barra de opções não estique até a largura inteira do campo.

Plano:

1. Ajustar a toolbar flutuante do editor
- Remover o comportamento atual `left-0 right-0`, que força a barra a ocupar toda a largura do textarea.
- Fazer a barra usar largura automática, limitada ao conteúdo real dos botões.
- Manter um `max-width` seguro para telas menores, com rolagem horizontal somente quando realmente necessário.

2. Melhorar posicionamento e responsividade
- Posicionar a barra acima do campo, alinhada à esquerda, sem cobrir botões laterais/desnecessários.
- Em mobile/tablet, impedir que ela ultrapasse a viewport ou quebre layout.
- Manter a altura compacta já aplicada anteriormente.

3. Aplicar no sistema todo
- A correção será feita em `src/components/ui/rich-text-editor.tsx`, que é o componente compartilhado usado em:
  - detalhe do CRM/deals
  - zona comercial
  - escopo de projetos
  - drawer de projetos
  - demais telas que usam `RichTextEditor`

4. Preservar comportamento atual
- Manter os mesmos botões e atalhos de formatação.
- Manter o popover de cor funcionando.
- Manter autosave no blur sem quebrar a interação com a toolbar.

Detalhe técnico previsto:

```text
Antes:
toolbar = absolute left-0 right-0
resultado = largura total do campo, mesmo com poucos botões

Depois:
toolbar = absolute left-0 w-max max-w-[min(...)]
resultado = largura somente do conteúdo, com limite responsivo
```

Não será necessária alteração de banco de dados.