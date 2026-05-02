## Objetivo

Reordenar as seções do `/configuracoes` para espelhar a sidebar e expandir cada uma com configurações que hoje estão espalhadas pelo código (ou faltando) — transformando o hub no único lugar onde se gerencia catálogos, comportamento e branding de cada módulo.

---

## 1. Reordenação das seções (espelhando a sidebar)

Sidebar atual: **Dashboard → CRM → Projetos → Financeiro → Área Dev → Configurações**.

Nova ordem das abas em `ConfiguracoesLayout.tsx`:

```text
1. CRM
2. Projetos          (nova)
3. Financeiro
4. Área Dev          (nova)
5. Pessoas & Empresas   (catálogos transversais)
6. Sistema
7. Integrações
```

A Pessoas & Empresas perde itens que pertencem só ao CRM; sobra como "catálogos compartilhados de verdade" (Setores, Cargos).

---

## 2. Reorganização de páginas existentes

| Página atual | Vai para |
|---|---|
| Pessoas → Papéis de Contato | **CRM** → Papéis de Contato |
| Pessoas → Origens de Lead | **CRM** → Origens de Lead |
| Pessoas → Categorias de Dor | **CRM** → Categorias de Dor |
| Pessoas → Tipos de Projeto | **Projetos** → Tipos de Projeto |
| Pessoas → Setores, Cargos | mantém em **Pessoas & Empresas** |
| Sistema → Auditoria | mantém |
| Integrações → IA das Propostas | mantém |

Rotas antigas viram `<Navigate>` para o novo destino (compat).

---

## 3. Novas configurações por módulo (varredura do que falta)

### CRM (adicionar)
- **Etapas do Funil** — já existe (read-only); vamos torná-la editável: cor, label, probabilidade, ordem (mantendo `is_system` para travar deleção das 7 base).
- **Motivos de descarte** — já existe.
- **Tipos de Atividade do Calendário** — hoje os tipos (`call`, `meeting`, `email`, `task`, `whatsapp`…) e suas cores estão hardcoded em `src/lib/crm/activityColors.ts`. Criar tabela `crm_activity_types` (slug, label, icon, color, is_system) e migrar o mapa.
- **Origens de Lead / Papéis de Contato / Categorias de Dor** — movidas de Pessoas.

### Projetos (nova seção inteira)
- **Status de Projeto** — hoje strings livres; criar `project_statuses` (slug, label, color, kind: `aberto/pausado/concluido/cancelado`).
- **Templates de Marcos** — bibliotecas de marcos reutilizáveis para `project_milestones` (ex.: "Kickoff", "Aceite final"). Tabela `milestone_templates`.
- **Categorias de Risco** — para `project_risks`. Tabela `project_risk_categories` (label, severidade default, cor).
- **Papéis de Ator (`project_actors`)** — catálogo de funções (PM, Dev, Designer…) usado em `AlocarAtorDialog`. Tabela `actor_roles`.
- **Tipos de Projeto** — vinda de Pessoas.
- **Tipos de Dependência** — para `project_dependencies` / `deal_dependencies` (ex.: "bloqueia", "depende de", "relaciona-se com").

### Financeiro (adicionar)
- **Meios de Pagamento** — tabela `meios_pagamento` já existe sem UI; criar CRUD (label, ícone, ativo, ordem).
- **Templates de Recorrência** — presets prontos (mensalidade fixa, anual com reajuste IGPM, parcelamento) que aparecem em `NovaRecorrenciaModal`.
- **Regras de Conciliação** — padrões de match para `extrato_transacoes` (regex no histórico → categoria/centro de custo sugerido).
- **Política de Inadimplência** — quando marcar como atrasado, dias de tolerância, juros/multa default usados em `InadimplenciaTab`.
- **Numeração de documentos** — formato/sequência de proposta, recibo, NF (ex.: `PROP-2026-####`).

