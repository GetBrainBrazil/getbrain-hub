## Parte 1 — Seleção em lote em `/CRM/Empresas`

Replicar o mesmo padrão já entregue em Leads, adaptado às particularidades de Empresas.

### Comportamento
- Coluna inicial com `Checkbox` por linha + checkbox no header (selecionar todos os filtrados, com estado `indeterminate`)
- Mobile (cards): mesmo padrão do Leads — checkbox lateral em cada card + atalho "Selecionar todos / Desmarcar todos" acima da lista
- Clique no checkbox não navega para o detalhe (`stopPropagation`)
- Seleção é podada quando filtros removem itens (efeito que limpa ids fora de `filtered`)
- Barra de ações sticky aparece quando `selected.size > 0`: contagem + "Limpar" + "Excluir selecionados" (destructive)
- Confirmação via `useConfirm()` (regra do projeto — nunca usar `confirm()` nativo)
- Feedback via `toast` do sonner

### KPIs dinâmicos (substituem os 4 atuais quando há seleção)
- "Empresas selecionadas" — contagem
- "Clientes ativos / sel." — quantos selecionados estão `active_client`
- "Leads selecionados" — soma do status `lead`
- "Perdidas selecionadas" — soma do status `lost`

Sem seleção → mantém os 4 KPIs atuais (Total empresas, Active clients, Leads em aberto, Perdidas).

### Exclusão em lote — regra de segurança
Empresas têm muitos vínculos cruzados (leads, deals, projetos, contratos, contatos). Para evitar quebrar histórico financeiro:

- Novo hook `useBulkDeleteCompanies()` em `src/hooks/crm/useCrmReference.ts`
- Antes de excluir, faz pré-checagem em `leads`, `deals` e `projects` filtrados por `company_id IN (ids)` e `deleted_at IS NULL`
- Empresas com qualquer vínculo ativo → **puladas** (não excluídas), retornadas em `skipped`
- Empresas sem vínculos → **soft delete** (`UPDATE companies SET deleted_at = now()`), preservando histórico
- Toast informa: "X empresa(s) arquivada(s). Y ignorada(s) por possuírem leads/deals/projetos vinculados."
- Invalida caches: `crm-companies`, `crm-companies-full`, `crm-company-autocomplete`, `crm-metrics`

### Arquivos
- `src/hooks/crm/useCrmReference.ts` — adicionar `useBulkDeleteCompanies`
- `src/pages/crm/CrmEmpresas.tsx` — checkboxes, barra de ações, KPIs dinâmicos, integração com `useConfirm` + `toast`

---

## Parte 2 — Resposta sobre integrar Leads ↔ Empresas

**Sim, faz total sentido — e na verdade já estão integrados no schema, mas a UI ainda não explora isso.**

### O que já existe hoje no banco
- `leads.company_id` é **obrigatório** (`NOT NULL`) e referencia `companies.id`. Todo lead já nasce ligado a uma empresa.
- `deals.company_id` idem. Há também `deals.origin_lead_id` ligando deal ao lead que o originou.
- `companies.relationship_status` tem valores exatamente alinhados ao funil: `prospect → lead → active_client → former_client / lost`.
- Hooks já cruzam os dois: `useCompanyLeads(id)`, `useCompanyDeals(id)`, `useCompanyStats(id)`. A página `/crm/empresas/:id` já mostra leads e deals da empresa.

### O que está faltando (oportunidades de integração)
1. **Sincronizar `companies.relationship_status` automaticamente** a partir do estado dos leads/deals da empresa. Hoje é manual e tende a ficar desatualizado:
   - Tem deal `fechado_ganho` ativo → `active_client`
   - Tem lead aberto e nenhum deal → `lead`
   - Tem deal aberto → mantém `lead` ou novo status `negociando`
   - Todos perdidos/descartados sem nada ativo → `lost`
   - Implementar via trigger Postgres em `leads` e `deals` que recalcula o status da empresa.

2. **Na página de Leads, mostrar o `relationship_status` da empresa** ao lado do nome (badge), e permitir clicar e ir para a empresa. Hoje só aparece o nome da empresa.

3. **Bloquear/avisar criação de lead duplicado** para a mesma empresa quando já existe lead aberto — evita pipeline poluído.

4. **KPIs cruzados em Empresas**: além de "Leads em aberto" agregado, mostrar "Empresas com lead aberto sem deal" (gargalo de conversão lead→deal por empresa).

5. **Filtro reverso em Leads**: filtrar leads por `relationship_status` da empresa (ex.: "todos os leads de ex-clientes" para campanhas de reativação).

### Recomendação prática
- **Curto prazo (rápido, alto valor):** items 2 e 3 — apenas UI, sem migração. Mostrar status da empresa no lead e impedir duplicidade.
- **Médio prazo:** item 1 — trigger de sincronização. Elimina dado desalinhado entre os dois módulos.
- **Longo prazo:** itens 4 e 5 — refinamentos de gestão.

Se você aprovar, posso implementar a Parte 1 agora e, num próximo passo, atacar os itens 2 e 3 da Parte 2 (que são os de melhor custo/benefício).
