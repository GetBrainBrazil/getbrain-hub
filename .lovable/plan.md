# Unificação total das Configurações

## Mapeamento — situação atual

```text
JÁ NO CENTRO (/configuracoes)         AINDA FORA (precisam migrar)
─────────────────────────────         ─────────────────────────────
Pessoas & Empresas                    /crm/configuracoes
 • Setores                             • Origens de leads ⟵ duplica
 • Papéis de Contato                   • Papéis de contato ⟵ duplica
 • Origens de Lead                     • (placeholders: Etapas, Motivos)
 • Categorias de Dor
 • Tipos de Projeto                   /admin/* (AdminLayout)
 • Cargos Internos                     • Usuários ⟵ já espelhado em /sistema
                                       • Permissões ⟵ já espelhado em /sistema
Financeiro                             • Auditoria ⟵ FORA
 • Contas, Categorias, Centros         • IA das Propostas ⟵ FORA
 • Clientes, Fornecedores,
   Colaboradores                      Páginas órfãs (sem rota direta, sujeira)
                                       • src/pages/ConfiguracoesFinanceiras.tsx
Sistema                                • src/pages/admin/AdminAgenciaPage.tsx
 • Usuários
 • Permissões
 • (Logs → redirect)
```

**Conclusão**: faltam migrar **4 páginas reais** (Auditoria, IA das Propostas — e os 2 placeholders ainda úteis do CRM passam a viver no centro). Tudo o resto já está duplicado e só precisa virar redirect.

## Estrutura final do `/configuracoes`

```text
Configurações Gerais
├── Pessoas & Empresas
│   • Setores · Papéis de Contato · Origens de Lead
│   • Categorias de Dor · Tipos de Projeto · Cargos Internos
├── CRM                              ← seção nova
│   • Etapas do funil (placeholder, mantido vivo p/ futuro)
│   • Motivos de descarte (placeholder)
├── Financeiro
│   • Contas · Categorias · Centros · Clientes · Fornecedores · Colaboradores
├── Sistema
│   • Usuários · Permissões · Auditoria · Logs (redir)
└── Integrações                      ← seção nova
    • IA das Propostas
```

A seção **CRM** entra mesmo só com placeholders (Etapas / Motivos de descarte) por dois motivos: (1) deixa claro que aquele lugar passa a ser o canal único, e (2) preserva o trabalho que já existia na CrmSettings sem ressuscitar duplicatas reais.

## Mudanças em código

### 1. Migrar páginas para o centro

- **Mover** `AdminAuditoriaPage.tsx` para a sub-aba `Sistema › Auditoria` (já existe rota `sistema/auditoria`, basta aparecer no menu).
- **Mover** `AdminPropostasIaPage.tsx` para nova sub-aba `Integrações › IA das Propostas`.
- Adicionar seção **Integrações** e seção **CRM** no `SECTIONS` do `ConfiguracoesLayout.tsx`.
- Criar sub-páginas placeholder consistentes com o padrão atual (mesma estética dos outros tabs do Centro).

### 2. Eliminar `/crm/configuracoes`

- Remover a aba "Configurações" de `CrmLayout.tsx`.
- Substituir a rota `crm/configuracoes` por `<Navigate to="/configuracoes/pessoas/origens" replace />`.
- Apagar `src/pages/crm/CrmSettings.tsx`.
- Os componentes `LeadSourcesManager` e `ContactRolesManager` (em `src/components/crm/settings/`) **continuam** sendo usados pelas páginas do centro — não mexer.

### 3. Eliminar `/admin/*` shell

- Apagar `AdminLayout.tsx` (o shell de tabs duplicado).
- Apagar `AdminAgenciaPage.tsx` (já órfã, não tem mais rota).
- Substituir as rotas filhas do `/admin` por redirects para o centro:
  - `/admin` → `/configuracoes/sistema/usuarios`
  - `/admin/usuarios` → `/configuracoes/sistema/usuarios`
  - `/admin/permissoes` → `/configuracoes/sistema/permissoes`
  - `/admin/auditoria` → `/configuracoes/sistema/auditoria`
  - `/admin/propostas-ia` → `/configuracoes/integracoes/ia-propostas`
- **Manter** `/admin/usuarios/:id` (ficha individual com `UsuarioFichaPage`) — é tela cheia, fora do shell, não tem equivalente no centro. Atualizar o link "voltar" dela para `/configuracoes/sistema/usuarios`.

### 4. Eliminar página antiga `ConfiguracoesFinanceiras.tsx`

