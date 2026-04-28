## Problema

A exclusão do deal não funciona porque existem **foreign keys com `NO ACTION`** apontando para `deals.id` que bloqueiam o `DELETE` no banco. O hook atual (`useDeleteDeal`) só remove `deal_activities` e `deal_dependencies`, mas o Postgres rejeita o delete por causa de:

- `proposals.deal_id` → bloqueia
- `projects.source_deal_id` → bloqueia (criado quando o deal é fechado como ganho)
- `leads.converted_to_deal_id` → bloqueia (lead que originou o deal)
- `deals.generated_project_id` (auto-ref via project) → indireto

E quando o projeto existe, ele puxa atrás: contratos de manutenção, movimentações financeiras (contas a pagar/receber), recorrências, marcos, riscos, dependências, integrações, etc.

Além disso, mesmo quando funcionar, hoje a tela do deal não fecha porque o `navigate('/crm/pipeline')` está dentro do `onDelete`, mas o erro silencioso do Supabase impede a chegada nessa linha.

## O que vou entregar

### 1. Pré-checagem de dependências (novo hook)

`useDealDeletionImpact(dealId)` — varre o banco antes de abrir o modal e devolve:

- propostas vinculadas (`proposals` por `deal_id`) — quantidade + códigos
- projeto gerado (`projects` por `source_deal_id` ou `deals.generated_project_id`) — código do projeto
- lead de origem (`leads` por `converted_to_deal_id`) — código do lead
- atividades e dependências (informativo, são CASCADE)
- **se há projeto**: contratos de manutenção ativos, movimentações financeiras (contas a pagar/receber pendentes e liquidadas), recorrências ativas — agrupadas por categoria

### 2. Novo modal de confirmação rico (substitui o `DangerZone` simples no deal)

Componente `DeleteDealDialog` que mostra:

- bloco vermelho de aviso
- lista visual com ícones de **tudo** que será afetado/bloqueado (propostas, projeto, manutenção, contas, recorrências, lead)
- separação clara entre:
  - **"Será removido em cascata"** (atividades, dependências do deal)
  - **"Bloqueia a exclusão"** (proposta, projeto vinculado, lead origem) — com botão "Ir para X" pra resolver
  - **"Será desvinculado"** (caso a gente opte por `SET NULL` em alguns)
- input "digite EXCLUIR pra confirmar" só quando há itens críticos
- se há **bloqueios fortes** (projeto/proposta/lead), o botão de excluir fica **desabilitado** com mensagem clara: "remova/desvincule X primeiro"
- se só tem itens em cascata, libera o delete normalmente

### 3. Migração no banco para destravar o que faz sentido

- `proposals.deal_id` → mudar pra `ON DELETE SET NULL` (proposta sobrevive ao deal, vira "órfã" na lista de orçamentos — comportamento esperado)
- `leads.converted_to_deal_id` → `ON DELETE SET NULL` + voltar lead pra `status='novo'` via trigger (ou deixar como `convertido` mas sem deal — preciso da sua decisão)
- `deals.generated_project_id` → `ON DELETE SET NULL` (já é, na prática, só desvinculação)
- `projects.source_deal_id` → **manter como bloqueio**: se existe projeto gerado, **não** deixa apagar o deal direto. O usuário precisa apagar/arquivar o projeto primeiro (que já tem CASCADE pro resto do mundo). Isso é a regra de integridade mais segura.

### 4. Hook de delete reescrito

`useDeleteDeal` faz, em ordem:

1. roda checagem de impacto novamente (defesa em profundidade)
2. se há projeto gerado → aborta com erro tipado `{ kind: 'has_project', projectCode }`
3. apaga `deal_activities`, `deal_dependencies`, `deal_documents` (cascade manual onde não há FK)
4. roda o `DELETE FROM deals` — Postgres limpa via FKs ajustadas
5. invalida caches: CRM, projetos, propostas, finance (caso o projeto existisse antes)

### 5. Fechamento da tela

Mover `navigate('/crm/pipeline')` para o `onSuccess` do `mutateAsync`, **com replace** pra não voltar pra tela do deal já apagado. Garantir que o `DangerZone` interno do deal não seja mais usado — substituído pelo novo dialog dedicado.

## Como vai parecer

```text
┌─ Excluir deal DEAL-042 — "Sistema de gestão XYZ"? ────┐
│ Esta ação NÃO pode ser desfeita.                       │
│                                                        │
│ Bloqueios (resolva primeiro):                          │
│   ⛔ Projeto gerado: PRJ-018 → [Abrir projeto]         │
│                                                        │
│ Será desvinculado:                                     │
│   🔗 1 proposta (ORC-007) — vira proposta avulsa       │
│   🔗 Lead de origem (LEAD-031) — volta pra "novo"      │
│                                                        │
│ Será removido em cascata:                              │
│   🗑 3 atividades                                       │
│   🗑 2 dependências do deal                             │
│                                                        │
│ Digite EXCLUIR para confirmar: [________]              │
│                       [Cancelar]  [Excluir definitivamente] │
└────────────────────────────────────────────────────────┘
```

Quando há projeto, o botão fica desabilitado e aparece o atalho pra abrir/excluir o projeto.

## Detalhes técnicos

**Arquivos novos:**
- `src/hooks/crm/useDealDeletionImpact.ts` — query que retorna `{ proposals, project, originLead, activitiesCount, dependenciesCount, finance }`
- `src/components/crm/DeleteDealDialog.tsx` — modal rico com listas + bloqueios + confirmação por texto
- `supabase/migrations/<ts>_deal_delete_relax_fks.sql` — ajusta FKs `proposals.deal_id` e `leads.converted_to_deal_id` para `ON DELETE SET NULL`

**Arquivos editados:**
- `src/hooks/crm/useDeals.ts` — `useDeleteDeal` reescrito com checagem + erros tipados
- `src/pages/crm/CrmDealDetail.tsx` — substitui `DangerZone` por `DeleteDealDialog`, fecha a tela com `navigate(..., { replace: true })` no `onSuccess`
- `src/lib/cacheInvalidation.ts` — `invalidateCrmCaches` já existe; adicionar invalidação de `projects` e `proposals` quando o deal é apagado (vai ser chamado a partir do hook)

**Não vou tocar:** `DangerZone.tsx` continua existindo e em uso para Lead e Empresa (sem dependências cruzadas pesadas).

**Pergunta de bloqueio (única):** quando o lead foi convertido em deal e o deal é excluído, o lead deve:
(a) voltar pra status `novo` automaticamente (trigger), ou (b) ficar como `convertido` mas com `converted_to_deal_id = null` (vira "lead com deal apagado")?

Vou seguir com **(a)** salvo orientação contrária — é o comportamento mais limpo pra UX.
