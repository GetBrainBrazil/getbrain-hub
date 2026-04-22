

## Fechar popover ao limpar seleção do filtro

Hoje, no componente `MultiSelectFilter` (em `src/pages/Movimentacoes.tsx`, linhas ~95-171), o botão **"Limpar seleção"** apenas chama `onChange([])`, mas o `Popover` continua aberto mostrando todas as opções. Você quer que limpar também feche o popover.

### Mudança

**`src/pages/Movimentacoes.tsx` — componente `MultiSelectFilter`**
- Tornar o `Popover` controlado: adicionar `const [open, setOpen] = useState(false)` e passar `open={open} onOpenChange={setOpen}`.
- No `onClick` do botão "Limpar seleção", chamar `onChange([])` **e** `setOpen(false)` em sequência.

### Resultado
Ao clicar em "Limpar seleção" em qualquer um dos filtros multi-select da página de Movimentações (Tipo, Categoria, Cliente/Fornecedor, Conta, Projeto, etc.), a seleção é limpa e o popover fecha imediatamente.

### Arquivo modificado
- `src/pages/Movimentacoes.tsx`