### Área Dev (nova seção)
- **Tipos de Task** — hoje strings em `tasks.tipo`; virar catálogo com cor/ícone (feature, bug, chore, spike…).
- **Status do Kanban** — colunas e transições permitidas (atualmente fixas).
- **Agentes de IA** — UI sobre `ai_agents` para configurar prompts/modelos por agente.
- **Configuração de Sprints** — duração padrão, dia da semana de início, cerimônias.
- **Severidades de Bug** — catálogo (P0/P1/P2/P3, SLA em horas).

### Pessoas & Empresas (limpar e adicionar)
- **Setores** — fica.
- **Cargos Internos** — fica.
- **Tipos de Contrato Interno** — para `usuario_contratos` (CLT, PJ, Estágio…) com campos default.
- **Planos de Saúde** — atualmente texto livre em `profiles.plano_saude`; virar catálogo.

### Sistema (adicionar)
- **Usuários, Permissões, Auditoria** — ficam.
- **Organização (`tenant_settings`)** — branding interno: nome fantasia, CNPJ, endereço, logo usados em propostas, contratos e e-mails. Hoje espalhado.
- **Manutenção** — limpeza de anexos órfãos, reindexação, recomputo de KPIs (usar `src/lib/maintenance.ts`).
- **Notificações do sistema** — destinatários de alertas críticos (proposta vista, deal ganho, falha de cobrança), substitui `proposal_notification_recipients` espalhado.

### Integrações (adicionar)
- **IA das Propostas** — fica.
- **Provedores de Integração (`integration_providers`)** — UI para ativar/desativar e configurar credenciais por provedor.
- **Webhooks de Saída** — endpoints externos para eventos (deal_won, proposal_signed…).
- **Página Pública de Propostas** — branding/cores/textos do `public_page_settings` (hoje em hooks sem UI dedicada).
- **E-mails Transacionais** — remetente, assinatura, templates de proposta enviada / cobrança / lembrete.

---

## 4. Detalhes técnicos

- **Migrations novas**: `crm_activity_types`, `project_statuses`, `milestone_templates`, `project_risk_categories`, `actor_roles`, `dependency_types`, `task_types`, `bug_severities`, `internal_contract_types`, `health_plans`, `payment_method` UI (tabela já existe), `reconciliation_rules`, `outbound_webhooks`. Todas com `slug`, `label`, `is_system`, `sort_order`, RLS admin-only, padrão idêntico ao já adotado em `crm_lead_sources` / `deal_lost_reasons`.
- **Refactors**:
  - `src/lib/crm/activityColors.ts` → ler do banco com cache (`useCrmActivityTypes`), mantendo fallback local.
  - `AlocarAtorDialog`, `NovoProjetoDialog`, `NovaRecorrenciaModal` consomem os novos catálogos via hooks `use<Catalog>()`.
- **Páginas**: cada item acima é um arquivo em `src/pages/configuracoes/<secao>/<Item>Page.tsx`, todos seguindo o padrão de CRUD inline com `ComboboxCreate` + tabela editável usado em `OrigensLeadPage` / `MotivosDescartePage`.
- **Navegação**: ampliar `SECTIONS` em `ConfiguracoesLayout.tsx` com a nova ordem e tabs; atualizar `AppSidebar.tsx` para listar Projetos/Área Dev/CRM como subitens de "Configurações".
- **Compat**: redirects de todas as rotas que se moveram (ex.: `/configuracoes/pessoas/origens` → `/configuracoes/crm/origens`).
- **Memória**: atualizar `mem://features/admin-area` com a nova ordem e a regra "todo catálogo de qualquer módulo deve nascer aqui".

---

## 5. Entrega faseada (sugestão)

Se preferir não fazer tudo de uma vez, a ordem natural é:

1. **Reordenar abas + mover páginas existentes** (zero schema, baixo risco).
2. **CRM** (activity_types) + **Projetos** (status/marcos/atores/risco/dependência).
3. **Financeiro** (meios de pagamento, conciliação, inadimplência, numeração).
4. **Área Dev** (task_types, kanban, ai_agents, sprints, severidades).
5. **Pessoas/Sistema/Integrações** restantes (organização, manutenção, webhooks, public page, e-mails).

Quer que eu vá direto com tudo, ou prefere começar pela Fase 1 + Fase 2?