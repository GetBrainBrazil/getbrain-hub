

## Objetivo
Reformular a página `/financeiro/movimentacoes/:id` (e o modal de criação) para ter **exatamente** o layout dos prints, com todas as variáveis funcionais. Também aplicar pequenas mudanças na lista externa (toggle "Exibir Saldos Parciais" + estilo dos botões).

Sem campo "Empresa", sem "Rateio".

## Mudanças no banco

**Migração** (apenas duas colunas novas):
- `movimentacoes.desconto_previsto numeric default 0` — para o campo "Desconto Previsto (-)"
- `anexos.descricao text` — para a descrição editável de cada anexo

**Bucket de Storage**: criar bucket privado `anexos-movimentacoes` (o atual `comprovantes` é genérico; usar um dedicado deixa as policies mais limpas) com RLS para usuários autenticados (read/write/delete).

## Mudanças em `src/pages/MovimentacaoDetalhe.tsx` (reescrita completa)

### Header
- Ícone de documento + título **"Editar Movimentação"** + subtítulo "Preencha os dados da movimentação financeira"
- Botão de voltar (seta) à esquerda

### Card único organizado em seções (cada seção com label maiúscula em cinza, ícone à esquerda, separador):

**1. DADOS PRINCIPAIS** (📄)
- Descrição da Movimentação * (input largo)
- Fornecedor * (combobox com botão `+`)
- *(Sem campo Empresa, conforme solicitado)*

**2. CLASSIFICAÇÃO FINANCEIRA** (🏷️)
- Categoria * (select)
- Centro de Custo (select com opção "Nenhum")

**3. DATAS E CONDIÇÕES** (📅)
- Data de Competência *
- Data de Vencimento *
- Forma de Pagamento (select: meios_pagamento)
- Conta Bancária (select)
- **Status** (StatusBadge logo abaixo, somente leitura)

**4. VALORES E ENCARGOS** (💲)
- Valor Base (R$) * — `valor_previsto`
- Desconto Previsto (-) — `desconto_previsto` (novo)
- Juros Previstos (+) — `juros`
- Multa Prevista (+) — `multa`
- Taxas ADM (+) — `taxas_adm`
- **Valor Total Previsto** (faixa cinza no rodapé do card, calculado em tempo real: `base - desconto + juros + multa + taxas`, em destaque vermelho/verde conforme tipo)

**5. IMPOSTOS RETIDOS NA FONTE (-)** (em card com fundo rosa claro)
- "Não interferem no valor total previsto"
- 6 inputs lado a lado: PIS, COFINS, CSLL, ISS, IR, INSS

**6. OBSERVAÇÕES INTERNAS**
- Textarea

**7. ANEXOS** (📎)
- Lista de anexos existentes — cada linha: ícone + nome do arquivo (link) + input de descrição editável + tamanho + botão `X` para remover
- Linha final: dropzone "Clique para anexar arquivo" (upload via Storage para `anexos-movimentacoes`, registra em `anexos` com `movimentacao_id` e `descricao`)
- Salvar a descrição dispara `update` na linha de `anexos` correspondente

### Rodapé fixo
- Esquerda: **Excluir** (vermelho destrutivo, ícone lixeira) + **Registrar Pagamento/Recebimento** (verde outline, condicional ao status)
- Direita: **Cancelar** (outline) + **Salvar e Fechar** (outline) + **Salvar** (vermelho primário)
- "Salvar e Fechar" = salva e navega para `/financeiro/movimentacoes`
- "Cancelar" = navega de volta sem salvar

### Comportamento
- Carregamento paralelo (já estava): adicionar `anexos` à query inicial
- Cálculo de "Valor Total Previsto" memoizado
- Toast em todas as ações
- Modo edição direto ao abrir (sem botão "Editar")

## Mudanças em `src/pages/Movimentacoes.tsx` (lista externa)

1. **Botões do header**: trocar estilo dos botões "Conta a Pagar" e "Conta a Receber" para variante destructive (vermelho), conforme print 38.
2. **Toggle "Exibir Saldos Parciais"** no lado direito da barra de filtros (antes dos botões de status). Quando ligado, a coluna "Valor" da tabela passa a mostrar `valor_realizado / valor_previsto` (parcial pago/total) em vez do valor total. Estado persistido com `usePersistedState`.
3. **KPI "Total Pago"**: já está condicional (Pago/Recebido) — manter.
4. *(Sem botão "Todas as Empresas", já que não vamos ter o campo Empresa)*

## Modal de criação ("Nova Conta a Pagar/Receber")
Manter o modal atual simples (apenas campos essenciais) — o formulário completo fica na página de edição. Se quiser unificar depois, fazemos em outro passo.

## Arquivos
- **Migração**: adicionar `movimentacoes.desconto_previsto`, `anexos.descricao`, criar bucket `anexos-movimentacoes` + RLS.
- **Reescrito**: `src/pages/MovimentacaoDetalhe.tsx` (layout completo dos prints)
- **Editado**: `src/pages/Movimentacoes.tsx` (toggle saldos parciais + estilo dos botões)

