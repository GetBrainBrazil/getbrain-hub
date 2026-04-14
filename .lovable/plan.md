

## Plano: Redesign da Visão Geral Financeira

Baseado na imagem de referência, vou reorganizar a página `/financeiro` para seguir o mesmo layout, mantendo a identidade visual escura do GetBrain.

### Mudanças

**1. KPI Cards (topo)**
- Reordenar: Saldo Total, Resultado do Período, A Receber, A Pagar
- No card "A Pagar", adicionar badge mostrando valor vencido (ex: "R$ 795,22 vencido") quando houver contas atrasadas
- Atualizar os ícones para corresponder à referência (Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle)

**2. Nova seção: Alertas e Avisos**
- Card com borda lateral amarela/laranja
- Ícone de alerta triangular + texto "X conta(s) a pagar atrasada(s)" + valor total vencido à direita
- Substituir o card de "contas vencidas" atual por este formato

**3. Gráficos lado a lado**
- **Evolução Mensal** (esquerda) — manter o BarChart existente
- **Fluxo de Caixa Projetado** (direita) — novo AreaChart/LineChart projetando saldo dos próximos 60 dias com base em contas pendentes e saldo atual

**4. Reorganizar layout**
- Remover seções "Saldo por Conta Bancária" e "Últimas Movimentações" desta view (podem ir para outra página ou ficar abaixo dos gráficos)

### Arquivos modificados
- `src/pages/FinanceiroVisaoGeral.tsx` — redesign completo do layout
- `src/components/KPICard.tsx` — suportar prop de badge extra (valor vencido)

