## Novos estágios do Kanban de Deals

Você fica com **7 colunas** (não 9 — os 2 primeiros vivem em Leads):

```text
┌───────────────────┬─────────────────────────────────────────────┬──────────┐
│ Coluna            │ O que significa                             │ Prob.    │
├───────────────────┼─────────────────────────────────────────────┼──────────┤
│ Descoberta Marcada│ Triagem rolou, presencial agendado          │  20%     │
│ Descobrindo       │ No cliente, montando entendimento/proposta  │  40%     │
│ Proposta na Mesa  │ Proposta enviada, esperando resposta        │  60%     │
│ Ajustando         │ Cliente respondeu, refinando termos/escopo  │  75%     │
│ Ganho             │ Fechado                                     │ 100%     │
│ Perdido           │ Não rolou                                   │   0%     │
│ Gelado            │ Cliente sumiu / pediu pra retomar depois    │  10%     │
└───────────────────┴─────────────────────────────────────────────┴──────────┘
```

**Regra Lead → Deal**: lead vira deal automaticamente quando a **triagem é agendada** (status `triagem_agendada` no Lead). O deal nasce direto em **"Descoberta Marcada"**.

## Mapeamento dos deals atuais (automático)

```text
Reunião Agendada    (presencial_agendada) → Descoberta Marcada
Reunião Realizada   (presencial_feita)    → Descobrindo
Orçamento Enviado   (orcamento_enviado)   → Proposta na Mesa
Em Negociação       (em_negociacao)       → Ajustando
Ganho               (fechado_ganho)       → Ganho        (sem mudança)
Perdido             (fechado_perdido)     → Perdido      (sem mudança)
```

Hoje só tem 1 deal ativo (`presencial_feita`) — migração é trivial.

## O que muda

### 1. Banco
- Estender o enum `deal_stage` com os novos valores: `descoberta_marcada`, `descobrindo`, `proposta_na_mesa`, `ajustando`, `ganho`, `perdido`, `gelado`.
- Migration `UPDATE deals SET stage = ...` aplicando o mapeamento acima.
- Atualizar default da coluna `stage` para `descoberta_marcada`.
- Atualizar a RPC `close_deal_as_won` (e qualquer outra que cite `fechado_ganho`/`fechado_perdido`) para os novos slugs.
- Manter os slugs antigos no enum por enquanto (não dá pra remover valor de enum facilmente sem recriar) — código nunca mais grava neles.

### 2. Fluxo Lead → Deal
- No hook/ação que muda lead para `triagem_agendada`, criar automaticamente o Deal vinculado já em `descoberta_marcada` (copiando empresa, contato, owner, valor estimado, dor, notas, origem).
- Lead ganha `converted_to_deal_id` na hora da triagem (hoje só ganha em "convertido").
- Botão "Converter em Deal" manual continua existindo como fallback.

### 3. Frontend
- `src/constants/dealStages.ts`: novos slugs, labels, probabilidades, cores (Gelado vira azul-cinza, distinto de Perdido).
- `src/types/crm.ts` + `src/integrations/supabase/types.ts`: tipos atualizados.
- `CrmPipeline.tsx`: 7 colunas com scroll horizontal no mobile (já tem padrão).
- `FunilVisual.tsx` (dashboard): refletir novos estágios.
- `useCrmDashboard*.ts`, `useDealsIndicators.ts`, `useDeals.ts`: atualizar agregações que filtram por stage.
- `audit/formatters.ts`: traduzir novos slugs no histórico.
- `CrmLeadDetail.tsx`: ao agendar triagem, dispara criação do Deal e mostra link.

### 4. Pequenos ajustes
- Remover qualquer hardcode de "Reunião Agendada/Realizada" em selects de criação rápida (`NewDealQuickDialog.tsx`, `NovoOrcamentoModal.tsx`).
- Garantir que cards "Gelado" não entram no forecast ponderado padrão (probabilidade baixa, mas filtrar para não inflar pipeline).

## Fora do escopo
- Campo "Bola com" — você confirmou que não precisa.
- Mexer no módulo Leads em si (continua com `novo / triagem_agendada / triagem_feita / convertido / descartado`). Só adicionamos a automação que cria o Deal quando triagem é agendada.

## Arquivos tocados (resumo)
- 1 nova migration (enum + UPDATE + RPC)
- `src/constants/dealStages.ts`, `src/types/crm.ts`
- `src/pages/crm/CrmPipeline.tsx`, `src/pages/crm/CrmLeadDetail.tsx`
- `src/hooks/crm/useDeals.ts`, `useDealsIndicators.ts`, `useCrmDashboard.ts`, `useCrmDashboardExec.ts`, `useCrmDetails.ts`
- `src/components/crm/dashboard/FunilVisual.tsx`, `DealHeader.tsx`, `NewDealQuickDialog.tsx`, `CrmDetailShared.tsx`
- `src/lib/audit/formatters.ts`

Aprova que eu já implemento.