
# Calendário comercial — repensado

## Para que serve (objetivo real)

O calendário NÃO é um Google Calendar bonito. É a **central operacional do dia comercial**: onde o time vê **o que precisa fazer agora**, marca **feito / remarcar / não atendeu**, e cai no Lead/Deal correto em 1 clique.

Hoje o módulo falha porque:
- A visão padrão é **Mês** (8 linhas vazias quando o pipeline tem pouca atividade — exatamente o que aparece no print).
- Cada célula do mês é gigante (148px) e mostra no máximo 3 atividades sem distinção visual de tipo.
- A coluna "Próximas e atrasadas" duplica informação e some no mobile.
- Sem KPIs ("quantas vencidas? quantas hoje?"), sem ação inline (precisa abrir o Lead/Deal pra remarcar).
- Filtros e navegação ocupam 2 barras separadas.
- O dialog "Nova atividade" não permite vincular a Lead/Deal e usa `<input datetime-local>` cru.

## Nova estrutura

```text
┌─────────────────────────────────────────────────────────────┐
│ Header sticky                                                │
│  Calendário comercial                       [+ Nova ativid.] │
│  Hoje · Semana · Mês · Agenda    ◀ 02–08 mai 2026 ▶  Hoje    │
├─────────────────────────────────────────────────────────────┤
│ KPI strip (4 cards densos, padrão CrmKpiStrip)               │
│  Hoje 3 · Atrasadas 2 · Esta semana 11 · Realizadas 7d 18    │
├─────────────────────────────────────────────────────────────┤
│ Filtros pill (Tipo · Owner · Status · Vinculado a)           │
├──────────────────────────────────┬──────────────────────────┤
│  VIEW (Hoje / Semana / Mês /     │  Painel lateral           │
│         Agenda)                  │  ─────────────            │
│                                  │  Atrasadas (vermelho)     │
│                                  │  Hoje                     │
│                                  │  Próximas 7d              │
│                                  │  (lista compacta clicável)│
└──────────────────────────────────┴──────────────────────────┘
            ↓ clique numa atividade
        Drawer lateral (Sheet) com detalhes + ações
```

### Views

- **Hoje** (default em mobile): timeline vertical com horas (08–20h), blocos coloridos por tipo, "agora" marcado por linha horizontal.
- **Semana** (default em desktop): grid 7 colunas × horas, blocos compactos. Substitui o "Mês vazio" como visão primária — é onde 90% da operação real acontece.
- **Mês**: mantida, mas com células menores (h-24), mostrando apenas pontinhos coloridos por tipo + contador. Clicar no dia abre a Semana correspondente.
- **Agenda**: lista agrupada por dia (padrão da auditoria unificada), com seções colapsáveis "Atrasadas / Hoje / Amanhã / Esta semana / Próximas".

### Bloco de atividade (visual consistente)

```text
┌──────────────────────────────┐
│ 🟦 14:30  Reunião virtual    │  ← cor da borda esquerda = tipo
│ Discovery — Acme Corp        │  ← título
│ DEAL-042 · João Silva        │  ← link + owner
└──────────────────────────────┘
```

Cores por tipo (já existem tokens no design system): reunião virtual = accent, presencial = primary, ligação = warning, email = muted, whatsapp = success, outro = neutro.

### Drawer de detalhes (ao clicar)

Sheet lateral direita (padrão `RecorrenciaDrawer` / `VendaDrawer`) com:
- Título editável inline
- Data/hora com `DatePicker` + `TimePicker` (não `datetime-local` cru)
- Tipo (Combobox), Owner (Combobox de actors), Duração
- **Vínculo**: campo "Vincular a" com busca de Deal/Lead (combobox unificado)
- Descrição (Textarea)
- **Botões de ação rápida**:
  - ✅ Marcar como feita (com campo opcional "Resultado")
  - 🔄 Remarcar (+1d / +1sem / data custom)
  - 📞 Não atendeu (cria nova atividade no dia seguinte)
  - 🗑️ Cancelar
- Link "Abrir Lead/Deal completo →"

### Dialog "Nova atividade" reformulado

- Mesmo formulário do drawer (componente compartilhado `ActivityForm`).
- Campo "Vincular a" obrigatório-ish (com opção "Sem vínculo" explícita).
- Pré-preenche owner = usuário logado.
- Pré-preenche horário = próxima meia hora redonda.

## Arquivos

**Novos:**
- `src/components/crm/calendar/ActivityForm.tsx` — formulário compartilhado (criar/editar)
- `src/components/crm/calendar/ActivityDrawer.tsx` — Sheet de detalhes + ações rápidas
- `src/components/crm/calendar/ActivityBlock.tsx` — bloco visual reutilizável (cor por tipo)
- `src/components/crm/calendar/CalendarKpis.tsx` — strip de 4 KPIs
- `src/components/crm/calendar/WeekView.tsx` — grid semanal horas×dias
- `src/components/crm/calendar/TodayView.tsx` — timeline vertical do dia
- `src/components/crm/calendar/MonthView.tsx` — mês compacto (refatorado do atual)
- `src/components/crm/calendar/AgendaView.tsx` — lista agrupada por dia
- `src/components/crm/calendar/LinkToEntityCombobox.tsx` — busca unificada Deal+Lead

**Editados:**
- `src/pages/crm/CrmCalendar.tsx` — vira shell magro (header + filtros + KPIs + view router + painel lateral)
- `src/hooks/crm/useCrmDashboard.ts` — `useCreateCalendarActivity` aceita `deal_id` / `lead_id`; adicionar `useDeleteCalendarActivity`
- `src/hooks/crm/useCalendar.ts` — adicionar hook `useCalendarKpis(range)` para os 4 contadores

**Sem migrações de banco** — `deal_activities` já tem todas as colunas necessárias (`deal_id`, `lead_id`, `outcome`, `duration_minutes`, `participants`).

## Detalhes técnicos

- View padrão: **Semana** (desktop) / **Hoje** (mobile, via `useIsMobile`).
- Persistência: `usePersistedState('crm-calendar-view-v2', ...)` — chave nova pra não conflitar com a antiga.
- Range query: a `useCalendarEvents` já aceita `start`/`end`, basta passar a semana ou o dia.
- KPIs em paralelo com a query principal, mesmos filtros aplicados.
- Confirmações de ação destrutiva via `useConfirm()` (regra de memória, nunca `confirm()` nativo).
- Cache invalidation: usar `invalidateCrmCaches`/helpers existentes nas mutações.
- Mobile: views Hoje/Agenda em full-width; Semana/Mês ficam atrás de um aviso "melhor em telas maiores" + fallback Agenda (padrão atual mantido).
- Cores por tipo centralizadas em `src/lib/crm/activityColors.ts` (novo arquivo pequeno).

## O que sai

- A coluna fixa "Próximas e atrasadas" — vira parte do painel lateral só nas views Semana/Mês, e some nas views Hoje/Agenda (que já mostram a mesma info).
- O bloco morto `{false && (...)}` no código atual (lixo).
- O `<input type="datetime-local">` cru.

## O que você ganha

1. Abre o calendário e em 2 segundos vê: **o que está atrasado, o que é hoje, o que vem essa semana**.
2. Marca feito / remarca / cancela **sem sair da tela**.
3. Cria atividade já vinculada ao Deal/Lead certo.
4. UX e densidade visual idênticos ao Pipeline e à Auditoria — sem mais "telão vazio de mês".
