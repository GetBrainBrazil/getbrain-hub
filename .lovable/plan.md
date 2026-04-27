## Reorganização: Admin no dropdown do perfil

A área "Configurações" sai da sidebar. O acesso passa a ser pelo **menu do avatar (TopBar)**, com 3 itens: **Meu Perfil**, **Admin**, **Sair** (mantendo "Ver como…" como placeholder visual). Internamente unificamos tudo na nova rota `/admin` com 4 abas (Usuários, Permissões, Logs) e uma rota separada `/perfil` (e `/admin/usuarios/:id`) que reproduz exatamente o layout dos prints — header com avatar grande + sub-tabs (Dados Pessoais, Endereço & Emergência, Contratos, Senha) e zona de perigo.

A identidade visual atual (serif para títulos, navy `--primary` 222 84% 11%, ciano `--accent` 187 82% 55%) é preservada — apenas reaplicada nos novos componentes.

### Estrutura de rotas

```text
/perfil                       → ficha do usuário logado (4 sub-tabs)
/admin                        → redireciona para /admin/usuarios
/admin/usuarios               → lista (replica print 84)
/admin/usuarios/:id           → ficha completa (replicas prints 85-88)
/admin/permissoes             → matriz de permissões (replica prints 89-90)
/admin/logs                   → auditoria (replica print 91)
```

A rota antiga `/configuracoes` é redirecionada para `/admin/usuarios` (mantém compatibilidade) e o item da sidebar é removido.

### Mudanças no banco (migrations)

1. **Estender `profiles**` com campos pessoais e de RH dos prints:
  `cep, pais, endereco, numero, complemento, bairro, cidade, estado, contato_emergencia_nome, contato_emergencia_telefone, plano_saude`.
2. **Nova tabela `usuario_contratos**` (`id, user_id, tipo, cargo, data_inicio, data_fim, salario, observacoes, anexo_url, created_at`) com RLS: dono lê/escreve o próprio; admin lê/escreve todos.
3. **Nova tabela `audit_logs**` (`id, user_id, user_nome, acao, modulo, tabela, registro_id, resumo, metadata jsonb, ip, user_agent, created_at`). RLS: insert por qualquer autenticado (edge function), select apenas admin.
4. **Trigger de login**: registrar evento `Login` em `audit_logs` via edge function chamada no `signIn` (não há trigger nativo confiável em `auth.users` para esse caso; faremos pelo cliente após login bem-sucedido).
  &nbsp;

### Mudanças de UI

**TopBar** (`src/components/TopBar.tsx`)

- Dropdown do avatar passa a mostrar: nome + email no topo, depois itens **Meu Perfil** (`/perfil`), **Admin** (`/admin/usuarios`, visível só se `has_role admin`), **Ver como…** (submenu placeholder com lista de cargos para impersonation visual futura), separator, **Sair**.

**AppSidebar** (`src/components/AppSidebar.tsx`)

- Remove o item "Configurações" da navegação principal.

**Nova rota wrapper `/admin**` (`src/pages/admin/AdminLayout.tsx`)

- Header com seta voltar + título serif "Admin" + subtítulo "Usuários, permissões, agência e logs".
- Tabs: Usuários | Permissões | Agência | Logs (persistido via `usePersistedState`).
- Renderiza `<Outlet/>` baseado na rota.

`**/admin/usuarios**` (`AdminUsuariosList.tsx`)

- Botão `+ Novo Usuário` (navy) abre `UsuarioDialog` existente.
- Tabela: Foto | Nome | E-mail | Celular | Função (badge colorida por cargo) → linha inteira clicável vai para `/admin/usuarios/:id`.
- Mobile: cards.

`**/admin/usuarios/:id` e `/perfil**` (`UsuarioFichaPage.tsx`)

- Header card grande: avatar 80px com botão câmera (upload), nome serif, email, badge cargo, texto "JPG ou PNG. Máx 2MB.".
- Sub-tabs (`usePersistedState`): **Dados Pessoais**, **Endereço & Emergência**, **Contratos**, **Senha**.
  - Dados Pessoais: nome completo, e-mail (admin pode editar; usuário comum não), celular, função (select de cargos — só admin edita).
  - Endereço & Emergência: CEP (busca ViaCEP via fetch), país, endereço, número, complemento, bairro, cidade, estado + nome/telefone emergência + plano de saúde.
  - Contratos: lista de `usuario_contratos` + diálogo "Novo Contrato".
  - Senha: nova senha + confirmar (admin altera de outros via edge `admin-update-user`; o próprio usuário usa `supabase.auth.updateUser`).
