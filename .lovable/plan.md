# Unificar UX de "Tipo de Projeto" e "Categorias da Dor"

Os dois campos vão usar exatamente o mesmo padrão visual. Diferença única: tipo é single-select, categorias é multi-select.

## Layout final (idêntico nos dois)

```text
TIPO DE PROJETO
[● Chatbot WhatsApp ✓ ×]                              ← chip(s) selecionado(s) em cima
┌──────────────────────────────────────────────────┐
│ Selecionar tipo de projeto...              ▾     │  ← barra discreta embaixo
└──────────────────────────────────────────────────┘
```

Ao clicar na barra, abre popover com busca + lista (estilo Command), permitindo selecionar/criar.

## Decisões de UX

- **Chips em cima** (estilo bonito do "Tipo de Projeto" atual):
  - Cor cheia da categoria/tipo + bolinha colorida + nome + ✓ + × no hover.
  - Em multi-select, vários chips lado a lado; em single-select, um chip só.
  - Só aparecem os itens selecionados (sem chips "sugeridos" inline — isso simplifica e segue o padrão do Pain).

- **Barra de seleção embaixo** (estilo do Pain atual, mas mais discreta):
  - Botão `outline` com altura `h-8`, texto `text-xs`, ícone `ChevronsUpDown` `h-3.5`.
  - Hoje a barra tem `default` size + `text-sm` e fica do tamanho de um input cheio — vai diminuir para parecer secundária ao chip selecionado.
  - Texto: "Selecionar..." quando vazio; "Trocar..." (single) ou "Adicionar mais..." (multi) quando já tem seleção.

- **Popover**:
  - Mesmo `Command` com input de busca, lista filtrada, criação inline para admins (Enter cria).
  - Lista mostra ✓ à esquerda do nome quando selecionado, bolinha colorida à direita.

## Detalhes técnicos

**Arquivos a editar:**

- `src/components/crm/ProjectTypeSelect.tsx` — reescrever do zero. Remover smart-ranking, modo compacto, input sempre visível, "+N outros". Substituir por: chip(s) selecionado(s) + barra `Popover`+`Command` (igual ao Pain). Mesma assinatura de props (`value`, `onChange`, `disabled`).
- `src/components/crm/PainCategoriesMultiSelect.tsx` — manter estrutura, mas:
  - Trocar a barra de `size default` para `size sm` + `h-8` + `text-xs` para deixar mais discreta.
  - Adicionar bolinha colorida e ícone ✓ nos chips selecionados (alinhar visual com o do tipo).
  - Manter ícone × para remover, manter popover Command.

**Sem mudanças em:**

- `src/hooks/crm/useCrmProjectTypes.ts` (o hook `useProjectTypeUsage` adicionado anteriormente fica órfão — pode ser removido para limpar, mas não quebra nada se ficar).
- Schema de banco.
- `useCrmPainCategories`, página de configurações dos dois.
- `CrmDealDetail.tsx` (consumidor — assinaturas iguais).

**Limpeza opcional:** remover `useProjectTypeUsage` de `src/hooks/crm/useCrmProjectTypes.ts` já que não será mais usado.

## Fora do escopo

- Mudar cards do `DealCard` (já tratado em iterações anteriores).
- Multi-select para tipo de projeto (continua single).
- Mudanças no schema ou nas páginas de gerenciamento em `/configuracoes/pessoas/*`.
