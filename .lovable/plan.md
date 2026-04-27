Vou tratar isso como uma reorganização/concilição financeira, não como uma simples mudança visual. E vou manter a regra que você pediu: não apagar nada sem consultar antes, e deixar claro o que será alterado.

## Diagnóstico atual

A parte de “contas” no Dashboard Financeiro realmente deveria representar os saldos das contas bancárias.

Hoje ela calcula assim:

```text
saldo da conta = saldo_inicial da conta
               + receitas pagas dessa conta
               - despesas pagas dessa conta
```

O problema é que os dados de base ainda não estão confiáveis:

1. Todas as contas estão com `saldo_inicial = R$ 0,00`.
   - Então o sistema ignora qualquer saldo real que já existia antes do primeiro lançamento importado/cadastrado.

2. Há muitos lançamentos pagos concentrados em abril/2026.
   - Exemplo encontrado:
     - Virtual BTG Pactual: 59 lançamentos pagos em 22/04/2026.
     - Virtual Rodrigo: 102 lançamentos pagos em abril/2026, com grande impacto negativo.
   - Isso distorce o dashboard, o gráfico e a variação “90d”.

3. A conta Virtual Rodrigo está derrubando o saldo consolidado.
   - Saldos calculados agora no banco:

```text
Virtual BTG Pactual:  R$   3.700,00
Virtual Daniel:       R$   1.796,54
Virtual Inter:        R$     675,00
Virtual Rodrigo:     -R$  54.359,61
```

4. Transferências internas aparecem dentro dos saldos das contas.
   - Para saldo por conta, isso pode estar correto se cada saída/entrada estiver lançada na conta certa.
   - Para resultado, receita, despesa e margem, elas precisam continuar sendo ignoradas para não virar “receita/despesa fake”.
   - O dashboard já ignora transferências em algumas métricas, mas não em todas as partes de saldo/projeção.

## Objetivo

Deixar o financeiro organizado em duas frentes:

1. Saldo bancário real por conta.
   - Deve bater com extratos bancários.
   - Foco em “quanto tem em cada conta”.

2. Resultado financeiro/gerencial.
   - Receita, despesa, margem, inadimplência, contas a pagar/receber.
   - Deve ignorar transferências internas.
   - Deve usar datas corretas conforme regime: competência ou caixa.

## Plano de execução

### Etapa 1 — Corrigir a explicação e leitura do dashboard

Vou ajustar o Dashboard Financeiro para deixar claro que:

- “Saldo em contas” é saldo bancário atual calculado por conta.
- “Receita do período”, “Despesa do período” e “Resultado” são indicadores do período filtrado.
- Transferências internas não devem ser consideradas como receita/despesa do resultado.
- A variação “90d” depende das datas de pagamento e hoje está distorcida por lançamentos importados em lote.

Também vou adicionar um aviso discreto quando o sistema detectar possível inconsistência, por exemplo:

```text
Atenção: existem muitos lançamentos pagos na mesma data. Isso pode indicar importação em lote e distorcer saldos históricos/projeções.
```

### Etapa 2 — Criar uma visão de auditoria financeira no próprio dashboard

Vou adicionar um bloco de diagnóstico para você conseguir ver rapidamente:

- saldo inicial cadastrado por conta;
- entradas pagas;
- saídas pagas;
- saldo calculado;
- quantidade de lançamentos pagos;
- quantidade de lançamentos conciliados;
- quantidade de transferências;
- possíveis lançamentos concentrados em uma mesma data;
- contas com saldo negativo.

Isso não altera dados. É só leitura e transparência.

### Etapa 3 — Corrigir a fórmula de saldo para ser mais segura

Vou revisar as funções usadas pelo dashboard:

- saldo por conta;
- saldo consolidado;
- projeção de caixa;
- sparkline histórico;
- alertas de saldo negativo.

A regra proposta:

```text
Saldos bancários:
  incluem movimentações pagas da conta, inclusive transferências internas,
  desde que estejam corretamente lançadas entre contas.

Resultados gerenciais:
  ignoram categorias marcadas como transferência interna.
```

Também vou garantir que lançamentos excluídos logicamente (`deleted_at`) não entrem em nenhum cálculo.

### Etapa 4 — Preparar conciliação por conta, sem apagar nada

Para cada conta, a organização será feita assim:

1. Comparar extrato bancário com `movimentacoes`.
2. Listar:
   - lançamentos que batem;
   - lançamentos faltantes no sistema;
   - lançamentos sobrando no sistema;
   - possíveis duplicados;
   - datas de pagamento suspeitas;
   - transferências sem par correspondente.
3. Só depois de você aprovar, eu crio/ajusto lançamentos.
4. Não vou apagar nada sem aprovação explícita.

Como a Virtual BTG Pactual já foi conciliada em grande parte, o próximo foco mais importante é a Virtual Rodrigo, porque é ela que está deixando o saldo consolidado muito errado.

### Etapa 5 — Ajustar saldos iniciais com base em extratos

Para cada conta, depois de comparar o extrato, vamos definir uma data de corte:

```text
saldo_inicial = saldo real do banco na data anterior ao primeiro lançamento considerado no sistema
```

Exemplo conceitual:

```text
Se o sistema começa a considerar lançamentos a partir de 01/01/2026,
então saldo_inicial deve ser o saldo bancário em 31/12/2025.
```

Isso é essencial. Sem saldo inicial real, o dashboard dificilmente baterá com o banco.

Importante: eu não vou alterar `saldo_inicial` automaticamente. Primeiro vou listar a recomendação por conta e pedir sua aprovação.

### Etapa 6 — Melhorias práticas na tela

Vou deixar a tela mais útil para gestão:

- adicionar status visual de “saldo confiável / precisa conciliar” por conta;
- mostrar “última conciliação” quando existir importação de extrato;
- permitir clicar numa conta e ir direto para extratos/movimentações filtradas;
- indicar quando o saldo depende de saldo inicial zerado;
- separar melhor “saldo em banco” de “resultado do período”.

## O que será alterado agora, se você aprovar

Alterações de código:

- dashboard financeiro em `/financeiro`;
- hooks/funções de métricas financeiras;
- funções do banco que calculam saldo e projeção, se necessário;
- componentes auxiliares para diagnóstico de saldos.

Alterações de dados:

- Nenhuma alteração de dados automática nesta primeira implementação.
- Não vou apagar nada.
- Não vou alterar saldo inicial sem te mostrar antes os valores recomendados.
- Não vou mexer nas 5 sobras da BTG sem nova confirmação.

## Próximo passo após essa correção

Depois que a tela estiver mostrando claramente o problema, o caminho ideal será:

1. conciliar Virtual Rodrigo com extrato;
2. revisar Virtual Daniel e Virtual Inter;
3. definir saldos iniciais reais;
4. só então considerar o dashboard como fonte confiável de saldo.