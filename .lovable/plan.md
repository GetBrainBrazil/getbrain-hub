## Diagnóstico do saldo BTG Pactual

Não alterei nem apaguei nada. Fiz apenas leitura do arquivo enviado e consulta dos dados atuais do sistema.

O saldo continua errado por 4 motivos principais:

1. **O arquivo enviado aqui no chat ainda não entrou no sistema financeiro**
   - O CSV atualizado do BTG tem **169 movimentações**, de **17/06/2025 a 25/04/2026**.
   - O saldo final real no arquivo é **R$ 3,26** em **25/04/2026**.
   - No banco de dados do sistema, não existe nenhuma importação registrada desse extrato para a conta BTG.

2. **O dashboard não usa a coluna “Saldo” do extrato bancário**
   - Hoje ele calcula assim:

```text
saldo do sistema = saldo_inicial da conta + receitas pagas - despesas pagas
```

   - Ou seja: mesmo que o extrato tenha uma coluna “Saldo”, o dashboard só olha para os lançamentos cadastrados em `movimentações`.

3. **A conta “Virtual BTG Pactual” está com lançamentos em datas erradas**
   - No sistema, a conta BTG tem **61 movimentações pagas**.
   - Dessas, **59 estão concentradas em 22/04/2026**, como se tivessem sido lançadas em lote.
   - Mas no extrato real essas movimentações estão espalhadas entre **junho/2025 e abril/2026**.
   - Isso distorce saldo, histórico, gráficos, comparação de períodos e fluxo de caixa.

4. **O saldo calculado pelo sistema está diferente do saldo real do extrato**
   - Sistema para “Virtual BTG Pactual”: **R$ 3.700,00**
   - Extrato atualizado BTG: **R$ 3,26**
   - Diferença aproximada: **R$ 3.696,74**
   - Além disso, só **1 das 61 movimentações BTG** está marcada como conciliada.

## Plano seguro para corrigir

### Etapa 1 — Importar o extrato BTG como base de conferência
Vou processar o CSV que você enviou e registrar as linhas do extrato como transações bancárias de referência, preservando data, descrição, valor e saldo bancário quando possível.

Nenhuma movimentação existente será apagada.

### Etapa 2 — Gerar uma conciliação assistida
Vou comparar cada linha do extrato com as movimentações já existentes da conta “Virtual BTG Pactual”, usando:

- data;
- valor;
- tipo: entrada ou saída;
- descrição;
- conta bancária.

O resultado será separado em grupos:

```text
1. Bate exatamente
2. Existe no sistema, mas com data errada
3. Existe no sistema, mas com descrição diferente
4. Está no extrato, mas falta no sistema
5. Está no sistema, mas não aparece no extrato
6. Possíveis duplicidades
```

### Etapa 3 — Mostrar uma prévia antes de alterar dados
Antes de qualquer correção, vou listar claramente:

- quais movimentações eu proponho marcar como conciliadas;
- quais datas eu proponho corrigir;
- quais lançamentos faltantes eu proponho criar;
- quais sobras/duplicidades precisam da sua decisão.

Não vou apagar nada. Se houver algo sobrando no sistema, vou apenas listar para você decidir depois.

### Etapa 4 — Corrigir somente o que for aprovado
Depois da sua confirmação específica, vou aplicar apenas as correções autorizadas, como:

- marcar movimentações BTG encontradas como conciliadas;
- corrigir datas de pagamento que foram importadas em lote como 22/04/2026;
- criar lançamentos que existem no extrato e ainda não existem no sistema;
- manter sobras sem exclusão.

### Etapa 5 — Ajustar o dashboard para não confundir “saldo do sistema” com “saldo do banco”
Vou melhorar a visualização para mostrar duas informações separadas:

```text
Saldo do banco/extrato: último saldo importado do extrato BTG
Saldo do sistema: saldo calculado pelas movimentações cadastradas
Diferença: quanto ainda falta conciliar/corrigir
```

Assim o dashboard deixa claro quando o saldo ainda não é confiável e por quê.

## Alterações técnicas previstas

- Ajustar o parser/importador de extrato para preservar o saldo bancário do CSV BTG.
- Registrar a importação do arquivo enviado para a conta “Virtual BTG Pactual”.
- Criar uma rotina de comparação segura entre extrato e movimentações.
- Atualizar os blocos do dashboard financeiro para exibir:
  - saldo calculado;
  - saldo do último extrato importado;
  - diferença entre eles;
  - status de conciliação.

## Garantias

- Não vou apagar nenhum dado.
- Não vou alterar lançamentos sem antes listar o que será alterado.
- Vou focar somente na conta **Virtual BTG Pactual** por enquanto.
- Sobras, duplicidades ou lançamentos suspeitos serão apenas listados para sua decisão.