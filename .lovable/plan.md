## 1. Auditoria — o que acontece HOJE quando você fecha como ganho

### Validações no front (`DealWonDialog.handleConfirm`)
- Nome do projeto preenchido
- Pelo menos 1 tipo de projeto
- Pelo menos 1 parcela com valor > 0 e data
- Se MRR ligado: valor > 0 e data de início
- Custos extras: descrição + valor consistentes

### Persistência no front, ANTES da RPC
1. `UPDATE deals` com tudo que foi ajustado no modal:
   - `discount_*` (desconto promocional sobre implementação)
   - `extra_costs` (jsonb)
   - `estimated_mrr_value`, `mrr_start_date`, `mrr_duration_months`, `mrr_discount_*`, `mrr_start_trigger`
   - `installments_count`, `first_installment_date`
   - `project_type_v2`, `pain_categories`
2. Se houver proposta com status `enviada` vinculada, marca como `convertida` + `accepted_at = now()`.

### RPC `close_deal_as_won(p_deal_id, p_project_data, p_installments)`

**a) Cliente financeiro** — busca por `companies.cnpj` em `clientes.cpf_cnpj`. Se não achar, cria novo cliente PJ.

**b) Cria `projects`** (uma linha) com:
- `code` PRJ-XXXX (sequence), `name`, `status='planning'`
- Copia do deal: `project_type` (legado), `project_type_v2`, `scope_in/out/bullets`, `business_context`, `company_id`, `owner_actor_id`, `source_deal_id`, `origin_lead_id`, `mrr_value`, `notes`, `estimated_hours_total`, `estimated_complexity`
- `commercial_context` jsonb com: `pain_description`, `pain_categories`, `pain_cost_brl_monthly`, `pain_hours_monthly`, `current_solution`, `competitors`, `decision_makers`, `pricing_rationale`, `budget_range_min/max`, `desired_start_date`, `desired_delivery_date`, `estimation_confidence`, `deliverables`, `premises`, `identified_risks`, `technical_stack`, `acceptance_criteria`, `mrr_start_trigger`, `mrr_discount_*`

**c) Anexos** — `UPDATE anexos SET projeto_id = novo_projeto WHERE deal_id = deal AND projeto_id IS NULL`

**d) Dependências do deal → tarefas do projeto** — cada `deal_dependencies` vira uma `tasks` (status `todo`, prioridade mapeada, `due_date = agreed_deadline`)

**e) Parcelas de implementação** — para cada parcela, cria 1 `financial_recurrences` tipo `parcelado`/`entrada`, `frequency='monthly'`, `total_installments=1`, com **a categoria/centro/conta/meio escolhidos no modal**. `source_module='crm'`, `source_entity='deal'`.

**f) MRR** (se valor > 0):
- 1 `financial_recurrences` tipo `recorrente`/`entrada`, mesma categoria/centro/conta/meio das parcelas (👈 esse é o problema), com campos de desconto temporário (`discount_active`, `discount_kind`, `discount_value`, `discount_full_amount`, `discount_months`, `discount_until_date`, `discount_until_stage`, `discount_started_at`)
- 1 `maintenance_contracts` (project_id, monthly_fee, desconto, start_date, status `active`)

**g) Custos extras** — para cada item, cria 1 `financial_recurrences` `unica`/`recorrente` direção `saida` (sem categoria/centro/conta/meio — também faltando)

**h) Atualiza o deal**: `stage='ganho'`, `probability_pct=100`, `closed_at=now()`, `generated_project_id`

**Retorno da RPC**: `{ project_id, project_code, cliente_id }`

### Pós-RPC no front
- `localStorage` salva os defaults financeiros para a próxima conversão
- Toast de sucesso (mostra `installments_created`, `mrr_installments_created`, `extras_recurring`, `extras_once` — **mas a RPC nunca devolve esses campos: estão sempre `undefined` no toast**)
- Invalida caches: `deal`, `crm.deals`, `proposals`, finanças, projeto, clientes
- Navega para `/projetos/{id}`

