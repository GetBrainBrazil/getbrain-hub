# GetBrain Hub — ARCHITECTURE.md

> **Documento-mãe do sistema interno da GetBrain.**
> Toda decisão de arquitetura, modelagem, UI e padrões deste projeto segue o que está escrito aqui.
> Sempre que um prompt for executado no Lovable, este documento é o primeiro a ser lido.
> **Versão atual: v1.6 — 23/04/2026**

---

## 1. Contexto de negócio

A GetBrain é uma empresa brasileira de desenvolvimento de sistemas personalizados com IA integrada, sediada em Curitiba. Este sistema interno (**GetBrain Hub**) é a ferramenta de gestão 360 da empresa — o lugar único onde o time controla financeiro, projetos, clientes, tarefas, suporte, manutenções e consumo de recursos.

### Time atual

- **Daniel (fundador):** CEO, comercial, gestor de projetos, atendimento, financeiro. Login `owner`, employment_type `founder`.
- **Vitor Correa:** Desenvolvedor Full Stack PJ. Login `developer`. Pagamento fixo mensal R$ 3.000.
- **João Pedro:** Desenvolvedor Backend Python PJ. Login `developer`. Pagamento fixo mensal R$ 2.000.

### Stack técnica

- **Frontend:** Lovable (React + Tailwind + shadcn/ui)
- **Backend/DB:** Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- **Linguagem de dados:** todas as tabelas em `snake_case` no banco, `camelCase` no front, labels em **português** na UI
- **Idioma da UI:** Brasileiro 100%. Datas em `DD/MM/AAAA`, moeda em `R$`, valores em `pt-BR`.

### Clientes ativos (referência para seed de dados e testes)

- **Equipe Certa** — sistema de triagem de candidatos com IA, integra Recrutei, Evolution API (WhatsApp), OpenAI, Microsoft Graph. Contrato de manutenção ativo: R$ 750/mês com 50% de desconto temporário.
- **NOI** — projeto em desenvolvimento.
- **No Frontier** — empresa de tradução e interpretação. Contrato de manutenção ativo: R$ 550/mês com 50% de desconto temporário.

---

## 2. Princípios de design — inegociáveis

Todo módulo, toda tabela, toda tela deve respeitar estes princípios. Se um prompt pedir algo que viole um princípio abaixo, o Lovable deve alertar e sugerir alternativa.

### 2.1 Tudo é rastreável
Toda ação relevante gera registro em `audit_logs` (quem, quando, o quê, valor anterior, valor novo). Nunca apagamos histórico — sempre registramos.

### 2.2 Tudo tem dono
Nenhum registro fica órfão. Projeto tem `owner_actor_id`. Tarefa tem assignees. Ticket tem responsável. Proposta tem criador.

### 2.3 Tudo tem estado explícito
Nada de `is_active boolean`. Todo fluxo usa `enum` com transições definidas. Ex: projeto segue `proposta → aceito → em_desenvolvimento → em_homologacao → entregue → em_manutencao → pausado → cancelado → arquivado`.

### 2.4 Tudo tem data-alvo e data-real
Para acumular histórico e parar de estimar no feeling: `estimated_hours` × `actual_hours`, `due_date` × `completed_at`, `estimated_delivery` × `actual_delivery`, `budget_value` × `actual_cost`.

### 2.5 Tudo tem rastro financeiro quando faz sentido
Projeto tem `contract_value` (receita contratada) e `total_cost` (soma de horas de dev, tokens de IA, custos externos). A margem é sempre calculável.

### 2.6 Tudo tem RLS (Row Level Security) no Supabase
Segurança no banco, não no front. Cliente externo (portal) vê só os dados dele. Dev vê projetos em que está alocado. Owner vê tudo. Qualquer tabela sem RLS é bug.

### 2.7 Tudo tem soft delete
Campo `deleted_at timestamptz`. Nunca `DELETE` de verdade. Query padrão filtra `WHERE deleted_at IS NULL`. Há tela administrativa de "lixeira" que permite restaurar.

### 2.8 Tudo tem `created_at`, `updated_at` e `created_by_actor_id`, `updated_by_actor_id` automáticos
Triggers no Postgres atualizam `updated_at` automaticamente. Os `_by_actor_id` são preenchidos pelo app.

### 2.9 Tudo é multi-tenant-ready, mas single-tenant na prática
Toda tabela tem `organization_id uuid not null`. Por ora, o valor é sempre o mesmo UUID fixo da GetBrain (`00000000-0000-0000-0000-000000000001`). Assim, quando quisermos virar produto, é só ativar a lógica sem refatorar schema.

### 2.10 Nada de dados mockados ou sintéticos após a Fundação
Depois do Prompt 01 (Fundação), nenhum módulo novo pode ser entregue com dados fictícios de nomes como "João Mendes" ou "Ana Ribeiro". Todos os dados de demonstração devem referenciar o time real (Daniel, Vitor, João Pedro) e clientes reais (Equipe Certa, NOI, No Frontier).

### 2.11 Separação entre projetos e contratos de manutenção
- **`projects`** representa trabalho com escopo, prazo e entrega.
- **`maintenance_contracts`** representa compromisso recorrente de manutenção após a entrega.
- Um projeto vive seu ciclo (proposta → entregue) e, se o cliente contratar manutenção, um `maintenance_contract` ativo é criado para ele com o `monthly_fee`.
- Renovação anual ou mudança de valor = fechar o contrato atual (`status='ended'`) e abrir um novo.
- Isso permite histórico completo da relação comercial e cálculo preciso de LTS por cliente.

### 2.12 Escopo é estruturado, não livre

Descrição textual simples não é suficiente para projetos profissionais. Todo projeto tem:

- Escopo documentado em 7 dimensões (contexto de negócio, in-scope, out-of-scope, premissas, entregáveis, stack técnico, riscos inicialmente identificados)
- Dependências externas rastreadas com SLA e flag de bloqueio
- Marcos/milestones com data-alvo × data-real
- Integrações catalogadas com custos estimados
- Riscos com severidade, probabilidade e plano de mitigação

Essa estrutura responde diretamente a duas das 4 causas-raiz dos atrasos: escopo mal definido e cliente atrasando dependências externas.

### 2.13 Integração entre módulos é de primeira classe

Módulos do GetBrain Hub não são ilhas — devem se conversar por eventos e referências rastreáveis. Cada ação relevante em um módulo pode disparar automações em outros. Todo lançamento/registro derivado de outro módulo deve carregar rastreabilidade total:

- `source_module` (text) — qual módulo originou (ex: 'projects', 'maintenance_contracts', 'tokens')
- `source_entity_type` (text) — tipo da entidade de origem
- `source_entity_id` (uuid) — id da entidade de origem
- `is_automatic` (boolean) — se foi gerado por automação ou manual

Isso permite: (a) saber de onde veio cada lançamento; (b) desfazer cascatas ao cancelar origem; (c) relatórios de "quanto faturei desse projeto vs quanto custou".

### 2.14 Módulos macro vs sub-abas de projeto

Critério para decidir se uma entidade vira módulo próprio na sidebar ou sub-aba dentro de Projetos:

Se faz sentido olhar a entidade agregada no sistema inteiro (atravessando projetos), vira módulo macro. Se existe só no contexto de um projeto específico, vira sub-aba dentro da página do projeto.

Aplicação concreta:

| Entidade | Módulo macro? | Por quê |
|----------|---------------|---------|
| Tarefas | Sim (Área Dev) | "O que o Vitor faz hoje?" atravessa projetos |
| Tickets de suporte | Sim (Suporte) | "Quais clientes têm tickets?" atravessa |
| Contratos de manutenção | Sim (Manutenção) | MRR total atravessa |
| Consumo de tokens | Sim (Tokens) | Total mensal atravessa |
| Lançamentos financeiros | Sim (Financeiro) | Óbvio |
| Leads/Pipeline | Sim (CRM) | Funil global |
| Dependências do projeto | Não → sub-aba | Específica do projeto |
| Marcos | Não → sub-aba | Específicos do projeto |
| Riscos | Não → sub-aba | Específicos do projeto |
| Integrações do projeto | Não → sub-aba | Específicas |

Padrão de apresentação cruzada:

- Entidades de módulos macro aparecem dentro da página de projeto como indicadores compactos (contagem + resumo + link para módulo macro filtrado).
- Indicadores compactos dentro do projeto consolidam-se numa aba "Operacional", separada das sub-abas de gestão do projeto (Escopo, Marcos, etc.).

### 2.15 Estratégia técnica: views SQL em tempo real para métricas

Métricas agregadas (horas gastas, receita × custo, progresso de tarefas, contagem de tickets, etc.) são calculadas em tempo real via views SQL — não armazenadas em campos derivados nem em materialized views.

Motivos:

- Sempre corretas, nunca desatualizam
- Zero manutenção de sincronização
- Escala bem para o volume realista da GetBrain nos próximos 2 anos (<10k linhas por tabela agregada)
- Simples: uma view por contexto agregado
- Cache no frontend via React Query (staleTime de 30-60s) absorve picos de leitura

Quando migrar: se alguma view específica começar a passar de 200ms, migra AQUELA view para materialized view com refresh agendado. Nunca refatora-se tudo de uma vez.

Implementação padrão:

- Criar uma view `<entidade>_metrics` por entidade agregadora (ex: `project_metrics`, `company_metrics`)
- A view consolida todas as métricas relevantes daquela entidade num registro por id
- Frontend consulta a view, não consulta as tabelas-fonte

Proibido neste sistema:

- Triggers que mantêm campos derivados (ex: `projects.total_hours_actual`) — armadilha de complexidade
- Cálculos duplicados em múltiplos lugares do frontend — sempre usar a view

---

## 3. Conceito central — Actors

O GetBrain Hub é construído sobre o conceito de **Actor (Ator)**: qualquer entidade que **executa trabalho** dentro do sistema. Actors podem ser humanos OU agentes de IA.

Isso não é firula: é a base de arquitetura que permite que, no futuro, agentes de IA (via OpenClaw ou direto) trabalhem lado a lado com humanos — respondendo tickets, gerando propostas, executando tarefas, fechando reuniões — e tudo seja contabilizado de forma consistente.

### Hierarquia de atores

```
actor (tabela central, todos executam trabalho)
├── type: 'human' | 'ai_agent'
│
├── quando type='human'
│   └── extensão em: humans
│       - vincula a auth.users
│       - tem role (owner, developer, designer, commercial, support, manager)
│       - tem custo/hora, salário fixo, variável
│
└── quando type='ai_agent'
    └── extensão em: ai_agents
        - tem provider (anthropic, openai, etc)
        - tem model
        - tem system_prompt
        - tem capabilities (array)
        - tem custo por token (input/output)
```

### Distinção CRÍTICA: actors vs people

- **actors** = quem trabalha DENTRO da GetBrain (humanos ou IAs). Faz login. Tem tarefas atribuídas.
- **people** = pessoas EXTERNAS. Contatos de clientes, leads, fornecedores. Não fazem login no sistema interno. Podem acessar o Portal do Cliente via magic link (auth separada).

Confundir os dois é erro de modelagem grave. Cliente "João da Silva" da Equipe Certa é uma `person`, não um `actor`.

---

## 4. Modelo de dados — tabelas fundacionais

Tabelas que todos os módulos usam. Estas são criadas no Prompt 01 e **nunca** devem ser recriadas ou duplicadas em prompts posteriores.

> **Nota v1.5:** O schema de `tasks`/`sprints`/`task_assignees` introduzido no Prompt 03A alimenta tanto a sub-aba Kanban quanto a sub-aba Dashboard da Área Dev. Nenhuma tabela é específica de uma sub-aba — o schema é do domínio "engenharia", e cada sub-aba é uma lente sobre ele.

> **Nota v1.6 — Views agregadas como padrão de métrica:**
>
> Todo módulo macro com dashboard interno tem sua própria view SQL agregada (padrão `<contexto>_metrics`). Regras:
>
> - **Por quê view e não campo denormalizado:** métricas sempre têm janelas móveis (sprint atual, últimos 30 dias, etc.). Campos denormalizados em trigger ficam obsoletos a cada mudança de janela. Views recalculam a cada query.
> - **Performance:** começamos com views comuns. Se alguma ficar > 500ms em produção, migra para MATERIALIZED VIEW com refresh periódico. Sem premature optimization.
> - **Nomenclatura:** `<dominio>_<granularidade>_metrics`:
>   - `project_metrics` — 1 linha por projeto
>   - `dev_dashboard_metrics` — 1 linha por sprint (recente) ou 1 linha por período (custom)
>   - `financial_metrics` (futuro) — 1 linha por mês
> - **Granularidade adicional via funções SQL:** quando o dashboard precisa de breakdown (por dev, por projeto, por tipo), criar funções SQL `get_*` em vez de múltiplas views. Exemplo: `get_dev_estimation_accuracy(sprint_id)` retorna set de `(actor_id, avg_accuracy, desvio)`.

> **Nota v1.6 — Views agregadas como padrão de métrica:**
>
> Todo módulo macro com dashboard interno tem sua própria view SQL agregada (padrão `<contexto>_metrics`). Regras:
>
> - **Por quê view e não campo denormalizado:** métricas sempre têm janelas móveis (sprint atual, últimos 30 dias, etc.). Campos denormalizados em trigger ficam obsoletos a cada mudança de janela. Views recalculam a cada query.
> - **Performance:** começamos com views comuns. Se alguma ficar > 500ms em produção, migra para MATERIALIZED VIEW com refresh periódico. Sem premature optimization.
> - **Nomenclatura:** `<dominio>_<granularidade>_metrics`:
>   - `project_metrics` — 1 linha por projeto
>   - `dev_dashboard_metrics` — 1 linha por sprint (recente) ou 1 linha por período (custom)
>   - `financial_metrics` (futuro) — 1 linha por mês
> - **Granularidade adicional via funções SQL:** quando o dashboard precisa de breakdown (por dev, por projeto, por tipo), criar funções SQL `get_*` em vez de múltiplas views. Exemplo: `get_dev_estimation_accuracy(sprint_id)` retorna set de `(actor_id, avg_accuracy, desvio)`.

### 4.1 `organizations`
Para multi-tenant futuro. Por ora, 1 registro fixo (GetBrain) com UUID `00000000-0000-0000-0000-000000000001`.
```
id uuid PK
name text
slug text unique
created_at, updated_at timestamptz
```

### 4.2 `actors`
Tabela central. Todo ator (humano ou IA) tem registro aqui.
```
id uuid PK
organization_id uuid FK → organizations
type enum('human', 'ai_agent') not null
display_name text not null
avatar_url text
status enum('active', 'inactive', 'archived') default 'active'
created_at, updated_at timestamptz
deleted_at timestamptz null
```