- Card "Zona de perigo" com botão "Excluir usuário" (oculto para o próprio usuário e quando único admin) — chama `admin-delete-user`.
- Em `/perfil`: a aba **Função** fica em modo somente-leitura e a Zona de Perigo some.

`**/admin/permissoes**` (`AdminPermissoesPage.tsx`)

- Card "Matriz de Permissões": tabela com coluna "Página" + uma coluna por cargo + ✓ / — / "Editar" (abre `CargoDialog` existente, agora ampliado para receber a página específica e marcar/desmarcar todas as ações).
- Card "Permissões de Funcionalidades": linhas para `aba_milhas_ficha_cliente` e `dados_acesso_milhas` (extensão de `cargo_permissoes` com `modulo='funcionalidade'`, ação como key).
- Resumo inferior: 4 cards (um por cargo) listando páginas habilitadas (ativas em navy, desabilitadas em cinza claro) + contador "X/Y".

`**/admin/agencia**` (`AdminAgenciaPage.tsx`)

- Form simples: razão social, CNPJ, logo upload, endereço, telefone, e-mail, IATA — salvo em nova `tenant_settings` (jsonb única linha).

`**/admin/logs**` (`AdminLogsPage.tsx`)

- Filtros: busca textual, select usuário, select tabela/módulo, select ação, seletor de datas (presets via `usePersistedState`).
- Tabela ordenável: Data/Hora | Usuário | Ação (badge) | Módulo | Resumo. Paginação 50/pg.
- Logs gravados por:
  - Login (chamada após `signInWithPassword`).
  - Edge functions `admin-create-user` / `admin-update-user` / `admin-delete-user` (já passam pelo backend — adicionar insert em `audit_logs`).
  - Hook utilitário `logAction(acao, modulo, resumo, metadata?)` chamado em pontos chave (criação/edição/exclusão de cargo, usuário, contrato).

### Componentes / hooks novos

```text
src/pages/admin/AdminLayout.tsx
src/pages/admin/AdminUsuariosList.tsx
src/pages/admin/UsuarioFichaPage.tsx        (compartilhada com /perfil)
src/pages/admin/AdminPermissoesPage.tsx
src/pages/admin/AdminAgenciaPage.tsx
src/pages/admin/AdminLogsPage.tsx
src/components/admin/UserHeaderCard.tsx
src/components/admin/DangerZoneCard.tsx
src/components/admin/PermissionsMatrix.tsx
src/components/admin/PermissionsSummaryCards.tsx
src/components/admin/NovoContratoDialog.tsx
src/hooks/useUsuarioFicha.ts
src/hooks/useContratos.ts
src/hooks/useAuditLogs.ts
src/hooks/useAgencia.ts
src/hooks/useLogAction.ts
src/lib/cep.ts                              (helper ViaCEP)
```

### Preservação / remoção

- `Configuracoes.tsx` antigo é **removido**; aba "Minha Conta" desaparece (substituída por `/perfil`).
- `MeiosPagamentoTab` é movida para dentro de **Configurações Financeiras** (`/financeiro/configuracoes`) como nova aba, já que é tema financeiro — assim nada se perde.
- `UsuariosTab` e `CargosTab` existentes são reaproveitados internamente pela nova `/admin` (refatorados para o visual exato dos prints).
- Edge functions `admin-create-user/update/delete` recebem inserts em `audit_logs` (sem mudança de contrato).

### Ordem de execução

1. Migration: estender `profiles`, criar `usuario_contratos`, `audit_logs`, `tenant_settings`; pré-popular permissões.
2. Edge functions: ajustar 3 admin-* para gravar log + criar `admin-log-action` simples (insert seguro).
3. TopBar: novo dropdown.
4. Sidebar: remover item Configurações.
5. Rotas em `App.tsx`: adicionar `/perfil`, `/admin/*`; redirect `/configuracoes` → `/admin/usuarios`.
6. Páginas e componentes novos.
7. Mover `MeiosPagamentoTab` para Configurações Financeiras.
8. QA visual em desktop e mobile.

Tudo permanece responsivo (regra de memória) — tabelas viram cards no mobile, sub-tabs com `overflow-x-auto`.