## Reformular UX/UI de "Custos extras" — sem padrão global, com herança inteligente

### O que muda na lógica

1. **Remover o bloco "Padrão de categorização"** colapsado no fim. Ele criava confusão (preenche tudo lá, depois precisa preencher de novo no item).
2. **Cada item passa a ter sua categorização visível e independente**, exposta direto no card (não fica mais escondida em collapsible).
3. **Herança automática ao adicionar item**: o novo item já vem com a categorização do **último item criado**. Se você adicionou "API OpenAI · Categoria: APIs/Ferramentas · Conta: BTG", o próximo item já vem com isso preenchido — mas livre para mudar.
4. **Botão "Aplicar a todos"** dentro de cada item: propaga a categorização daquele item para todos os outros itens **que ainda estão vazios** (não atropela quem já tem própria). Toast confirma quantos foram afetados.
5. **Botão "Duplicar item"** ao lado da lixeira: copia o item inteiro (categorização + valores) — útil para criar variações rápidas (ex: 3 APIs do mesmo provedor).
6. **Botão "Limpar categorização"** no card quando ele tem alguma categorização preenchida.
7. Os state legados (`extraCategoriaId`, etc.) continuam existindo em memória apenas para **migração de drafts antigos** — o `addExtraCost` os usa como fallback inicial. Mas a UI deles some.

### O que muda no UI

```text
┌─ CUSTOS EXTRAS (APIs, infra, licenças)        [+ Adicionar item] ┐
│ Liste o que esse projeto vai consumir. Cada item tem sua          │
│ própria categorização — você pode duplicar ou aplicar a todos.    │
│                                                                   │
│ ┌─ 1 ITEM                            [📋 Aplicar p/ todos] [⎘][🗑]┐│
│ │ [Descrição: API OpenAI]    [R$ 200,00]    [Mensal ▾]           ││
│ │                                                                 ││
│ │ ┌─ Categorização ─────────────── 4/4 ✓ [Limpar] ────────────┐  ││
│ │ │ 📁 Categoria      [APIs/Ferramentas ▾]                    │  ││
│ │ │ 💰 Centro custo   [Operações ▾]                            │  ││
│ │ │ 🏦 Conta          [BTG ▾]                                  │  ││
│ │ │ 🔁 Meio pagamento [Cartão ▾]                               │  ││
│ │ └────────────────────────────────────────────────────────────┘  ││
│ │ [Observação opcional]                                          ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                   │
│              + Adicionar outro item (herda do anterior)           │
│                                                                   │
│ Resumo: 3 itens · Mensal: R$ 450 · Único: R$ 1.200                │
└───────────────────────────────────────────────────────────────────┘
```

**Detalhes visuais:**
- Card de categorização interno reutiliza o `FinanceCategorizationCard` melhorado (header com badge `4/4`, ícones, checks verdes).
- Botão **"Aplicar p/ todos"** só aparece no header do item quando há **mais de 1 item** E o item atual tem alguma categorização preenchida. Ícone de copy/duplicate.
- Botão **"Duplicar"** sempre visível (ícone Copy).
- Quando o item é **incompleto** (sem descrição ou valor), borda âmbar permanece.
- Estado vazio (sem nenhum item) continua igual.
- Resumo no rodapé continua igual.

### Detalhes técnicos

**Arquivo:** `src/components/crm/DealWonDialog.tsx`

- `addExtraCost()` herda categorização do último item (ou dos `extraCategoriaId`/etc. legados se não houver itens ainda).
- Novas funções: `duplicateExtraCost(id)`, `applyCategorizationFrom(id)`, `clearItemCategorization(id)`.
- `applyCategorizationFrom`: só sobrescreve itens **vazios** de categorização (proteção). Toast informa quantos foram afetados; toast info se nenhum.
- Substituir todo o JSX da `TabsContent value="custos"`:
  - Remover o `<Collapsible>` "Padrão de categorização" do final.
  - Substituir o collapsible interno do item ("Personalizar categorização") pelo `FinanceCategorizationCard` direto, em modo compacto, com botão "Limpar" no header quando há valores.
  - Adicionar botões "Aplicar p/ todos" e "Duplicar" no header do item.
- Manter os state legados (`extraCategoriaId` etc.) e os campos no draft para retrocompatibilidade — só remove a UI de configurá-los.
- Manter o fallback no submit (`e.categoria_id || extraCategoriaId || null`) — assim drafts antigos com padrão definido continuam funcionando, mas novos itens já vêm com categorização própria.
- Pequena adição no `FinanceCategorizationCard`: aceitar prop `compact?: boolean` para diminuir paddings quando renderizado dentro de um item, e prop `onClear?: () => void` para mostrar botão "Limpar" no header.

### Fora do escopo
- Mudar o schema de `extra_costs` no banco.
- Auto-sugestão de itens recorrentes baseada em projetos anteriores.
