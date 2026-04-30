## Objetivo

Fazer o seletor "Quando começa a cobrar" do MRR (modal de fechar deal) realmente controlar duas coisas:

1. **"Na entrega da implementação"** → o início efetivo da cobrança do MRR fica suspenso até que o projeto correspondente seja movido para o status `entregue` na tela `/projetos`. Nesse momento, automaticamente, a recorrência MRR começa a ser cobrada (ativada e com `start_date` ajustada para a data real de entrega).
2. **"Antes da entrega"** → libera/exibe um campo de **data de início da cobrança** (já existe no topo do bloco MRR, mas hoje aparece sempre). Esse campo só deve aparecer quando essa opção for selecionada.
3. Quando **"Na entrega da implementação"** estiver selecionado, o campo "Início" da cobrança MRR deve **sumir** (a data será definida automaticamente pelo backend na entrega).

## Mudanças no UI (`src/components/crm/DealWonDialog.tsx`)

- Reorganizar o bloco MRR para que o seletor **"Quando começa a cobrar"** venha **antes** do campo "Início".
- Tornar o campo **"Início"** condicional:
  - Mostrar somente se `mrrStartTrigger === 'before_delivery'`.
  - Esconder se `mrrStartTrigger === 'on_delivery'` (mostrar uma linha informativa: "A cobrança começará automaticamente quando o projeto for marcado como Entregue.").
- Ajustar a validação (linha 612): só exigir `mrrStartDate` quando trigger for `before_delivery`. Para `on_delivery`, não exigir.
- Ao salvar:
  - Se `on_delivery`: enviar `mrr_start_date = null` e gravar a recorrência criada como **inativa/pendente** (status `pausada`) até a entrega.
  - Se `before_delivery`: comportamento atual (cria ativa com a data informada).

## Mudanças no backend (migration nova)

### A) `close_deal_as_won` (atualizar a recorrência MRR)

Quando `mrr_start_trigger = 'on_delivery'` ao criar a `financial_recurrences` do MRR:
- Inserir com `status = 'pausada'` (em vez de `'ativa'`).
- `start_date` fica como placeholder (ex.: `CURRENT_DATE`) mas a recorrência fica pausada — não gera movimentações até ativação.
- Marcar `commercial_context.mrr_start_trigger = 'on_delivery'` no projeto (já é feito).

### B) Novo trigger `activate_mrr_on_delivery`

Trigger `AFTER UPDATE OF status ON public.projects` que, quando `NEW.status = 'entregue'` e `OLD.status` era diferente:
- Para cada `financial_recurrences` com `projeto_id = NEW.id`, `type = 'recorrente'`, `direction = 'entrada'`, `status = 'pausada'` e cujo deal de origem tenha `mrr_start_trigger = 'on_delivery'` (ou marcador equivalente no `commercial_context` do projeto):
  - Atualizar `start_date = NEW.actual_delivery_date` (ou `CURRENT_DATE` se nulo).
  - Atualizar `status = 'ativa'`.
  - `updated_at = now()`.

Para identificar o vínculo com `on_delivery`, ler de `projects.commercial_context->>'mrr_start_trigger'` (já gravado pela função `close_deal_as_won`), evitando depender de FK do deal.

### C) Garantir `actual_delivery_date`

Adicionar trigger leve em `projects` para preencher `actual_delivery_date = CURRENT_DATE` automaticamente quando o status muda para `entregue` e o campo está vazio (caso ainda não exista esse comportamento).

## Comunicação ao usuário

Adicionar um pequeno banner informativo no bloco MRR quando `on_delivery` estiver selecionado:
> "A cobrança da manutenção começará automaticamente quando este projeto for movido para a coluna **Entregue**."

## Arquivos afetados

- `src/components/crm/DealWonDialog.tsx` — UI condicional + validação.
- Nova migration SQL — atualiza `close_deal_as_won` (status pausada quando on_delivery) + cria trigger `activate_mrr_on_delivery` + trigger de `actual_delivery_date`.

## Fora do escopo

- Não alterar o fluxo de parcelas de implementação.
- Não alterar lógica de descontos MRR (`until_stage` continua funcionando independentemente).
