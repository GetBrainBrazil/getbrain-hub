
# Reconstruir o submódulo de Lead com propósito claro

## 1. O que é um Lead nesse sistema (decisão conceitual)

Um **Lead** é um *candidato a virar oportunidade*. Ele existe por um motivo só: **decidir, no menor tempo possível, se vale gastar energia montando uma proposta**. Tudo que não serve a essa decisão pertence ao Deal.

Regra de ouro: **se você precisa de mais de 1 minuto para preencher um lead, o lead está pedindo a coisa errada.**

### Ciclo de vida (5 estados, sem mudança de schema)

```text
novo  →  triagem_agendada  →  triagem_feita  →  convertido (vira Deal)
                                              ↘  descartado (com motivo)
```

- **novo**: alguém pingou. Tem origem e contato. Falta marcar a conversa.
- **triagem_agendada**: tem data/hora/canal da call de qualificação.
- **triagem_feita**: a call rolou; existe um *resumo* e um *veredito* (avançar / descartar).
- **convertido**: virou Deal. Lead vira read-only com link para o Deal.
- **descartado**: tem motivo registrado. Pode ser reaberto.

## 2. Como você vai usar (fluxo real, do seu lado)

1. Cria lead em 10 segundos: `empresa + contato + origem + título curto`. Status: `novo`.
2. Marca a triagem: clica "Agendar triagem", define data/hora/canal. Status vira `triagem_agendada`.
3. **Faz a triagem.** Volta na tela e preenche **um campo só**: `resumo da triagem` (texto livre, o que importou). Marca como feita. Status: `triagem_feita`.
4. Decide:
   - **"Vale proposta"** → clica `Converter em Deal`. O Deal nasce já com empresa/contato/dono/origem/resumo da triagem grudados, e você qualifica dor/escopo/valores **lá**, onde realmente importa.
   - **"Não vale"** → `Descartar` com motivo. Fim.

**O que você não faz mais no Lead:** preencher categoria de dor, custo da dor, horas perdidas, fit, urgência, contexto de negócio, solução atual. Isso tudo é trabalho do Deal — fazer antes da triagem é chute, fazer depois é retrabalho duplo.

## 3. Nova UI do Lead Detail (3 zonas, não 4)

```text
┌─ HEADER ─────────────────────────────────────────────┐
│ LEAD-009 · Sunbright Engenharia · [Triagem agendada] │
│ Título do lead (inline)                              │
│ R$ estimado · Daniel · Indicação · há 3d             │
│ ▶ Próximo passo: "Triagem em 05/05 14h" [Ver agenda] │
│ [Marcar triagem feita] [Reagendar] [Descartar]       │
├─ MAIN ───────────────────────┬─ SIDEBAR ─────────────┤
│ 01 Origem & primeiro contato │ EMPRESA               │
│   • Origem (combobox)        │  link + KPIs reais    │
│   • Valor estimado           │  (deals, MRR)         │
│   • O que sabemos (textarea  │ ─────                 │
│     curta — 3 linhas)        │ CONTATO PRINCIPAL     │
│                              │  nome, papel, contato │
│ 02 Triagem                   │ ─────                 │
│   • Quando (datetime)        │ DONO                  │
│   • Canal (combobox)         │ ─────                 │
│   • Aconteceu em + duração   │ STATUS                │
│   • Resumo da triagem (rich) │  ChipGroup 5 estados  │
│   • [Marcar como feita]      │ ─────                 │
│                              │ HISTÓRICO DA EMPRESA  │
│ 03 Veredito                  │  últimos 3 leads/deals│
│   • Banner contextual:       │                       │
│     - se feita+sem deal:     │                       │
│       [Converter em Deal] ⭐ │                       │
│     - se convertido:         │                       │
│       link p/ DEAL-XXX       │                       │
│     - se descartado:         │                       │
│       motivo + [Reabrir]     │                       │
└──────────────────────────────┴───────────────────────┘
[Atividades] [Timeline]  ← tabs auxiliares, não principais
[Zona de risco]
```

**Zonas removidas vs hoje:**
- ❌ "01 Qualificação" (urgência + fit + contexto) → vai para o Deal
- ❌ "02 Dor & Contexto" (categorias, custo, horas, solução atual) → vai para o Deal
- ❌ "04 Próximo passo & notas livres" — substituído pelo banner do header (1 ação clara) e pelo `resumo da triagem`

## 4. Mudanças técnicas