- Remover o arquivo `src/pages/ConfiguracoesFinanceiras.tsx` e seu import em `App.tsx`. A rota `/financeiro/configuracoes` continua existindo só como redirect e não precisa do componente.
- A pasta `src/components/config-financeiras/` é usada pelas páginas novas (`FinContasPage`, etc.)? Verificar — se for, manter; se não, apagar. (No plano fica como item de limpeza condicional.)

### 5. Atualizar links cruzados

- `TopBar.tsx`: dropdown do avatar → "Admin" passa a apontar para `/configuracoes/sistema/usuarios` (rótulo pode virar "Configurações").
- Breadcrumbs/títulos em `TopBar.tsx` (linhas 45-47, 82-86): atualizar mapeamento `/admin/*` → labels do Centro.
- `RouteTracker.getAdminExitRoute()` (referenciado pelo AdminLayout que vai sumir): conferir se ainda é usado em outro lugar; se não, deletar.
- `AppSidebar.tsx`: o item "Configurações" já existe — adicionar 2 sub-itens novos ("CRM", "Integrações") e remover qualquer link para `/admin`/`/crm/configuracoes` se houver.

### 6. Permissão

- O Centro já é admin-only (`AdminRoute` + `useAuth().isAdmin`). Tudo migrado herda isso automaticamente.

## Arquivos tocados

**Editados**

- `src/App.tsx` — novas rotas `integracoes/ia-propostas`, `crm/etapas`, `crm/motivos-descarte`; redirects do `/admin/*`; remoção de imports mortos.
- `src/pages/configuracoes/ConfiguracoesLayout.tsx` — adicionar seções CRM + Integrações; ícones.
- `src/pages/crm/CrmLayout.tsx` — remover aba Configurações.
- `src/components/TopBar.tsx` — labels e link do dropdown.
- `src/components/AppSidebar.tsx` — sub-itens novos.
- `src/pages/admin/UsuarioFichaPage.tsx` — corrigir `navigate("/admin/usuarios")` → `/configuracoes/sistema/usuarios`.

**Criados**

- `src/pages/configuracoes/integracoes/IaPropostasPage.tsx` — wrapper que reusa todo o conteúdo de `AdminPropostasIaPage` (move o JSX para cá; o componente original some).
- `src/pages/configuracoes/crm/EtapasFunilPage.tsx` — placeholder estilizado.
- `src/pages/configuracoes/crm/MotivosDescartePage.tsx` — placeholder estilizado.

**Apagados**

- `src/pages/crm/CrmSettings.tsx`
- `src/pages/admin/AdminLayout.tsx`
- `src/pages/admin/AdminAgenciaPage.tsx`
- `src/pages/admin/AdminPropostasIaPage.tsx` (conteúdo migrado para `IaPropostasPage`)
- `src/pages/ConfiguracoesFinanceiras.tsx`

**Mantidos com rota nova**

- `AdminAuditoriaPage.tsx`, `AdminPermissoesPage.tsx`, `AdminUsuariosList.tsx`, `UsuarioFichaPage.tsx` — código reaproveitado dentro do Centro; arquivos ficam no `src/pages/admin/` por enquanto pra reduzir churn de imports (renomear é cosmético, fica fora do escopo).

## Detalhes técnicos

- `usePersistedState` em `CrmSettings` (`crm-settings-tab`) deixa de ser usado — sem migration de dados, é só localStorage.
- Não há mudança de banco.
- Memória `mem://features/admin-area` precisa ser atualizada após a execução: a área `/admin/*` deixa de existir como shell; só a ficha `/admin/usuarios/:id` permanece como rota tela-cheia.
- Atualizar `mem://index.md` se mudar a estrutura conhecida.

## O que você ganha

1. **Um lugar único** (`/configuracoes`) para qualquer ajuste de catálogo, usuário, permissão, auditoria ou integração.
2. Fim das duplicatas (Origens/Papéis em CRM **e** em Pessoas, Usuários em /admin **e** em /sistema).
3. Sidebar mais enxuta — sem "Admin" escondido no avatar duplicando o que está em "Configurações".
4. Estrutura preparada pra crescer (seção **Integrações** já existe pra próximas: webhooks, Stripe, etc.).  
  
  
Vamos começar a migrar então, monte um planejamneto de etapas para migrar um módulo de cada vez e apagando o lugar antigo onde ele ficava. caso o módulo de config esteja muito simples, desenvolva e deixe ele com controle nível micro para o módulo que ele representa.