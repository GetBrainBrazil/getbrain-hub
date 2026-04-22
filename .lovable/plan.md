

## Refinar visual da sidebar

Os módulos atuais estão usando um fundo ciano sólido (`bg-accent/15`) em estado idle e ciano puro com sombra neon quando ativo — muito saturado, "chapado" e visualmente ruidoso. Vou refinar para um design mais sóbrio, alinhado a apps profissionais como Linear, Notion e Vercel.

### Mudanças no `src/components/AppSidebar.tsx`

**Estado idle (não ativo):**
- Remover o fundo ciano (`bg-accent/15`) — fica transparente
- Texto e ícone em `text-sidebar-foreground/70` (cinza claro suave sobre o fundo escuro)
- Hover sutil: `hover:bg-sidebar-accent/50` + `hover:text-sidebar-foreground`
- Peso de fonte `font-medium` (não `font-semibold`)

**Estado ativo (módulo aberto):**
- Fundo sutil: `bg-sidebar-accent` (azul-escuro do tema, não ciano)
- Borda esquerda fina ciano de 2px (`border-l-2 border-accent`) — esse é o "contorno azul neon" discreto
- Texto em ciano (`text-accent`)
- Sem sombra neon (`shadow-md shadow-accent/25` removido)
- Mesmo `font-medium`

**Botão Financeiro (collapsible):**
- Mesmo tratamento — sem fundo ciano em idle, apenas borda esquerda + texto ciano quando ativo
- Subitens já estão bons, mantém

**Refinamentos gerais:**
- Padding reduzido para `px-3 py-2` (de `py-2.5`)
- Gap entre ícone e texto `gap-3` para respirar melhor
- Ícones em `h-[18px] w-[18px]` (ligeiramente menores, mais elegantes)
- Espaçamento entre grupos (`SidebarGroup`) ajustado para visual mais arejado

### Resultado visual

```text
Antes:                          Depois:
┌─────────────────┐            ┌─────────────────┐
│ ████ Dashboard  │            │  Dashboard      │
│ ████ Financeiro │            │ ▌Financeiro     │  ← borda ciano + bg sutil
│ ████ Projetos   │  →         │  Projetos       │
│ ████ Área Dev   │            │  Área Dev       │
└─────────────────┘            └─────────────────┘
(tudo em ciano,                (limpo, hierarquia
ruidoso)                        clara, ativo destacado)
```

Apenas o módulo aberto recebe o destaque (borda lateral ciano + texto ciano + fundo sutil). Os outros ficam neutros e discretos.

**Arquivo alterado:** `src/components/AppSidebar.tsx` apenas.

