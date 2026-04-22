

## Sidebar: fechar submenus ao navegar para outro módulo

Atualmente o `openMap` em `src/components/AppSidebar.tsx` só **abre** grupos (nunca fecha) quando a rota muda. Resultado: depois de visitar Financeiro, seus submódulos ficam expandidos mesmo quando o usuário vai para Projetos/Clientes/etc.

### Mudança

Em `src/components/AppSidebar.tsx`, no `useEffect` que reage a `location.pathname`, trocar a lógica de "merge aditivo" por uma reconstrução completa do mapa: para cada item com `children`, `open = location.pathname.startsWith(item.url)`. Assim, ao sair de `/financeiro/*`, o grupo Financeiro fecha automaticamente.

Comportamento adicional: o usuário ainda pode abrir/fechar manualmente um grupo via chevron (o `setOpenMap` do toggle continua funcionando) — a sincronização automática só ocorre quando a rota muda.

### Resultado

- Clicar em "Projetos" estando em `/financeiro/movimentacoes` → grupo Financeiro recolhe.
- Clicar em "Financeiro" → seu submenu abre e os outros (se houvesse) ficam fechados.
- Submenu do módulo ativo permanece aberto enquanto o usuário navega entre seus subitens.

### Arquivo alterado

- `src/components/AppSidebar.tsx` (apenas o `useEffect` de sincronização — sem outras mudanças)

