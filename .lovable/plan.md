## Problema

No card **Cronograma** (Visão Geral do projeto), depois de preencher uma data não é possível voltar ao estado vazio ("—"). O `<input type="date">` nativo dificulta limpar o campo: o botão "x" do Chrome em alguns sistemas não dispara `onChange` com `""` corretamente, e ao salvar o valor antigo permanece (ou é convertido em uma data inválida como `0001-01-01`, comportamento visto na sessão atual).

## Solução

Substituir os três `<input type="date">` do card **Cronograma** por um componente `DatePicker` (Popover + Calendar do shadcn) com um botão explícito **"Limpar"** dentro do popover. Assim o usuário sempre consegue voltar para "sem data".

A lógica de salvar já trata `null` corretamente (`patchProject` envia `null` para o Supabase e a coluna aceita `NULL`). O problema é puramente de UI ao limpar o campo.

### Mudanças

**1. Novo componente reutilizável** `src/components/ui/date-picker-field.tsx`
- Props: `value: string | null` (formato `YYYY-MM-DD`), `onChange: (v: string | null) => void`, `placeholder?`, `className?`.
- Estrutura: `Popover` + `Button` trigger (mostra data formatada em pt-BR ou placeholder "—") + `PopoverContent` com:
  - `Calendar` (mode="single", locale ptBR) com `pointer-events-auto`.
  - Botão "Limpar" no rodapé que chama `onChange(null)` e fecha o popover.
- Conversão interna entre `string` (`YYYY-MM-DD`) e `Date` (sem timezone shift — usar `parseISO` / `format(d, "yyyy-MM-dd")`).

**2. Em `src/pages/ProjetoDetalhe.tsx`** — card "Cronograma" (linhas ~1769-1811)
- Trocar os três `<Input type="date">` por `<DatePickerField>` para Início, Entrega Estimada e Entrega Real.
- Manter `draftStartDate`, `draftEstimated`, `draftActual` mas tipá-los como `string | null` (em vez de `string ""`). Ajustar `syncDrafts` para usar `null` em vez de `""`. Ajustar a checagem de salvar (`sd !== (project.start_date ?? null)`) — já está compatível.

**3. Reuso opcional** — usar o mesmo `DatePickerField` em outros campos de data do `ProjetoDetalhe.tsx` que sofrem do mesmo problema:
- Data de início do contrato de manutenção (campo `draftContractStartDate`).
- Esse reuso fica como melhoria de consistência, sem mudança comportamental além de permitir limpar.

### Detalhes técnicos

- Usar `date-fns` (`format`, `parseISO`) e `ptBR` de `date-fns/locale`, ambos já presentes no projeto.
- Garantir `className="p-3 pointer-events-auto"` no `Calendar` (regra do projeto para popovers).
- Trigger com `variant="outline"`, `size="sm"`, largura fixa de 180px para casar com o layout atual.
- Sem mudanças no schema do banco. Sem mudanças em `patchProject`.

### Fora de escopo

- Não mexer em outros cards (Financeiro, Descrição, etc.) além de, opcionalmente, reaproveitar o componente em datas de contrato.
- Não alterar `audit_logs` — a transição "data → null" já é registrada pelo fluxo existente.