## O que muda

A confusão acontece porque o pipeline só mostra `deals` (a tabela rica), mas o botão criava `leads` (tabela paralela invisível no funil). Vamos eliminar a barreira: o botão passa a criar **Deal** direto, e o card aparece imediatamente no pipeline.

A entidade `leads` continua existindo no banco (não vamos migrar ou apagar nada agora), mas o fluxo principal de captação passa a ser pelo Deal. Você ainda pode usar a aba "Leads & Empresas" para gerenciar os leads existentes.

## Fluxo novo

1. Você clica **"+ Deal"** (botão renomeado, posicionado abaixo dos KPIs, com destaque visual).
2. Abre um diálogo enxuto: só **Empresa** (busca/cria inline com Enter, igual ao que já fizemos).
3. Confirma → cria o Deal na coluna **"Reunião Agendada"** (primeira do pipeline atual) com título placeholder `"Novo deal — {Empresa}"` e probabilidade 20%.
4. Navega imediatamente para a ficha do Deal (`/crm/deals/{code}`), onde tudo é editável inline (título, valor, contato, owner, escopo, dependências, próximas ações etc.).
5. O card já está visível no Kanban quando você voltar.

## Mudanças de UI

- **Botão "+ Lead" no header → vira "+ Deal"** e some do header global do CRM.
- **Novo botão "+ Novo Deal" abaixo dos KPIs do Pipeline**, com destaque (cor accent, ícone, tamanho `default`). Posicionado na toolbar de filtros, alinhado à direita, antes do toggle Lista/Kanban — assim fica perto do conteúdo e óbvio que cria um card.
- **Botões "+" das colunas** continuam funcionando, mas agora criam Deal naquela coluna específica (não mais Lead).
- **Botão "+ Novo deal" do estado vazio** das colunas: idem.
- Na aba **"Leads & Empresas"**: o botão "+ Lead" continua existindo (lá ainda faz sentido capturar lead "puro" sem virar deal). Quem quiser converter, usa o fluxo atual de conversão lead→deal.

## Mudanças técnicas

- Novo componente `NewDealQuickDialog.tsx` (mini-modal só com Empresa + criar inline, reutilizando `ComboboxCreate`). Recebe opcionalmente `initialStage` para os botões "+" das colunas.
- Usa o hook `useCreateDeal` existente (que já está pronto).
- `CrmPipeline.tsx`: substitui `NewLeadDialog` por `NewDealQuickDialog`. Move o botão "+ Novo Deal" para dentro da toolbar de filtros do pipeline (mais perto dos KPIs/colunas). Após criar, navega para `/crm/deals/{code}`.
- `CrmLayout.tsx`: remove o botão "+ Lead" do header quando a aba ativa é `pipeline`. Mantém na aba `leads`.
- `NewLeadDialog` permanece intacto para a aba "Leads & Empresas".

## Layout do botão (mockup ASCII)

```text
┌─ KPIs ─────────────────────────────────────────────┐
│ Pipeline R$ 0  │ Forecast R$ 0  │ Ativos 0 │ Atras │
└────────────────────────────────────────────────────┘
┌─ Toolbar ──────────────────────────────────────────┐
│ [Estágio] [Tipo]              [+ Novo Deal] [Lista│Kanban]
└────────────────────────────────────────────────────┘
┌─ Kanban ───────────────────────────────────────────┐
│ Reunião Agendada │ Reunião Realizada │ ... │
│ ┌──────────────┐ │                          │
│ │ Card recém   │ │                          │
│ │ criado aqui  │ │                          │
│ └──────────────┘ │                          │
```

## Sobre adicionar coluna "Novo"

Não vou adicionar agora — você pediu para liberar a criação primeiro e depois avaliar. Os cards novos vão para "Reunião Agendada" (atual primeira coluna). Depois que você criar alguns e ver o funil rodando, decidimos se faz sentido adicionar uma coluna "Novo" antes.

## Arquivos afetados

- **Criar**: `src/components/crm/NewDealQuickDialog.tsx`
- **Editar**: `src/pages/crm/CrmPipeline.tsx` (trocar dialog, mover botão para toolbar)
- **Editar**: `src/pages/crm/CrmLayout.tsx` (remover botão do header na aba pipeline)
- Sem migration de banco. Sem impacto em leads existentes.
