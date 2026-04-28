
# Merge limpo: Empresas → Leads

## Decisão de produto
Para o seu negócio, **toda empresa é um lead** (1:1, sem reuso histórico). Então a separação Empresas × Leads só duplica trabalho. Vamos:

- Eliminar a **aba Empresas** do menu superior do CRM
- Manter Leads como a **única lista** de "empresas que estão na nossa base"
- A linha do Lead passa a mostrar dados que hoje só aparecem em Empresa (indústria, porte, site, status de relacionamento, receita ganha, # deals)
- A página de detalhe da empresa (`/crm/empresas/:id`) continua existindo, mas vira **rota interna** — alcançada via "Ver ficha da empresa" dentro do Lead. Não some, porque outros módulos (Pipeline, Lead detail, Projetos) já apontam pra ela.
- A tabela `companies` no banco **não muda** — continua sendo o registro mestre. Só some da navegação.

Isso preserva: schema, dados, hooks, integrações com Projetos / Deals / Orçamentos / Vendas / Financeiro.

## O que muda na navegação

```text
Antes:                            Depois:
CRM                               CRM
├─ Dashboard                      ├─ Dashboard
├─ Pipeline                       ├─ Pipeline
├─ Leads                          ├─ Leads & Empresas   ← rota /crm/leads
├─ Empresas       ← removido      └─ Calendário
└─ Calendário
```

Sidebar: remover o item "Empresas" (`src/components/AppSidebar.tsx`).
Tabs do CRM: remover `{ value: 'empresas', label: 'Empresas' }` (`src/pages/crm/CrmLayout.tsx`).
Rota `/crm/empresas` (lista) é removida do `App.tsx`. Rota `/crm/empresas/:id` (detalhe) **fica**.

## O que muda na tela de Leads (`/crm/leads`)

Tabela ganha colunas vindas de Empresa, ordenadas por relevância:

| Code | Título do Lead | Empresa | **Status empresa** | **Indústria** | **Porte** | Status lead | Origem | Valor | **Deals** | **Receita ganha** | Dono | Criação |

- **Status empresa**: badge `prospect / lead / active_client / former_client / lost` — clicável para filtrar
- **Deals / Receita ganha**: agregados da empresa (já existem em `useCompanyRowStats`)
- Coluna "Empresa" vira link "Ver ficha →" abrindo `/crm/empresas/:id` em drawer ou nova aba

Filtros adicionados ao topo:
- Status do lead (já existe)
- **Status do relacionamento da empresa** (novo — reaproveita filtro de Empresas)
- **Indústria** e **Porte** (novos — vindos de Empresas)

KPIs do topo passam a mostrar (sem seleção):
- Leads abertos | Taxa conversão | Valor pipeline | **Clientes ativos** | **Receita ganha total**

Com seleção (já implementado), continua: Selecionados | Conversão | Valor.

## Criação de Lead

Ao criar um Lead novo (`NewLeadDialog`), o fluxo unifica Lead + Empresa:

1. Campo "Empresa" continua com autocomplete (cria nova se não existir — já é assim)
2. **Novo: aviso** se a empresa já tem Lead aberto ("Esta empresa já tem o lead L-0123 em aberto. Continuar mesmo assim?")
3. Ao criar a empresa do zero pelo diálogo, abre um mini-form com 3 campos extras opcionais (indústria, porte, site) para não precisar mais ir à tela de Empresas

A função `useCreateCompany` já existe e é reaproveitada.

## Integrações externas — checklist sem quebra

Verificado nos arquivos abaixo. Tudo continua funcionando porque a tabela e a rota de detalhe não somem:

- `src/pages/crm/CrmPipeline.tsx` → `navigate('/crm/empresas/:id')` ✅ continua
- `src/pages/crm/CrmLeadDetail.tsx` → `Link to /crm/empresas/:id` ✅ continua
- `src/pages/crm/CrmDealDetail.tsx`, `CrmCompanyDetail.tsx` ✅ continuam
- `src/components/projetos/*`, `src/hooks/projetos/useProjectContacts.ts` (lê `companies`) ✅
- `src/components/orcamentos/*`, `src/hooks/orcamentos/*` ✅
- `src/components/vendas/NovaVendaDialog.tsx`, `useVendas.ts` ✅
- `src/hooks/finance/useFinanceExtras.ts`, `FinanceBlocks09B.tsx` ✅
- `src/hooks/crm/useCrmDashboard*.ts`, `useCrmMetrics.ts` ✅
- Cache invalidation em `src/lib/cacheInvalidation.ts` (`invalidateCrmCaches`) ✅

Nenhum hook é renomeado. `useAllCompanies`, `useBulkDeleteCompanies`, `useCreateCompany`, `useCompanyLeads`, `useCompanyDeals` continuam exportados — passam a ser consumidos dentro de Leads.

## Arquivos a modificar

1. **`src/components/AppSidebar.tsx`** — remover item "Empresas"
2. **`src/pages/crm/CrmLayout.tsx`** — remover tab "empresas"
3. **`src/App.tsx`** — remover rota `<Route path="empresas" element={<CrmEmpresas />} />` (manter `/crm/empresas/:id`)
4. **`src/pages/crm/CrmLeads.tsx`** — adicionar colunas/filtros/KPIs de empresa; usar `useCompanyRowStats` por linha (memoizado em batch para evitar N queries — agregar via um único `useAllCompaniesAggregates`)
5. **`src/components/crm/NewLeadDialog.tsx`** — duplicate-warning + mini campos de empresa
6. **`src/hooks/crm/useCrmDetails.ts`** — adicionar `useAllCompaniesAggregates()` que retorna `{ companyId → { dealsOpen, revenueWon, leadsOpen } }` em UMA query (evita N+1)
7. **`src/pages/crm/CrmEmpresas.tsx`** — **deletar** (não é mais referenciado)
8. **`src/pages/crm/CrmCompanyDetail.tsx`** — manter; ajustar breadcrumb "Empresas → /crm/leads"

## Migração / banco
**Nenhuma migração SQL necessária.** Schema permanece idêntico. Decisão é puramente de UI/UX.

## Riscos e mitigação
- Risco: alguém com bookmark `/crm/empresas` cair em 404 → adicionar redirect `/crm/empresas` → `/crm/leads` no `App.tsx`
- Risco: performance da tabela de Leads com agregados por empresa → resolvido com 1 query agregada (`useAllCompaniesAggregates`) em vez de hook por linha

## Resultado final
Você tem **uma única lista** ("Leads & Empresas") que mostra cada empresa da sua base com todo o contexto comercial (status, indústria, porte, deals, receita) sem precisar trocar de aba. A ficha detalhada da empresa continua acessível pelo link na linha — só não polui mais o menu.
