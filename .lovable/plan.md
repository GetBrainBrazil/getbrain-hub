

## Plano: Campos de data inline ao selecionar "Personalizado"

### Problema
Atualmente, ao clicar em "Personalizado", dois calendários grandes abrem dentro do popover. O usuário quer que, ao invés disso, apareçam dois campos de data compactos (tipo input `dd/mm/aaaa` com ícone de calendário) ao lado do dropdown — como no print de referência.

### O que muda

**Comportamento:**
- Quando "Personalizado" é selecionado, o popover fecha normalmente (igual aos outros presets)
- Ao lado do botão do filtro, aparecem dois date pickers inline: um campo "Data Início" e um campo "Data Fim", separados por um texto "a"
- Cada campo é um Popover com um Calendar dentro (padrão shadcn DatePicker)
- Layout: `[Botão Personalizado ▾] [dd/mm/aaaa 📅] a [dd/mm/aaaa 📅]`

**Mudanças em `src/components/PeriodFilter.tsx`:**
- Remover os dois `Calendar` de dentro do `PopoverContent` principal
- Fechar o popover ao clicar em "Personalizado" (igual aos outros presets)
- Renderizar condicionalmente, fora do popover principal, dois DatePicker compactos (cada um com seu próprio Popover + Calendar) quando `preset === "custom"`
- Inputs com placeholder `dd/mm/aaaa`, formato brasileiro

### Arquivo
- `src/components/PeriodFilter.tsx`

