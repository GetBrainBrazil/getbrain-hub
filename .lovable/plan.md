## Diagnóstico

Olhando o deal `DEAL-008` ligado à proposta `Sunbright Engenharia`:

| Variável no CRM (`deals`) | Valor real | O que aparece hoje na proposta |
|---|---|---|
| `estimated_implementation_value` | **R$ 4.000** (one-time) | Some — virou "total dos itens" |
| `estimated_mrr_value` | **R$ 600 / mês** | OK em "Manutenção / mês" |
| `installments_count` | **7×** | Some — proposta não exibe |
| `first_installment_date` | **08/06/2026** | Some |
| `deliverables` (7 entregáveis) | títulos reais | Vira 7 "módulos" com **R$ 571,43 cada** (4000 ÷ 7) ❌ |
| `scope_bullets` | `[]` (vazio) | — |
| `mrr_duration_months` / `mrr_discount_*` | gatilhos do MRR | Some |

### A raiz do bug

`parseScopeItems()` em `CrmDealLinkPicker.tsx` faz `4000 / 7 = 571,43` e injeta esse valor falso em cada item, porque o modelo mental atual é **"itens somam o valor de implementação"**. Mas no CRM `estimated_implementation_value` é o **preço cheio do projeto** — os `deliverables` são só descrições do que está incluso, sem preço por item.

Resultado: a proposta perde a noção de "R$ 4.000 em 7×" e mostra um total de itens fake (R$ 4.000,01 por arredondamento) com módulos precificados artificialmente.

## Modelo correto (alinhado ao CRM)

A tab Escopo passa a refletir o que o vendedor realmente cadastra no deal:

```text
┌─ KPIs comerciais ────────────────────────────────────────┐
│ IMPLEMENTAÇÃO       MRR             1º ANO              │
│ R$ 4.000            R$ 600/mês      R$ 11.200           │
│ 7× R$ 571,43        início em ...   impl + 12× MRR      │
│ 1ª em 08/06/2026                                         │
└──────────────────────────────────────────────────────────┘
```

1. **Bloco "Investimento (implementação)"** — substitui "Total dos itens"
   - Campo `implementationValue` (R$, editável). Mapeia direto de `deals.estimated_implementation_value`.
   - Campos `installmentsCount` (1–60) + `firstInstallmentDate`.
   - Mostra preview ao vivo: `7× R$ 571,43 — 1ª em 08/06/2026`.

2. **Bloco "Módulos inclusos"** — substitui "Módulos da proposta"
   - Lista de **descrições sem preço por item** (alinha com `deliverables`/`scope_bullets`).
   - Esconde a coluna de R$ no `NotionItemsEditor` por padrão; opção "exibir valor por módulo" só aparece quando o usuário tem `scope_bullets` reais com `value > 0` no deal.
   - Header agora diz `7 módulos inclusos` em vez de somar valores.

3. **Bloco "Manutenção mensal (MRR)"** — expande o atual
   - Mantém valor + descrição.
   - Adiciona (opcional): nº de meses (`mrr_duration_months`), desconto inicial (`mrr_discount_value` × `mrr_discount_months`), gatilho de início (`mrr_start_trigger`: na assinatura / na entrega / em data).
   - Linha de receita anual atualizada para considerar desconto: `(MRR − desconto)×meses_desc + MRR×(12−meses_desc)`.

4. **Bloco "Prazos"** e **"Considerações"** — sem mudança.

## Mudanças no importador (`CrmDealLinkPicker`)

Reescreve `parseScopeItems` e a lista de seções:

- Item **"Itens do escopo"** vira **"Módulos inclusos (N)"** e copia apenas títulos+descrição, **sem distribuir valores**.
- Adiciona item **"Investimento (implementação)"** — copia `estimated_implementation_value` para `implementationValue`.
- Item "Parcelamento" passa a copiar os 2 campos juntos (já faz, mantém).
- Adiciona item **"Gatilhos do MRR"** quando o deal tiver `mrr_start_trigger` ou `mrr_discount_*` preenchidos.
- Remove a heurística `4000/7=571,43`.

## Mudanças de schema

Adicionar à tabela `proposals` (todas opcionais, com defaults seguros):

```sql
implementation_value       numeric(12,2)
mrr_start_trigger          text       -- 'on_signature' | 'on_delivery' | 'on_date'
mrr_start_date             date
mrr_duration_months        integer
mrr_discount_value         numeric(12,2)
mrr_discount_months        integer
```

`scope_items` continua existindo, mas o `value` por item passa a ser opcional (UI esconde se todos forem 0).

## Estado e tipos

`useProposalEditorState`: novos campos no state + hidratação + autosave (segue o padrão de `installmentsCount`). `TabResumo` já mostra parcelamento — passa a usar `implementationValue` (não a soma dos itens) como "valor de implementação" e o cálculo do 1º ano usa o MRR efetivo (com desconto).

## Arquivos impactados

- `supabase/migrations/<nova>.sql` — adicionar 6 colunas em `proposals`.
- `src/components/orcamentos/page/useProposalEditorState.ts` — novos campos + hidratação + save.
- `src/components/orcamentos/page/CrmDealLinkPicker.tsx` — remover distribuição falsa, novas seções.
- `src/components/orcamentos/page/tabs/TabEscopo.tsx` — novo bloco "Investimento", header de módulos sem somatório, MRR expandido.
- `src/components/orcamentos/NotionItemsEditor.tsx` — prop `showItemValue?: boolean` (default false).
- `src/components/orcamentos/page/tabs/TabResumo.tsx` — passar a ler `implementationValue` direto e MRR efetivo.
- `src/pages/public/PropostaPublica.tsx` + `PropostaTrackingSheet.tsx` — exibir parcelamento e MRR efetivo (ajuste pequeno).

## Migração de dados existentes

Para propostas já criadas com a heurística antiga (como `Sunbright`), a migration faz um `UPDATE` único:

- `implementation_value = COALESCE(SUM(scope_items.value), 0)` quando `implementation_value IS NULL`.
- Não mexe em `scope_items` (continuam visíveis, só não mostram preço por padrão).
