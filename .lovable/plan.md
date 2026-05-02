## Objetivo

Resolver três problemas:
1. **Variáveis ainda não editáveis** no CMS (mockup, cor da marca do cliente, título da proposta, logo do cliente, KPIs do hero, presets de layout do bloco de investimento, descrição da manutenção, considerações estão lá mas faltam outros, etc.).
2. **Sidebar de seções pouco prática** — ícones genéricos, hierarquia confusa, sem progresso/preenchimento, sem agrupamento visual claro.
3. **Caixas de edição com UI ruim** — campos pequenos, sem hierarquia, sem preview/affordance, sem agrupamento, sem visual feedback.

Tudo continua com **autosave on blur** + **live patch** no iframe + **scroll-to** quando trocar de seção, padrão já estabelecido.

---

## 1. Novo preset de layout do bloco de Investimento

Adicionar um campo `investment_layout` em `proposals`:

- `total_first` (padrão atual): valor total em destaque grande, abaixo "+ Mensalidade" e "Composição".
- `installments_first` (novo): valor parcelado em destaque (`R$ 571,43` enorme) com `7×` em letra menor ao lado, e abaixo "Total: R$ 4.000,00 à vista" pequeno.

No painel **Investimento**, abaixo do "Valor da implementação", um seletor visual com **2 cards radio** mostrando o preview minimalista de cada layout. Live-patch envia o preset pro iframe instantaneamente; persiste on change.

Migration: adicionar coluna `investment_layout text default 'total_first'` (sem CHECK, validação no app). Atualizar edge function `get-proposal-public-data` para retornar o campo, e a view `PropostaPublica.tsx` (seção Investimento) para renderizar os 2 modos.

---

## 2. Variáveis faltantes — novos painéis e campos

### Painéis novos (grupo "Esta proposta")

- **Identidade da proposta** (`p.identidade`) — agrupa: `title`, `welcome_message` (move boas-vindas pra cá), `client_brand_color` com color picker, `mockup_url` com preview clicável, e logo do cliente (upload já existente em outra aba — aqui só mostra preview + link "editar na aba Cliente").
- **Hero KPIs** (`p.hero-kpis`) — toggles para mostrar/esconder cada KPI do hero (Investimento, Mensalidade, Implementação, Válida até) já que hoje sempre aparecem se o valor existir; e os **labels** dos 4 KPIs (`kpi_labels` em `public_page_settings`, parte global) — mas aqui no painel da proposta o usuário só decide visibilidade.

### Campos novos em painéis existentes

- **Investimento**: além do já existente, adiciona o seletor de layout (item 1 acima) e um toggle "Mostrar composição (lista de itens)".
- **Manutenção**: além do valor mensal já existente em `p.investimento`, mover a `maintenance_description` para o painel Manutenção (hoje só tem o valor) com um editor de lista de bullets (cada linha vira um `+ item incluso`), espelhando como aparece na página.
- **Cronograma**: adicionar campo `validation_days` (hoje só `implementation_days` está exposto), `expires_at` (validade) e mostra cálculo "D+0 → D+N · entrega em DD/MM".
- **Considerações**: já existe — só revisar UX para ficar igual aos outros editores de lista.

### Painéis globais — pequenos acréscimos

- **Hero & navegação**: adicionar edição de `kpi_labels` (Investimento / Mensalidade / Implementação / Válida até) — novo campo JSON em `public_page_settings`.
- **Rodapé & contato**: já existe.

---

## 3. Redesign da Sidebar de seções