### Schema (migration nova)
Remover do `leads` os 8 campos que duplicavam o Deal:
```sql
ALTER TABLE public.leads
  DROP COLUMN IF EXISTS pain_categories,
  DROP COLUMN IF EXISTS pain_cost_brl_monthly,
  DROP COLUMN IF EXISTS pain_hours_monthly,
  DROP COLUMN IF EXISTS current_solution,
  DROP COLUMN IF EXISTS urgency,
  DROP COLUMN IF EXISTS fit,
  DROP COLUMN IF EXISTS business_context,
  DROP COLUMN IF EXISTS next_step,
  DROP COLUMN IF EXISTS next_step_date;
DROP TRIGGER IF EXISTS trg_validate_lead_qualifiers ON public.leads;
DROP FUNCTION IF EXISTS public.validate_lead_qualifiers();
```

**Mantém** no `leads`: `pain_description` (renomeado conceitualmente para "o que sabemos / sinal de interesse"), `triagem_summary`, `triagem_channel`, `triagem_duration_minutes`, `triagem_scheduled_at`, `triagem_happened_at`, `notes`, `lost_reason`.

### `convert_lead_to_deal` (nova versão)
- Continua copiando: empresa, contato, dono, título, valor estimado, origem.
- **Para de tentar copiar** os campos removidos.
- **Novo**: concatena `pain_description` + `triagem_summary` no `deals.business_context` do Deal recém-criado, como ponto de partida — o vendedor refina lá.

### Tipos (`src/types/crm.ts`)
- Remove `LeadUrgency`, `LeadFit` e os 9 campos do tipo `Lead`.

### Componentes
- **Apaga**: `ConvertLeadDialog` cheio de checklist de campos (vira diálogo simples), `inlineFields.tsx` se só era usado pelo Lead (Deal já tem versão própria — confirmar antes de apagar).
- **Reescreve `CrmLeadDetail.tsx`**: 3 zonas, header com banner de próximo passo único, sidebar enxuta.
- **Reescreve `LeadHeader.tsx`**: ações reduzidas a `Marcar triagem feita` / `Reagendar` / `Descartar` / `Converter em Deal` (a última só aparece em `triagem_feita`).
- **Mantém**: `LeadSidebar` (já é boa, só remove o que não existe mais).
- **Mantém**: tabs `Atividades` e `Timeline` (úteis e consistentes com Deal).

### UI polish (correções de inconsistência que já existem)
- Trocar `<select>` HTML cru por `Combobox` no canal da triagem.
- Trocar `<input type="date">` cru por `DatePicker` consistente.
- Timeline passa a usar o mesmo agrupamento por dia do `AdminAuditoriaPage` (já existe o componente).

## 5. Arquivos afetados

**Migration nova**
- `supabase/migrations/<ts>_lead_simplification.sql` — remove colunas + reescreve `convert_lead_to_deal`.

**Editar**
- `src/types/crm.ts` — encolhe interface `Lead`.
- `src/pages/crm/CrmLeadDetail.tsx` — reescrita (3 zonas).
- `src/components/crm/LeadHeader.tsx` — banner de próximo passo + ações reduzidas.
- `src/components/crm/LeadSidebar.tsx` — remove campos inexistentes.
- `src/components/crm/ConvertLeadDialog.tsx` — simplifica (sem checklist de campos qualitativos).
- `src/hooks/crm/useCrmDetails.ts` — `useUpdateLeadField` já é genérico, só perde tipos.

**Possivelmente apagar (após verificar que só Lead usava)**
- `src/components/crm/inlineFields.tsx` — se Deal não importar, remove.

## 6. Critérios de aceite

- Criar um lead leva ≤30s (empresa, contato, origem, título).
- A tela do lead tem **uma única ação destacada por status** — nunca múltiplas competindo.
- Nenhum campo de dor estruturada / urgência / fit aparece no Lead.
- Conversão para Deal cria um Deal com empresa/contato/dono/origem/resumo já preenchidos, e abre direto no Deal recém-criado.
- Lead descartado mostra motivo em destaque e botão de reabrir.
- Lead convertido vira read-only com link clicável para o Deal gerado.
- Mobile: header empilhado, sidebar em Sheet, ações em barra fixa no rodapé.

## 7. O que isso resolve (por que não é "mais do mesmo")

| Antes | Depois |
|---|---|
| Lead = mini-Deal com 4 zonas e ~20 campos | Lead = ficha de triagem com 3 zonas e 6 campos |
| Mesma dor preenchida 2x (Lead → Deal) | Dor preenchida 1x, no Deal |
| 4 ações no header competindo | 1 ação destacada por status |
| `<select>` e `<input date>` crus quebrando padrão | Combobox + DatePicker consistentes |
| Timeline simples destoa do resto | Timeline agrupada por dia (igual auditoria) |

O Lead vira o que ele deveria ser: **um filtro rápido**. O Deal continua sendo o lugar do trabalho pesado de qualificação.
