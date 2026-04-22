

## Refinar a barra lateral: espaçamento consistente, estados padronizados e clique no módulo-pai

Atualizar `src/components/AppSidebar.tsx` para padronizar o visual e o comportamento de todos os itens (com ou sem submódulos).

### 1. Espaçamento e estrutura padronizados

- Remover os 3 `<SidebarGroup>` separados (Dashboard / Financeiro / Outros) e usar **um único container** com `space-y-1`, garantindo distância idêntica entre todos os itens (Dashboard, Financeiro, Projetos, Área Dev, Clientes, Configurações).
- Padding interno de cada item: `px-3 py-2` (igual ao Dashboard atual).
- Gap entre ícone e label: `gap-3`.
- Tamanho de ícone unificado: `h-[18px] w-[18px]`.
- Border-left de 2px (transparente quando inativo, ciano quando ativo) em **todos** os itens — inclusive no trigger do Financeiro — para reação visual idêntica.

### 2. Estados de hover/ativo unificados

Criar uma constante `itemClasses(active)` reutilizada por TODOS os itens (incluindo o trigger do Financeiro):

```
border-l-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
inativo: border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
ativo:   border-accent       bg-sidebar-accent              text-accent
```

Hoje o trigger do Financeiro fica "ativo" em qualquer rota `/financeiro/*`, deixando o ícone ciano permanente. Vai mudar: o trigger só fica ativo quando o cursor está sobre ele (hover) ou quando o submenu está aberto E nenhum submódulo específico está selecionado. Submódulo ativo NÃO pinta mais o pai — só o submódulo em si fica ciano. Isso elimina o "duplo destaque" atual.

### 3. Clicar em "Financeiro" abre o Dashboard

Hoje o `<CollapsibleTrigger>` apenas expande/colapsa. Mudança:

- Substituir o `<button>` puro por um wrapper que faz **duas coisas no clique**:
  1. `navigate("/financeiro")` — abre o primeiro submódulo (Dashboard do Financeiro).
  2. Garante que o collapsible fique aberto (`setFinOpen(true)`).
- O chevron (▾) vira um botão **separado** à direita que apenas alterna `finOpen` sem navegar (`e.stopPropagation()`).
- Padrão genérico: se um item tiver `children`, o clique no rótulo navega para `children[0].url` e o chevron controla expand/collapse.

### 4. Submenu — espaçamento e estados

- Container do submenu: `pl-7 space-y-0.5 mt-1` (indentação consistente, alinhada ao texto do pai, não ao ícone).
- Cada subitem: `block px-3 py-1.5 rounded-md text-sm transition-colors`
  - inativo: `text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/30`
  - ativo: `text-accent font-medium bg-sidebar-accent/40`
- Linha vertical sutil à esquerda do bloco do submenu (`border-l border-sidebar-border/40`) para indicar agrupamento — padrão Linear/Vercel.

### 5. Estado colapsado (sidebar mini)

- Quando `collapsed`, esconder labels e chevron; manter ícones centralizados.
- Clique em "Financeiro" colapsado → navega para `/financeiro` (não tenta abrir submenu).

### 6. Comportamento auto-expand

- `finOpen` inicia `true` se a rota atual começa com `/financeiro`.
- Ao navegar para `/financeiro/*`, garantir `setFinOpen(true)` via `useEffect` na location.

### Resultado visual esperado

```
┌──────────────────────────────┐
│ [logo GetBrain]              │
│                               │
│ ▎🏠  Dashboard                │  ← todos com mesmo padding
│  💲  Financeiro          ▾   │  ← clicar no texto vai p/ /financeiro
│      │ Dashboard              │  ← submenu indentado, linha sutil
│      │ Contas a Pagar/Rec.    │
│      │ Orçamento              │
│      │ Relatórios             │
│      │ Extratos Bancários     │
│      │ Configurações          │
│  📁  Projetos                 │
│  </> Área Dev                 │
│  👥  Clientes                 │
│  ⚙️  Configurações            │
└──────────────────────────────┘
```

Distâncias verticais idênticas entre todos os itens de primeiro nível. Hover/ativo com a mesma animação. Clique em qualquer módulo (com ou sem filhos) leva o usuário a uma página — nunca a um estado vazio.

### Arquivos alterados
- `src/components/AppSidebar.tsx` (único arquivo; sem mudanças de schema, rotas ou outras telas)