---

## 2. Problemas identificados

### Críticos (causam dados errados ou bugs)
1. **Categoria de receita única para tudo.** Implementação e MRR são receitas conceitualmente diferentes (vendas vs recorrente). Hoje vão na mesma categoria, mesmo centro, mesma conta, mesmo meio.
2. **Custos extras não recebem categoria/centro/conta/meio.** Caem como `financial_recurrences` "órfãos" no DRE — sem categorização, atrapalham relatórios.
3. **Resumo informa números que não existem.** `data.installments_created`, `mrr_installments_created`, `extras_recurring`, `extras_once` são lidos mas a RPC só retorna `project_id`, `project_code`, `cliente_id`. Toast mostra `0 parcela(s)` mesmo quando criou várias.
4. **`v_mrr_disc_value < v_mrr_value` decide se o desconto é "ativo".** Se o usuário digitar valor com desconto MAIOR que o cheio (typo), o desconto silenciosamente é desligado sem aviso.
5. **MRR sem categoria default sensata.** Mesmo quando o usuário separar (item 1), não há onde dizer "use categoria X para MRR". Hoje assume a mesma da implementação.

### UX / UI
6. **Modal monolítico** com ~10 seções amontoadas em scroll vertical de 92vh. Difícil escanear, difícil saber o que falta preencher.
7. **Configuração financeira** é só um quadradinho colapsável com 4 ComboboxCreate genéricos — sem distinção visual entre receita e despesa, e sem indicar quando é obrigatório vs opcional.
8. **Ordem confusa.** Resumo no topo mostra valores que dependem de campos que estão lá embaixo (parcelas, MRR, custos extras). Quem abre o modal primeiro lê números, depois descobre como ajustá-los.
9. **Botão "Regenerar parcelas"** redundante: campos N e 1ª data já regeneram on-change.
10. **Sem indicação de progresso.** Não dá para saber, antes de clicar "Confirmar", o que vai ser criado (quantas linhas em finanças, contrato, tarefas).

### Faltando
11. **Categoria/centro/conta/meio para MRR separados** dos da implementação.
12. **Categoria/centro/conta/meio para custos extras** (cada custo extra deveria ter os seus, ou ao menos um bloco "padrão para extras").
13. **Descrição customizável das parcelas** (hoje vira "Implementação PRJ-XXXX" hard-coded — não dá para ajustar antes da criação).
14. **Owner do projeto** — hoje copia do deal, mas seria útil revisar/trocar no modal (caso o owner do CRM ≠ owner do delivery).
15. **Conferência final visual.** Antes de confirmar, mostrar "vai criar: 1 projeto, 5 parcelas R$X, 1 contrato MRR R$Y/mês, 3 tarefas, 2 custos extras". Hoje o resumo mostra alguns valores mas não a lista completa de objetos.
16. **Status visual de "deal ainda sem proposta enviada/aceita"** — fechar como ganho sem proposta vinculada deveria pelo menos avisar (hoje só lista "Nenhuma proposta encontrada" como bullet de texto).

---

## 3. Redesign proposto

### Estrutura: stepper horizontal de 4 passos
Um modal grande (`max-w-3xl`) com tabs/steps no topo. Botões "Voltar" / "Próximo" / "Confirmar fechamento".

```text
┌──────────────────────────────────────────────────────────────┐
│ Fechar deal como ganho — DEAL-008                            │
│                                                              │
│ ●─────●─────○─────○                                          │
│ Projeto Receita Custos Revisão                               │
└──────────────────────────────────────────────────────────────┘
```

#### Passo 1 · Projeto
Reúne identidade do que vai virar projeto:
- Nome
- Tipos (multi, chips coloridos — já feito)
- Dores (multi, chips coloridos — já feito)
- Owner (Combobox de actors, default = owner do deal)
- Início / Entrega estimada
- Bloco compacto "Origem" mostrando deal code + proposta vinculada (read-only)