### 4.3 `humans`
Extensão de actor quando type='human'. Relação 1:1 com actor.
```
id uuid PK
actor_id uuid FK UNIQUE → actors
auth_user_id uuid FK → auth.users UNIQUE
email text unique not null
phone text
cpf text
role enum('owner', 'developer', 'designer', 'commercial', 'support', 'manager') not null
employment_type enum('founder', 'pj', 'clt', 'intern', 'freelancer') not null
fixed_monthly_pay numeric(12,2)
hourly_cost numeric(12,2)   -- usado pra calcular custo de tarefa
variable_percentage numeric(5,2)  -- % de lucro pago
contract_start_date date
contract_end_date date
created_at, updated_at timestamptz
```

### 4.4 `ai_agents`
Extensão de actor quando type='ai_agent'. Relação 1:1 com actor.
```
id uuid PK
actor_id uuid FK UNIQUE → actors
provider enum('anthropic', 'openai', 'google', 'custom')
model text  -- ex: 'claude-opus-4-7'
system_prompt text
capabilities text[]  -- ex: ['ticket_triage', 'proposal_generation']
cost_per_1k_input_tokens_usd numeric(10,6)
cost_per_1k_output_tokens_usd numeric(10,6)
openclaw_agent_id text null  -- pra futura integração
config jsonb  -- parâmetros livres
created_at, updated_at timestamptz
```

### 4.5 `companies`
Empresas do mundo real — clientes, prospects, fornecedores, parceiros.
```
id uuid PK
organization_id uuid FK
legal_name text not null  -- razão social
trade_name text  -- nome fantasia
cnpj text
company_type enum('client', 'prospect', 'supplier', 'partner', 'other') not null
industry text  -- setor (RH, tradução, marcenaria, etc.)
size enum('micro', 'small', 'medium', 'large', 'enterprise')
website text
status enum('active', 'inactive', 'churned', 'lost') default 'active'
notes text
created_at, updated_at timestamptz
deleted_at timestamptz null
created_by_actor_id uuid FK → actors
```

### 4.6 `people`
Pessoas externas (contatos).
```
id uuid PK
organization_id uuid FK
full_name text not null
email text
phone text
role_in_company text  -- cargo
linkedin_url text
notes text
status enum('active', 'inactive') default 'active'
created_at, updated_at timestamptz
deleted_at timestamptz null
```

### 4.7 `company_people`
Relação N:N entre empresas e pessoas. Uma pessoa pode estar em várias empresas; uma empresa tem várias pessoas.
```
id uuid PK
company_id uuid FK → companies
person_id uuid FK → people
is_primary_contact boolean default false
role text  -- cargo nessa empresa específica
started_at date
ended_at date
created_at timestamptz
```

### 4.8 `projects`
Projetos entregáveis. **Não contém `monthly_fee`** — receita recorrente está em `maintenance_contracts`.
```
id uuid PK
organization_id uuid FK
code text unique  -- gerado auto: PRJ-001, PRJ-002...
name text not null
company_id uuid FK → companies  -- cliente contratante
owner_actor_id uuid FK → actors  -- quem gerencia (Daniel)
status enum project_status (
  'proposta',
  'aceito',
  'em_desenvolvimento',
  'em_homologacao',
  'entregue',
  'em_manutencao',
  'pausado',
  'cancelado',
  'arquivado'
) not null default 'proposta'
project_type enum project_type (
  'sistema_personalizado',
  'chatbot',
  'consultoria',
  'interno',
  'outro'
) not null
contract_value numeric(12,2)  -- valor de implementação contratado
installments_count int  -- quantas parcelas
token_budget_brl numeric(12,2)  -- bolsão de tokens em R$ (durante desenvolvimento)
start_date date
estimated_delivery_date date
actual_delivery_date date
description text
acceptance_criteria text  -- critérios formais de aceite
business_context text        -- contexto e objetivo de negócio do cliente
scope_in text                -- o que está incluso
scope_out text               -- o que NÃO está incluso
premises text                -- premissas assumidas
deliverables text            -- entregáveis formais
technical_stack text         -- tecnologias envolvidas
identified_risks text        -- riscos no início do projeto
notes text
created_at, updated_at timestamptz
deleted_at timestamptz null
created_by_actor_id, updated_by_actor_id uuid FK → actors
```

### 4.9 `project_actors`
Quem está alocado em qual projeto (N:N).
```
id uuid PK
project_id uuid FK → projects
actor_id uuid FK → actors
role_in_project enum('owner', 'developer', 'designer', 'consultant', 'support')
allocation_percent numeric(5,2)  -- quanto da semana dedica
started_at date
ended_at date
created_at timestamptz
```

### 4.10 `maintenance_contracts`
Contratos mensais recorrentes de manutenção vinculados a um projeto. Um projeto pode ter múltiplos contratos ao longo do tempo, mas apenas **um ativo por vez** (constraint única).
```
id uuid PK
organization_id uuid FK
project_id uuid FK → projects
monthly_fee numeric(12,2) not null
monthly_fee_discount_percent numeric(5,2) default 0  -- o 50% temporário atual
token_budget_brl numeric(12,2)  -- bolsão mensal durante manutenção
hours_budget int  -- horas mensais alocadas
start_date date not null
end_date date
status enum maintenance_contract_status ('active', 'paused', 'ended', 'cancelled')
notes text
created_at, updated_at timestamptz
deleted_at timestamptz null
created_by_actor_id, updated_by_actor_id uuid FK → actors
```

**Regra:** `unique index idx_maintenance_one_active_per_project on maintenance_contracts(project_id) where status = 'active' and deleted_at is null` — garante só um contrato ativo por vez.

### 4.11 `audit_logs`
Rastro de tudo.
```
id uuid PK
organization_id uuid FK
actor_id uuid FK → actors  -- quem fez
entity_type text not null  -- 'project', 'task', 'ticket', etc.
entity_id uuid not null
action enum('create', 'update', 'delete', 'restore', 'status_change', 'custom') not null
changes jsonb  -- { field: { before: X, after: Y } }
metadata jsonb  -- contexto adicional
created_at timestamptz default now()
```

### 4.12 `project_dependencies`
Dependências externas (acessos, dados, credenciais, aprovações) que o projeto precisa do cliente ou de terceiros. Rastreia SLA e marca bloqueios.
```
id uuid PK
organization_id uuid FK
project_id uuid FK → projects
title text not null
description text
dependency_type enum project_dependency_type
  ('acesso_api','credenciais','dados_cliente','aprovacao',
   'documentacao','homologacao','infraestrutura','outro')
status enum project_dependency_status
  ('pendente','solicitado','em_andamento','recebido',
   'atrasado','bloqueante','resolvido','cancelado')
requested_from text          -- nome livre de quem fornece
responsible_actor_id uuid FK → actors  -- quem da GetBrain cobra
requested_at date
expected_at date             -- data-alvo
received_at date             -- data real
is_blocking boolean default false
notes text
created_at, updated_at, deleted_at
created_by_actor_id, updated_by_actor_id
```

### 4.13 `project_milestones`
Marcos/entregas intermediárias com data-alvo × data-real, alinhado ao princípio 2.4.
```
id uuid PK
organization_id uuid FK
project_id uuid FK → projects
title text not null
description text
sequence_order int not null   -- ordem visual
target_date date not null
actual_date date              -- preenchido quando concluído
status enum project_milestone_status
  ('planejado','em_andamento','concluido','atrasado','cancelado')
acceptance_notes text
created_at, updated_at, deleted_at
created_by_actor_id, updated_by_actor_id
```

