## Objetivo

Permitir editar **toda** a manutenção mensal direto no card "Financeiro" do projeto (sem abrir modal), incluindo: mensalidade, % desconto, duração do desconto (indefinido ou Nº meses), bolsão de tokens e data de início. Garantir que outros módulos que consomem essa informação (Vendas, Contratos de Manutenção, Aba Operacional, sidebar/MRR) reflitam imediatamente as mudanças e respeitem a expiração do desconto.

## O que muda na tela (Projeto → card Financeiro)

A seção "Manutenção" passa a fazer parte do mesmo modo de edição do card Financeiro (botão **Editar** que já existe no topo do card). Quando `editing === "financial"`:

- **Mensalidade**: input numérico (valor inteiro em R$).
- **Desconto (%)**: input numérico (0–100).
- **Duração do desconto**: aparece somente se desconto > 0. Toggle entre:
  - "Indefinido" (salva `discount_duration_months = null`)
  - "Por X meses" (input numérico ao lado).
- **Bolsão de tokens (R$)**: input numérico, opcional.
- **Início**: date input.
- **Status**: select (active / paused / cancelled) — apenas quando já existe contrato.

Quando **não há contrato** e o usuário clica Editar no card Financeiro, mostramos os mesmos campos com defaults (Status = active, Início = hoje). Ao clicar **Salvar**:
- Se não existia → `INSERT` em `maintenance_contracts`.
- Se existia → `UPDATE` no contrato ativo.
- Se mensalidade for 0/vazia e não havia contrato → não cria nada.

Em modo de leitura, mantemos o resumo atual (Mensalidade, Desconto com "indefinido / por N meses até dd/mm/aaaa / expirado", MRR efetivo, Bolsão, Início).

O modal `NovoContratoDialog` deixa de ser usado a partir do card Financeiro do projeto (continua disponível na página de Contratos para criar contratos avulsos). Removemos o botão "Adicionar/Editar" da seção Manutenção e o `<NovoContratoDialog>` montado no detalhe do projeto.

## Integrações com outros módulos (consistência)

A regra de **MRR efetivo respeitando expiração do desconto** precisa ser uniforme. Hoje só `ProjetoDetalhe` aplica isso. Vamos:

1. **Criar helper compartilhado** `src/lib/maintenance.ts` exportando:
   - `getDiscountInfo(contract)` → `{ active, indefinite, endsAt }`
   - `getEffectiveMrr(contract, atDate?)` → number (aplica desconto só se vigente)
   - `getAnnualMrr(contracts)` etc.
2. **Substituir cálculos duplicados** em:
   - `src/pages/ProjetoDetalhe.tsx` (sidebar, mini-KPI, card Financeiro).
   - `src/pages/ContratosManutencao.tsx` (linhas 33, 82–118: `mrrAtivo` passa a usar `getEffectiveMrr`; tabela mostra "−10% até dd/mm" ou "−10% indef." e "expirado" quando aplicável).
   - `src/components/projetos/AbaOperacional.tsx` (linhas 333–336: `activeContractMrr` usa `getEffectiveMrr`).
   - `src/components/projetos/ProjetoDrawer.tsx` (linha 410: cálculo do MRR no resumo do contrato).
3. **Vendas (`NovaVendaDialog`)**: ao listar contratos no select, exibir mensalidade efetiva (com `getEffectiveMrr`) e marcar visualmente "desconto expirado" para o usuário entender o valor real cobrado. Sem mudança de schema.
4. Todas as queries de `maintenance_contracts` passam a selecionar também `discount_duration_months` (já existe na tabela).

## Detalhes técnicos

- Estados novos no `ProjetoDetalhe.tsx` (junto aos demais drafts):
  - `draftMonthlyFee`, `draftDiscountPct`, `draftDiscountIndefinite` (boolean), `draftDiscountMonths`, `draftContractTokenBudget`, `draftContractStartDate`, `draftContractStatus`.
- `openEditor("financial")` popula esses drafts a partir de `activeContract` (ou defaults).
- `Salvar` do card Financeiro faz, em sequência:
  1. `patchProject(updates, changes)` (campos do projeto, como já faz hoje).
  2. Upsert do contrato:
     - Payload: `{ project_id, organization_id: project.organization_id, monthly_fee, monthly_fee_discount_percent, discount_duration_months: indefinite ? null : Number(months), token_budget_brl, start_date, status }`.
     - Se `activeContract`: `update().eq('id', activeContract.id)`.
     - Caso contrário e `monthly_fee > 0`: `insert`.
  3. Registra em `audit_logs` (entity_type = `maintenance_contract`, action `update`/`create`) com diff dos campos relevantes — segue o padrão de `patchProject`.
  4. Recarrega `loadProjeto()` para atualizar `contracts`.
- Validação simples: desconto entre 0 e 100; se duração não-indefinida, meses ≥ 1.
- O helper `getDiscountInfo` move a função inline atual (linhas 790–800 do `ProjetoDetalhe.tsx`) para o módulo compartilhado.

## Fora de escopo

- Histórico de versões de contrato (manter "1 contrato ativo por projeto").
- Mudanças no schema do banco (a coluna `discount_duration_months` já existe).
- Reescrever o modal `NovoContratoDialog` (continua para criação avulsa em `/contratos`).

## Arquivos afetados

- `src/lib/maintenance.ts` (novo)
- `src/pages/ProjetoDetalhe.tsx` (edição inline + remover dialog do card)
- `src/pages/ContratosManutencao.tsx` (usar helper, mostrar vigência)
- `src/components/projetos/AbaOperacional.tsx` (usar helper)
- `src/components/projetos/ProjetoDrawer.tsx` (usar helper)
- `src/components/vendas/NovaVendaDialog.tsx` (mostrar mensalidade efetiva)
