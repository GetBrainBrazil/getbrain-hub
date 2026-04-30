## Melhorar UX/UI da aba "Custos" + persistir rascunho do modal inteiro

### Problemas atuais
1. **Confuso**: O bloco "Padrão para custos extras" (categoria, centro, conta, meio) aparece **antes** dos itens, então o usuário preenche 4 campos sem saber pra quê e ainda tem que escolher de novo "Padrão: APIs/Ferramentas" embaixo de cada item.
2. **Redundância visual**: cada item mostra Categoria + Centro de custo de novo, mesmo quando o padrão já cobre.
3. **Ordem invertida** com o que se espera: deveria ser "adicione seus itens → defina o padrão (opcional) → ajuste exceções".
4. **Sem persistência**: ao fechar/reabrir o modal, todo o preenchimento (projeto, parcelas, MRR, custos, desconto) é perdido. Estado vive só em `useState`.

---

### Mudanças no UI/UX da aba Custos

**Nova estrutura (top → bottom):**

```text
┌─ CUSTOS EXTRAS (APIs, infra, licenças)        [+ Adicionar item] ┐
│                                                                   │
│  [estado vazio: ilustração leve + "Adicione APIs, infra,         │
│   licenças que esse projeto vai consumir mensalmente"]           │
│                                                                   │
│  — OU lista de itens (cards compactos) —                         │
│                                                                   │
│  ┌─ Item 1 ────────────────────────────────────── [⋯] [🗑] ───┐ │
│  │ [Descrição: API OpenAI]      [R$ 200,00]  [Mensal ▾]      │ │
│  │ ▸ Categorização específica (colapsado, abre on demand)    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ▾ Padrão de categorização (aplica a todos os itens sem          │
│     categoria própria)  — colapsado por padrão                   │
│     └─ [Categoria] [Centro] [Conta] [Meio de pagamento]          │
│                                                                   │
│  Total mensal: R$ X,XX · Único: R$ Y,YY                          │
└───────────────────────────────────────────────────────────────────┘
```

**Pontos-chave:**

- **Inverter ordem**: itens primeiro, padrão por último (e colapsado). O padrão vira "configuração avançada" — o caminho rápido é só descrição + valor + recorrência.
- **Padrão colapsável** (`Collapsible` do shadcn): fica fechado se ainda não houver itens; abre automaticamente após o 1º item ser adicionado, com hint "Defina aqui pra não repetir em cada item".
- **Categorização do item também colapsada** dentro de cada card ("▸ Personalizar categorização deste item"). Quando fechado, mostra um chip discreto: `Usa padrão: APIs/Ferramentas · BTG · Cartão`. Reduz drasticamente o ruído visual.
- **Estado vazio melhor**: ícone + microcopy explicando que custos extras são opcionais e pra que servem (recorrentes vs setup).
- **Resumo de totais no rodapé** do bloco: "3 itens · R$ 450/mês · R$ 1.200 únicos".
- **Botão Adicionar** continua no topo, mas também aparece um secundário no fim da lista quando já tem itens.
- **Validação inline**: item sem descrição ou valor 0 fica com borda âmbar e aviso "Preencha descrição e valor para salvar".
- Mobile: cards empilham, recorrência vira `Select` full-width abaixo do valor.

---

### Persistência do rascunho do modal inteiro

O modal `DealWonDialog` perde todo input ao fechar. Vamos persistir um **draft por deal** em `localStorage` via `usePersistedState` (padrão já adotado no projeto).

**Chave**: `deal-won-draft:${deal.id}`

**O que persiste**:
- Aba "Projeto": `projectName`, `projectTypeSlugs`, `painCategorySlugs`, `startDate`, `estimatedDelivery`
- Aba "Receita": `installmentsN`, `firstDueDate`, `installments[]`, `mrrEnabled`, `mrrValue`, `mrrStartDate`, `mrrIndefinite`, `mrrDuration`, `mrrDiscount*`, `mrrStartTrigger`, `discountEnabled`, `discountKind`, `discountAmount`, `discountValidUntil`, `discountNotes`
- Aba "Custos": `extraCategoriaId`, `extraCentroId`, `extraContaId`, `extraMeioId`, `extraCosts[]`
- Aba ativa (`step`)

**Comportamento**:
- Ao abrir o modal: se existir draft pra esse deal **e** o draft for mais novo que `deal.updated_at`, restaura o draft. Caso contrário, usa os dados atuais do deal (comportamento atual).
- Banner discreto no topo do modal: "📝 Rascunho restaurado — [Descartar rascunho]" quando aplicado.
- Salva no `localStorage` em cada mudança (debounce 400 ms pra não martelar).
- Ao concluir com sucesso (`close_deal_as_won` retorna ok), **limpa** o draft.
- Ao clicar "Cancelar" ou fechar: mantém o draft (volta de onde parou).
- Botão "Descartar rascunho" volta tudo aos defaults do deal e apaga a chave.

---

### Detalhes técnicos

**Arquivos a editar:**
- `src/components/crm/DealWonDialog.tsx` — reorganizar JSX da `TabsContent value="custos"`, adicionar `Collapsible` do shadcn pro padrão e pra categorização individual de cada item; trocar bloco "Categoria + Centro" inline por chip de resumo + botão de expandir.
- `src/components/crm/DealWonDialog.tsx` — encapsular todos os `useState` do modal em um único objeto persistido com `usePersistedState<DraftV1>(`deal-won-draft:${deal.id}`, ...)`. Manter os setters individuais como wrappers pra minimizar diff. Adicionar versionamento (`__v: 1`) pra invalidar drafts antigos no futuro.
- Adicionar effect que limpa `localStorage.removeItem('deal-won-draft:${dealId}')` no `onSuccess` de `close_deal_as_won`.

**Sem mudanças no banco** — toda a persistência é client-side (rascunho).

**Componentes shadcn já existentes** que serão usados: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `Badge` (pro chip de resumo da categorização).

---

### Fora do escopo
- Mudanças no schema `extra_costs` no banco.
- Mudar UX das abas Projeto/Receita/Revisão (só persistência).
- Auto-sugestão de itens recorrentes baseada em projetos anteriores (pode virar próximo passo).
