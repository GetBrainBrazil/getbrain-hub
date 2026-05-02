# Reestruturação do módulo Leads & Empresas

## Diagnóstico do que está ruim hoje

A aba `/crm/leads` se chama "Leads & Empresas" mas é só uma lista de **leads** com 2 colunas extras de empresa coladas. Problemas:

- **Empresas não são cidadãs de primeira classe.** Não dá para listar, filtrar ou paginar empresas — só chega nelas via lead.
- **KPIs misturam contextos.** "Receita ganha" e "Clientes ativos" no topo de uma lista de leads confundem (a tela é sobre topo de funil).
- **Tabela densa demais (12 colunas)** sem hierarquia visual; mobile usa cards genéricos.
- **Filtros pobres**: só Status lead e Status empresa. Falta indústria/setor, dono, origem, tem deal/proposta/projeto, range de valor — coisas que já vivem no banco.
- **Ficha de empresa subaproveitada**: tem dados ricos (`sector_id`, `client_type`, `revenue_range`, `digital_maturity`, `logo_url`, contratos de manutenção, MRR, projetos, financeiro) que não aparecem nem na ficha nem na lista.
- **Sem integração cruzada**: não mostra MRR ativo, contratos de manutenção, último projeto, próxima atividade, ticket histórico.

## Visão final

`/crm/leads` vira um **hub "Leads & Empresas" com 2 sub-abas** controladas por `usePersistedState`:

```text
CRM › Leads & Empresas
┌──────────────────────────────────────────────────────────┐
│ [ Leads (12) ] [ Empresas (47) ]        [+ Novo Lead ▾]  │
│                                          └ Nova Empresa  │
├──────────────────────────────────────────────────────────┤
│ KPIs contextuais (mudam conforme sub-aba)                │
│ Toolbar contextual (filtros, busca, view toggle)         │
│ Conteúdo (tabela densa | kanban | grid de empresas)      │
└──────────────────────────────────────────────────────────┘
```

Mesmo padrão visual usado em `CrmPipeline` (chips de filtro removíveis, scope toggle, segmented controls, busca com clear).

---

## Sub-aba 1 — Leads (topo de funil)

**KPIs (5 cards, focados em funil):**
1. Leads abertos (novo + agendada + feita)
2. Triagens nesta semana (count com base em `triagem_scheduled_at`)
3. Taxa de conversão lead→deal (período filtrado)
4. Valor estimado em pipeline de leads
5. Leads parados >14 dias sem atividade (atenção)

KPIs respondem aos filtros ativos. Quando há seleção, alternam para "métricas da seleção" (como hoje, mas mais enxutas: Selecionados / Valor / Conversão).

**Toolbar (mesmo padrão do Pipeline):**
- Busca global (code, título, empresa, contato, owner)
- `MultiFilter`: Status lead, Status empresa, Origem, Dono, Indústria/Setor
- Range de valor estimado
- Scope toggle: **Em trilha** (novo+agendada+feita) | **Tudo**
- View toggle: **Tabela** | **Kanban**
- Chips removíveis dos filtros ativos + "Limpar tudo"
- `+ Novo Lead`

**Tabela (desktop) — densidade reduzida, hierarquia clara:**

| Sel | Code | Lead (título + empresa) | Status | Origem | Valor | Próx. ação | Dono | Idade |

- Coluna "Lead" combina título (primário) + empresa em chip clicável (secundário) = remove 2 colunas redundantes.
- "Próx. ação" mostra triagem agendada ou última atividade com cor (vermelho se atrasado).
- "Idade" em dias desde criação, com cor escalonada.
- Linhas zebradas, hover destacado, clique abre ficha.
- Colunas opcionais (Receita ganha, Deals) viram um menu "Colunas" (popover de visibilidade salvo em `usePersistedState`).

**Kanban**: mantém o atual mas com cabeçalho mostrando soma de valor por coluna (igual aos headers do Pipeline) e card mais clean.

**Mobile**: cards já existem; refinar com chip de empresa, status colorido, próxima ação visível.

**Bulk actions** (já existe): manter, mas mover para uma barra fixa no rodapé em mobile (bottom sheet pattern do sistema).

---

## Sub-aba 2 — Empresas (relacionamento)

Lista nova, focada em **gestão de carteira de clientes**.

**KPIs (5 cards, focados em base):**
1. Empresas total / por status
2. Clientes ativos (`relationship_status='active_client'`)
3. MRR ativo total (soma de contratos ativos)
4. Receita ganha YTD (deals ganhos no ano)
5. Empresas sem atividade > 60 dias

**Toolbar:**
- Busca (nome, CNPJ, indústria)
- `MultiFilter`: Status relacionamento, Setor, Indústria, Porte (`employee_count_range`), Tipo de cliente, Dono (último deal/projeto)
- Toggle: **Ativos** | **Tudo**
- View toggle: **Tabela** | **Cards** (grid)
- `+ Nova Empresa`

**Tabela:**

| Empresa (logo + razão/fantasia) | Status | Setor/Indústria | Leads ativos | Deals ativos | MRR | Receita ganha | Última atividade |

Coluna "Empresa" mostra logo (do `logo_url`), trade_name primário, legal_name secundário. Status com badge colorido.

**View Cards** (grid 3-col desktop / 1-col mobile):
- Logo + nome
- Badge de status
- Mini-stats: Leads ativos · Deals · MRR
- Última atividade
- Footer: setor + porte