Constraint única: `(project_id, sequence_order)` onde `deleted_at is null`.

### 4.14 `project_integrations`
Integrações externas do projeto (APIs de terceiros, sistemas do cliente).
```
id uuid PK
organization_id uuid FK
project_id uuid FK → projects
name text not null            -- ex: "Recrutei API"
provider text                 -- fabricante
purpose text                  -- para que serve
documentation_url text
credentials_location text     -- descrição de onde estão as chaves (NÃO as chaves)
status enum project_integration_status
  ('planejada','em_desenvolvimento','testando','ativa','com_erro','descontinuada')
estimated_cost_monthly_brl numeric(12,2)
notes text
created_at, updated_at, deleted_at
created_by_actor_id, updated_by_actor_id
```

**Importante:** `credentials_location` NÃO armazena credenciais. Um Gestor de Secrets dedicado virá em prompt futuro.

### 4.15 `project_risks`
Riscos identificados + plano de mitigação.
```
id uuid PK
organization_id uuid FK
project_id uuid FK → projects
title text not null
description text
severity enum project_risk_severity ('baixa','media','alta','critica')
probability enum project_risk_probability ('baixa','media','alta')
status enum project_risk_status
  ('identificado','em_mitigacao','mitigado','materializado','aceito')
mitigation_plan text
responsible_actor_id uuid FK → actors
identified_at date default current_date
resolved_at date
notes text
created_at, updated_at, deleted_at
created_by_actor_id, updated_by_actor_id
```

---

## 5. Convenções de schema

### 5.1 Tipos padrão
- IDs: sempre `uuid` (nunca `serial`/`bigint`)
- Dinheiro: `numeric(12,2)` em BRL, `numeric(12,6)` em USD (tokens)
- Datas de evento: `timestamptz`
- Datas calendário: `date`
- Texto longo: `text` (nunca `varchar(n)`)
- Enums: criar como `create type`, nunca como `text + check`

### 5.2 Naming
- Tabelas: plural, snake_case. Ex: `projects`, `project_actors`, `maintenance_contracts`.
- Colunas: snake_case.
- Foreign keys: `<entidade>_id`. Ex: `company_id`, `actor_id`.
- Enums: singular. Ex: `type project_status as enum(...)`.
- Campos booleanos de data: `xxx_at` (ex: `approved_at`, `deleted_at`).

### 5.3 Triggers obrigatórios
Toda tabela de entidade (não de relacionamento) tem:
- Trigger `set_updated_at` que atualiza `updated_at = now()` em todo UPDATE.
- Quando aplicável, trigger que grava em `audit_logs` em INSERT/UPDATE/DELETE.

### 5.4 RLS — padrões
Toda tabela tem RLS habilitado. Políticas padrão:
- **Leitura:** autenticado e pertence à mesma `organization_id` que o usuário.
- **Escrita:** autenticado, mesma org, e tem role suficiente (ex: só `owner` edita `humans`).
- **Portal do cliente:** via magic link com JWT que contém `company_id`. Vê só dados do próprio `company_id`.

---

## 6. Padrões de UI

### 6.1 Layout global
- **Sidebar esquerda**, fundo escuro sempre (mesmo em light mode). Largura 240px expandida, 64px colapsada.
- Logo GetBrain no topo da sidebar.
- Módulos principais listados: Dashboard, Financeiro, Projetos, Área Dev, CRM/Clientes, Manutenção+Suporte, Configurações.
- Cada módulo pode ter submódulos (ex: Financeiro → Dashboard, Contas a Pagar/Receber, Orçamento, Relatórios, Extratos, Configurações).
- **Topbar** com busca global, notificações, toggle dark/light, avatar do usuário.

### 6.2 Dark mode first
O sistema é desenhado dark-first. Light mode existe, mas dark é o padrão e o que recebe mais cuidado visual.

### 6.3 Cores e tokens
- **Primary:** ciano/turquesa `#06b6d4` (hsl ~189 94% 43%) — usado em itens selecionados, botões primários, destaques.
- **Success:** verde `#10b981`
- **Danger:** vermelho `#ef4444` (usado em valores negativos, atrasos, bugs críticos)
- **Warning:** amarelo `#f59e0b`
- **Dark background:** `#0a0e1a` (sidebar e cards profundos)
- **Card background (light):** `#ffffff`
- **Card background (dark):** `#11172a`
- **Border (dark):** `#1e2538`

Sempre usar variáveis CSS / tokens do Tailwind, nunca hex hardcoded em componentes.

### 6.4 Componentes padrão
- **KPI Card:** card com título pequeno em cima, valor grande, ícone no canto superior direito, sparkline/trend opcional embaixo. Usado no topo dos dashboards.
- **Table:** listagem padrão com header sticky, colunas sortáveis (ícone ↕), busca, filtros, paginação, checkbox de seleção múltipla, ações de linha (menu 3 pontos).
- **Drawer lateral:** sempre à direita, ocupa ~40% da tela, para detalhes de entidade (como o drawer de tarefa da Área Dev).
- **Modal:** centralizado, usado para ações rápidas e confirmações.
- **Formulário:** labels acima dos inputs, erros abaixo em vermelho, botão primário à direita e cancelar à esquerda no rodapé.
- **Status badge:** pill arredondada colorida conforme estado. Cor segue convenção: verde = resolvido/ok, amarelo = em andamento/atenção, vermelho = bloqueado/crítico, cinza = arquivado.
- **Avatar:** círculo com iniciais coloridas ou foto. Sempre com tooltip de nome.

### 6.5 Datas e moeda
- Data: `DD/MM/AAAA`. Nunca ISO na UI.
- Moeda: `R$ 1.234,56`. Pontos e vírgulas no padrão brasileiro.
- Percentual: `12,5%`.
- Valores negativos em vermelho, com sinal de menos.

---

### 6.Z Padrão de dashboard denso

Dashboards do GetBrain Hub seguem estrutura hierárquica vertical:

1. Cabeçalho com controles globais (escopo temporal, filtros)
2. Linha de alertas acionáveis (só aparece se tem alerta — nunca vazia, nunca ornamental)
3. Linha de KPIs macro (4-6 cards compactos com valor + delta + sparkline)
4. Blocos temáticos (cada bloco responde a uma pergunta de negócio, título imperativo)

**Regras obrigatórias:**

- Todo KPI tem delta comparativo (vs período anterior). Sem histórico, mostrar "—", nunca mostrar 0 falso.
- Toda visualização tem estado vazio explicativo (não mostrar eixos vazios).
- Todo número é clicável quando faz sentido drill-down (lista de tasks, página de projeto, etc.). Número sem drill é candidato a ser removido.

**Cores semânticas padronizadas:**

- verde = bom / dentro da meta
- amarelo = atenção / 80-100% de limite
- vermelho = ruim / > 100% de limite ou atrasado
- ciano (primary) = neutro / em andamento
- cinza = sem dado

**Nunca mostrar métrica vitrine.** Se uma métrica não gera decisão nem conversa, sai.

**Dashboards são responsivos, mas priorizam desktop denso.** Mobile recebe reorganização vertical sem degradar informação.

**Hierarquia visual de blocos:**

- Título do bloco em text-lg font-semibold + subtítulo mutado com a pergunta que o bloco responde
- Bloco contém 2-5 widgets em grid responsivo
- Widget = card com título + visualização + legenda/contexto

---

### 6.Z Padrão de dashboard denso

