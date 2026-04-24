## Objetivo

No card **Financeiro** do detalhe do projeto, hoje só aparecem campos do projeto principal (valor contratado, parcelas, token budget). Não há como criar/visualizar a **manutenção mensal** dali — o usuário precisa ir até a aba "Operacional" ou outra tela. Além disso, quando há **desconto**, não há como dizer **por quanto tempo** ele vale (3 meses, 6 meses, indefinido).

Vou:

1. Adicionar a manutenção como uma seção dentro do card Financeiro do detalhe, com criação inline.
2. Adicionar **duração do desconto** ao schema e à UI: opções `Indefinido` (default) ou `N meses` a partir do início.
3. Refletir o desconto e sua expiração no MRR efetivo exibido no sidebar.

## Comportamento

### Card Financeiro (no detalhe do projeto)

Estrutura (em ordem):

```
Valor Contratado          R$ 50.000,00
Nº de Parcelas            5x
Parcela Mensal            R$ 10.000,00
Token Budget              R$ 2.000,00
─────────────────────────────────────
Manutenção Mensal         [+ Adicionar]   ← quando não há contrato ativo
```

Quando há contrato ativo, em vez do botão aparece:

```
Manutenção Mensal         R$ 1.500,00 / mês
Desconto                  10% por 6 meses (até 24/10/2026)   ← ou "Indefinido"
Token Budget (manut.)     R$ 500,00
Início                    24/04/2026
[Editar contrato]
```

- Botão **+ Adicionar** abre o `NovoContratoDialog` já existente, com `projectId` pré-preenchido.
- Botão **Editar contrato** abre o mesmo dialog em modo edição (passando o `contractId`), permitindo ajustar mensalidade, desconto, duração, datas e bolsão de tokens.

### Duração do desconto

No `NovoContratoDialog`, quando `Desconto > 0`, aparece um seletor extra:

```
Desconto válido por: ( ) Tempo indefinido
                     (•) Por X meses     [ 6 ]
```

- Default ao habilitar desconto: **Indefinido**.
- Se "Por X meses": exibe input numérico (mín 1).
- Se "Indefinido": campo de meses some.
- A data de fim do desconto é calculada como `start_date + N meses`. Mostrada no card para referência.

Quando `Desconto = 0`, o seletor não aparece.

### Cálculo do MRR efetivo (sidebar "Manutenção")

- Hoje: `mrr = monthly_fee * (1 - discount/100)` sempre.
- Novo: se `discount_duration_months IS NOT NULL` e `today > start_date + N meses`, o desconto **expirou** → `mrr = monthly_fee` cheio. Caso contrário, mantém o cálculo atual.
- O sidebar passa a mostrar, quando o desconto está vigente e tem prazo: `(-10% até 24/10/2026)`. Quando indefinido: `(-10%)`. Quando expirou: nada.

## Implementação técnica

### 1. Migração

Adicionar coluna `discount_duration_months INTEGER NULL` em `public.maintenance_contracts`. `NULL` = indefinido. Sem default — preserva linhas atuais. Sem mudança de RLS.

### 2. `src/components/projetos/NovoContratoDialog.tsx`

- Adicionar `contractId?: string` à interface — quando presente, dialog opera em modo edição: carrega o contrato no open, troca título para "Editar Contrato de Manutenção" e usa `update` em vez de `insert`.
- Estados novos:
  - `discountDurationMode: "indefinite" | "months"` (default `"indefinite"`).
  - `discountDurationMonths: string` (default `"6"`).
- UI: abaixo da linha "Mensalidade / Desconto", quando `Number(discount) > 0`, renderizar bloco com `RadioGroup` (Indefinido / Por X meses) + Input number.
- No save: `discount_duration_months = discountDurationMode === "months" ? Number(discountDurationMonths) : null`. Se `Number(discount) === 0`, sempre grava `null`.
- No load (modo edição): popular os campos a partir do contrato.

### 3. `src/pages/ProjetoDetalhe.tsx` — card Financeiro

- Logo abaixo do `Token Budget` PropRow, adicionar uma seção "Manutenção" com PropRows:
  - Se `activeContract` é null: PropRow "Manutenção Mensal" com botão `+ Adicionar` à direita (chama `setContractOpen(true)`).
  - Se `activeContract` existe: 4 PropRows (Mensalidade, Desconto+duração, Token Budget mensal, Início) + botão `Editar` que abre o dialog com `contractId={activeContract.id}`.
- Estado novo: `editingContractId: string | null`.
- Passar `contractId={editingContractId ?? undefined}` ao `NovoContratoDialog`. Quando `contractOpen` fecha, resetar `editingContractId`.
- Renderizar duração do desconto: `{discount}% {duration ? `por ${duration} meses (até ${formatDate(addMonths(start_date, duration))})` : 'indefinido'}`. Adicionar helper `addMonths` em `src/lib/formatters.ts` (ou inline).

### 4. `src/pages/ProjetoDetalhe.tsx` — recalcular MRR

Substituir o cálculo atual de `mrr` para considerar expiração:

```ts
const discountActive = (() => {
  if (!activeContract || Number(activeContract.monthly_fee_discount_percent) <= 0) return false;
  const months = activeContract.discount_duration_months;
  if (!months) return true; // indefinido
  const end = addMonths(new Date(activeContract.start_date), months);
  return new Date() <= end;
})();
const mrr = activeContract
  ? Number(activeContract.monthly_fee) * (discountActive ? (1 - Number(activeContract.monthly_fee_discount_percent) / 100) : 1)
  : 0;
```

Sidebar "Manutenção" exibe a tag `(-X% até DD/MM/AAAA)` ou `(-X%)` apenas quando `discountActive`.

### 5. Tipos

A tabela `maintenance_contracts` é regenerada em `src/integrations/supabase/types.ts` automaticamente após a migração. Nenhuma edição manual.

## Fora de escopo

- Trocar a lógica que cria movimentações financeiras a partir do contrato (esse fluxo já existe via outro caminho; só estamos representando a duração do desconto no contrato).
- Modificar `src/pages/ContratosManutencao.tsx` ou `Projetos.tsx` agora — o dialog já é compartilhado, então a mudança aparece neles automaticamente; só não vou ajustar a tabela/lista visual desses lugares para mostrar a duração do desconto. Posso fazer depois sob demanda.
- Migrar contratos antigos (todos ficam com `discount_duration_months = NULL` = indefinido, comportamento atual preservado).
