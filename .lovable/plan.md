## Diagnóstico

Achei o bug raiz. A função `close_deal_as_won` (versão atual em produção, migration `20260430005655`) tem dois problemas:

1. **Não escreve nas colunas dedicadas do projeto.** A tabela `projects` tem colunas `deliverables text[]`, `premises text[]`, `identified_risks text[]`, `technical_stack text[]`, `acceptance_criteria jsonb`, `start_date`, `estimated_delivery_date`, `contract_value`, `installments_count`, `primary_contact_person_id`, `origin_lead_source_id`, `mockup_url`, `mockup_screenshots`, `organograma_url` — mas a função atual só insere `commercial_context` (JSON), `mrr_value`, `notes` e umas poucas colunas básicas. Por isso a aba **Escopo** do projeto fica vazia.
2. **Joga tudo dentro do JSON `commercial_context`**, incluindo arrays e o `acceptance_criteria` (array de objetos `{ text }`). O `CommercialContextCard` faz `Object.entries` + `String(val)`, então arrays viram texto solto e objetos viram `[object Object]` (visível no print).

Resultado prático: o projeto criado vira "um bloco com tudo misturado" e a aba Escopo aparece vazia.

## Correções

### 1. Migration `fix_close_deal_handoff` (banco)

Recria `close_deal_as_won` para:

- **Escrever nas colunas próprias** de `projects`: `deliverables`, `premises`, `identified_risks`, `technical_stack`, `acceptance_criteria`, `scope_in`, `scope_out`, `business_context`, `start_date`, `estimated_delivery_date`, `estimated_hours_baseline`, `complexity_baseline`, `primary_contact_person_id`, `origin_lead_source_id`, `mockup_url/organograma_url/mockup_screenshots`, `contract_value` (= soma das parcelas) e `installments_count`.
- **Manter `commercial_context` enxuto** — só descoberta comercial sem coluna própria: `pain_description`, `pain_categories`, `pain_cost_brl_monthly`, `pain_hours_monthly`, `current_solution`, `competitors`, `decision_makers`, `pricing_rationale`, `budget_range_min/max`, `estimation_confidence`, `next_step`, `next_step_date`, `mrr_start_trigger`, `mrr_discount_*`.
- Continuar movendo anexos do deal para o projeto, copiando `deal_dependencies` para `project_dependencies`, e marcando o deal como `ganho`.

E faz **backfill** dos projetos já criados (como o PRJ-0015): para cada projeto com `source_deal_id` e arrays presos no `commercial_context`, transfere para as colunas próprias e remove esses campos do JSON.

### 2. Refatorar `CommercialContextCard.tsx` (UI)

Substituir o `Object.entries` genérico por **sub-blocos semânticos** lado a lado:

```
┌─ Contexto comercial ──────── Origem · DEAL-008 ┐
│ [Tipos do projeto: chips coloridos]            │
│                                                │
│ ┌─ ⚠ Dor identificada ─┐  ┌─ 💡 Solução & ─┐ │
│ │ chips de categorias    │  │ concorrência    │ │
│ │ Descrição              │  │ Solução atual   │ │
│ │ Custo mensal           │  │ Concorrentes    │ │
│ │ Tempo perdido          │  └─────────────────┘ │
│ └────────────────────────┘                      │
│                                                 │
│ ┌─ 👥 Decisão ─────────┐  ┌─ 💰 Orçamento ──┐  │
│ │ Decisores             │  │ Faixa            │  │
│ │ Próximo passo + data  │  │ Confiança        │  │
│ └───────────────────────┘  │ Racional         │  │
│                            └──────────────────┘  │
│                                                  │
│ ┌─ 🔁 MRR (recorrência) ─────────────────────┐  │
│ │ Início, desconto, validade                  │  │
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

Cada sub-bloco:
- Aparece só se tem dado real (sem placeholders "—" poluindo).
- Formata por tipo: BRL para custos/orçamento, `Xh/mês` para horas, datas pt-BR, labels para enums (`baixa`/`media`/`alta` → "Baixa/Média/Alta", `on_delivery` → "Inicia na entrega").
- Cor de tom: dor = warning, solução = info, MRR = success.
- Ignora chaves legacy (`deliverables`, `premises`, etc.) caso ainda venham por algum motivo, evitando o bug do `[object Object]`.

A aba **Escopo** (`AbaEscopo.tsx`) já existe e renderiza certinho `deliverables`, `premises`, `technical_stack`, `identified_risks`, `acceptance_criteria` a partir das colunas — então depois da migration ela passa a mostrar os dados automaticamente.

## Arquivos editados

- Migration nova: `fix_close_deal_handoff` — refaz `close_deal_as_won` + backfill dos projetos existentes.
- `src/components/projetos/CommercialContextCard.tsx` — UI em sub-blocos semânticos.

## Verificação após aplicar

- Abrir o PRJ-0015 → aba **Escopo** mostra Premissas, Deliverables, Stack técnica, Riscos, Critérios de aceite (vindos do deal).
- Aba **Visão Geral** → "Contexto comercial" aparece organizado em sub-blocos (Dor, Solução, Decisão, Orçamento, MRR), sem `[object Object]`.
- Próximo deal fechado como ganho cria o projeto já com tudo separado.