Dashboards do GetBrain Hub seguem estrutura hierárquica vertical:

1. Cabeçalho com controles globais (escopo temporal, filtros)
2. Linha de alertas acionáveis (só aparece se tem alerta — nunca vazia, nunca ornamental)
3. Linha de KPIs macro (4-6 cards compactos com valor + delta + sparkline)
4. Blocos temáticos (cada bloco responde a uma pergunta de negócio, título imperativo)

**Regras obrigatórias:**

- Todo KPI tem delta comparativo (vs período anterior). Sem histórico, mostrar "—", nunca mostrar 0 falso.
- Toda visualização tem estado vazio explicativo (não mostrar eixos vazios).
- Todo número é clicável quando faz sentido drill-down (lista de tasks, página de projeto, etc.). Número sem drill é candidato a ser removido.

**Cores semânticas padronizadas:**

- verde = bom / dentro da meta
- amarelo = atenção / 80-100% de limite
- vermelho = ruim / > 100% de limite ou atrasado
- ciano (primary) = neutro / em andamento
- cinza = sem dado

**Nunca mostrar métrica vitrine.** Se uma métrica não gera decisão nem conversa, sai.

**Dashboards são responsivos, mas priorizam desktop denso.** Mobile recebe reorganização vertical sem degradar informação.

**Hierarquia visual de blocos:**

- Título do bloco em text-lg font-semibold + subtítulo mutado com a pergunta que o bloco responde
- Bloco contém 2-5 widgets em grid responsivo
- Widget = card com título + visualização + legenda/contexto

---

## 7. Padrões de autenticação

### 7.1 Usuários internos (humans)
- Login via Supabase Auth com email + senha.
- Sessão persistente.
- Row em `humans` vinculada a `auth.users.id`.

### 7.2 Portal do cliente
- Auth separada, via magic link enviado por email.
- JWT carrega `company_id` e **expira em 90 dias fixos**.
- Não usa `auth.users` (ou usa uma role especial `portal_guest`).
- Só acessa rotas `/portal/*`.

### 7.3 Agentes de IA (ai_agents)
- Não têm login por UI. São "executados" pelo sistema via chave de API interna.
- Cada ação que fazem é registrada em `audit_logs` com o `actor_id` deles.

---

## 8. Módulos do sistema — visão geral

### 8.1 Módulos existentes (manter e integrar)
- **Financeiro** — já construído. Será refatorado no Prompt 01 para usar `companies`, `actors`, `humans`, `projects`.
- **Área Dev** — redefinida como **módulo macro hub** (v1.5). Estrutura: rota-mãe `/dev` com sub-abas internas (Dashboard, Kanban, Sprints, Backlog). Schema real de `tasks`, `sprints`, `task_assignees` introduzido no Prompt 03A.

### 8.2 Módulos macro (sidebar principal)

1. **Dashboard** — visão executiva geral
2. **Financeiro** — já construído (módulo macro plano)
3. **Projetos** — em construção (Prompts 02, 02b, 02c)
4. **Área Dev** — módulo macro hub de engenharia. Rota-mãe: `/dev` Sub-abas:
   - **Dashboard** `/dev` (default) — Métricas de produtividade, entrega, gargalos e qualidade. É a tela que Daniel abre na segunda-feira pra saber "estamos entregando?"
   - **Kanban** `/dev/kanban` — Board operacional da sprint ativa. Tela principal dos devs no dia-a-dia.
   - **Sprints** `/dev/sprints` — Gestão de sprints (criar, ativar, encerrar, comparar). Histórico e retrospectivas.
   - **Backlog** `/dev/backlog` — Lista priorizável de tasks sem sprint atribuída. Ponte entre "ideia/bug reportado" e "Kanban".
   
   Tela cheia de task: `/dev/tasks/:code` (ex: `/dev/tasks/TASK-0042`) — padrão GitHub Issues / Linear. Layout 70/30, ver seção 6.
   
   **Princípio de separação:** o Dashboard responde perguntas, o Kanban é ferramenta de execução diária, Sprints é planejamento, Backlog é pipeline de entrada. Nunca duplicar função entre abas.
5. **CRM** — futuro (pipeline comercial, leads, propostas)
6. **Suporte** — futuro (tickets globais, kanban macro)
7. **Manutenção** — futuro (contratos ativos, recorrência)
8. **Tokens** — futuro (consumo agregado por cliente e por projeto)
9. **Configurações** — já construído (dentro do Financeiro por ora, vai migrar)

### 8.3 Estrutura padrão de abas dentro de uma página de entidade (ex: Projetos)

Sub-abas "de gestão" (controlam o projeto em si):

- Visão Geral
- Escopo
- Marcos
- Dependências
- Riscos
- Integrações
- Time & Contratos
- Atividade

Sub-aba "Operacional" (consolida indicadores de módulos macro filtrados por este projeto):

- Painel Financeiro (receita contratada, recebida, pendente, custo, margem)
- Painel Tarefas (contagem por status, horas estimadas × reais, progresso)
- Painel Suporte (tickets abertos, SLA, resolvidos no mês)
- Painel Tokens (consumo mensal × bolsão)

Cada painel tem botão "Ver em [Módulo]" que leva ao módulo macro filtrado pelo projeto atual.

**Integrações:** seguir mapa da Seção 13 do ARCHITECTURE.md.

### 8.4 Módulos futuros (Fase 2 e 3)
- Gerador de proposta com IA
- Gerador de contrato com IA
- Motor de marketing (criativos, calendário editorial, IA estrategista)
- Gestor de secrets (substituir Discord)
- Integração com OpenClaw (agentes de IA executando tarefas)
- Relançamento MyDarwin (após revisão de posicionamento)

---

## 9. Como o Lovable deve trabalhar

### 9.1 Protocolo de cada prompt
Todo prompt enviado ao Lovable começa com:

> **"Leia o `ARCHITECTURE.md` na raiz do projeto antes de qualquer ação. Siga rigorosamente os princípios, convenções e padrões definidos lá. Se algo neste prompt conflitar com `ARCHITECTURE.md`, o `ARCHITECTURE.md` prevalece e você deve me alertar sobre o conflito antes de prosseguir."**

### 9.2 Tamanho dos prompts
Prompts são **pequenos e focados**. Cada prompt entrega **uma funcionalidade coesa** — não um módulo inteiro. A Fase 1 inteira terá entre 40 e 60 prompts pequenos.

### 9.3 Ordem de execução dentro de um prompt
1. Atualizar/criar schema no Supabase (SQL)
2. Atualizar/criar tipos TypeScript
3. Atualizar/criar componentes React
4. Atualizar/criar rotas
5. Popular seed data se necessário
6. Testar criação/edição/exclusão

### 9.4 Proibições
- ❌ Nunca usar `localStorage` / `sessionStorage` para dados de domínio (usar Supabase)
- ❌ Nunca criar tabelas sem RLS
- ❌ Nunca usar DELETE real (usar soft delete)
- ❌ Nunca introduzir dados mockados com nomes fictícios depois da Fundação
- ❌ Nunca quebrar referências de foreign key existentes sem migration explícita
- ❌ Nunca usar cor hex hardcoded em componente — sempre token CSS

### 9.5 Obrigações
- ✅ Sempre criar migration SQL nomeada com timestamp
- ✅ Sempre criar policy RLS para toda tabela nova
- ✅ Sempre criar trigger de `updated_at`
- ✅ Sempre usar TypeScript estrito (`strict: true`)
- ✅ Sempre tratar estados de loading e erro na UI
- ✅ Sempre usar `react-hook-form` + `zod` para formulários
- ✅ Sempre usar `@tanstack/react-query` para fetch

