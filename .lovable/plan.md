
# Papéis customizáveis + Configurações do CRM só para Admin

Objetivo: na seção **Contatos & Papéis** do deal o usuário poderá digitar e criar um papel novo (igual já funciona em "Setor da empresa"); e em **Configurações do CRM** o admin poderá criar, editar, ativar/desativar, reordenar e excluir essas variáveis. A aba **Configurações** ficará oculta para quem não é admin.

## 1. Banco de dados — papéis viram tabela configurável

Hoje `company_contact_roles.role` usa o enum Postgres `contact_role` (5 valores fixos), o que impede criar papéis novos pela UI. Vou migrar para uma tabela de catálogo, no mesmo padrão de `crm_lead_sources`:

- Nova tabela `crm_contact_roles` (id, name, slug único, color, display_order, is_active, is_system, timestamps).
- Seed dos 5 papéis atuais como `is_system = true`: Decisor, Usuário final, Técnico, Financeiro, Outro (preservando os slugs `decisor`, `usuario_final`, `tecnico`, `financeiro`, `outro`).
- Adicionar coluna `role_id uuid` em `company_contact_roles` referenciando `crm_contact_roles(id)`; preencher a partir do enum atual; tornar `NOT NULL`; trocar a `UNIQUE(company_person_id, role)` por `UNIQUE(company_person_id, role_id)`; manter a coluna antiga `role` por compatibilidade temporária (preenchida via trigger a partir do slug do papel selecionado, quando o slug ainda existir no enum) ou removê-la.
- RLS no padrão das outras tabelas de catálogo: SELECT para qualquer authenticated; INSERT/UPDATE/DELETE só para `has_role(auth.uid(), 'admin')`; sistema não pode ser deletado, só desativado.

> Decisão técnica: como o enum não é estendível em tempo de execução pela UI, a tabela é a única forma robusta de permitir "criar papel novo".

## 2. Hooks de papéis configuráveis

- Novo `src/hooks/crm/useCrmContactRoles.ts` no mesmo modelo de `useCrmLeadSources`: `useCrmContactRoles` (lista ativa, ordenada), `useCreateContactRole`, `useUpdateContactRole`, `useDeleteContactRole`, `useReorderContactRole`.
- Refatorar `src/hooks/crm/useCompanyContactRoles.ts` para trabalhar com `role_id` (em vez do enum) e fazer join com `crm_contact_roles` para devolver `{ id, role_id, role: { id, name, slug, color } }`.
- `src/hooks/crm/useCompanyContacts.ts`: ajustar o tipo `roles` para o novo formato com objeto de papel.

## 3. UI — criar papel inline no card do deal (Contatos & Papéis)

Refatorar `src/components/crm/CompanyContactsManager.tsx`:

- Substituir o array fixo `ALL_ROLES` por `useCrmContactRoles()`.
- Trocar o `Popover` de "+ papel" pelo padrão `ComboboxCreate` (já usado em SectorPicker), exibindo papéis disponíveis (não usados pelo contato), com filtro por digitação e ação **"Criar 'X'"** ao pressionar Enter quando não há match.
- Ao criar inline, chama `useCreateContactRole` (cor padrão da paleta, próximo `display_order`) e em seguida `useAddContactRole` no contato.
- A cor do badge passa a vir do `color` do papel (estilo inline) em vez do mapa estático `ROLE_TONE`. Fallback neutro quando vazio.
- Renomear o botão "Outro" some — agora qualquer papel customizado aparece naturalmente.

## 4. UI — Configurações do CRM (só admin)

`src/pages/crm/CrmSettings.tsx`:

- Gating: se `!isAdmin`, renderizar tela "Acesso restrito" e não mostrar tabs.
- Adicionar nova aba **"Papéis de contato"** (ativa, ao lado de "Origens de leads"). As abas "Etapas" e "Motivos de descarte" continuam como `Em breve`.
- Novo componente `src/components/crm/settings/ContactRolesManager.tsx`, idêntico em UX ao `LeadSourcesManager` (linha de criação com cor + nome, lista com reordenar ↑↓, editar nome inline no blur, trocar cor via popover, switch ativo/inativo, badge "sistema", excluir só não-sistema com `useConfirm`).

`src/pages/crm/CrmLayout.tsx`:

- Esconder a tab `configuracoes` da `TABS` quando `!isAdmin` (usar `useAuth().isAdmin`).
- Manter a rota `/crm/configuracoes` registrada, mas o `CrmSettings` já bloqueia acesso direto via URL.

## 5. Compat / dados antigos

- A migração popula `role_id` para todos os registros existentes em `company_contact_roles` mapeando enum → slug → id da seed.
- Constants `CONTACT_ROLE_LABEL` e tipo `ContactRole` em `src/types/crm.ts` e `src/constants/dealEnumLabels.ts` deixam de ser usados nos componentes; manter por ora apenas como fallback de label se algum lugar ainda referenciar (vou remover usos no caminho).

## Arquivos afetados

Novos:
- `supabase/migrations/<timestamp>_crm_contact_roles.sql`
- `src/hooks/crm/useCrmContactRoles.ts`
- `src/components/crm/settings/ContactRolesManager.tsx`

Editados:
- `src/hooks/crm/useCompanyContactRoles.ts` (usar `role_id`)
- `src/hooks/crm/useCompanyContacts.ts` (join com `crm_contact_roles`)
- `src/components/crm/CompanyContactsManager.tsx` (criar papel inline, cor dinâmica)
- `src/pages/crm/CrmSettings.tsx` (gating admin + nova aba)
- `src/pages/crm/CrmLayout.tsx` (esconder tab Configurações para não-admin)

## Fora do escopo (posso fazer depois se quiser)

- Tornar **Etapas do funil** e **Motivos de descarte** configuráveis (mesma técnica: tabela de catálogo + manager). Hoje esses ainda usam enum.
- Tornar **Tipo de projeto (v2)**, **Categoria de dor**, **Tipos/Status de dependência** configuráveis.

Posso começar pela migração e seguir até a UI numa única passada, ou prefere que eu inclua já neste mesmo trabalho a configuração de Etapas e Motivos de descarte?
