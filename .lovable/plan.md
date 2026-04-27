Diagnóstico encontrado:

1. O problema principal não parece ser banco nem permissões. É a navegação do front-end.
2. O link “Dashboard” da sidebar aponta para `/`.
3. Hoje a rota `/` não abre necessariamente o Dashboard: ela redireciona automaticamente para a última rota salva na sessão (`getbrain_last_route`).
4. Como a última rota salva era o próprio card/projeto (`/projetos/...`), clicar em “Dashboard” navega para `/`, mas imediatamente volta para `/projetos/...`. Visualmente parece que “não clicou” ou que a tela está travada.
5. Também há um ajuste anterior em `AppLayout` que dispara `Escape` quando a rota muda. Isso é arriscado, porque fecha overlays só depois da navegação e pode interferir em componentes Radix. Vou substituir por uma limpeza mais previsível.
6. As abas internas do card de projeto funcionam quando clicadas diretamente, mas a experiência ficou confusa porque a navegação global para Dashboard volta para a rota atual.

Plano de correção:

1. Separar Dashboard real de “rota inicial”
   - Fazer a sidebar usar uma rota explícita para Dashboard, por exemplo `/dashboard`, em vez de `/`.
   - Adicionar a rota `/dashboard` renderizando o componente de Dashboard atual.
   - Manter `/` apenas como rota inicial/restauração de sessão, sem ser usada como destino do botão Dashboard.

2. Ajustar o rastreador de última rota
   - Impedir que a rota de Dashboard gere loop com a última página aberta.
   - Garantir que clicar em Dashboard sempre vá para Dashboard, e não para o último projeto visitado.
   - Preservar a lógica útil de “voltar para última rota” apenas quando o usuário entra pela raiz `/`.

3. Melhorar a limpeza de overlays/modais ao navegar
   - Remover a solução frágil de disparar `KeyboardEvent('Escape')` no `AppLayout`.
   - Implementar limpeza controlada em navegação: fechar estados globais quando aplicável e/ou garantir que overlays Radix não fiquem prendendo cliques após trocar de rota.
   - Revisar `Dialog`, `Sheet`, `DropdownMenu`, `Popover` e `Select` para evitar camadas invisíveis bloqueando cliques.

4. Corrigir o warning de Tooltip em contatos do projeto
   - O console mostra: “Function components cannot be given refs” em `ContactRow` / `CardContatos`.
   - Isso não é a causa principal do travamento, mas é um erro estrutural de componente Radix e pode gerar comportamento inconsistente.
   - Ajustar o uso de `TooltipTrigger` para usar um elemento compatível com ref ou aplicar `forwardRef` onde necessário.

5. Validar os fluxos afetados
   - Abrir `/projetos`, entrar em um card de projeto, clicar em Dashboard e confirmar que sai da página.
   - Testar botão “Projetos”/seta de voltar no detalhe.
   - Testar abas internas do projeto: Visão Geral, Escopo, Operacional, Tarefas etc.
   - Testar links da sidebar: Financeiro, Projetos, CRM, Área Dev, Clientes.

Arquivos que pretendo ajustar:

- `src/App.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/RouteTracker.tsx`
- `src/components/AppLayout.tsx`
- `src/components/projetos/CardContatos.tsx`