---

## 10. Glossário

- **Actor:** qualquer entidade (humana ou IA) que executa trabalho no sistema.
- **Human:** actor do tipo humano. Faz login. Ex: Daniel, Vitor, João Pedro.
- **AI Agent:** actor do tipo agente de IA. Executa tarefas automatizadas.
- **Person:** pessoa externa. Contato de cliente. Não faz login no sistema interno.
- **Company:** empresa externa. Cliente, prospect, fornecedor ou parceiro.
- **Project:** projeto entregável. Pertence a uma company. Tem orçamento e prazo.
- **Maintenance Contract:** contrato mensal recorrente de manutenção vinculado a um projeto entregue.
- **Task:** tarefa dentro de um projeto. Atribuída a um ou mais actors.
- **Sprint:** ciclo de tempo (geralmente 1-2 semanas) com conjunto de tasks.
- **Ticket:** solicitação de suporte ou feature. Aberta por pessoa (via portal) ou por actor interno.
- **Token Budget:** bolsão mensal de tokens de IA contratado com o cliente. Excedente é cobrado.
- **MRR:** Monthly Recurring Revenue. Soma dos `monthly_fee` de todos os `maintenance_contracts` ativos.
- **Organization:** tenant do sistema. Por ora, só a GetBrain.
- **Portal:** área externa acessada por clientes via magic link, sem login tradicional.

---

## 11. Estado dos dados-semente (seed)

Ao final da Fundação (Prompt 01), o banco deve conter:

**Organizations:**
- GetBrain (UUID fixo `00000000-0000-0000-0000-000000000001`)

**Actors + Humans:**
- Daniel (owner, founder)
- Vitor Correa (developer, pj, fixed_monthly_pay=3000)
- João Pedro (developer, pj, fixed_monthly_pay=2000)

**Companies (clientes reais):**
- Equipe Certa (setor: RH/recrutamento)
- NOI
- No Frontier (setor: tradução/interpretação)

**Projects (os três em andamento, com status corretos):**
- Equipe Certa — Sistema de Triagem de Candidatos (status: em_manutencao, project_type: sistema_personalizado)
- NOI — Sistema Personalizado (status: em_desenvolvimento, project_type: sistema_personalizado)
- No Frontier — Sistema de Tradução e Interpretação (status: em_manutencao, project_type: sistema_personalizado)

**Maintenance Contracts (os dois que pagam manutenção hoje):**
- Equipe Certa → monthly_fee=750, discount=50%, status=active
- No Frontier → monthly_fee=550, discount=50%, status=active

Sem dados fictícios. Sem "João Mendes" ou "Ana Ribeiro".

> As 4 novas tabelas (`project_dependencies`, `project_milestones`, `project_integrations`, `project_risks`) começam vazias. Serão populadas por Daniel à medida que ele configurar os 3 projetos existentes.

> **Nota v1.6 — Seed histórico descartável:**
>
> Alguns módulos precisam de histórico para alimentar gráficos de tendência desde o primeiro dia. Exemplo: Dashboard Dev precisa de pelo menos 3 sprints para mostrar evolução de velocity, precisão de estimativa, etc.
>
> Quando isso ocorre, criar seed histórico descartável seguindo regras:
>
> - Sprints/entidades fake usam código fora do range natural (ex: SPR-000, SPR--001) pra serem visualmente identificáveis.
> - Campo metadata JSONB da entidade (se houver) ou comentário no seed SQL marca: `"seed_fake": true`, `"discard_after": "quando houver 3 sprints reais"`.
> - Criar migration separada `seeds/historical-discardable-<modulo>.sql` para facilitar remoção futura.
> - Registrar na lista de "dívidas técnicas" do módulo que esse seed precisa ser limpo quando histórico real existir.

---

## 12. Histórico de versões

- **v1.5 — 23/04/2026:**
  - Área Dev redefinida como **módulo macro hub** (antes era macro plano)
  - Sub-abas formalizadas: Dashboard, Kanban, Sprints, Backlog
  - Adicionado padrão canônico de módulo hub vs plano (seção 6.X)
  - Adicionado padrão canônico de página de detalhe em tela cheia (seção 6.Y)
  - Nota de protocolo Lovable: sub-abas de hub viram prompts separados
  - Sem alterações de schema nesta versão — é decisão arquitetural de UI/navegação
- **v1.4 (22/04/2026):**
  - Novo princípio 2.14: módulos macro vs sub-abas com critério de agregação global
  - Novo princípio 2.15: views SQL em tempo real como padrão para métricas (proibido campos derivados via trigger)
  - Seção 8 reorganizada com mapa consolidado de navegação
  - Nova aba "Operacional" dentro de Projetos consolidando indicadores de módulos macro
  - Seção 13 expandida com mapa de entradas (IN) para Projetos
- **v1.3 (21/04/2026):**
  - Novo princípio 2.13: integração entre módulos de primeira classe
  - Nova Seção 13: Mapa de Integrações entre Módulos
  - Definida barra de qualidade: todo módulo tem Camada 1 (dados+funcionalidade), Camada 2 (visual premium estilo Pipedrive/HubSpot), Camada 3 (integrações/automações com outros módulos)
  - Definidos campos padrão para rastreabilidade de origem em lançamentos automáticos: `source_module`, `source_entity_type`, `source_entity_id`, `is_automatic`
- **v1.2 (21/04/2026):**
  - Adicionados 7 campos TEXT à tabela `projects` para escopo estruturado (`business_context`, `scope_in`, `scope_out`, `premises`, `deliverables`, `technical_stack`, `identified_risks`)
  - Adicionadas 4 tabelas fundacionais novas (`project_dependencies`, `project_milestones`, `project_integrations`, `project_risks`)
  - Adicionados 7 enums novos correspondentes
  - Novo princípio 2.12: escopo estruturado
  - Drawer do projeto reorganizado em 8 abas: Visão Geral, Escopo, Dependências, Marcos, Riscos, Integrações, Atores & Manutenção, Atividade
  - Novo KPI na listagem de Projetos: "Dependências Bloqueantes"
- **v1.1 (21/04/2026):**
  - `project_type` reduzido para 5 opções (removido `manutencao`)
  - Adicionada tabela `maintenance_contracts` (seção 4.10)
  - `monthly_fee` movido de `projects` para `maintenance_contracts`
  - Novo princípio 2.11: separação entre projetos e contratos de manutenção
  - Módulo "Suporte/Tickets" e "Portal do Cliente" refatorados em módulo combinado **Manutenção + Suporte** (item 5) + Portal do Cliente separado (item 6)
  - Magic link do Portal do Cliente: 90 dias fixos (antes era 30)
  - Daniel: role=owner, employment_type=founder (confirmado)
  - Código de projeto: formato PRJ-001 sequencial (confirmado)
  - Primary color: ciano #06b6d4 (confirmado)
  - Seção 11 atualizada com seed incluindo `maintenance_contracts`
- **v1.0 (21/04/2026):** Documento inicial. Define Actors, entidades base, princípios, padrões de UI, convenções de schema e protocolo de trabalho com Lovable.

---

## 13. Mapa de integrações entre módulos

Esta seção define quais eventos de um módulo disparam quais ações em outro módulo. Todo prompt que cria ou modifica um módulo deve incluir seção "Integrações ativas deste módulo" com referência a esta tabela.

