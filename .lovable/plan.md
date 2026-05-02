## Diagnóstico

Confirmei os números no banco. Você tem hoje:

| Deal | Estágio | Implementação | MRR | `estimated_value` salvo |
|------|---------|---------------|-----|---|
| DEAL-008 Sunbright | **ganho** | R$ 4.000 | R$ 600/mês | R$ 11.200 |
| DEAL-009 Del Fiori | descoberta_marcada | — | — | — |

A proposta PROP-0006 (status `convertida`) bate com isso: implementação 4.000 + manutenção 600/mês.

### Por que aparece R$ 11.200 / 2 deals / R$ 9.520 forecast / R$ 11.200 ticket médio?

Encontrei 2 problemas em `src/pages/crm/CrmPipeline.tsx`:

**1. Fórmula inflando o valor do deal**
Em `CrmPipeline.tsx:347` e `CrmDealDetail.tsx:746`, sempre que você edita implementação ou MRR, o sistema sobrescreve `estimated_value` com:
```
estimated_value = implementação + MRR × 12
```
Ou seja, R$ 4.000 + R$ 600 × 12 = **R$ 11.200**. Isso é um TCV de 12 meses, não o valor da proposta. O KPI "Pipeline" simplesmente soma esse campo.

**2. Deal "ganho" entrando no pipeline (modo Kanban)**
No modo Kanban, o `homeKpis` usa `filteredDeals`, que inclui deals já ganhos/perdidos. Por isso o Sunbright (ganho) ainda conta como "pipeline" e infla os 4 KPIs. No modo Lista os fechados já são ocultados — a inconsistência é só no Kanban.

Resultado: forecast = 11.200 × 85% = R$ 9.520 ✓, ticket médio = 11.200/1 = R$ 11.200 ✓ (só 1 deal tem valor). Matemática correta, premissas erradas.

---

## Plano de correção

### 1. Mudar o conceito de "Pipeline" para refletir one-time + MRR separados

Em `src/components/crm/CrmKpiStrip.tsx` e nos KPIs de `CrmPipeline.tsx`, trocar o card único "Pipeline" por **dois números** lado a lado:

- **Pipeline (implementação)** — soma de `estimated_implementation_value` dos deals abertos
- **MRR em pipeline** — soma de `estimated_mrr_value` dos deals abertos, formatada como `R$ X/mês`

Para o seu caso atual (sem deals abertos com valor): ambos zerariam, que é o esperado já que o único deal com valor virou ganho.

### 2. Forecast ponderado: também separar

- **Forecast one-time** = Σ implementação × probabilidade
- **Forecast MRR** = Σ MRR × probabilidade (mostrado como `R$ Y/mês`)

Remove a soma "implementação + MRR×12" disfarçada de forecast.

### 3. Excluir deals fechados (ganho/perdido) dos KPIs em qualquer modo

No `homeKpis` de `CrmPipeline.tsx`, sempre filtrar por `ACTIVE_STAGES` antes de calcular pipeline/forecast/ticket — independente de Kanban ou Lista. Os deals fechados continuam visíveis no Kanban (são colunas válidas) mas não entram nas métricas de "pipeline futuro".

### 4. Ticket médio = média da implementação

Trocar `pipeline / nº deals com valor` por `Σ implementação / nº deals abertos com implementação > 0`. Mais alinhado com como você pensa ("o ticket de uma proposta").

### 5. Parar de sobrescrever `estimated_value` com TCV

Em `CrmPipeline.tsx:347` e `CrmDealDetail.tsx:746`, remover a linha que faz `estimated_value = implementation + mrr*12`. O campo `estimated_value` passa a ser só um valor manual opcional (legado). Os KPIs leem direto de `estimated_implementation_value` e `estimated_mrr_value`, que já existem e estão corretos no banco.

Vou rodar uma migração one-shot para zerar `estimated_value` em deals onde o valor atual seja exatamente `estimated_implementation_value + estimated_mrr_value*12` (evita resíduo desse cálculo antigo poluindo qualquer outra view).

### 6. Layout do strip

```text
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ PIPELINE     │ MRR PIPELINE │ FORECAST     │ TICKET MÉDIO │ PRÓXIMO PASSO│
│ R$ 0         │ R$ 0/mês     │ R$ 0 + 0/mês │ R$ 0         │ ATRASADO: 0  │
│ 0 deals      │              │ ponderado    │ por deal     │              │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

Em desktop largo viram 5 cards; em mobile colapsam para 2 colunas como hoje.

---

## Arquivos afetados

- `src/components/crm/CrmKpiStrip.tsx` — novo card MRR, forecast separado
- `src/pages/crm/CrmPipeline.tsx` — `homeKpis` usa implementação/MRR e sempre filtra fechados; remove sobrescrita de `estimated_value`
- `src/pages/crm/CrmDealDetail.tsx` — remove sobrescrita de `estimated_value`
- `src/types/crm.ts` (`CrmMetrics`) — adicionar `mrr_pipeline_brl` se a view CRM for usada
- Migração SQL — limpar `estimated_value` legado e atualizar a view `crm_pipeline_metrics` para expor MRR separado

## Resultado esperado para você agora

Com 1 deal ganho (Sunbright) e 1 deal aberto sem valor (Del Fiori):
- Pipeline: **R$ 0** (1 deal aberto sem valor)
- MRR Pipeline: **R$ 0/mês**
- Forecast: **R$ 0**
- Ticket médio: **R$ 0**
- Próximo passo atrasado: **0**

Quando você precificar o Del Fiori com 4k + 600/mês, vai aparecer corretamente como `Pipeline R$ 4.000`, `MRR R$ 600/mês`, sem inflar nada.
