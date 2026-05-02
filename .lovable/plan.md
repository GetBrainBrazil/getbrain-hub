## Objetivo

Preencher o projeto **Sunbright Engenharia (PRJ-0015)** como se fosse criado e gerenciado manualmente — populando **todos os submódulos** (Visão Geral, Escopo, Operacional, Tarefas, Marcos, Dependências, Riscos, Integrações) com dados realistas extraídos do DEAL-008, do que já está no projeto e completando o que falta com inferências coerentes.

Importante: este é um **trabalho de dados** sobre o registro existente (PRJ-0015). **Nada de UI/lógica nova** será alterado. Tudo é feito via migrations (UPDATE/INSERT) porque o sandbox só tem permissão de leitura/insert direto.

---

## O que está hoje em PRJ-0015

- Status: `aceito` | Tipo: `sistema_personalizado` | Cliente: Sunbright Engenharia
- `business_context`, `deliverables` (7), `premises` (4), `identified_risks` (4), `technical_stack` (2), `acceptance_criteria` (6) — **OK**
- `commercial_context` JSON: dor + solução atual + confiança de estimativa — **OK** (já reorganizado)
- **Faltando** no projeto: `contract_value`, `installments_count`, `start_date`, `estimated_delivery_date`, `description`, `notes`, `primary_contact_person_id`, `token_budget_brl`, `scope_in`, `scope_out`
- **Vazias**: `project_milestones`, `project_dependencies`, `project_risks`, `project_integrations`, `project_actors`, `maintenance_contracts`

Dados disponíveis no DEAL-008 a aproveitar:  
contrato R$ 4.000 implantação + R$ 600 MRR (`on_delivery`), 7 parcelas com 1ª em 08/06/2026, contato Vanessa, custo extra Z-API R$ 100/mês, complexidade 3, MRR trigger `on_delivery`.

---

## Plano de preenchimento

### 1. Tabela `projects` — completar campos do header e da Visão Geral

UPDATE em PRJ-0015:

- `contract_value = 4000`, `installments_count = 7`
- `start_date = 2026-05-05`, `estimated_delivery_date = 2026-07-15`
- `primary_contact_person_id` = Vanessa (3d147a48…)
- `token_budget_brl = 150` (consistente com escopo IA conservador)
- `description`: parágrafo curto descrevendo o produto (CRM + WhatsApp + Agentes IA + Analytics)
- `notes`: observações operacionais (cliente embrionário, foco em SDR e pós-venda)
- `scope_in`: bullets do que está incluso (resumido a partir de `deliverables`)
- `scope_out`: bullets do que NÃO está incluso (treinamento presencial, integração com ERPs, migração de base, etc.)

### 2. `maintenance_contracts` — criar contrato de manutenção

INSERT 1 linha:

- `monthly_fee = 600`, `token_budget_brl = 150`, `hours_budget = 8`
- `start_date = 2026-07-15` (alinhado com entrega + trigger `on_delivery`)
- `status = 'active'`
- `notes`: "MRR começa na entrega. Inclui Z-API R$ 100/mês como custo de integração."

### 3. `project_milestones` — criar 5 marcos com cobrança parcelada

Sequência alinhada com 7 parcelas de R$ 571,43 (4000/7), spread por marco:


| #   | Título                                     | Data       | Status       | Cobra? | Valor                |
| --- | ------------------------------------------ | ---------- | ------------ | ------ | -------------------- |
| 1   | Kickoff e descoberta técnica               | 12/05/2026 | concluido    | sim    | 571,43               |
| 2   | Setup base + integração WhatsApp Cloud API | 26/05/2026 | em_andamento | sim    | 571,43               |
| 3   | Módulo CRM + base de leads                 | 16/06/2026 | planejado    | sim    | 1142,86 (2 parcelas) |
| 4   | Agentes IA (SDR + pós-venda) treinados     | 30/06/2026 | planejado    | sim    | 1142,86 (2 parcelas) |
| 5   | Analytics + monitoramento + go-live        | 15/07/2026 | planejado    | sim    | 571,43               |