### 13.1 Projetos → Financeiro

| Evento gatilho | Ação automatizada | Quem dispara |
|----------------|-------------------|--------------|
| `projects.status` muda para `aceito` | Criar N lançamentos de Contas a Receber no Financeiro, um por parcela do `contract_value / installments_count`, espaçados mensalmente a partir de `start_date` ou data atual. Marca `source_module='projects'`, `is_automatic=true`. | Trigger no banco + Edge Function |
| `projects.status` muda para `cancelado` | Listar lançamentos futuros com `source_entity_id = project.id` e marcar como `cancelled`. Perguntar ao usuário (modal) se deve estornar parcelas já pagas. | Edge Function |
| `projects.status` muda para `entregue` | Sugerir (não criar automaticamente) abertura de `maintenance_contract` com valores pré-preenchidos baseados no tipo de projeto. Exibir modal de confirmação. | Frontend após trigger |
| Ator alocado a projeto | Calcular custo projetado mensal (`humans.hourly_cost` × horas_semana × 4) e expor em "Custos do Projeto". | View ou função |

### 13.2 Manutenção → Financeiro

| Evento gatilho | Ação automatizada |
|----------------|-------------------|
| `maintenance_contract.status = active` criado | Criar série de lançamentos recorrentes mensais em Contas a Receber, a partir de `start_date`, com valor `monthly_fee × (1 - discount_percent/100)`. |
| `maintenance_contract.status` muda para `paused` | Marcar lançamentos futuros (ainda não-pagos) como `paused`. |
| `maintenance_contract.status` muda para `ended` / `cancelled` | Marcar lançamentos futuros como `cancelled`. Lançamentos já pagos ficam intactos. |
| `maintenance_contract.end_date` atingido | Mudar status automaticamente para `ended` (Edge Function agendada). |

### 13.3 Tokens → Financeiro (futuro, Prompt do módulo Tokens)

| Evento gatilho | Ação |
|----------------|------|
| Consumo atinge 80% do `token_budget_brl` | Notificar Daniel (email/UI). |
| Consumo ultrapassa 100% | Criar lançamento adicional em Contas a Receber com valor do excedente, `source_module='tokens'`. |

### 13.4 CRM → Projetos (futuro, Prompt do módulo CRM)

| Evento gatilho | Ação |
|----------------|------|
| Pipeline muda para `fechado` | Criar `project` com `status='aceito'`, pré-populando `company_id`, `project_type`, `contract_value`, descrição a partir do lead. |
| Pipeline muda para `perdido` | Atualizar `companies.status='lost'`. |

### 13.5 Suporte → Manutenção (futuro, Prompt do módulo Suporte)

| Evento gatilho | Ação |
|----------------|------|
| Ticket resolvido | Registrar horas gastas no `maintenance_contract` vinculado. Alertar se acumulado > `hours_budget`. |
| Ticket reaberto 2+ vezes | Aumentar prioridade, notificar Daniel. |

### 13.6 Projetos → Atividade global

Toda mudança de status ou campo importante em qualquer módulo deve gerar entrada em `audit_logs` — base para feed de atividade do projeto, dashboard global e auditoria.

### 13.7 Regras gerais de implementação

- **Edge Functions (Supabase)** implementam automações que atravessam tabelas.
- **Triggers SQL** implementam automações simples dentro de uma tabela.
- **Frontend** dispara eventos explicitamente quando user confirma ação que precisa de input (ex: sugerir criar contrato de manutenção).
- Toda tabela que recebe eventos de outros módulos tem colunas: `source_module text`, `source_entity_type text`, `source_entity_id uuid`, `is_automatic boolean default false`.
- **Nenhuma automação roda sem estar documentada aqui primeiro.** Se um prompt futuro precisa adicionar automação, atualizar esta seção.

### 13.8 Projetos ← outros módulos (entradas)

| Módulo origem | Evento | Como aparece em Projetos |
|---------------|--------|--------------------------|
| Área Dev (Tarefas) | Task criada/atualizada com `project_id` preenchido | Contagem no painel Tarefas da aba Operacional |
| Área Dev (Tarefas) | Task com `hours_actual` registrado | Soma em `project_metrics.hours_actual` |
| Financeiro (Lançamentos) | Lançamento com `source_entity_id = project.id` e status pago | Soma em `project_metrics.revenue_received` |
| Financeiro (Lançamentos) | Lançamento com `source_entity_id = project.id` e status pendente | Soma em `project_metrics.revenue_pending` |
| Suporte (Tickets) | Ticket criado com `project_id` | Contagem no painel Suporte |
| Tokens | Consumo registrado com `project_id` | Soma no painel Tokens |
| CRM | Pipeline fechado | Cria projeto automaticamente com `status='aceito'` |

### 13.9 Princípio de agregação

Todas as métricas cruzadas são expostas via view `project_metrics` (criada no Prompt 02c). Nenhum módulo precisa "saber" que Projetos está consumindo — o Projetos simplesmente lê a view, que faz LEFT JOIN com as tabelas dos outros módulos. Quando uma tabela-fonte ainda não existe (Suporte, Tokens), a view retorna 0 para aquele agregado — e passa a retornar dados reais automaticamente quando a tabela for criada no prompt futuro.

---

## 12. Histórico de versões

- **v1.5 — 23/04/2026:**
  - Área Dev redefinida como **módulo macro hub** (antes era macro plano)
  - Sub-abas formalizadas: Dashboard, Kanban, Sprints, Backlog
  - Adicionado padrão canônico de módulo hub vs plano (seção 6.X)
  - Adicionado padrão canônico de página de detalhe em tela cheia (seção 6.Y)
  - Nota de protocolo Lovable: sub-abas de hub viram prompts separados
  - Sem alterações de schema nesta versão — é decisão arquitetural de UI/navegação
- **v1.4 (22/04/2026):**
  - Novo princípio 2.14: módulos macro vs sub-abas com critério de agregação global
  - Novo princípio 2.15: views SQL em tempo real como padrão para métricas (proibido campos derivados via trigger)
  - Seção 8 reorganizada com mapa consolidado de navegação
  - Nova aba "Operacional" dentro de Projetos consolidando indicadores de módulos macro
  - Seção 13 expandida com mapa de entradas (IN) para Projetos
- **v1.3 (21/04/2026):**
  - Novo princípio 2.13: integração entre módulos de primeira classe
  - Nova Seção 13: Mapa de Integrações entre Módulos
  - Definida barra de qualidade: todo módulo tem Camada 1 (dados+funcionalidade), Camada 2 (visual premium estilo Pipedrive/HubSpot), Camada 3 (integrações/automações com outros módulos)
  - Definidos campos padrão para rastreabilidade de origem em lançamentos automáticos: `source_module`, `source_entity_type`, `source_entity_id`, `is_automatic`
- **v1.2 (21/04/2026):**
  - Adicionados 7 campos TEXT à tabela `projects` para escopo estruturado (`business_context`, `scope_in`, `scope_out`, `premises`, `deliverables`, `technical_stack`, `identified_risks`)
  - Adicionadas 4 tabelas fundacionais novas (`project_dependencies`, `project_milestones`, `project_integrations`, `project_risks`)
  - Adicionados 7 enums novos correspondentes
  - Novo princípio 2.12: escopo estruturado
  - Drawer do projeto reorganizado em 8 abas: Visão Geral, Escopo, Dependências, Marcos, Riscos, Integrações, Atores & Manutenção, Atividade
  - Novo KPI na listagem de Projetos: "Dependências Bloqueantes"
