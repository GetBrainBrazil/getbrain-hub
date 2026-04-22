

## Máscara monetária BRL nos campos de Valores e Encargos

Aplicar formatação automática (separador de milhar `.` e decimal `,`) em todos os campos numéricos da seção "Valores e Encargos" e "Impostos Retidos" da página de criar/editar movimentação (`MovimentacaoDetalhe.tsx`), e também no diálogo de baixa em `Movimentacoes.tsx`.

Hoje os inputs são `<Input type="number">` puros — sem máscara, sem separador de milhar, e o valor digitado é ambíguo (digitar `19343` vira `19343,00` em vez de `193,43`).

### Comportamento desejado

- Input se comporta como campo de moeda: digitar só dígitos, e a máscara forma o valor automaticamente da direita pra esquerda.
  - Digita `1` → mostra `0,01`
  - Digita `19343` → mostra `193,43`
  - Digita `1934300` → mostra `19.343,00`
- Sem permitir letras, sinais ou múltiplos pontos/vírgulas.
- Ao colar valor `1.234,56` ou `1234.56`, normaliza para `1.234,56`.
- Estado interno passa de `string numérica` (`"19343"`) para `string formatada` (`"19.343,00"`); na hora de salvar no banco, converte com `parseMoney(...)` (já existe em `shared.tsx`) e envia como `number`.

### Mudança 1 — Reutilizar helpers de `shared.tsx`

Já existem em `src/components/config-financeiras/shared.tsx`:
- `applyMoneyMask(value)` — formata enquanto digita
- `parseMoney(value)` — converte `"19.343,00"` → `19343`
- `formatMoneyForInput(n)` — formata `number` → string para preencher input ao carregar registro existente

Vou exportar/usar esses três (já são exports nomeados).

### Mudança 2 — `MovimentacaoDetalhe.tsx` (criar/editar movimentação)

**Campos afetados** (linhas 916-963 + impostos linhas 985-992):
- Valor Base, Desconto Previsto, Juros, Multa, Taxas ADM
- PIS, COFINS, CSLL, ISS, IR, INSS

Para cada `<Input>`:
```tsx
<Input
  inputMode="decimal"
  value={form.valor_previsto}
  onChange={(e) => setForm({ ...form, valor_previsto: applyMoneyMask(e.target.value) })}
  placeholder="0,00"
  className="text-right font-mono"  // alinhamento de moeda
/>
```

Remover `type="number"` e `step="0.01"`.

**Carregamento de registro existente**: na função que popula `form` a partir do `mov` carregado do banco (números), usar `formatMoneyForInput(mov.valor_previsto ?? 0)` para preencher já formatado.

**Submit**: na função `handleSave` (ou equivalente), antes de mandar pro Supabase, converter cada campo monetário com `parseMoney(form.valor_previsto)`.

**Cálculo do total previsto**: a função `totalPrevisto` (que hoje soma `parseFloat(form.valor_previsto)`) precisa usar `parseMoney(...)` em cada parcela.

### Mudança 3 — `Movimentacoes.tsx` (diálogo de baixa)

Mesma transformação para os 5 campos do bloco "Valor + ajustes" (linhas 833-849) e os 6 impostos (linha 867). Atualizar `baixaTotals` para usar `parseMoney`.

### Mudança 4 — Valores derivados/exibidos

`formatCurrency(totalPrevisto)` no resumo (linha 968 de Detalhe e 856 de Movimentações) continua funcionando — só precisa receber `number` (resultado do `parseMoney + soma`), não muda.

### Detalhes de UX

- **Alinhamento à direita** + **`font-mono`** nos inputs monetários (padrão já usado nos totais), pra ficar consistente com como números financeiros são exibidos.
- **`inputMode="decimal"`** pra teclado mobile abrir numérico com vírgula.
- **`placeholder="0,00"`** (já está).
- Valor inicial vazio mostra placeholder; assim que digitar o primeiro dígito vira `0,0X`.

### Arquivos afetados

- **Modificado**: `src/pages/MovimentacaoDetalhe.tsx` — máscara nos 11 inputs (5 valores + 6 impostos), conversão no load e no save, ajuste em `totalPrevisto`.
- **Modificado**: `src/pages/Movimentacoes.tsx` — máscara nos 11 inputs do diálogo de baixa, conversão nos cálculos `baixaTotals` e no submit `handleBaixa`.

Sem mudança de schema, sem migration. Apenas frontend, reusando helpers já existentes.