```text
┌─────────────────────────────────────┐
│  🔍  Buscar campo...                │
├─────────────────────────────────────┤
│  ESTA PROPOSTA                  3/9 │ ← contador de "preenchidos"
│  ────────────────────               │
│  ● Identidade            ✓          │ ← bullet colorido + check verde se preenchido
│  ● Boas-vindas           •          │ ← • amarelo se vazio/pendente
│  ● Contexto              ✓          │
│  ● Solução               ✓          │
│  ● Resumo executivo      ✦ IA       │ ← chip "IA" se for gerado por IA
│  ● Escopo (5 itens)      ✓          │ ← contagem inline
│  ● Investimento          ✓          │
│  ● Cronograma            ✓          │
│  ● Manutenção            —          │ ← traço se opcional + vazio
│  ● Considerações (3)     ✓          │
├─────────────────────────────────────┤
│  GLOBAL · TODAS AS PROPOSTAS    ⚙   │
│  ────────────────────               │
│  ◇ Hero & KPIs                      │
│  ◇ Títulos das seções               │
│  ◇ Sobre a GetBrain                 │
│  ◇ Cards de capacidades  (6)        │
│  ◇ Stack tecnológico    (17)        │
│  ◇ Próximos passos                  │
│  ◇ Tela de senha                    │
│  ◇ Rodapé & contato                 │
└─────────────────────────────────────┘
```

Detalhes:
- Largura aumenta de 240→280 px no desktop para evitar truncamento.
- Itens "Esta proposta" com bullet colorido (azul/cyan), itens "Global" com diamante neutro (◇) — diferença visual imediata entre o que é só desta proposta vs o que afeta todas.
- **Status indicator** ao lado direito: `✓` verde (preenchido), `•` amarelo (vazio mas obrigatório), `—` cinza (opcional vazio), `●` cyan (alterações não salvas / dirty), chip `IA` ou `(N)` para coleções.
- **Contador no header de cada grupo** ("3/9") mostra preenchimento.
- **Pinned active**: o item ativo fica com fundo `bg-accent/10`, borda esquerda `border-l-2 border-accent`, ícone colorido — em vez do tratamento sutil atual.
- Ícones reorganizados: usar lucide consistentes por categoria (texto = `Type`, número/dinheiro = `DollarSign`, lista = `ListChecks`, mídia = `Image`, etc.) e tamanho 14 px.
- Mobile: vira `Sheet` lateral (não `Select`), abre por botão "Seções" no header — muito mais navegável que dropdown.

---

## 4. Redesign das caixas de edição (painéis)

Padrão novo do `PainelHeader` + `Campo`:

- **Header do painel**: ícone maior (40 px), título grande (18 px), descrição em 2ª linha. À direita: chip "Esta proposta" ou "Global · afeta todas as propostas" (avisar o usuário sobre escopo da edição). Linha divisória mais sutil.
- **Cards de seção dentro do painel**: cada subgrupo de campos vira um card (`rounded-xl border border-border/40 bg-muted/20 p-4`) com label de subgrupo em uppercase pequeno. Ex.: dentro de "Investimento" temos cards `Valor`, `Parcelamento`, `Como exibir`, `Mensalidade`.
- **Campos**: label maior (13 px, semibold), input height 40 px (era 36), foco com ring cyan, hint com ícone à esquerda. Para textos longos: textarea com `max-h` automático, contador de caracteres no rodapé direito quando relevante (welcome_message, paragraphs).
- **Saved flash**: além da borda verde já existente, mostrar pequeno toast inline `✓ Salvo` no canto inferior direito do campo por 1.2 s.
- **Preview hint**: cada Campo recebe prop opcional `previewSection` que ao focar dá scroll/highlight no iframe naquele anchor — torna óbvio o que está editando.

### Editor de listas (entregáveis, considerações, capacidades, stack)

Hoje cada um tem implementação ad-hoc. Padronizar com `<ListEditor>`:
- Botão "+ Adicionar" em cima.
- Cada item em row com handle de drag (reorder), input/textarea inline, botão lixeira ao hover.
- Vazio: empty state com ilustração mínima e botão grande.
- Reorder via dnd-kit (já usado no projeto).

### Editor de seleção visual (layout de investimento)

Cards radio com ilustração SVG simples mostrando o resultado:

```text
┌────────────────────────┬────────────────────────┐
│  TOTAL EM DESTAQUE     │  PARCELA EM DESTAQUE   │
│                        │                        │
│   R$ 4.000,00          │   R$ 571,43  7×        │
│   ─────────            │   ───────────────      │
│   7× R$ 571,43         │   Total R$ 4.000,00    │
│                        │                        │
│   [Selecionado]        │   [ Selecionar ]       │
└────────────────────────┴────────────────────────┘
```

---

## 5. Refatoração de arquivos

### Novos
- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelIdentidade.tsx`
- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelHeroKpis.tsx`
- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/InvestmentLayoutPicker.tsx`
- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/ListEditor.tsx`
- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/StatusDot.tsx`

### Editados
- `SidebarConteudo.tsx` — novo design (status dots, contadores, agrupamento visual, mobile vira Sheet).
- `ui.tsx` — novo `PainelHeader` (chip de escopo), novo `Campo` (subgrupos via `<CampoGroup>`), `<CampoGroup title>` wrapper, suporte a `previewSection`.
- `SubTabConteudo.tsx` — adicionar painéis novos no `GROUPS`, novo `SECTION_ANCHOR`, propagar `proposalId`/`previewBust` p/ painéis que precisam do contexto da proposta.
- `PainelInvestimento.tsx` — adicionar `InvestmentLayoutPicker` + toggle "Mostrar composição".
- `PainelCronograma.tsx` — adicionar `validationDays` e `expires_at`.
- `PainelManutencao.tsx` — adicionar editor de bullets para `maintenance_description`.
- `PainelMensagemBoasVindas.tsx` — vira parte do painel Identidade; arquivo removido ou redirecionado.
- `PainelHero.tsx` (global) — adicionar `kpi_labels`.
- `proposalInputs.tsx` — adicionar `ProposalCommitColor` (color picker compacto) e `ProposalCommitToggle` (switch com live-patch).
- `useProposalEditorState.ts` — adicionar `investmentLayout` e `showInvestmentBreakdown` no state e save.
- `publicPageDefaults.ts` — adicionar `kpi_labels: { investimento, mensalidade, implementacao, validade }`.
- `PropostaPublica.tsx` — renderizar layout de investimento em 2 modos, ler `kpi_labels`, ler `show_investment_breakdown`.

### Banco (migration nova)
```sql
ALTER TABLE proposals
  ADD COLUMN investment_layout text DEFAULT 'total_first',
  ADD COLUMN show_investment_breakdown boolean DEFAULT true;

ALTER TABLE public_page_settings
  ADD COLUMN kpi_labels jsonb DEFAULT '{"investimento":"Investimento","mensalidade":"Mensalidade","implementacao":"Implementação","validade":"Válida até"}';
```

### Edge function
- `get-proposal-public-data/index.ts`: incluir `investment_layout`, `show_investment_breakdown`, `kpi_labels`.

---

## 6. Detalhes técnicos relevantes

- O `livePatch` no iframe deve aceitar `investment_layout` e `show_investment_breakdown` para a mudança de preset ser instantânea.
- Status dot da sidebar: helper `computeFillStatus(active, state, settings)` retorna `filled | empty | optional | dirty | ai`. Calculado por seção, memoizado.
- Color picker reutiliza o componente existente em `src/lib/crm/presetColors.ts` se houver, senão `<input type="color">` estilizado.
- Mobile: sidebar vira Sheet aberto via botão fixo no topo do editor; preview continua via Sheet flutuante (já existe).
- Sem mudanças em RLS — colunas novas herdam policy da tabela.

---

## Fora do escopo

- Não vamos editar os textos da carta IA (`public_opening_letter`) e roadmap (`public_roadmap`) inline aqui — ficam em outra etapa, são auto-gerados.
- Não mexemos no chat IA, tracking, ou edge functions de envio.
