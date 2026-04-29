# Editor de texto rico para todas as caixas de descrição

## Visão geral

Hoje o `RichTextEditor` (em `src/components/ui/rich-text-editor.tsx`) já tem boa parte do que você pediu: **Ctrl+B**, **Ctrl+I**, listas, lista numerada, checklist, alinhamento (esquerda/centro/direita/justificar) e auto-continuação de listas no Enter. Falta:

1. **Markdown shortcuts inline** ao digitar (auto-bullet com `- `, auto-numerado com `1. `, auto-checkbox com `[] `).
2. **Toolbar flutuante** que aparece **só quando o campo está em foco** e some no blur — em vez de uma barra fixa visível o tempo todo.
3. **Mais opções de formatação**: cor da letra, sublinhado, riscado, código inline, citação, título (H2/H3), e link.
4. **Trocar todas as caixas multiline** que hoje são `Textarea` cru pelo novo editor.

## Comportamento detalhado

### Toolbar flutuante (foco-só)

- Ancorada acima do editor, posicionamento `sticky` com `transition opacity`.
- Aparece com fade-in quando o `Textarea` recebe `focus`.
- Some quando o campo perde foco — **a menos** que o foco esteja indo para um botão da própria toolbar (já temos a guarda `data-md-toolbar` no blur, vamos preservar).
- `Esc` também colapsa a toolbar e tira foco do campo.
- Visual: pílula compacta com `shadow-md`, fundo `bg-popover`, borda sutil. Mais bonita que a barra fixa atual.

### Markdown shortcuts ao digitar

Implementar no `onKeyDown` do textarea, ativando ao digitar **espaço** depois de:

- `-` ou `*` no início da linha → vira marcador de lista (`- `).
- `1.` ou `1)` → vira lista numerada (`1. `).
- `[]` ou `[ ]` → vira checkbox (`- [ ] `).
- `>` → vira citação (`> `).
- `#`, `##`, `###` → vira heading (renderizado no preview com fonte maior).

Implementação: detecta padrão na linha atual, substitui pelo marcador canônico e mantém cursor logo após.

### Atalhos de teclado adicionais

- `Ctrl+B` negrito, `Ctrl+I` itálico (já existem).
- `Ctrl+U` sublinhado → wrapper `__texto__` (parser custom — Markdown puro não tem sublinhado, vamos usar HTML `<u>` no render).
- `Ctrl+Shift+S` riscado → `~~texto~~`.
- `Ctrl+E` código inline → `` `texto` ``.
- `Ctrl+K` insere link → `[texto](url)`, com seleção colocada na URL.
- `Ctrl+Shift+7` lista numerada, `Ctrl+Shift+8` lista com marcadores, `Ctrl+Shift+9` checklist.

### Cor da letra

Botão de cor abre popover com 6-8 cores do design system (foreground, muted, primary, accent, destructive, success, warning, info). Aplica wrapper `{color:nome}texto{/color}` na seleção (sintaxe custom, simples de parsear). No `RichTextView` adiciona regex que renderiza esse wrapper como `<span style="color: hsl(var(--cor))">`.

Sem color picker arbitrário — só paleta do design system, para consistência.

### Toolbar — itens finais

```text
[B] [I] [U] [S]  |  [H2] [H3]  |  [• lista] [1. lista] [☑ check]  |  [" cite] [< / > code] [🔗 link]  |  [🎨 cor]  |  [⇆ esq] [⇔ centro] [⇉ dir] [⇌ just]
```

Agrupado com separadores `|` finos. Labels em tooltip.

### Onde aplicar (substituir Textarea)

Todas as caixas onde texto longo faz sentido. Lista mínima:

- `src/pages/crm/CrmDealDetail.tsx` — função `InlineText` (multiline). Refatorar para usar `RichTextEditor` quando `multiline`. Cobre: descrição da dor, contexto comercial, descobertas, dependências, etc.
- `src/components/crm/ZoneComercial.tsx` — mesma função `InlineText` duplicada, mesmo refactor.
- `src/pages/crm/CrmCalendar.tsx` — descrição de evento.
- `src/pages/crm/CrmPipeline.tsx` — motivo de perda (popup).
- `src/pages/crm/CrmLeads.tsx` — motivo de descarte.
- `src/pages/Clientes.tsx`, `ContasPagar.tsx`, `ContasReceber.tsx`, `ExtratoMovimentacaoDetalhe.tsx`, `MovimentacaoDetalhe.tsx`, `Movimentacoes.tsx`, `ProjetoDetalhe.tsx` — campos "Observações" / "Descrição".
- `src/components/dev/TaskMetadataSidebar.tsx`, `NovaTaskDialog.tsx` — descrição de task.
- `src/components/orcamentos/OrcamentoKanban.tsx`, `pages/financeiro/OrcamentoEditarDetalhe.tsx` — observações.
- `src/components/vendas/NovaVendaDialog.tsx` — descrição opcional.
- `src/components/configuracoes/CargoDialog.tsx` — descrição do cargo.

**Onde NÃO aplicar:** campos de "motivo" curto (1 linha, sem benefício de formatação) — fica decisão pragmática: se já passa `rows={2}` ou menos, mantém Textarea simples. Vou aplicar onde `multiline` está explícito ou `rows >= 3`.

### Render (RichTextView)

Atualizar para suportar:
- Citação `> `
- Headings `#`, `##`, `###`
- Sublinhado `__texto__`
- Riscado `~~texto~~`
- Código inline `` `texto` ``
- Link `[texto](url)` (já parcialmente suportado em `renderInline` — verificar e completar)
- Cor `{color:primary}texto{/color}`

Tudo continua serializando como string única no banco — sem mudança de schema.

## Detalhes técnicos

**Arquivos a editar:**

- `src/components/ui/rich-text-editor.tsx` — adicionar shortcuts inline, toolbar flutuante focus-only, novos atalhos de teclado, popover de cor, novos botões na toolbar, parser de novos marcadores no `RichTextView`.
- `src/pages/crm/CrmDealDetail.tsx` — `InlineText` multiline usa `RichTextEditor` (com `onSave` no blur já encaixa no padrão).
- `src/components/crm/ZoneComercial.tsx` — idem.
- Demais arquivos da lista — substituições pontuais de `<Textarea>` por `<RichTextEditor>` quando o campo for descritivo.

**Sem mudanças em:**

- Schema do banco (continua salvando string).
- `MarkdownComposer` / `MarkdownSplitEditor` (são outro padrão, usados em locais específicos com preview lado a lado — não sobrepor).
- Inputs de 1 linha (mantém `Input`).

**Consideração técnica:** o editor permanece baseado em `<textarea>` controlado, sem contenteditable. Isso simplifica autosave, undo nativo do browser, mobile keyboard, copy-paste. A "richness" vive no parser de render — abordagem que já está no projeto e funciona bem.

## Fora do escopo

- WYSIWYG real (contenteditable / Tiptap / Slate). Custo alto, ganho marginal pro caso de uso (notas internas, descrições). Mantemos a abordagem markdown atual.
- Inserção de imagem inline (caixas de descrição não recebem mídia).
- Tabela inline.
- Cores customizadas com color picker (apenas paleta do DS).
