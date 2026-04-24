# Separar Implementação x Manutenção pela categoria

## Problema

Hoje a separação está sendo feita pelo campo `recorrente` e por `source_entity_type`, o que classifica errado várias parcelas. O correto é usar a **categoria** do lançamento (em Contas a Pagar/Receber).

Existem duas categorias canônicas no banco (filhas de "Vendas"):
- **Implementação** — `54986866-7bd2-42e5-abec-2378b3e7c6a9`
- **Manutenção** — `fd3b23be-1101-4122-83d1-6b559c64c04b`

Os lançamentos automáticos gerados pelo contrato de manutenção (`source_entity_type='maintenance_contract'`) hoje têm categoria nula — eles serão tratados como Manutenção por origem (fallback), mas idealmente deveriam receber a categoria certa na criação.

## Conferência com seus dados (PRJ-001)

| Origem | Recebido | Em aberto |
|---|---|---|
| Categoria = Implementação | R$ 10.125 (8 parcelas pagas) | R$ 0 |
| Categoria = Manutenção | R$ 4.875 (8 parcelas pagas) | R$ 0 |
| Contrato manutenção (auto) | R$ 0 | R$ 9.000 (12 parcelas) |
| **Total Implementação** | **R$ 10.125** | **R$ 0** |
| **Total Manutenção** | **R$ 4.875** | **R$ 9.000** |

Contratado de implementação = R$ 12.750. Então **falta R$ 2.625** de implementação a receber — diferente do que mostra hoje (15.000 / 12.750 = 100%).

## O que muda

### 1. Banco — view `project_metrics`

Substituir a regra atual (`recorrente` / `source_entity_type`) por classificação **pela categoria**:

```
Implementação = categoria_id = '54986866-...'
Manutenção    = categoria_id = 'fd3b23be-...'
                OU source_entity_type = 'maintenance_contract' (fallback p/ auto-gerados sem categoria)
Sem categoria classificável → não entra em nenhum dos dois (fica só no total geral)
```

Atualizar as 4 colunas:
- `revenue_received_implementation`
- `revenue_pending_implementation`
- `revenue_received_maintenance`
- `revenue_pending_maintenance`

### 2. Frontend — tela de detalhes `/projetos/:id/financeiro`

No hook `useProjectFinanceDetail.ts`, expor `categoria_id` no `ProjectMovimentacao` (já lido na query, falta tipar e devolver) e atualizar o classificador:

```ts
const IMPL_CAT = '54986866-7bd2-42e5-abec-2378b3e7c6a9';
const MANUT_CAT = 'fd3b23be-1101-4122-83d1-6b559c64c04b';

const isMaintenance = (r) =>
  r.categoria_id === MANUT_CAT ||
  r.source_entity_type === 'maintenance_contract';

const isImplementation = (r) =>
  r.categoria_id === IMPL_CAT;
```

Com isso:
- Donut/lista de **Implementação** mostra só categoria Implementação.
- Donut/lista de **Manutenção** mostra categoria Manutenção + auto-gerados do contrato.
- Lançamentos sem categoria nem origem ficam fora dos dois donuts (mas continuam aparecendo na timeline geral e na lista geral — adicionar uma terceira lista "Outros / sem categoria" se houver).

### 3. Card operacional `/projetos/:id`

Lê os campos da view (`revenue_received_implementation`, etc.). Como a view será corrigida, **não precisa mudar nada no card** — os números corretos passam a aparecer automaticamente.

## Detalhes técnicos

- IDs das categorias serão centralizados em `src/lib/financeCategories.ts` (`CATEGORIA_IMPLEMENTACAO_ID`, `CATEGORIA_MANUTENCAO_ID`) para reutilizar entre views/SQL e frontend.
- Migration recria a view `project_metrics` (DROP + CREATE) trocando a regra de classificação dentro das 4 colunas de implementação/manutenção. Demais colunas ficam idênticas.
- Hook `useProjectFinanceDetail.ts`: adicionar `categoria_id` na interface `ProjectMovimentacao` (já vem do `select`, só falta tipar).
- `ProjetoFinanceiroDetalhe.tsx`: trocar `isMaintenance` para usar categoria + fallback de origem; adicionar `isImplementation`; (opcional) bloco "Outros" para lançamentos sem categoria classificável.
- Sem mudanças no `AbaOperacional.tsx` — ele já consome os campos da view.

## Resultado esperado para PRJ-001

- **Implementação:** R$ 10.125 pagos / R$ 12.750 contratado = **79%**, restante R$ 2.625
- **Manutenção:** R$ 4.875 já recebido + R$ 9.000 a vencer (12 parcelas geradas pelo contrato)
