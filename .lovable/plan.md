# Botões contextuais + Origens cadastráveis + Configurações do CRM

## Problema

1. Botões "Novo Lead / Novo Deal" aparecem em todas as sub-abas, mesmo onde não fazem sentido (ex: Calendário, Dashboard).
2. Campo **Origem** hoje é texto livre (`<Input list>` com datalist). Sem padrão, qualquer um digita "Instagram", "instagram", "IG" e vira bagunça.
3. Não existe lugar para configurar as variáveis do CRM.

## Solução

### 1. Botões contextuais por aba (`src/pages/crm/CrmLayout.tsx`)

Mostrar botões só onde fazem sentido:

| Aba | Novo Lead | Novo Deal |
|---|---|---|
| Pipeline | sim | sim |
| Leads & Empresas | sim | não |
| Dashboard | não | não |
| Calendário | não | não |
| Configurações (nova) | não | não |

Lógica: dois booleans derivados de `currentTab`, controlam render dos botões.

### 2. Tabela de origens gerenciáveis (nova `crm_lead_sources`)

```sql
create table public.crm_lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- ex: "Instagram", "Indicação", "LinkedIn"
  slug text not null unique,    -- normalizado: "instagram"
  icon text,                    -- nome de ícone lucide (opcional)
  color text,                   -- hex/hsl para badge (opcional)
  display_order int default 0,
  is_active boolean default true,
  is_system boolean default false, -- presets não deletáveis
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

- RLS: SELECT autenticado; INSERT/UPDATE/DELETE só admin (via `has_role`).
- Trigger `updated_at`.
- Seed de presets (`is_system=true`, deletes bloqueados via trigger):
  - Instagram, LinkedIn, Indicação, Site/Formulário, WhatsApp, E-mail, Evento, Google Ads, Outbound (cold), Parceria.
- Campo `leads.source` continua `text` (sem FK rígida) — guarda o `slug`. Migração soft: leads antigos mantêm string atual; UI passa a usar select.

### 3. Origem como Select em todos os pontos

- `NewLeadDialog.tsx`: trocar `<Input list="crm-sources">` por `<Select>` populado por novo hook `useCrmLeadSources()` (só ativos). Última opção: "+ Nova origem" abre mini-form inline (apenas para admins).
- `CrmLeadDetail.tsx` (aside): mesmo `<Select>` no lugar do `<Input>`.
- Hook antigo `useDistinctLeadSources` continua existindo para os filtros (que ainda derivam de leads existentes), mas internamente passa a ler de `crm_lead_sources` (ativas) para garantir consistência.

### 4. Novo sub-módulo: Configurações do CRM

- Rota: `/crm/configuracoes` (nova aba no `CrmLayout`).
- Arquivo: `src/pages/crm/CrmSettings.tsx`.
- Layout com Tabs internas (`usePersistedState` para a aba ativa):
  - **Origens de leads** — CRUD (lista + drawer de edição). Reordenar (display_order via drag handle simples ou setas), ativar/desativar, criar nova, editar nome/cor/ícone. Presets `is_system=true` não podem ser deletados (só desativados).
  - **(placeholders prontos para crescer)**: "Status / etapas", "Motivos de descarte", "Tags" — exibidos como cards "em breve" para deixar claro o caminho de evolução, sem implementar agora.
- Acesso: apenas usuários com permissão de admin/CRM-admin (usar `has_role` ou checagem existente do projeto). Usuários sem permissão veem mensagem "Sem permissão".

### 5. Cache & integrações

- Após qualquer mutação em `crm_lead_sources`: invalidar `['crm-lead-sources']` e `['crm-leads']` (cor/label do badge muda).
- Sem impacto em Pipeline / Dashboard / Deals — origem continua sendo string no `leads.source`.

## Arquivos novos

- `supabase/migrations/<timestamp>_crm_lead_sources.sql`
- `src/pages/crm/CrmSettings.tsx`
- `src/components/crm/settings/LeadSourcesManager.tsx`
- `src/hooks/crm/useCrmLeadSources.ts` (list + create + update + delete + reorder)

## Arquivos editados

- `src/App.tsx` — rota `configuracoes`
- `src/pages/crm/CrmLayout.tsx` — botões contextuais + nova tab "Configurações"
- `src/components/crm/NewLeadDialog.tsx` — Select de origem
- `src/pages/crm/CrmLeadDetail.tsx` — Select de origem
- `src/hooks/crm/useCrmReference.ts` — `useDistinctLeadSources` lê da nova tabela

## Garantias

- Zero quebra: leads antigos com origem string livre continuam exibindo o valor; só novos cadastros usam o select.
- Filtros do Pipeline (`Origem`) continuam funcionando.
- Mobile: gestão de origens em sheet/drawer (regra de responsividade do projeto).
- Confirmações via `useConfirm()`, notificações via `toast` (sonner).
