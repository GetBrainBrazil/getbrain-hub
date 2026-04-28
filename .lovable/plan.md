## O que vamos resolver

Hoje:

- **CRM** (`CompanyContactsManager`): cria contato com nome + email + telefone + cargo, mas **só mostra nome/email/telefone em texto pequeno** e não permite editar inline. Foco está nos "papéis" (badges).
- **Projetos** (`CardContatos`): UI rica com avatar, edição inline, telefone formatado, mailto/tel, marcar principal, combobox de cargo "type-to-create", remover do projeto.
- Ambos gravam na **mesma tabela** (`people` + `company_people`), então um contato criado no CRM já aparece em Projetos e vice-versa — só falta paridade de UI.

Quando um deal vira "ganho", `DealWonDialog` chama `close_deal_as_won` que cria o projeto reaproveitando empresa + descoberta + dependências + proposta. Os contatos da empresa **já viajam automaticamente** porque estão vinculados via `company_people`. Então a unificação visual já garante a integração.

Hoje também temos **catálogos espalhados**:

- `/financeiro/configuracoes` → Contas, Categorias, Centros, Clientes, Fornecedores, Colaboradores, Meios pagamento
- `/crm/configuracoes` → Origens de leads, Papéis de contato (Etapas e Motivos: placeholder)
- `/configuracoes/setores` → Setores das empresas
- `/admin/*` → Usuários, Cargos, Permissões, Logs

A proposta é criar uma **Central de Configurações Gerais** que agrupe tudo que é compartilhado entre módulos, mantendo as configs internas só para o que é exclusivo do módulo.

---

## Etapa 1 — Paridade de contatos CRM ↔ Projetos

Substituir o `CompanyContactsManager` do CRM por um componente único que tenha tudo do `CardContatos` **mais** os papéis (badges) que o CRM já tem.

Novo componente: `src/components/shared/CompanyContactsPanel.tsx` (usado nos dois módulos).

Funcionalidades:

- Avatar com iniciais
- Nome + cargo na empresa (combobox "type-to-create" com cargos já usados na base)
- Email com `mailto:`
- Telefone com máscara `(11) 99999-9999` e `tel:`
- Botão estrela: marcar como contato principal da empresa
- Editar inline (não abre dialog)
- Remover do projeto/empresa (soft delete via `ended_at`)
- **+ Papéis comerciais** (badges coloridos) — só aparecem no contexto CRM (prop `showRoles`)
- Cria papéis novos via `useCreateContactRole` (já existe)

Reaproveitar hooks existentes:

- `useProjectContacts` / `useCreateProjectContact` / `useUpdateProjectContact` / `useSetPrimaryContact` / `useUnlinkProjectContact`
- `useCompanyContactsWithRoles` (CRM, traz papéis)
- Unificar em um único hook `useCompanyContacts(companyId, { withRoles })` que devolve tudo.

Substituir uso em:

- `src/components/projetos/CardContatos.tsx` → vira wrapper passando `showRoles={false}`
- `src/components/crm/CompanyContactsManager.tsx` → vira wrapper passando `showRoles={true}`

Resultado: editar email/telefone/cargo no card do deal já reflete na ficha do projeto (mesma `person` row).

---

## Etapa 2 — Central de Configurações Gerais do sistema

Criar nova rota `**/configuracoes**` (admin only) com layout de abas agrupadas por domínio. Mover catálogos compartilhados para lá.

Estrutura proposta:

```text
/configuracoes
├─ Pessoas & Empresas
│   ├─ Setores de empresa          (← migra de /configuracoes/setores)
│   ├─ Papéis de contato           (← migra de /crm/configuracoes)
│   ├─ Cargos internos             (← migra de /admin)
│   └─ Origens de lead             (← migra de /crm/configuracoes)
├─ Financeiro
│   ├─ Contas bancárias            (← migra de /financeiro/configuracoes)
│   ├─ Categorias                  (← idem)
│   ├─ Centros de custo            (← idem)
│   └─ Meios de pagamento          (← idem)
├─ Cadastros operacionais
│   ├─ Clientes                    (← /financeiro/configuracoes — usado por todos)
│   ├─ Fornecedores                (← idem)
│   └─ Colaboradores               (← idem)
└─ Sistema
    ├─ Usuários                    (← /admin/usuarios)
    ├─ Permissões                  (← /admin/permissoes)
    └─ Logs                        (← /admin/logs)
```

Cada aba reaproveita os componentes que já existem (`ContasBancariasTab`, `CategoriasTab`, `LeadSourcesManager`, `ContactRolesManager`, etc.) — não vamos reescrever conteúdo, só centralizar a navegação.

