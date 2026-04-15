
Detectei o problema: o layout novo foi aplicado em `src/pages/ContasPagar.tsx`, mas você está usando a tela `/financeiro/movimentacoes`, que abre outro modal separado em `src/pages/Movimentacoes.tsx`. Por isso nada mudou no que você está vendo.

Plano de correção:

1. Usar o modal certo
- Refazer o modal de “Conta a Pagar” dentro de `src/pages/Movimentacoes.tsx`, que é o modal real da tela que você está usando.
- Aplicar o mesmo layout também no modal de edição aberto pelo botão “Editar” da lateral.

2. Seguir exatamente a referência
- Substituir o `NewForm` genérico por uma estrutura específica para “Conta a Pagar”.
- Replicar a organização exata dos campos, inclusive:
  - Fornecedor + botão “+” na mesma linha
  - Descrição em largura total
  - Valor previsto + data competência + data vencimento lado a lado
  - Conta bancária abaixo, alinhada à esquerda
  - Observações internas
  - Recorrência
  - Rodapé com “Cancelar” e “Confirmar Cadastro” no mesmo layout do print
- Ajustar largura do modal, padding, tipografia, tamanhos, espaçamentos, bordas e cores para bater com a imagem.

3. Manter as regras funcionais que você pediu
- Remover “Empresa proprietária”
- Manter GetBrain implícita
- Fornecedor em estilo combobox/pesquisa
- Se digitar um fornecedor inexistente e confirmar, criar automaticamente na base
- Manter recorrência mensal criando os próximos lançamentos automaticamente

4. Unificar criação e edição
- O mesmo componente/layout será usado para:
  - nova conta a pagar
  - edição de conta a pagar
- Assim não fica um modal bonito numa tela e outro antigo em outra.

5. Preservar o restante da tela
- Não mexer na tabela/listagem além do necessário
- Não alterar as contas a receber agora, a menos que você peça depois

Arquivos envolvidos
- `src/pages/Movimentacoes.tsx` — correção principal
- possivelmente extração de um componente compartilhado em `src/components/...` para evitar duplicação entre criação e edição

Resultado esperado
- Ao abrir “Conta a Pagar” em Movimentações, o modal ficará igual ao modelo enviado
- Ao clicar em “Editar” na lateral, abrirá esse mesmo modal com os dados preenchidos
- As mudanças finalmente aparecerão na tela que você está usando