#### Passo 2 · Receita (implementação + MRR)
Duas colunas lado a lado em desktop, empilhadas em mobile:

**Coluna A — Implementação (one-shot)**
- Total esperado (display, vem da proposta ou do deal)
- Nº de parcelas + 1ª data → gera lista
- Lista editável de parcelas (valor + data; remover; adicionar)
- Card "Categorização financeira da implementação"
  - Categoria de receita (filtra `tipo='receitas'`)
  - Centro de custo
  - Conta bancária
  - Meio de pagamento

**Coluna B — Manutenção mensal (MRR)** — toggle on/off
- Valor mensal, início, duração (indefinido / X meses)
- Início da cobrança (na entrega / antes / data acima)
- Sub-bloco "Desconto promocional" (igual hoje, mas com validação: se valor c/ desconto ≥ valor cheio, marca aviso vermelho)
- Card **separado** "Categorização financeira do MRR"
  - Categoria de receita (default sugerido: a primeira categoria que tiver "MRR"/"Manutenção"/"Recorrente" no nome, senão vazia)
  - Centro de custo, conta, meio (defaults vindos de localStorage; podem ser iguais aos da implementação se o usuário não trocar)

Defaults persistidos: dois conjuntos separados em `localStorage` (`crm.lastWonFinancialDefaults.implementation`, `crm.lastWonFinancialDefaults.mrr`). Migra silenciosamente do antigo na primeira abertura.

#### Passo 3 · Custos extras
- Lista de custos extras já existente, **mas** com colunas adicionais por item: `Categoria` (filtra `tipo='despesas'`) e `Centro de custo`. Conta/meio podem usar default global (mostrado como "padrão: …").
- Bloco "Padrão para custos extras" no topo (Conta + Meio) que se aplica a todos.
- Vazio por padrão. Botão "+ Adicionar custo extra".

#### Passo 4 · Revisão
Tela de confirmação que enumera **exatamente** o que vai ser criado:
```text
✓ Projeto PRJ-???? "Nome"  (status: planejamento)
✓ 5 parcela(s) de implementação · total R$ X · cat: Receita SaaS / cc: …
✓ Contrato de manutenção: R$ Y/mês · cat: MRR / cc: …
   • Desconto: R$ Z nos primeiros 3 meses
✓ 2 custo(s) extra(s) · R$ W/mês
✓ 3 tarefa(s) (oriundas das dependências do deal)
✓ Anexos do deal serão movidos para o projeto
✓ Cliente: "Empresa X" (será criado / encontrado por CNPJ)
✓ Proposta PROP-??? marcada como aceita
```
Botão final "Fechar como ganho e criar projeto".

### Mudanças no schema/RPC
A RPC precisa aceitar **categorização separada** para implementação, MRR e (opcional) por custo extra. Sem mudar a assinatura atual (`p_project_data`/`p_installments`):
- Cada item de `p_installments` pode trazer `categoria_id/centro_custo_id/conta_bancaria_id/meio_pagamento_id` próprios. Se ausentes, usa os do `p_project_data` (mantém compatibilidade).
- Em `p_project_data`, adicionar bloco `mrr_categoria_id/mrr_centro_custo_id/mrr_conta_bancaria_id/mrr_meio_pagamento_id`. Se ausentes, RPC continua usando os "globais" (compat).
- `extra_costs` (já em `deals.extra_costs`) ganha campos `categoria_id`, `centro_custo_id`, `conta_bancaria_id`, `meio_pagamento_id` por item; RPC passa a ler.
- Retorno da RPC passa a incluir `installments_created`, `mrr_installments_created`, `extras_recurring`, `extras_once`, `tasks_created`, `proposal_marked_accepted` para o toast e a tela de revisão pós-criação.

