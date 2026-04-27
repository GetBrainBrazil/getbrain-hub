## Área de Usuários e Cargos (Configurações → Usuários)

Adicionar uma nova aba **"Usuários e Permissões"** dentro de `/configuracoes`, com gestão completa de membros da equipe e cargos customizáveis com níveis de acesso.

---

### 1. Modelo de Dados (migration)

Hoje o sistema tem `app_role` enum fixo (`admin`, `member`) e `user_roles (user_id, role)`. Vou estender para suportar **cargos customizáveis com permissões granulares**, sem quebrar o que já existe.

**Novas tabelas:**

- `cargos` — cargos criados pelo admin
  - `id`, `nome` (ex: "Gerente Financeiro"), `descricao`, `nivel` (1-5, ranking visual), `cor` (badge), `is_system` (bool, protege admin/member nativos), `created_at`, `updated_at`
- `cargo_permissoes` — permissões de cada cargo
  - `id`, `cargo_id`, `modulo` (financeiro, projetos, crm, dev, configuracoes, vendas, usuarios), `acao` (view, create, edit, delete, admin)
- `usuario_cargos` — vínculo usuário ↔ cargo (substitui uso direto de `user_roles` para cargos custom; mantemos `user_roles` para compatibilidade com `has_role()`)
  - `id`, `user_id`, `cargo_id`, `assigned_at`, `assigned_by`

**Extensão de `profiles`:**
- adicionar colunas: `email` (text, sincronizado de auth), `telefone` (text), `cargo_principal` (text, denormalizado para listagem rápida), `ativo` (bool default true), `ultimo_acesso` (timestamp)
- `avatar_url` já existe — usado para foto

**Funções/Triggers:**
- `has_permission(_user_id uuid, _modulo text, _acao text)` — security definer, verifica via `usuario_cargos` + `cargo_permissoes`
- `sync_profile_email()` — trigger em `auth.users` para popular `profiles.email` no signup
- Seed: cria cargos de sistema "Administrador" (todas permissões) e "Membro" (view em tudo)

**RLS:**
- `cargos`, `cargo_permissoes`, `usuario_cargos`: SELECT autenticado; INSERT/UPDATE/DELETE só `has_role(auth.uid(), 'admin')`
- `profiles`: manter SELECT autenticado; UPDATE próprio OU admin; DELETE só admin

---

### 2. Edge Functions

Criar/excluir usuário exige Admin API do Supabase (não dá pelo client). Duas funções:

- **`admin-create-user`** — recebe `{email, password, full_name, telefone, cargo_id}`, valida que o caller é admin via JWT, cria usuário com `supabase.auth.admin.createUser`, popula profile, vincula cargo.
- **`admin-delete-user`** — recebe `{user_id}`, valida admin, chama `supabase.auth.admin.deleteUser`.
- **`admin-update-user`** — atualiza email/senha de outro usuário (admin only).

Ambas com CORS, validação Zod, verificação de admin via `has_role`.

---

### 3. UI — Nova aba em Configurações

**`src/pages/Configuracoes.tsx`**: adicionar 2 novas abas → `Usuários` e `Cargos`.

**`src/components/configuracoes/UsuariosTab.tsx`** (novo):
- Header: busca + botão "Novo Usuário" (full-width no mobile)
- **Desktop**: tabela com colunas Avatar, Nome, Email, Telefone, Cargo (badge colorido), Último acesso, Status (switch ativo), Ações (editar/excluir)
- **Mobile**: cards (`md:hidden`) com avatar grande, nome, email, cargo, ações em menu dropdown
- Dialog "Novo/Editar Usuário": foto (upload pra Supabase Storage bucket `avatars`), nome completo, email, telefone (mask BR), senha (só create), cargo (select), switch ativo
- Confirm dialog para exclusão
- Bloqueio: admin não pode se auto-excluir nem se rebaixar do último cargo admin

**`src/components/configuracoes/CargosTab.tsx`** (novo):
- Lista de cargos em cards com nome, descrição, cor, contagem de usuários, badge "Sistema" (não editável)
- Botão "Novo Cargo" → dialog com nome, descrição, cor, nível, **matriz de permissões** (tabela módulos × ações com checkboxes; ex: linha "Financeiro" × colunas View/Create/Edit/Delete/Admin)
- Editar cargo: mesmo dialog. Excluir só permitido se nenhum usuário vinculado.

**`src/hooks/useUsuarios.ts` e `src/hooks/useCargos.ts`** (novos): React Query para CRUD.

**`src/hooks/usePermissions.ts`** (novo): expõe `can(modulo, acao)` baseado no cargo do usuário logado, para uso futuro em sidebar/rotas.

---

### 4. Storage

Criar bucket `avatars` (público) com policies: anyone read; insert/update só pelo dono ou admin.

---

### 5. Responsividade

Toda a UI segue o padrão do sistema (já memorizado): tabela em desktop / cards em mobile, botões 40px+, dialogs full-width em mobile, matriz de permissões com scroll horizontal em telas pequenas.

---

### Detalhes técnicos

- Módulos disponíveis: `financeiro`, `projetos`, `crm`, `dev`, `vendas`, `configuracoes`, `usuarios`, `relatorios`
- Ações: `view`, `create`, `edit`, `delete`, `admin`
- `usuario_cargos` permite múltiplos cargos por usuário (mas UI v1 só atribui 1 — facilita evolução)
- Sincronização: ao atribuir cargo "Administrador" também insere em `user_roles` com `'admin'` para manter `has_role()` funcionando em RLS legado
- Email do auth.users é replicado em `profiles.email` via trigger para evitar consultar `auth.users` no client
- A primeira execução faz seed: usuário logado vira admin (cargo "Administrador") se ninguém tiver cargo ainda

---

### Roadmap de implementação

1. Migration: tabelas, funções, triggers, seed, RLS, bucket
2. 3 edge functions admin-*
3. Hooks (`useUsuarios`, `useCargos`, `usePermissions`)
4. `UsuariosTab` + dialogs
5. `CargosTab` + matriz de permissões
6. Plug nas tabs de `Configuracoes.tsx`

Pronto para implementar?