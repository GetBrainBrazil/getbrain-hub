
## Diagnóstico do problema

Você lançou um Conta a Receber em `/financeiro/contas-receber` (ou `Movimentacoes` / `MovimentacaoDetalhe`), mas a tela `/projetos/:id/financeiro` continuou mostrando os dados antigos.

A causa é arquitetural — não é específica desse caso:

- As páginas de **lançamento financeiro** (`ContasReceber.tsx`, `ContasPagar.tsx`, `Movimentacoes.tsx`, `MovimentacaoDetalhe.tsx`) escrevem direto em `supabase.from("movimentacoes")` e depois chamam um `loadData()` **local** (refetch só da própria página).
- Elas **não invalidam** as queries do React Query usadas por outros módulos:
  - `["project-finance-detail", projectId]` — usado em `/projetos/:id/financeiro`
  - `["project-metrics", projectId]` — usado em todos os cards/headers de projeto
  - `["financeiro_dashboard_kpis", ...]`, `["finance_projection", ...]`, `["finance", "project_profitability", ...]` — dashboards
  - `["movimentacoes"]` — várias listas
- Hoje só `useVendas`, `useUpdateRecurrence`, `NovaRecorrenciaModal`, `RegistrarComprovanteWizard` e `ImportExtratoWizard` invalidam — e mesmo assim só algumas chaves.

Resultado: cada tela vive numa "ilha" de cache. Atualizações só aparecem em outros módulos depois de F5 ou de o `staleTime` (30s) expirar.

## Estratégia: regra global do sistema

Criar **um único helper** que sabe quais caches dependem de cada entidade e invalida tudo de uma vez. Toda mutação financeira passa a chamar esse helper. Mesmo padrão se estende para CRM, projetos, propostas, etc.

```text
mutação em movimentacoes
        │
        ▼
invalidateFinanceCaches(qc, { projectId?, recurrenceId? })
        │
        ├─► ["movimentacoes"]               (listas)
        ├─► ["project-finance-detail", id]  (card operacional do projeto)
        ├─► ["project-metrics", id]         (header do projeto + projetos kanban)
        ├─► ["financeiro_dashboard_kpis"]   (dashboard financeiro)
        ├─► ["finance_projection"]
        ├─► ["finance", *]                  (lucratividade, evolução, etc.)
        ├─► ["financeiro_serie_mensal"]
        ├─► ["financeiro_fluxo_projetado"]
        ├─► ["extrato_movimentacoes"]       (conciliação)
        └─► ["recorrencia*"]                (se tocar recurrence_id)
```

E **regra do sistema** registrada na memória: toda mutação cross-módulo usa o helper correspondente, nunca um `loadData()` solitário.

## Etapas

### 1. Criar `src/lib/cacheInvalidation.ts`
Helpers centralizados, um por domínio:

- `invalidateFinanceCaches(qc, opts?: { projectId?, recurrenceId?, clientId?, supplierId? })`
- `invalidateProjectCaches(qc, projectId)`
- `invalidateCrmCaches(qc, opts?: { dealId?, leadId?, companyId? })`
- `invalidateProposalCaches(qc, opts?: { proposalId?, dealId?, projectId? })`

Cada helper conhece TODAS as `queryKey` do sistema que dependem daquela entidade (lista acima). Refatorações futuras só mexem aqui.

### 2. Plugar nas páginas/hooks de mutação financeira

Adicionar `useQueryClient()` + chamada ao helper logo após cada `insert/update/delete` em `movimentacoes`:

- `src/pages/ContasReceber.tsx` (5 mutações: create, update, delete, baixa)
- `src/pages/ContasPagar.tsx` (idem)
- `src/pages/Movimentacoes.tsx` (insert, update, delete, baixa, estorno)
- `src/pages/MovimentacaoDetalhe.tsx` (insert, update, delete, baixa, estorno)
- `src/pages/ExtratoMovimentacaoDetalhe.tsx` (já invalida `extrato_movimentacoes`, falta finance)
- `src/components/RegistrarComprovanteWizard.tsx`
- `src/components/ImportExtratoWizard.tsx`
- `src/hooks/useVendas.ts` (já tem 2 chaves, expandir para o helper)
- `src/hooks/recorrencias/useUpdateRecurrence.ts`
- `src/components/recorrencias/NovaRecorrenciaModal.tsx` e `EditarRecorrenciaModal.tsx`

