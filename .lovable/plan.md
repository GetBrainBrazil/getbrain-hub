## Problema

Há **dois editores diferentes** de "Critérios de Aceite" no projeto:

1. `AbaEscopo.tsx` (aba Escopo) — já tem toolbar (B/I/Lista/Checklist) e parsing de `[]`.
2. `ProjetoDetalhe.tsx` linhas 1899-1964 (visão lateral, mostrada no print) — é só um `<Textarea>` puro, sem toolbar, sem auto-save, sem suporte a `[]` ou alinhamento.

O print mostra o editor #2 — por isso "checkbox e bullet/negrito sumiram". Além disso, vários outros campos rich-text espalhados em `ProjetoDetalhe.tsx` (`patchProject` em linhas 885, 914, 1304, 1517, 1758, 1862, 1979) usam `<Textarea>` cru, sem qualquer toolbar.

## Solução

Criar **um único componente reutilizável** `RichTextEditor` (e seu renderizador `RichTextView`) e aplicá-lo em todos os campos editáveis do sistema. Isso vira a regra padrão.

### 1. Novo componente `src/components/ui/rich-text-editor.tsx`

Extraído da implementação que já existe em `AbaEscopo.tsx`, contendo:

- **Toolbar** com: Negrito (`**`), Itálico (`*`), Lista (`-`), Lista numerada (`1.`), **Checklist (`- [ ]`)**, e **Alinhamento** (esquerda / centro / direita / justificado — usando marcadores invisíveis tipo `::left::`, `::center::`, `::right::`, `::justify::` no início da linha, renderizados como `<p style="text-align:...">`).
- `Textarea` com:
  - `autoFocus`
  - Auto-continuação de listas no Enter (já existente)
  - **Auto-save no blur** (chamando `onSave(value)` apenas se mudou; ignora blur que vai para botões da toolbar via `data-md-toolbar`).
  - Atalhos: `Esc` cancela, `Ctrl/Cmd+Enter` salva, `Ctrl/Cmd+B`, `Ctrl/Cmd+I`.
- Sempre exibe checklist na toolbar (não mais opcional via `showChecklist`).

### 2. Novo componente `RichTextView`

Renderiza o markdown no modo leitura, unificando lógica que hoje está duplicada (`MarkdownView` + `CriteriaList` em `AbaEscopo.tsx` e `CriteriaList` em `ProjetoDetalhe.tsx`):

- Reconhece `- [ ]`, `- [x]` e **`- []`** (sem espaço) como checkbox interativo.
- Reconhece `[ ]`, `[x]`, `[]` no início da linha (sem o `-`) também como checkbox — resolve o caso do print onde o usuário digitou apenas `[]`.
- Renderiza `**bold**`, `*italic*`, listas, listas numeradas e alinhamento.
- Recebe `onToggle(newText)` para persistir mudanças de checkbox de forma otimista.

### 3. Substituir editores existentes

- **`ProjetoDetalhe.tsx` linhas 1899-1964** (Critérios de Aceite lateral, o do print): trocar `<Textarea>` puro + `<CriteriaList>` por `<RichTextEditor>` + `<RichTextView>`. Salvar no blur via `patchProject`.
- **`AbaEscopo.tsx`**: substituir o trecho de toolbar/textarea/MarkdownView/CriteriaList interno pelo `RichTextEditor`/`RichTextView` compartilhado. Mantém auto-save no blur que já existe.
- **`ProjetoDetalhe.tsx` outros campos textuais** (Observações, descrição, escopo lateral, etc. — todos os `<Textarea>` editáveis nos blocos `editing === "..."`): também trocar para `<RichTextEditor>` para ter toolbar consistente. Auto-save no blur passa a funcionar em todos eles.
- **`ProjetoDrawer.tsx`** (`acceptance_criteria` em linha ~356): mesmo tratamento.

### 4. Remover duplicação

Apagar `CriteriaList` e `MarkdownView` de `ProjetoDetalhe.tsx` e `AbaEscopo.tsx`, substituindo por imports do novo `RichTextView`.

### 5. Atualizar memória

Atualizar `mem://preference/inline-edit-and-tabs.md` com a regra:
> Todo campo de texto rico do sistema usa `<RichTextEditor>` (toolbar com B/I/Listas/Checklist/Alinhamento) e `<RichTextView>` para leitura. Auto-save no blur. `[]`, `[ ]`, `[x]` viram checkbox interativo ao salvar.

## Detalhes técnicos

**Sintaxe de alinhamento:** prefixo de linha `::center:: texto`, `::right:: texto`, `::justify:: texto`. Sem prefixo = `left` (default). O `RichTextView` extrai o prefixo e aplica `text-align`.

**Compatibilidade:** o parser aceita tanto `- [ ]` (com espaço) quanto `- []` e `[]` puro — então conteúdo já salvo continua funcionando, e o que o usuário digitou no print (`[] Desenvolvimento...`) passa a virar checkbox automaticamente.

**Arquivos alterados:**
- novo: `src/components/ui/rich-text-editor.tsx`
- editado: `src/components/projetos/AbaEscopo.tsx`
- editado: `src/pages/ProjetoDetalhe.tsx`
- editado: `src/components/projetos/ProjetoDrawer.tsx`
- editado: `mem://preference/inline-edit-and-tabs.md`
