
# Melhorar transferência Deal → Projeto

Dois problemas reais a resolver e um enriquecimento de dados.

## Problema 1 — Bug: categorias vazias no modal

A query carrega `categorias` filtrando por `tipo = 'receita'`, mas no banco o valor real é `'receitas'` (plural). Resultado: o select fica sempre vazio, mesmo com 11 categorias de receita cadastradas. Por isso "ele não puxa nenhuma variável existente".

**Correção**: trocar o filtro para `tipo = 'receitas'` (e remover o `tipo` do `.select` que não é usado).

## Problema 2 — UX: criar inline na configuração financeira

Hoje, criar uma categoria/centro/conta exige clicar no botão `+`, abrir um mini-modal, digitar e confirmar. Você quer digitar dentro do próprio campo e criar dali, sem etapa extra.

Já existe no projeto o componente `ComboboxCreate` (`src/components/crm/ComboboxCreate.tsx`) que faz exatamente isso: combobox com busca + opção "Criar [termo]" dentro do mesmo dropdown. É o mesmo padrão usado em CRM (origens de lead, papéis de contato, categorias de dor).

**Mudanças no `DealWonDialog.tsx`**:
- Substituir os 4 `Select` da seção "Configuração financeira" por `ComboboxCreate`.
- Cada um com seu `onCreate` que insere direto na tabela (categorias, centros_custo, contas_bancarias, meios_pagamento) e seleciona automaticamente.
- Remover o mini-modal "+ Criar" (`createTarget`, `createName`, `handleCreateOption`) — fica obsoleto.
- Manter o `loadFinDefaults`/persistência de defaults no localStorage.
- Subir essa seção pra cima do modal (logo após "Dados do projeto") já que agora é fácil de usar e é informação importante.

## Problema 3 — Mais informações no card de projeto

A RPC `close_deal_as_won` já copia bastante (escopo, dependências, contexto comercial, anexos, contato primário, origem do lead, hour estimates, mockups). Faltam estes campos identificados no mapeamento anterior:

| Faltando no projeto | Origem | Tratamento |
|---|---|---|
| `notes` (anotações livres) | `deals.notes` | Concatenar em `projects.notes` |
| `project_type_v2` (multi-tipos) | `deals.project_type_v2` | Nova coluna em `projects` |
| `scope_bullets` (escopo estruturado) | `deals.scope_bullets` | Nova coluna `scope_bullets jsonb` em `projects` |
| `mrr_value` dedicado | calculado no MRR | Nova coluna `mrr_value numeric` em `projects` (para KPIs/relatórios sem ter que JOIN no `maintenance_contracts`) |
| `origin_lead_id` (ponteiro do lead) | `deals.origin_lead_id` | Nova coluna `origin_lead_id uuid` em `projects` |
| Histórico `deal_activities` | `deal_activities` | Manter no deal (rastreável via `source_deal_id`); não duplicar |

### Migração SQL

```sql
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS mrr_value         numeric,
  ADD COLUMN IF NOT EXISTS origin_lead_id    uuid,
  ADD COLUMN IF NOT EXISTS project_type_v2   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope_bullets     jsonb  NOT NULL DEFAULT '[]'::jsonb;
```

### Atualização da RPC `close_deal_as_won` (v5)

No `INSERT INTO projects` adicionar:
- `notes` = `v_deal.notes`
- `mrr_value` = `v_mrr_value` (preenchido depois, via `UPDATE` no fim da função, já que é calculado no bloco MRR)
- `origin_lead_id` = `v_deal.origin_lead_id`
- `project_type_v2` = `COALESCE(v_deal.project_type_v2, '{}')`
- `scope_bullets` = `COALESCE(v_deal.scope_bullets, '[]'::jsonb)`

## Detalhes técnicos

**Arquivos:**
- `src/components/crm/DealWonDialog.tsx`: refatorar bloco "Configuração financeira" usando `ComboboxCreate`; corrigir filtro `'receitas'`; remover mini-modal de criação; remover imports/estados obsoletos.
- Nova migration `supabase/migrations/<timestamp>_project_extra_fields_and_won_rpc_v5.sql`:
  1. `ALTER TABLE projects` com as 4 colunas novas.
  2. `DROP FUNCTION close_deal_as_won(uuid, jsonb, jsonb)` + recriar v5 com os campos extras no INSERT e o `UPDATE projects SET mrr_value = v_mrr_value WHERE id = v_project_id` no bloco MRR.

**Cuidados:**
- A `ComboboxCreate` usa `onCreate` async — passar handlers que inserem na tabela, dão `await reloadFinanceLists` e selecionam o id retornado.
- Para `meios_pagamento` o create é simples (só `nome`), mantendo o padrão.
- `tipo` da categoria criada inline continua sendo `'receitas'` (consistente com banco).
- `src/integrations/supabase/types.ts` é auto-gerado — não tocar; o cast `as any` em `sb` continua mascarando o tipo até o regen.

**Não quebra:** RPC ainda aceita a mesma assinatura `(uuid, jsonb, jsonb)`. Projetos antigos sem as novas colunas ficam com defaults vazios.
