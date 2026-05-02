
## Objetivo

Transformar a tab **Resumo** num verdadeiro "preview comercial" da proposta — não só KPIs soltos — e permitir vincular um deal do CRM **direto dali**, com import automático que agora também traz **logo, cidade, cor de marca e parcelas**.

## O que muda

### 1. Tab Resumo vira um "snapshot da proposta"

Substitui a área de KPIs genéricos (`AbaResumo` atual) por um cartão estruturado com tudo que o cliente vai ver:

```text
┌─ [logo cliente] Acme S.A. · São Paulo, SP ───────────────────────┐
│  Plataforma de automação para vendas — Fase 1                    │
│  Validade: 01/06/2026 (vence em 30 dias)                         │
├──────────────────────────────────────────────────────────────────┤
│  IMPLEMENTAÇÃO         MRR              1º ANO          PRAZO    │
│  R$ 24.000             R$ 600/mês       R$ 31.200       45 dias  │
│  6× R$ 4.000                                                      │
├──────────────────────────────────────────────────────────────────┤
│  Escopo (4 itens)                                                 │
│  • Discovery e arquitetura ........................ R$ 6.000     │
│  • Setup de pipelines ............................. R$ 8.000     │
│  • Integração CRM ................................. R$ 6.000     │
│  • Treinamento e go-live .......................... R$ 4.000     │
├──────────────────────────────────────────────────────────────────┤
│  Resumo executivo (3 linhas, truncado, "ver mais →")              │
│  Contexto/dor (3 linhas, truncado)                                │
└──────────────────────────────────────────────────────────────────┘
```

Detalhes:
- **Header**: logo (se houver) + nome/cidade + título grande + chip de validade.
- **Grid de 4 KPIs** densos: Implementação (com `Nx R$ y` se houver parcelas), MRR/mês, Total 1º ano, Prazo (implementation_days + validation_days).
- **Bullets de escopo**: lista compacta com título + valor; mostra os 6 primeiros e "+ N restantes" se passar.
- **Trechos de narrativa** (resumo executivo, contexto/dor) em pré-visualização truncada com link "ir para Escopo".
- Mantém o **checklist de prontidão** e **botões de ação rápida** já existentes no topo.

### 2. Vínculo CRM acessível direto do Resumo

Adiciona um cartão "Vínculo com CRM" no topo do Resumo (acima do checklist) usando o **mesmo `CrmDealLinkPicker` já existente** — assim o usuário não precisa navegar até a tab Cliente para vincular/importar. Quando vincular um deal, o dialog de importação abre automaticamente como já faz hoje.

### 3. Import do CRM agora traz logo, cidade, cor e parcelas

Hoje o importador só traz nome, narrativa, escopo, MRR e validade. Vamos ampliar para refletir o que o usuário pediu ("cliente completo, inclusive imagem da logo"):

| Campo na proposta | Origem no deal/company | Hoje | Depois |
|---|---|---|---|
| `clientName` | `companies.trade_name`/`legal_name` | sim | sim |
| `clientCity` | `companies.address` (cidade) | não | **sim** |
| `clientLogoUrl` | `companies.logo_url` | não | **sim** |
| `clientBrandColor` | derivado (não há campo) | não | (mantém manual — sem campo na company) |
| `installmentsCount` | `deals.installments_count` | não | **sim** |
| `painContext`, `executiveSummary`, `solutionOverview` | já existentes | sim | sim |
| `scope_items` | `scope_bullets`/`deliverables` | sim | sim |
| `maintenance` | `estimated_mrr_value` | sim | sim |
| `validUntil` | `discount_valid_until` | sim | sim |

Se algum campo já estiver preenchido na proposta, mostramos no diff do dialog para o usuário decidir sobrescrever (já é o comportamento atual com checkboxes).

### 4. Persistência de parcelas

Como `proposals` não tem coluna de parcelas, criamos `installments_count int` e `first_installment_date date` (espelhando o deal). Isso permite mostrar `6× R$ 4.000` no Resumo e no PDF/página pública depois.

## Detalhamento técnico

**Migration** (`supabase`):
```sql
alter table public.proposals
  add column if not exists installments_count int,
  add column if not exists first_installment_date date;
```

**Editor state** (`useProposalEditor` ou equivalente) — adicionar `installmentsCount` e `firstInstallmentDate` ao state mapeado com `setField`. Confirmar nome exato do hook lendo o arquivo antes.

**`CrmDealLinkPicker.tsx`**:
- Ampliar o `select` da query para incluir `companies(id, trade_name, legal_name, logo_url)` e `deals.installments_count, first_installment_date`.
- Adicionar seções no `ImportDealDialog`:
  - "Logo do cliente" → `setField("clientLogoUrl", deal.company.logo_url)`
  - "Cidade do cliente" (se a company tiver — verificar campo de endereço; pular se não houver)
  - "Parcelamento" → `setField("installmentsCount", deal.installments_count); setField("firstInstallmentDate", deal.first_installment_date)`

**`TabResumo.tsx`**:
- Adicionar `<CrmDealLinkPicker>` no topo (acima do checklist), recebendo `setField`/`setItems` via props (o orquestrador já tem os dois — passar adiante).
- Substituir o `<AbaResumo>` pelo novo bloco "Snapshot da proposta" descrito acima. Reusar `calculateScopeTotal`, `formatBRL`, `formatDateBR` já existentes.
- Cálculo da parcela: `total / installmentsCount` quando `installmentsCount > 1`; senão mostrar "à vista".

**`OrcamentoEditarDetalhe.tsx`**:
- Passar `setField`, `setItems`, `dealClientLink`, `onLinkChanged` também para `<TabResumo>`.

**`AbaResumo.tsx`**: deixa de ser usado pela tab Resumo nova; mantém o arquivo (pode ser usado em outro lugar — vou verificar antes de remover).

## Fora de escopo

- Importar cor de marca da company (não há campo).
- Editor de cronograma de parcelas com datas individuais — fica para uma tab "Pagamento" futura.
- Atualizar PDF/página pública para mostrar parcelas — entra junto se sobrar tempo, mas o foco é o Resumo.

## Resultado esperado

Quando o usuário abrir uma proposta nova vinda do CRM ou clicar em "Vincular deal" na própria tab Resumo, ele verá em uma tela só: logo + nome + cidade do cliente, valor de implementação parcelado, MRR, total no 1º ano, prazo, lista resumida do escopo e trechos da narrativa — exatamente o "resumo do que vai ter na proposta" pedido.
