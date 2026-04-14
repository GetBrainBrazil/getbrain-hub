

## Plano: Bolinhas pontuais no Fluxo de Caixa Projetado

### Problema
Atualmente, o gráfico exibe bolinhas (`dot`) em **todos os 13 pontos** de dados (a cada 5 dias), criando poluição visual.

### Solução
Exibir bolinhas apenas nos pontos-chave: **dia 0 (hoje), dia 15, dia 30, dia 45 e dia 60** — ou seja, a cada 15 dias. Isso dá contexto temporal sem sobrecarregar a linha.

### Mudança
**`src/pages/FinanceiroVisaoGeral.tsx`**:
1. Marcar nos dados do `fluxoData` quais pontos são "âncora" (dias 0, 15, 30, 45, 60)
2. Trocar `dot={{ r: 5, ... }}` por uma função customizada que só renderiza o ponto quando o índice corresponde a um ponto âncora
3. Manter `activeDot` para hover em qualquer ponto

Resultado: linha suave com 5 bolinhas bem espaçadas nos marcos de tempo.

