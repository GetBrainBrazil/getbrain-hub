## Objetivo

Fechar as lacunas entre **Deal (CRM)** e **Projeto** ao usar o "Marcar como ganho", copiando os campos que ainda se perdem e centralizando as configurações financeiras no momento da conversão. Também trazer da lógica de Projetos algumas integrações bidirecionais úteis.

---

## Mapeamento atual (o que já passa, o que falta)

```text
DEAL                              PROJETO                    STATUS
────────────────────────────────  ─────────────────────────  ───────────────
company_id                        company_id                 ✅ ok
title                             name                       ✅ ok
estimated_value                   contract_value             ✅ ok
project_type                      project_type               ✅ ok
scope_summary/in/out              description/scope_in/out   ✅ ok
deliverables/premises/risks       idem (arrays)              ✅ ok
acceptance_criteria               idem                       ✅ ok
technical_stack                   idem                       ✅ ok
estimated_hours_total             estimated_hours_baseline   ✅ ok
estimated_complexity              complexity_baseline        ✅ ok
business_context                  business_context           ✅ ok
organograma_url / mockup_url      idem                       ✅ ok
deal_dependencies                 project_dependencies       ✅ ok (mapeado)
proposta aceita                   proposals.project_id       ✅ ok
─────────────────────────────────────────────────────────────────────────────
contact_person_id                 (perdido)                  ❌ FALTA
origin_lead_id                    (perdido — sem origem)     ❌ FALTA
pain_description/category/cost    (perdido)                  ❌ FALTA (contexto)
competitors / pricing_rationale   (perdido)                  ❌ FALTA (contexto)
clientes.id (financeiro)          match por nome frágil      ⚠️ FALTA CNPJ
categoria/centro_custo/conta      não escolhidos             ❌ FALTA na UI
```

---

## Ações

### Ação A — Migration: completar `close_deal_as_won`

1. **Contato principal** → propaga `deals.contact_person_id` para `projects.primary_contact_person_id` (criar coluna se não existir e popular `company_people.is_primary_contact = true` quando aplicável).
2. **Origem do lead** → criar `projects.origin_lead_source_id` (FK opcional para `crm_lead_sources`) e copiar do lead/deal.
3. **Contexto comercial** → criar `projects.commercial_context jsonb` consolidando `pain_description`, `pain_category`, `pain_cost_brl_monthly`, `pain_hours_monthly`, `competitors`, `decision_makers`, `pricing_rationale`, `current_solution`. Não polui colunas operacionais; fica disponível como leitura/aba "Contexto comercial" no projeto.
4. **Cliente financeiro robusto** → resolver `cliente_id`:
   - 1º tenta por `companies.cnpj` ↔ `clientes.cpf_cnpj`,
   - 2º fallback por nome (lógica atual),
   - 3º se nenhum: cria `clientes` automaticamente com dados de `companies` (nome, cnpj, sector, e-mails/telefones do contato primário).
5. **Propagar IDs financeiros** escolhidos no diálogo (categoria, centro de custo, conta bancária, meio de pagamento) para `financial_recurrences` e parcelas geradas.

### Ação B — UI `DealWonDialog` (campos financeiros)

Adicionar bloco "Configuração financeira" (colapsável, com defaults inteligentes) com:

- **Categoria de receita** (`categorias` tipo `receita`) — default: última usada em receitas de projeto.
- **Centro de custo** (`centros_custo`).
- **Conta bancária** (`contas_bancarias`).
- **Meio de pagamento** (`meios_pagamento`).

Os IDs entram no `p_project_data` e são propagados pela RPC. Se vazios, mantém comportamento atual (parcelas sem categoria/conta — como hoje).

### Ação C — Integrações bidirecionais (copiar lógica de Projetos)

Inspirado no que já funciona em Projetos:

