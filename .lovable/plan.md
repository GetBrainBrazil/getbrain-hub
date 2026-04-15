

## Plano: Recorrência com seleção de período e quantidade

### O que muda

**Form state:**
- Adicionar `quantidade_recorrencia: number` (default 1) ao form state
- Mudar `frequencia_recorrencia` para aceitar `"diario" | "mensal" | "anual"` (default `"mensal"`)

**UI — Seção de recorrência (linhas 479-486):**
- Manter o Switch "Conta recorrente"
- Quando ativado, exibir abaixo:
  - Input numérico para quantidade (ex: "12")
  - Select com opções: "Dia(s)", "Mês(es)", "Ano(s)"
  - Texto: "A cada X dia(s)/mês(es)/ano(s)"

**Lógica de criação (linhas 179-194):**
- Usar `quantidade_recorrencia` como número de repetições (em vez de fixo 11)
- Calcular datas com base na frequência:
  - `diario`: addDays
  - `mensal`: addMonths
  - `anual`: addYears

**resetForm e edit prefill:**
- Incluir `quantidade_recorrencia` no reset e no carregamento de edição

### Arquivo
- `src/pages/Movimentacoes.tsx`

