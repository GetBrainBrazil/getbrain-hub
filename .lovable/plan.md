# Melhorias na sidebar do Deal

Refinar a sidebar do detalhe do deal (`DealSidebarRich.tsx`) para deixar mais claro o propósito de cada zona de navegação, melhorar o feedback visual no hover e renomear o campo Owner.

## O que muda

### 1. Tooltips explicativos em cada item de navegação
Cada zona da navegação (Cliente, Dor, Solução, Dependências, Comercial) ganha um tooltip ao passar o mouse, explicando o que se preenche ali. Conteúdo proposto:

- **Cliente** — "Dados da empresa, contatos e tipo de cliente (B2B/B2C)."
- **Dor** — "Dor identificada, categoria, custo mensal e solução atual."
- **Solução** — "Escopo, entregáveis, critérios de aceite, premissas e estimativa."
- **Dependências** — "Acessos, dados, pessoas e autorizações necessárias para iniciar."
- **Comercial** — "Valores, orçamento, decisores, concorrentes e próximos passos."

Implementação: usar o componente `Tooltip` já existente do shadcn (`@/components/ui/tooltip`), envelopando cada `<a>` da nav.

### 2. Hover mais destacado e legível
Hoje o hover usa `hover:bg-muted/40`, que fica fraco. Trocar por um destaque com a cor de acento mas mantendo o texto totalmente legível:

- Item ativo no hover: `hover:bg-accent/15 hover:text-foreground hover:border-l-2 hover:border-accent hover:pl-2` (uma barrinha lateral cyan + leve fundo translúcido).
- O número (01, 02…) passa a `hover:text-accent` para reforçar.
- Transição suave já existente (`transition-colors`) — manter, e adicionar `transition-all` para a borda lateral.
- Garantir contraste: o texto continua usando `text-foreground` (não vira neon sobre neon).

### 3. Renomear "Owner" → "Responsável"
Confirmado: é o responsável pelo deal/projeto no CRM.

- Título do bloco: `Responsável` (em vez de `Owner`).
- Placeholder do select: `Sem responsável`.
- Item "sem owner" do dropdown: `— sem responsável —`.

Escopo desta renomeação: apenas a sidebar (`DealSidebarRich.tsx`). Outras telas (kanban, listagem, header) continuam como estão para não estourar o escopo — se quiser propagar, é só pedir num próximo passo.

## Arquivo afetado

- `src/components/crm/DealSidebarRich.tsx` (única edição).

## Detalhes técnicos

- Importar `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` de `@/components/ui/tooltip`.
- Adicionar campo `hint: string` em cada item do array `ZONES`.
- Envolver a `<nav>` com um `<TooltipProvider delayDuration={300}>`.
- Cada `<a>` vira `<TooltipTrigger asChild>` dentro de um `<Tooltip>`, com `<TooltipContent side="left">` mostrando o hint.
- Classes de hover ajustadas conforme descrito acima, mantendo o estilo "loop" mais discreto para Dependências (badge 2C).