1. **Contatos da empresa visíveis nos dois lados** — já feito via `CompanyContactsPanel`. Reforço: marcar contato primário no projeto reflete na empresa e fica disponível pro próximo deal da mesma empresa.
2. **Anexos** — Projetos tem `anexos.projeto_id`. Adicionar suporte a `anexos.deal_id` (coluna nullable + RLS). Quando o deal for fechado, anexos do deal viram anexos do projeto (UPDATE simples). Assim, já no CRM o usuário pode anexar documentos comerciais sem precisar duplicar depois.
3. **Atalho de navegação** — no header do projeto criado, mostrar chip "Originado do deal `DEAL-008`" linkando de volta. No deal fechado, já existe link pro projeto; padronizar visual.
4. **Sincronia de status do cliente** — já feito (`relationship_status = active_client`). Adicionar inverso: quando todos os projetos da empresa terminarem (`status = concluido` ou cancelado), opção de marcar `relationship_status = inactive_client` (apenas sugestão via toast, não automático).

---

## Detalhes técnicos

**Novas colunas (migration):**
```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS primary_contact_person_id uuid REFERENCES people(id),
  ADD COLUMN IF NOT EXISTS origin_lead_source_id uuid REFERENCES crm_lead_sources(id),
  ADD COLUMN IF NOT EXISTS commercial_context jsonb DEFAULT '{}'::jsonb;

ALTER TABLE anexos
  ADD COLUMN IF NOT EXISTS deal_id uuid; -- sem FK rígida, igual projeto_id
```

**Resolução de cliente (pseudocódigo SQL):**
```sql
SELECT id INTO v_cliente_id FROM clientes
 WHERE cpf_cnpj = v_company.cnpj AND ativo
 LIMIT 1;

IF v_cliente_id IS NULL THEN
  SELECT id INTO v_cliente_id FROM clientes
   WHERE LOWER(TRIM(nome)) = LOWER(TRIM(v_company_name)) LIMIT 1;
END IF;

IF v_cliente_id IS NULL THEN
  INSERT INTO clientes (nome, razao_social, cpf_cnpj, tipo_pessoa, emails, telefones)
  VALUES (...)
  RETURNING id INTO v_cliente_id;
END IF;
```

**UI — bloco financeiro no `DealWonDialog`:**
- Hooks reutilizando `useCategorias`, `useCentrosCusto`, `useContasBancarias`, `useMeiosPagamento`.
- Layout em grid 2x2, colapsável com `<Collapsible>` aberto por padrão.
- Defaults: lê `localStorage` (`crm.lastWonFinancialDefaults`) para repetir escolha do último fechamento.

**Componente "Contexto comercial" no projeto:**
- Nova aba leve em `ProjetoDetailPage` lendo `projects.commercial_context` (read-only, com botão "Editar no deal de origem" se `source_deal_id` existir).

---

## Impacto / risco

- **Migration**: aditiva (3 colunas opcionais + 1 em `anexos`). Sem breaking change.
- **RPC**: mudança backwards-compatible — campos novos em `p_project_data` são opcionais.
- **UI**: o diálogo continua funcionando se o usuário não preencher financeiro.
- **Cache**: invalidar `['projects']`, `['movimentacoes']`, `['financial_recurrences']`, `['clientes']` (se cliente foi auto-criado) via `invalidateFinanceCaches` + `invalidateProject`.

---

## Resumo do que muda

| Onde | O quê |
|------|-------|
| `supabase/migrations/*` | Novas colunas em `projects` e `anexos`; `close_deal_as_won` v3 |
| `DealWonDialog.tsx` | Bloco "Configuração financeira" + persistência de defaults |
| `ProjetoDetailPage` | Aba "Contexto comercial" (read-only) + chip "Originado de…" |
| `anexos` / upload UI do CRM | Permitir anexar no deal; migrar pro projeto na conversão |
| `cacheInvalidation.ts` | Garantir invalidação cruzada após `close_deal_as_won` |

Pronto pra executar tudo (A + B + C) assim que aprovar.