- **v1.1 (21/04/2026):**
  - `project_type` reduzido para 5 opções (removido `manutencao`)
  - Adicionada tabela `maintenance_contracts` (seção 4.10)
  - `monthly_fee` movido de `projects` para `maintenance_contracts`
  - Novo princípio 2.11: separação entre projetos e contratos de manutenção
  - Módulo "Suporte/Tickets" e "Portal do Cliente" refatorados em módulo combinado **Manutenção + Suporte** (item 5) + Portal do Cliente separado (item 6)
  - Magic link do Portal do Cliente: 90 dias fixos (antes era 30)
  - Daniel: role=owner, employment_type=founder (confirmado)
  - Código de projeto: formato PRJ-001 sequencial (confirmado)
  - Primary color: ciano #06b6d4 (confirmado)
  - Seção 11 atualizada com seed incluindo `maintenance_contracts`
- **v1.0 (21/04/2026):** Documento inicial. Define Actors, entidades base, princípios, padrões de UI, convenções de schema e protocolo de trabalho com Lovable.

---

## 13. Mapa de integrações entre módulos

Esta seção define quais eventos de um módulo disparam quais ações em outro módulo. Todo prompt que cria ou modifica um módulo deve incluir seção "Integrações ativas deste módulo" com referência a esta tabela.

### 13.1 Projetos → Financeiro

| Evento gatilho | Ação automatizada | Quem dispara |
|----------------|-------------------|--------------|
| `projects.status` muda para `aceito` | Criar N lançamentos de Contas a Receber no Financeiro, um por parcela do `contract_value / installments_count`, espaçados mensalmente a partir de `start_date` ou data atual. Marca `source_module='projects'`, `is_automatic=true`. | Trigger no banco + Edge Function |
| `projects.status` muda para `cancelado` | Listar lançamentos futuros com `source_entity_id = project.id` e marcar como `cancelled`. Perguntar ao usuário (modal) se deve estornar parcelas já pagas. | Edge Function |
| `projects.status` muda para `entregue` | Sugerir (não criar automaticamente) abertura de `maintenance_contract` com valores pré-preenchidos baseados no tipo de projeto. Exibir modal de confirmação. | Frontend após trigger |
| Ator alocado a projeto | Calcular custo projetado mensal (`humans.hourly_cost` × horas_semana × 4) e expor em "Custos do Projeto". | View ou função |

### 13.2 Manutenção → Financeiro

| Evento gatilho | Ação automatizada |
|----------------|-------------------|
| `maintenance_contract.status = active` criado | Criar série de lançamentos recorrentes mensais em Contas a Receber, a partir de `start_date`, com valor `monthly_fee × (1 - discount_percent/100)`. |
| `maintenance_contract.status` muda para `paused` | Marcar lançamentos futuros (ainda não-pagos) como `paused`. |
| `maintenance_contract.status` muda para `ended` / `cancelled` | Marcar lançamentos futuros como `cancelled`. Lançamentos já pagos ficam intactos. |
| `maintenance_contract.end_date` atingido | Mudar status automaticamente para `ended` (Edge Function agendada). |

### 13.3 Tokens → Financeiro (futuro, Prompt do módulo Tokens)

| Evento gatilho | Ação |
|----------------|------|
| Consumo atinge 80% do `token_budget_brl` | Notificar Daniel (email/UI). |
| Consumo ultrapassa 100% | Criar lançamento adicional em Contas a Receber com valor do excedente, `source_module='tokens'`. |

### 13.4 CRM → Projetos (futuro, Prompt do módulo CRM)

| Evento gatilho | Ação |
|----------------|------|
| Pipeline muda para `fechado` | Criar `project` com `status='aceito'`, pré-populando `company_id`, `project_type`, `contract_value`, descrição a partir do lead. |
| Pipeline muda para `perdido` | Atualizar `companies.status='lost'`. |

### 13.5 Suporte → Manutenção (futuro, Prompt do módulo Suporte)

| Evento gatilho | Ação |
|----------------|------|
| Ticket resolvido | Registrar horas gastas no `maintenance_contract` vinculado. Alertar se acumulado > `hours_budget`. |
| Ticket reaberto 2+ vezes | Aumentar prioridade, notificar Daniel. |

### 13.6 Projetos → Atividade global

Toda mudança de status ou campo importante em qualquer módulo deve gerar entrada em `audit_logs` — base para feed de atividade do projeto, dashboard global e auditoria.

### 13.7 Regras gerais de implementação

- **Edge Functions (Supabase)** implementam automações que atravessam tabelas.
- **Triggers SQL** implementam automações simples dentro de uma tabela.
- **Frontend** dispara eventos explicitamente quando user confirma ação que precisa de input (ex: sugerir criar contrato de manutenção).
- Toda tabela que recebe eventos de outros módulos tem colunas: `source_module text`, `source_entity_type text`, `source_entity_id uuid`, `is_automatic boolean default false`.
- **Nenhuma automação roda sem estar documentada aqui primeiro.** Se um prompt futuro precisa adicionar automação, atualizar esta seção.

### 13.8 Projetos ← outros módulos (entradas)

| Módulo origem | Evento | Como aparece em Projetos |
|---------------|--------|--------------------------|
| Área Dev (Tarefas) | Task criada/atualizada com `project_id` preenchido | Contagem no painel Tarefas da aba Operacional |
| Área Dev (Tarefas) | Task com `hours_actual` registrado | Soma em `project_metrics.hours_actual` |
| Financeiro (Lançamentos) | Lançamento com `source_entity_id = project.id` e status pago | Soma em `project_metrics.revenue_received` |
| Financeiro (Lançamentos) | Lançamento com `source_entity_id = project.id` e status pendente | Soma em `project_metrics.revenue_pending` |
| Suporte (Tickets) | Ticket criado com `project_id` | Contagem no painel Suporte |
| Tokens | Consumo registrado com `project_id` | Soma no painel Tokens |
| CRM | Pipeline fechado | Cria projeto automaticamente com `status='aceito'` |

### 13.9 Princípio de agregação

Todas as métricas cruzadas são expostas via view `project_metrics` (criada no Prompt 02c). Nenhum módulo precisa "saber" que Projetos está consumindo — o Projetos simplesmente lê a view, que faz LEFT JOIN com as tabelas dos outros módulos. Quando uma tabela-fonte ainda não existe (Suporte, Tokens), a view retorna 0 para aquele agregado — e passa a retornar dados reais automaticamente quando a tabela for criada no prompt futuro.

---

## 14. O que esta v1.5 NÃO faz

Para evitar escopo inflado, o adendo não inclui:

- Schema de tasks/sprints/task_assignees → fica no Prompt 03A
- Definição detalhada do dashboard → fica no Prompt 03C (ARCHITECTURE só referencia a existência da view dev_dashboard_metrics, não detalha campos)
- Regras de permissão para quem vê cada sub-aba → adiado para quando RLS for endurecido
- Componentes visuais específicos do kanban denso → ficam no Prompt 03A

---

## 15. Próximos passos após aplicar este adendo

1. Daniel aplica o adendo no ARCHITECTURE.md do repo, commita.
2. Claude gera Prompt 03A — dados reais + kanban denso. O prompt já assumirá a estrutura de sub-abas desta v1.5, então vai incluir o esqueleto do macro hub (rota /dev com Tabs) além do kanban em si.
3. Em seguida, Prompt 03B (tela cheia task) e 03C (dashboard).