### Outras correções
- Remover botão "Regenerar parcelas" (redundante).
- Validação visível: se desconto MRR ≥ valor cheio, badge vermelho "desconto inválido — não será aplicado".
- Aviso amarelo no passo 4 quando não houver proposta vinculada (não bloqueia).
- Toast pós-RPC usa o retorno real ("✓ Projeto PRJ-XXXX criado · 5 parcelas · MRR ativo · 3 tarefas").

---

## 4. Plano de execução

### Fase 1 — Refator visual + categorização separada (sem mudar RPC)
**Arquivos novos:**
- `src/components/crm/dealWon/StepProject.tsx`
- `src/components/crm/dealWon/StepRevenue.tsx`
- `src/components/crm/dealWon/StepExtraCosts.tsx`
- `src/components/crm/dealWon/StepReview.tsx`
- `src/components/crm/dealWon/FinanceCategorizationCard.tsx` (Categoria + CC + Conta + Meio em um bloco reutilizável)
- `src/components/crm/dealWon/useDealWonState.ts` (hook que centraliza todo o estado do wizard)

**Arquivo refeito:**
- `src/components/crm/DealWonDialog.tsx` vira só shell + stepper + lógica de submit

**Ajustes:**
- Persistir defaults de implementação e MRR separados em `localStorage`.
- Adicionar campos `categoria_id`, `centro_custo_id`, `conta_bancaria_id`, `meio_pagamento_id` em cada item de `extra_costs` antes de salvar no deal.
- Remover botão "Regenerar".
- Toast pós-confirmação só com o que a RPC retorna hoje (sem campos fantasmas).

### Fase 2 — Migration na RPC + retorno enriquecido
- Migration `update_close_deal_as_won_split_categorization`:
  - Lê `mrr_categoria_id` etc. de `p_project_data` (com fallback para os globais).
  - Lê `categoria_id` etc. de cada item de `p_installments` (fallback global).
  - Lê `categoria_id` etc. de cada item em `extra_costs` (fallback global; se nada, fica null como hoje).
  - Counters locais e retorna `installments_created`, `mrr_installments_created`, `extras_recurring`, `extras_once`, `tasks_created`, `proposal_marked_accepted`.

### Fase 3 — Polimento
- Toast e tela de revisão usando os counters reais.
- Skeleton/loading dos selects de categoria por tipo (receitas vs despesas).
- Validação visual do desconto MRR.
- Mobile: stepper vira sheet com header sticky e footer sticky de "Voltar/Avançar".

---

## 5. Resposta direta às suas perguntas

**"Faz sentido botar mais alguma coisa?"**
Sim — separar categoria/centro/conta/meio entre **implementação**, **MRR** e **custos extras** (hoje tudo cai no mesmo balaio); permitir trocar o **owner do projeto** no modal; e mostrar uma **tela de revisão** antes de confirmar.

**"O que já tem está fazendo sentido?"**
Em parte. A captura de implementação, MRR (com todos os tipos de desconto), custos extras, parcelas custom, defaults em localStorage, criação automática de cliente por CNPJ, herança de anexos e dependências — tudo isso é sólido conceitualmente. O que **não** faz sentido é:
- Categoria única para tudo (item 1).
- Resumo com números fantasmas (item 3).
- Botão "Regenerar" sobrando.
- Layout monolítico que mistura "configuração" com "revisão" na mesma tela.

**"Quais módulos serão chamados / quais funções executadas?"**
Ver seção 1 acima — resumo:
- Tabelas tocadas: `deals`, `proposals`, `companies`, `clientes`, `projects`, `anexos`, `deal_dependencies` → `tasks`, `financial_recurrences` (3 tipos: parcelado, recorrente, único), `maintenance_contracts`.
- Funções: 1 RPC SECURITY DEFINER (`close_deal_as_won`) + 1 update direto no front (deals) + 1 update opcional em `proposals`.
- Caches invalidados: deal, crm.deals, proposals, finance (com projectId/clientId), project, clientes, projects.