Quando o registro tiver `projeto_id`, o helper recebe e invalida também as caches do projeto específico.

### 3. Reduzir `staleTime` perigosos
Hoje `useProjectFinanceDetail` e `useProjectMetrics` usam `staleTime: 30_000`. Como vamos invalidar explicitamente, manter os 30s está OK para a navegação normal — sem mudança aqui. Garantir que nenhum hook crítico use `staleTime: Infinity`.

### 4. Cobrir outros módulos (mesma regra)
Aplicar o mesmo padrão (sem refazer fluxo, só plugar o helper) em:

- **CRM ↔ Projetos**: `close_deal_as_won` já dispara um RPC; o `DealWonDialog` precisa invalidar `["projects"]`, `["project-metrics"]`, `["deals"]`, `["proposals"]` via `invalidateProjectCaches` + `invalidateCrmCaches`.
- **Propostas ↔ Deal**: `useUpdateProposal` invalida proposta; deve invalidar também `["deals", dealId]` e `["project-finance-detail", projectId]` quando o `project_id` da proposta existir.
- **Contratos de manutenção**: `NovoContratoDialog` → invalidar finance + project caches.

### 5. Memória do sistema
Adicionar memória `mem://preference/cache-invalidation` documentando a regra: "Toda mutação que afeta dados visíveis em outro módulo DEVE chamar o helper de `cacheInvalidation.ts` correspondente. `loadData()` local nunca é suficiente."

Atualizar `mem://index.md` Core com:
> Toda mutação cross-módulo deve invalidar caches via helpers de `src/lib/cacheInvalidation.ts`. Nunca confiar só em refetch local.

### 6. Realtime (opcional, fase 2)
Para deixar verdadeiramente "instantâneo entre abas/usuários", podemos depois habilitar Supabase Realtime em `movimentacoes` e fazer um `useEffect` global no `AppLayout` que escuta mudanças e dispara o mesmo helper. **Não incluído nesta fase** — a invalidação por React Query já resolve 100% do caso de um único usuário/aba (que é o seu cenário hoje).

## Detalhes técnicos

**Exemplo do helper:**
```ts
// src/lib/cacheInvalidation.ts
import type { QueryClient } from "@tanstack/react-query";

export function invalidateFinanceCaches(
  qc: QueryClient,
  opts: { projectId?: string | null; recurrenceId?: string | null } = {},
) {
  // Listas e dashboards globais — predicate pega todas as variantes de filtro
  qc.invalidateQueries({ queryKey: ["movimentacoes"] });
  qc.invalidateQueries({ queryKey: ["financeiro_dashboard_kpis"] });
  qc.invalidateQueries({ queryKey: ["financeiro_serie_mensal"] });
  qc.invalidateQueries({ queryKey: ["financeiro_fluxo_projetado"] });
  qc.invalidateQueries({ queryKey: ["finance_projection"] });
  qc.invalidateQueries({ queryKey: ["finance"] }); // pega ["finance", "project_profitability", ...] etc
  qc.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });

  if (opts.projectId) {
    qc.invalidateQueries({ queryKey: ["project-finance-detail", opts.projectId] });
    qc.invalidateQueries({ queryKey: ["project-metrics", opts.projectId] });
  }
  if (opts.recurrenceId) {
    qc.invalidateQueries({ queryKey: ["recorrencia", opts.recurrenceId] });
    qc.invalidateQueries({ queryKey: ["recorrencias"] });
  }
}
```

**Uso:**
```ts
// Em ContasReceber.tsx
const qc = useQueryClient();
const { error } = await supabase.from("movimentacoes").insert({ ... projeto_id });
if (!error) {
  invalidateFinanceCaches(qc, { projectId: form.projeto_id });
  toast.success("Lançamento criado");
}
```

## Resultado esperado

1. Lançar um conta a receber com `projeto_id` em qualquer tela → o card `/projetos/:id/financeiro` reflete a parcela em < 1 segundo, sem F5.
2. Mesmo comportamento se vier de baixa, estorno, edição ou exclusão.
3. Mesma garantia se a mutação vier de Recorrências, Vendas, Comprovante, Importação de extrato ou Conciliação.
4. Regra documentada na memória do projeto, então futuras telas que mexem em movimentações vão herdar o padrão automaticamente.

Posso prosseguir?