### 4. `project_dependencies` — criar 4 dependências (vindas do cliente)

- Conta ativa Meta WhatsApp Cloud API (kind: `cliente`, blocking, expected 10/05)
- Base de leads exportada/CSV (kind: `cliente`, blocking, expected 15/05)
- Aprovação dos templates de mensagem WhatsApp (kind: `cliente`, blocking, expected 20/05)
- Definição da hierarquia de usuários e permissões (kind: `cliente`, não-blocking, expected 22/05)

### 5. `project_risks` — criar 4 riscos (mesmos do `identified_risks`, agora estruturados)


| Risco                            | Severidade | Probabilidade | Status      | Mitigação                                       |
| -------------------------------- | ---------- | ------------- | ----------- | ----------------------------------------------- |
| API WhatsApp instável/bloqueios  | alta       | media         | monitorando | Fallback via segundo número + retry com backoff |
| Base de leads desatualizada      | media      | alta          | monitorando | Validação prévia + enriquecimento amostral      |
| Ajuste fino dos agentes demorado | media      | media         | monitorando | Sprints semanais de tuning + métricas A/B       |
| Aprovação de templates WhatsApp  | alta       | media         | monitorando | Submeter templates já no kickoff                |


### 6. `project_integrations` — criar 3 integrações


| Nome                | Provider | Status | Custo/mês | Propósito                                   |
| ------------------- | -------- | ------ | --------- | ------------------------------------------- |
| WhatsApp Cloud API  | Meta     | ativa  | 0         | Disparo e recebimento de mensagens          |
| Z-API               | Z-API    | ativa  | 100       | Camada de envio (já no extra_costs do deal) |
| OpenAI / Lovable AI | OpenAI   | ativa  | 150       | Agentes generativos SDR + pós-venda         |


### 7. `project_actors` — alocar Daniel como owner

INSERT 1 linha: Daniel (owner do deal: 79f250f2…), `role_in_project = responsavel_tecnico`, `allocation_percent = 50`, `started_at = 2026-05-05`.

### 8. Limpar `commercial_context`

Adicionar `decision_makers` ("Vanessa — sócia") e ajustar `pricing_rationale` ("R$ 4k implantação em 7x + R$ 600 MRR after delivery; Z-API R$ 100/mês custo passado adiante via MRR.") para a Visão Geral ficar redonda.

---

## Detalhes técnicos

- Tudo é executado em **uma migration** (`20260502_seed_prj0015_full.sql`) com UPDATEs e INSERTs idempotentes (`ON CONFLICT DO NOTHING` onde aplicável; usar UUIDs determinísticos via `gen_random_uuid()` aceitável já que a tabela está vazia).
- Não toca em schema, não muda RLS, não cria função.
- `organization_id` em todas as inserções: `00000000-0000-0000-0000-000000000001` (mesma do projeto).
- Não mexe em `crm.deals` — o deal já está fechado e correto.
- Após rodar, refresh de `/projetos/a8b4179b…` deve mostrar todas as abas preenchidas e o card Operacional (que lê `project_metrics`) com KPIs financeiros consistentes.

## Validação pós-execução

Rodar SELECT de contagem nas 6 sub-tabelas + leitura do projeto e confirmar:

- Marcos: 5 | Dependências: 4 | Riscos: 4 | Integrações: 3 | Atores: 1 | Manutenção: 1
- `contract_value=4000`, `installments_count=7`, `primary_contact_person_id` setado
- Aba Operacional mostra MRR R$ 600 e custo integração R$ 250/mês  
  
  
Fazer isso para todos os card que forem dados como ganho, quero que esse processo de automação seja feito sempre, seguindo as correções que fizemos aqui com a sunbtright