Sidebar:

- "Configurações" no menu principal aponta para `/configuracoes` com sub-itens das 4 seções.
- Remove "Configurações" de dentro de Financeiro e CRM (vira link "Ver em Configurações Gerais").
- Mantém `/admin/*` redirecionando para a aba correspondente em `/configuracoes` por compatibilidade.

Acesso:

- Toda a `/configuracoes` exige `isAdmin` (mesmo guard que já existe no `CrmSettings`).
- Cada aba pode ter granularidade adicional via `useCargos` no futuro.

---

## Etapa 3 — Mapa de variáveis interligadas (referência)

Documentar (em `mem://features/shared-catalogs`) o que cada catálogo alimenta, para guiar futuras decisões:


| Catálogo            | Tabela              | Usado em                                                              |
| ------------------- | ------------------- | --------------------------------------------------------------------- |
| Setores empresa     | `sectors`           | CRM (empresa), Projetos (cliente)                                     |
| Papéis de contato   | `crm_contact_roles` | CRM (deal contacts), futuro Projetos                                  |
| Origens de lead     | `crm_lead_sources`  | Leads, Deals                                                          |
| Cargos internos     | `cargos`            | Usuários do sistema                                                   |
| Categorias finance. | `categorias`        | Movimentações, Recorrências, Orçamentos                               |
| Centros de custo    | `centros_custo`     | Movimentações, Projetos                                               |
| Contas bancárias    | `contas_bancarias`  | Movimentações, Extratos, Recorrências                                 |
| Meios de pagamento  | `meios_pagamento`   | Movimentações, Recorrências                                           |
| Clientes            | `clientes`          | Financeiro (legacy). **Empresas CRM** (`companies`) é o cadastro novo |
| Fornecedores        | `fornecedores`      | Movimentações, Contratos                                              |
| Colaboradores       | `colaboradores`     | Folha, Movimentações, Projetos (alocação)                             |


Observação importante: existem **dois cadastros paralelos de empresas/pessoas**:

- `clientes` + `colaboradores` (financeiro legado)
- `companies` + `people` (CRM/Projetos novo)

Não vou unificar isso agora (é uma refatoração maior). Apenas registro como dívida técnica para próxima rodada.

---

## Detalhes técnicos

**Arquivos novos:**

- `src/components/shared/CompanyContactsPanel.tsx` — componente unificado
- `src/hooks/shared/useCompanyContacts.ts` — hook unificado (substitui os dois antigos)
- `src/pages/configuracoes/ConfiguracoesGerais.tsx` — layout de abas
- `mem://features/shared-catalogs` — mapa de variáveis

**Arquivos editados:**

- `src/components/projetos/CardContatos.tsx` — vira wrapper fino
- `src/components/crm/CompanyContactsManager.tsx` — vira wrapper fino
- `src/App.tsx` — registra rota `/configuracoes/*` com sub-rotas; redireciona `/admin/usuarios|permissoes|logs` e `/configuracoes/setores` e `/financeiro/configuracoes` e `/crm/configuracoes` para a nova
- `src/components/AppSidebar.tsx` — reorganiza entrada "Configurações"
- `src/pages/crm/CrmLayout.tsx` — remove aba "Configurações" interna (ou deixa link "abrir em Configurações Gerais")
- `src/pages/crm/CrmSettings.tsx` — vira deprecated/redirect

**Sem mudanças de schema** — tudo já está nas tabelas existentes.

**Sem quebra de dados** — só consolidação de UI.

---

## Critérios de aceite

1. Adicionar contato no card do deal cria o registro com nome + email + telefone + cargo, e ele aparece igual na aba Contatos do projeto correspondente.
2. Editar email/telefone em qualquer um dos lados reflete no outro instantaneamente.
3. Marcar contato principal funciona dos dois lados.
4. Papéis de contato (badges) continuam aparecendo só no CRM.
5. Existe rota `/configuracoes` (admin-only) com todas as abas atuais agrupadas em 4 seções.
6. Rotas antigas (`/configuracoes/setores`, `/financeiro/configuracoes`, `/crm/configuracoes`, `/admin/usuarios`, `/admin/permissoes`, `/admin/logs`) continuam funcionando via redirect.
7. Sidebar mostra "Configurações" como item raiz; CRM e Financeiro não têm mais sub-aba de configuração interna.  
  
  
  
No final faz um resumo de tudo que foi criado, editado etc... 
8. &nbsp;