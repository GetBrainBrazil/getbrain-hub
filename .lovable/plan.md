## Redesign do bloco "Saúde Financeira"

Refatorar o bloco em `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx` para ficar mais organizado, equilibrado e com hierarquia visual clara — sem mexer em dados ou lógica, só apresentação.

### Problemas no design atual
- Donut e legenda à esquerda parecem soltos; muito espaço em branco entre o donut e a timeline.
- Legenda em lista simples (bolinha + texto) não destaca os valores nem mostra %.
- Timeline ocupa metade da tela mas é apenas um traço com pontos: sem referência de "hoje", sem contagem por status, sem densidade visual.
- Datas só nos cantos extremos não dão contexto temporal.

### O que vai mudar

**Donut (`Donut`)**
- Ganha trilho de fundo cinza para mostrar o "círculo completo" mesmo quando há pouco dado.
- Pontas arredondadas (`strokeLinecap="round"`) para visual mais refinado.
- Rótulo central reformatado: `63%` grande + "RECEBIDO" abaixo + linha "Total: R$ X" embaixo do círculo.
- Vira um componente vertical e auto-centrado (não mais lado a lado com a legenda).

**Legenda (`DonutLegend` — novo componente)**
- Cada item vira um card sutil (`border + bg-card/40`), com:
  - Bolinha colorida
  - Label em CAPS pequeno
  - Valor em fonte mono grande
  - **% à direita** na cor do item
- Cards ficam em coluna única ao lado do donut.

**Timeline (`Timeline`)**
- Trilho com leve gradiente vertical (`bg-gradient-to-b from-muted/10 to-muted/30`) — mais "tela de gráfico".
- Marca vertical "HOJE" sobreposta ao trilho quando o intervalo cobre o dia atual.
- Pontos com hover (`scale-150`) e sombra leve.
- Acima do trilho: legenda inline compacta com **contagem por status** (ex.: "Recebido 14 · Previsto 22 · Atrasado 1").
- Abaixo: rodapé com data inicial · contagem total de parcelas (centro) · data final.

**Layout do bloco**
- Grade `md:grid-cols-[280px_1fr]`: donut+legenda à esquerda em coluna fixa, timeline ocupa o resto.
- Subtítulo "LINHA DO TEMPO DE PARCELAS" reposicionado e alinhado.

### Arquivo afetado
- `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx` (apenas componentes `Donut`, `Timeline` e o JSX do "Bloco 1").

Sem mudanças de dados, hooks ou rotas.
