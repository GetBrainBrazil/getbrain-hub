## Objetivo

Substituir o `ParcelasCalendar` atual (poluído, com bolinhas amontoadas e pouco legível) por um calendário financeiro mensal mais bonito, prático de ler, e que mostre **entradas e saídas** com tooltip detalhado ao passar o mouse — incluindo descrição, valor, data e **categoria** (Salário, Implementação, Manutenção, etc.).

## O que muda visualmente

### Antes
- Cards densos com bolinhas coloridas pequenas (até 8 por mês), título do mês, contagem e valor previsto.
- Tooltip nativo do browser (`title=`) — feio, lento e sem formatação.
- Mostra apenas receitas (`allReceitas`).

### Depois — calendário mensal "heatmap" financeiro
Cada célula do mês passa a ter:

```text
┌──────────────────────────┐
│ JUL                   3  │  ← mês + nº de lançamentos
│                          │
│  +R$ 2.250        ▲      │  ← entradas (verde) com seta ↑
│  −R$    450       ▼      │  ← saídas  (vermelho) com seta ↓
│ ─────────────────────    │
│  Saldo  +R$ 1.800        │  ← saldo líquido
│                          │
│  ●●● ○○                  │  ← micro-barra de status (recebido/previsto/atrasado)
└──────────────────────────┘
```

- Fundo do card recebe um leve **tint verde/vermelho** conforme o saldo do mês (heatmap discreto).
- Mês atual destacado com `ring-accent`.
- Meses sem lançamento ficam **vazios e apagados** (sem borda forte) para o olho focar nos meses com atividade.
- Tipografia mono nos valores, alinhamento `tabular-nums` para colunas verticais limpas.

### Tooltip rico (Radix `HoverCard` / `Tooltip`)
Ao passar o mouse sobre uma célula do mês, abre um popover com a lista detalhada:

```text
Julho · 2025                            +R$ 1.800,00 líquido
─────────────────────────────────────────────────────────────
ENTRADAS
  ● 10/07  Mensalidade contrato         Manutenção    R$ 750,00
  ● 15/07  Parcela 3/6 implementação    Implementação R$ 1.500,00

SAÍDAS
  ● 05/07  Salário João                 Salário       R$ 350,00
  ● 20/07  API OpenAI                   Integrações   R$ 100,00
```

Cada linha clicável → abre `/financeiro/movimentacoes/:id` (mesmo destino do `ParcelaRow` atual).

## Mudanças técnicas

**Arquivo:** `src/pages/projetos/ProjetoFinanceiroDetalhe.tsx`

1. **Passar entradas + saídas para o calendário**
   - Trocar `<ParcelasCalendar items={allReceitas} />` por `<ParcelasCalendar receitas={allReceitas} despesas={detail?.despesas ?? []} />`.

2. **Reescrever `ParcelasCalendar`**
   - Nova assinatura: `{ receitas, despesas }`.
   - Construir `byMonth: Map<string, { receitas: [], despesas: [] }>` cobrindo o range completo (min..max) das duas listas juntas.
   - Para cada mês calcular: `entradas`, `saidas`, `saldo`, contagem por status.
   - Renderizar grid responsivo `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6`.
   - Heatmap: `bg-success/5` quando saldo > 0, `bg-destructive/5` quando saldo < 0, intensidade proporcional ao maior saldo absoluto do range (clamp em 3 níveis: `/5`, `/10`, `/15`).

3. **Tooltip rico com `HoverCard`**
   - Importar de `@/components/ui/hover-card` (já existe no projeto shadcn).
   - `HoverCardTrigger` envolve a célula inteira; `HoverCardContent` lista lançamentos agrupados em ENTRADAS / SAÍDAS, ordenados por data.
   - Cada item exibe: bolinha de status, dia/mês, descrição (truncada), badge da categoria, valor.

4. **Resolver nome da categoria**
   - Adicionar fetch leve no hook `useProjectFinanceDetail.ts`: após carregar movimentações, coletar `categoria_id` distintos e fazer um único `select("id, nome")` em `categorias_financeiras`.
   - Expor `categoriasMap: Record<string, string>` no retorno do hook.
   - Fallback de label quando `categoria_id == null`:
     - `source_entity_type === "maintenance_contract"` → `"Manutenção"`
     - `tipo === "despesa"` e descrição contém "salário" → `"Salário"` (heurística leve)
     - caso contrário → `"Sem categoria"`

5. **Legenda atualizada**
   - Manter contadores Recebido / Previsto / Atrasado (apenas para receitas, como hoje).
   - Adicionar linha extra com totais do range: `Entradas R$ X · Saídas R$ Y · Saldo R$ Z`.

6. **Título da seção**
   - Mudar de "Calendário de parcelas (todas)" para **"Calendário financeiro"**.

## Fora do escopo
- Não alteramos os gráficos donut nem os totais já corrigidos na rodada anterior.
- Não mexemos na lógica de `parcelStatus` / `statusColor`.
- Não criamos visão diária (continua mensal — pedido foi melhorar a leitura, não trocar a granularidade).