**Mobile**: cards otimizados com mesma info.

---

## Ficha de Empresa enriquecida (`/crm/empresas/:id`)

Hoje a ficha existe mas é minimalista. Refatorar para usar dados que já temos:

**Header novo:**
- Logo + nome + status + setor + porte + website + LinkedIn (chips)
- Strip de stats: Leads ativos · Deals ativos · Pipeline · MRR ativo · Receita ganha · Projetos ativos

**Tabs:**
- **Visão Geral**: timeline condensada (último lead, último deal, último projeto, último pagamento, próxima atividade) + cards-resumo
- **Leads** (lista + botão Novo Lead pré-preenchendo a empresa)
- **Deals** (lista + botão Novo Deal)
- **Projetos** (lista, link para `/projetos/:id`)
- **Contratos & Financeiro** (NOVA): contratos de manutenção ativos com MRR, próximas faturas a receber (`movimentacoes` com `cliente_id` matching CNPJ ou `company_id`), histórico de pagamentos
- **Contatos** (gerenciar pessoas vinculadas via `company_people`)
- **Atividades** (já existe)
- **Notas** (já existe)

**Sidebar direita** (existe): adicionar Setor (combobox de `sectors`), Tipo de cliente, Faixa de receita, Maturidade digital, upload de Logo.

---

## Detalhes técnicos

**Roteamento (em `App.tsx` / `CrmLayout.tsx`):**
- `/crm/leads` continua sendo a rota; renderiza um wrapper `LeadsAndCompanies` com sub-abas `?view=leads|empresas` (querystring + `usePersistedState` fallback).
- `/crm/empresas/:id` mantida (já existe). Adicionar redirect `/crm/empresas` → `/crm/leads?view=empresas`.

**Novos arquivos:**
- `src/pages/crm/CrmLeadsAndCompanies.tsx` — wrapper com tabs
- `src/pages/crm/leads/LeadsView.tsx` — extrai todo o conteúdo atual de `CrmLeads.tsx` enxugado
- `src/pages/crm/leads/CompaniesView.tsx` — nova lista de empresas
- `src/components/crm/LeadsTable.tsx` — tabela densa com seletor de colunas
- `src/components/crm/CompaniesTable.tsx` + `CompaniesGrid.tsx` + `CompanyCard.tsx`
- `src/components/crm/CompanyContractsPanel.tsx` — financeiro/contratos na ficha
- `src/components/crm/ColumnVisibilityMenu.tsx` — controle de colunas reutilizável

**Hooks novos / estendidos (em `useCrmDetails.ts`):**
- `useAllCompaniesEnriched()` — junta `companies` + `useAllCompaniesAggregates` + último activity + contagem de projetos + MRR ativo (de `contratos_manutencao` ou cálculo similar) numa só query memo'd.
- `useCompanyMrr(id)` / `useCompanyFinance(id)` — busca contratos ativos e movimentações pendentes da empresa.
- `useLastActivityByEntity(type, ids[])` — bulk para popular a coluna "Última atividade" sem N+1.

**Reuso:**
- `MultiFilter`, `SearchBox`, `FilterChip`, `ValueRangeFilter` de `CrmFilters.tsx` (já reformulados na última iteração).
- Padrão de scope toggle (segmented com ícones) idêntico ao Pipeline.
- `usePersistedState` para view, scope, filtros, colunas visíveis.
- `useConfirm` para exclusões; `toast` (sonner) para feedback.
- `invalidateCrmCaches` para mutações.

**Performance:**
- Manter `useAllLeads` + `useAllCompaniesAggregates` (uma query agregada). Paginação client-side com filtros (volumes esperados <2k).
- Queries de "última atividade" agregadas em uma só por sub-aba.

**Responsividade:**
- Mobile-first: tabela vira cards <md, kanban com snap horizontal, filtros em sheet, ações bulk em barra fixa inferior.

**Sem mudança de schema** — tudo é UI/composição em cima das tabelas existentes (`leads`, `companies`, `deals`, `projects`, `deal_activities`, `contratos_manutencao`, `movimentacoes`, `sectors`, `company_people`).

---

## Arquivos a editar / criar

| Ação | Arquivo |
|---|---|
| Criar | `src/pages/crm/CrmLeadsAndCompanies.tsx` |
| Criar | `src/pages/crm/leads/LeadsView.tsx` |
| Criar | `src/pages/crm/leads/CompaniesView.tsx` |
| Criar | `src/components/crm/LeadsTable.tsx` |
| Criar | `src/components/crm/CompaniesTable.tsx` |
| Criar | `src/components/crm/CompaniesGrid.tsx` |
| Criar | `src/components/crm/CompanyCard.tsx` |
| Criar | `src/components/crm/CompanyContractsPanel.tsx` |
| Criar | `src/components/crm/ColumnVisibilityMenu.tsx` |
| Editar | `src/pages/crm/CrmLeads.tsx` → simplifica para reexportar wrapper |
| Editar | `src/pages/crm/CrmCompanyDetail.tsx` (header rico, novas tabs, financeiro) |
| Editar | `src/hooks/crm/useCrmDetails.ts` (novos hooks de enriquecimento) |
| Editar | `src/App.tsx` (rota `/crm/empresas` redirect) |

## Fora de escopo (mantido como está)

- Pipeline de Deals (não mexer).
- Schema de banco.
- Conversão lead→deal (continua funcionando).
- Auth/permissões.
