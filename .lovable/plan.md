# Color picker visual unificado para configurações do CRM

Substituir os swatches fixos de cor por um **color picker visual completo** (área de saturação/brilho + slider de matiz + campo HEX), aplicado de forma idêntica em **Categorias da dor**, **Tipos de projeto**, **Origens de lead** e **Papéis de contato**.

## Comportamento UX

- Clicar no círculo colorido (no formulário de adicionar ou em cada item da lista) abre um **popover compacto** contendo:
  - Quadrado de **saturação × brilho** (arrastar para escolher tom)
  - Slider de **matiz (hue)** abaixo
  - Linha com **8 swatches sugeridos** (paleta vibrante curada para acesso rápido)
  - Campo **HEX** editável (`#22D3EE`) com validação
- Mudanças aplicadas em tempo real (preview) e persistidas ao soltar/sair (`onBlur`/`onCommit` debounced).
- Popover com largura ~240 px, fundo `popover`, sombra suave, arredondado.

## Padronização de armazenamento (HEX)

Hoje há inconsistência:
- `crm_pain_categories.color` e `crm_project_types.color` guardam **classes Tailwind** (`bg-accent/15 text-accent border-accent/30`).
- `crm_lead_sources.color` e `crm_contact_roles.color` guardam **HEX** (`#22D3EE`).

Padronizar tudo em **HEX**. Itens antigos com classes Tailwind continuam sendo lidos: um helper `tokenToHex()` converte os ~6 tokens existentes em HEX equivalente para retro-compatibilidade na renderização. Quando o usuário escolher uma nova cor pelo picker, o valor salvo será HEX puro.

## Renderização dos chips

`PainCategoriesMultiSelect` e `ProjectTypeSelect` hoje aplicam a string como `className`. Trocar para **estilo inline** baseado em HEX:
- `background: hexToRgba(hex, 0.15)`
- `color: hex`
- `border-color: hexToRgba(hex, 0.3)`
- Bolinha lateral: `background: hex`

Funciona tanto para HEX novo quanto para HEX derivado dos tokens antigos.

## Arquivos

**Novo**
- `src/lib/crm/colorUtils.ts` — `tokenToHex`, `hexToRgba`, `randomVividHex`, `SUGGESTED_HEX_PALETTE`, `isValidHex`.
- `src/components/ui/color-picker-popover.tsx` — componente reutilizável (trigger = bolinha, conteúdo = picker visual + paleta + HEX).

**Editados**
- `src/lib/crm/presetColors.ts` — `randomPresetColor()` passa a retornar HEX.
- `src/hooks/crm/useCrmPainCategories.ts` e `useCrmProjectTypes.ts` — defaults de cor em HEX.
- `src/components/crm/settings/PainCategoriesManager.tsx`, `ProjectTypesManager.tsx`, `LeadSourcesManager.tsx`, `ContactRolesManager.tsx` — trocar swatches+popover atuais pelo `ColorPickerPopover` único.
- `src/components/crm/PainCategoriesMultiSelect.tsx` e `ProjectTypeSelect.tsx` — renderizar chips via estilo inline (HEX), removendo dependência das classes Tailwind salvas.

## Dependência

Adicionar `react-colorful` (~3 kB, sem deps, headless, customizável via CSS). Usaremos `HexColorPicker` (área SV + slider hue) e `HexColorInput`.

## Detalhes técnicos

- `tokenToHex` mapeia exatamente os 6 tokens legados:
  - `bg-accent/...` → `#22D3EE`
  - `bg-success/...` → `#10B981`
  - `bg-warning/...` → `#F59E0B`
  - `bg-chart-4/...` → `#A855F7`
  - `bg-chart-5/...` → `#EC4899`
  - `bg-muted ...` → `#94A3B8`
  - Fallback: `#94A3B8`.
- `SUGGESTED_HEX_PALETTE`: `["#22D3EE","#10B981","#F59E0B","#EF4444","#A855F7","#EC4899","#6366F1","#94A3B8"]`.
- `randomVividHex()`: sorteia da paleta exceto cinza.
- Picker: usar `<HexColorPicker color={value} onChange={onChange} />` com CSS override para 200×120 px, bordas arredondadas, ponteiros cyan.
- Salvar com pequeno debounce (200ms) enquanto arrasta, evitando inundar o backend; commit final no `onMouseUp`/`onBlur`.

## Sem mudanças de banco

Coluna `color text` já aceita HEX. Migração não é necessária — apenas convivência via `tokenToHex` na renderização.
