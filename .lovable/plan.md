## Diagnóstico — o que está quebrado hoje

Investiguei o fluxo `Deal → Projeto` e achei 5 problemas, sendo um deles **crítico** (que explica por que "não puxa nada e não consigo criar nada na config financeira"):

### 1. RPC `close_deal_as_won` foi sobrescrita por engano (CRÍTICO)
A migration de `pain_categories` (29/04) substituiu a versão completa v3 da função por uma versão antiga e mutilada que:
- **Perdeu o parâmetro `p_installments`** — parcelas digitadas no diálogo são ignoradas
- **Perdeu a configuração financeira** (categoria, centro de custo, conta, meio) — por isso "não puxa nada"
- **Perdeu a criação da recorrência** em `financial_recurrences` → nenhuma parcela cai no financeiro
- **Perdeu a resolução/criação automática do cliente** por CNPJ
- **Perdeu o vínculo de propostas aceitas** ao projeto e o move dos anexos
- **Perdeu o update do deal** (stage, closed_at, generated_project_id)
- Retorna `uuid` em vez do `jsonb` que o front espera → mensagens de sucesso quebradas

### 2. Dropdowns financeiros vazios
Confirmado no banco: `categorias` (receita) = 0 linhas, `centros_custo` = 0 linhas. Não é RLS, é falta de dados. Precisa de botão "+ Criar" inline no diálogo.

### 3. MRR não vira contrato de manutenção
O deal já tem `estimated_mrr_value` na ficha, mas a RPC nunca cria a recorrência mensal de manutenção. Vai pro projeto como número solto e some.

### 4. Faltam campos de desconto e custos extras
Não existe nada em `deals` nem no diálogo de fechamento pra:
- Desconto promocional (% ou R$, com prazo de validade)
- Custos extras recorrentes (APIs externas, infra, licenças) que precisam virar despesa do projeto

### 5. Parcelas — só botões fixos
Os botões `1x 2x 3x 6x 12x` dividem o total igualmente, mas não dá pra digitar "8x" ou "10x".

---

## Plano de correção

### Backend — nova migration

**Schema novo em `deals`:**
- `discount_amount numeric` + `discount_kind` ('percent'|'fixed') + `discount_valid_until date` + `discount_notes text`
- `extra_costs jsonb` — array de `{description, amount, recurrence ('once'|'monthly'|'yearly'), notes}` (ex: API OpenAI R$ 200/mês)
- `mrr_start_date date` + `mrr_duration_months int` (null = indefinido) + `mrr_discount_months int` + `mrr_discount_value numeric` (pra "primeiros 3 meses com 50% off")

**RPC `close_deal_as_won` reconstruída** (volta pra v3 completa + extensões):
- Aceita de volta `p_installments` e config financeira (categoria/centro/conta/meio)
- Cria recorrência de **implementação** (parcelas) como antes
- Se `estimated_mrr_value > 0`: cria **segunda recorrência mensal** (manutenção) vinculada ao projeto, usando `mrr_start_date` e `mrr_duration_months`
- Se houver `mrr_discount_value/months`: gera as N primeiras movimentações com valor reduzido
- Para cada item de `extra_costs` recorrente (mensal/anual): cria recorrência de **despesa** vinculada ao projeto. Para `'once'`: movimentação única.
- Aplica desconto no total da implementação se `discount_*` preenchido
- Mantém: copy de descoberta/contexto/anexos/dependências, vínculo de propostas, criação de cliente por CNPJ, marcar deal como ganho, propagar IDs financeiros, retornar `jsonb` completo

### Frontend — `DealWonDialog.tsx` reescrito

**Novas seções:**

```text
┌─ Resumo do que vai ser transferido ───────┐
│ ✓ Descoberta, contatos, anexos…           │
│ ✓ Implementação: R$ 12.000 em N parcelas  │
│ ✓ Manutenção (MRR): R$ 800/mês a partir   │
│   de DD/MM, por 12 meses                  │
│ ✓ Custos extras: 2 itens (R$ 250/mês)     │
└───────────────────────────────────────────┘

┌─ Parcelas de implementação ───────────────┐
│ Atalhos: [1x][2x][3x][6x][12x]            │
│ Ou digite: [____]x  [Aplicar]             │ ← novo
│ • Lista editável (valor + vencimento)     │
└───────────────────────────────────────────┘

┌─ Manutenção / MRR (auto se > 0) ──────────┐ ← novo
│ Valor mensal:  R$ [800,00]                │
│ Início:        [DD/MM/AAAA]               │
│ Duração:       (•) Indefinido  ( ) ___ m  │
│ ☑ Desconto: primeiros [3] meses por R$ [400]│
└───────────────────────────────────────────┘

┌─ Desconto promocional (opcional) ─────────┐ ← novo
│ Tipo: (•) % ( ) R$  Valor: [10] %         │
│ Válido até: [DD/MM/AAAA]                  │
│ Observação: [_______________________]     │
└───────────────────────────────────────────┘

┌─ Custos extras (APIs, infra, licenças) ───┐ ← novo
│ + Adicionar custo                         │
│ • OpenAI API · R$ 200 · mensal · [🗑]     │
│ • Setup AWS  · R$ 1.500 · uma vez · [🗑]  │
└───────────────────────────────────────────┘

┌─ Configuração financeira (opcional) ──────┐
│ Categoria de receita: [select] [+ Criar]  │ ← novo botão
│ Centro de custo:      [select] [+ Criar]  │ ← novo botão
│ Conta bancária:       [select] [+ Criar]  │ ← novo botão
│ Meio de pagamento:    [select]            │
└───────────────────────────────────────────┘
```

**Botões "+ Criar" inline** abrem mini-modal que insere direto em `categorias`/`centros_custo`/`contas_bancarias` sem fechar o diálogo, recarrega a lista e seleciona o item recém-criado.

**Input livre de parcelas:** `[____]x [Aplicar]` ao lado dos atalhos — aceita qualquer N entre 1 e 60.

**Persistência no deal:** ao abrir, lê `discount_*`, `extra_costs`, `mrr_*` do deal; ao confirmar, salva de volta no deal antes de chamar a RPC (assim a ficha do deal preserva o histórico).

---

## Detalhes técnicos

**Arquivos alterados:**
- `supabase/migrations/<novo>.sql` — adiciona colunas + reescreve RPC
- `src/components/crm/DealWonDialog.tsx` — UI nova + novos params
- `src/types/crm.ts` — campos novos no `Deal`
- `src/components/crm/ZoneComercial.tsx` — exibir/editar desconto + custos extras + MRR detalhado também na ficha do deal (não só no diálogo de fechamento)

**Compatibilidade:** todos os campos novos têm default seguro (`NULL` / `'[]'::jsonb`). Deals antigos continuam funcionando — UI só mostra blocos novos quando relevante (MRR só aparece se `estimated_mrr_value > 0`, etc.).

**Validação no front:**
- Total parcelas = valor implementação − desconto (warning se diferente)
- MRR exige data de início se valor > 0
- Custos extras exigem descrição + valor

**Sem mudança de RLS necessária** — todas as tabelas já têm policies adequadas.

---

## O que NÃO vou mexer agora

- Não vou criar telas novas de gerenciamento de categorias/centros (já existem em `/configuracoes/financeiro/...`) — só atalho "+ Criar" inline.
- Não vou refatorar o `ZoneComercial` inteiro — só acrescentar os campos novos.
