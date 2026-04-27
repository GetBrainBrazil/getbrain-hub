## Objetivo

Transformar a visualização de **Cards** em `/projetos` num **Kanban por etapa (status)**, com uma coluna para cada status do projeto, contendo os cards dos projetos daquela etapa. A visualização de Tabela permanece intocada.

## O que muda

Na aba **Cards** (desktop ≥ md), em vez de um grid uniforme `grid-cols-2 lg:grid-cols-4`, exibir colunas horizontais — uma por status de projeto — com os respectivos cards empilhados verticalmente dentro de cada coluna.

Cada coluna terá:
- **Header** com o nome do status (usando `getStatusLabel` de `projetos-helpers`), uma cor/borda superior usando `getStatusBadgeClass` para identidade visual, e um contador `(N)` de projetos.
- **Lista vertical** de cards (mesmo card visual já existente: código, nome, cliente, tipo, valor, progresso, atores, prazo). O `StatusBadge` interno do card pode ser removido nessa visão (redundante, pois a coluna já indica), deixando o card mais limpo.
- **Empty state** sutil ("Nenhum projeto") quando a coluna não tiver itens.

O container das colunas usa **scroll horizontal** (`overflow-x-auto`) com colunas de largura fixa (~ `w-72`/`w-80`), padrão Kanban — igual ao já usado em CRM/Orçamentos do projeto.

## Filtros e ordem das colunas

- Apenas status presentes em `statusFilter` (filtro persistido) viram coluna. Assim o usuário continua controlando o que vê via filtros existentes.
- Ordem das colunas segue `PROJECT_STATUS_OPTIONS` (proposta → aceito → em_desenvolvimento → em_homologacao → entregue → em_manutencao → pausado → cancelado → arquivado).
- Os demais filtros (tipo, cliente, busca) continuam funcionando normalmente — o `filtered` já aplica tudo, basta agrupar por `status`.

## Paginação

Na visão Kanban a paginação atual (`paginated`) não faz sentido (cada coluna tem volume próprio). Solução:
- Na visão Kanban, ignorar `pageSize` e usar `filtered` direto. Esconder o rodapé de paginação nessa visão.
- Tabela e Cards-mobile mantêm a paginação atual.

## Mobile

A visão mobile (`md:hidden`) **não muda** — segue como grid vertical de cards (Kanban horizontal não funciona bem em mobile pequeno e a memória de responsividade pede mobile-first sem perda de função).

## Detalhes técnicos

Arquivo afetado: `src/pages/Projetos.tsx` (apenas o bloco `view === "cards"` no `hidden md:block`).

Estrutura nova:
```text
<div className="overflow-x-auto pb-2">
  <div className="flex gap-4 min-w-max">
    {PROJECT_STATUS_OPTIONS
      .filter(o => statusFilter.includes(o.value))
      .map(o => {
        const items = filtered.filter(r => r.status === o.value);
        return (
          <div className="w-80 shrink-0 flex flex-col gap-3">
            <ColumnHeader status={o.value} count={items.length} />
            {items.length === 0 ? <EmptyHint/> : items.map(r => <ProjectCard ... />)}
          </div>
        );
      })}
  </div>
</div>
```

- `ColumnHeader`: usa `getStatusLabel` + classe de borda/topo derivada de `getStatusBadgeClass` (apenas a cor de borda) para faixa colorida no topo.
- `ProjectCard`: extrair o JSX do card já existente para função interna (`renderProjectCard(r)`) e reusar tanto na coluna do Kanban quanto na grid mobile, evitando duplicação.
- Manter `onClick={() => openDrawer(r.id)}`, `cursor-pointer`, `hover:shadow-md` e `animate-fade-slide`.
- Sem drag-and-drop nesta entrega (apenas visualização agrupada). Mudança de status segue acontecendo dentro do drawer/detalhe do projeto.

## Fora do escopo

- Drag-and-drop entre colunas (pode ser uma próxima iteração se desejado).
- Mudanças na visão Tabela.
- Mudanças nos filtros, KPIs ou na tela mobile.
