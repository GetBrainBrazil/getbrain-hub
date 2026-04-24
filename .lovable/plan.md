## Objetivo

Substituir a "Linha do tempo de parcelas (todas)" do card **Saúde financeira** (aba Operacional do projeto) por uma **visualização em calendário mensal**, mais legível que a régua horizontal atual onde os pontos se sobrepõem.

## O que muda

Apenas o componente `Timeline` em `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx` (linhas ~229-323) será substituído por um novo `ParcelasCalendar`. Tudo mais (dados, filtros, métricas, blocos abaixo) permanece igual.

## Visualização proposta

Calendário compacto agrupando parcelas por mês, do primeiro ao último mês com lançamentos:

```text
┌─ Recebido 16   ● Previsto 11   ● Atrasado 1 ──────── [‹ 2025 ›] ─┐
│                                                                  │
│  JAN/25   FEV/25   MAR/25   ABR/25   MAI/25   JUN/25             │
│  ──       ──       ──       ──       ──       ●                  │
│                                                R$ 725             │
│                                                                  │
│  JUL/25   AGO/25   SET/25   OUT/25   NOV/25   DEZ/25             │
│  ●        ●        ●        ●        ● ●      ●                  │
│  R$725    R$725    R$725    R$750    R$1.500  R$750               │
│                                                                  │
│  JAN/26   FEV/26   MAR/26  [ABR/26] MAI/26    JUN/26             │
│  ●        ●        ●        ● ●     ○         ○                  │
│  R$750    R$750    R$750    R$1.500 R$750     R$750               │
└──────────────────────────────────────────────────────────────────┘
● recebido  ● atrasado  ○ previsto       Mês de hoje destacado
```

Características:
- **Grade mensal** (4 colunas em mobile, 6 em desktop) cobrindo o intervalo completo das parcelas.
- Cada célula mostra **mês/ano**, **bolinhas coloridas** (uma por parcela, cor = status) e o **total do mês** em fonte mono.
- **Mês atual** com borda destacada (ring accent).
- **Hover/tooltip** em cada bolinha com descrição, valor e data (mantém comportamento atual).
- **Clique na bolinha**: abre tooltip detalhado (descrição + valor + data + status). Sem navegação por enquanto para manter escopo enxuto.
- Legenda no topo (Recebido / Previsto / Atrasado) — preservada.

## Implementação técnica

Arquivo único alterado: `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx`

1. Remover a função `Timeline` (linhas ~229-323).
2. Criar `ParcelasCalendar({ items }: { items: ProjectMovimentacao[] })`:
   - Agrupa `items` por `YYYY-MM` de `data_vencimento` usando `date-fns` (`format`, `startOfMonth`, `eachMonthOfInterval`).
   - Gera todos os meses entre `min` e `max` (inclui meses vazios para manter continuidade visual).
   - Para cada mês: lista de parcelas + soma de `valor_previsto`.
   - Reusa helpers existentes: `parcelStatus`, `statusColor`, `statusLabel`, `formatCurrency`, `formatDate`.
   - Renderiza grid Tailwind (`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2`).
   - Cada célula = `Tooltip` (shadcn) wrappando bolinhas; mês atual recebe `ring-2 ring-accent`.
3. Trocar a chamada `<Timeline items={allReceitas} />` (linha 666) por `<ParcelasCalendar items={allReceitas} />`.
4. Atualizar o título do bloco (linha 664) de "Linha do tempo de parcelas (todas)" para **"Calendário de parcelas (todas)"**.

Sem mudanças em banco, queries, tipos, rotas ou outros componentes. Sem novas dependências (`date-fns` já está no projeto).
