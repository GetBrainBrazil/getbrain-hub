
## Contexto

Hoje em **`/projetos/:id`** (`ProjetoDetalhe.tsx`) **não existe** nenhuma aba de propostas ou anexos. As abas atuais são: Visão Geral, Escopo, Operacional, Tarefas, Marcos, Dependências, Riscos, Integrações, Atividade.

A área "Descoberta | Proposta & Anexos" do print **vive no CRM** (`PropostaTabContent` em `src/components/crm/proposta/`). Como o projeto sempre nasce de um deal (campo `source_deal_id` em `projects`), dá pra trazer toda essa visão pro detalhe do projeto — mas em **modo leitura/consulta**, com o padrão visual novo dos cards de projeto (header denso, cards com bordas suaves, totais à direita em fonte mono, badges de status), e listando **todas** as versões de proposta vinculadas, não só a ativa.

## O que vai ser feito

### 1. Nova aba "Propostas & Anexos" em ProjetoDetalhe

Adicionar entre **Operacional** e **Tarefas**, com contador = nº de propostas vinculadas.

```
Visão Geral · Escopo · Operacional · Propostas (3) · Tarefas · Marcos · ...
```

### 2. Componente `AbaPropostas` (novo, em `src/components/projetos/`)

Estrutura visual seguindo o padrão dos outros cards do projeto:

```text
┌─────────────────────────────────────────────────────────────┐
│ Propostas comerciais                       [Abrir editor →] │
│ Todas as versões geradas pra este projeto                   │
├─────────────────────────────────────────────────────────────┤
│ ╭─ PROP-0006  ● Convertida           TOTAL R$ 4.000  MRR 600 ╮│
│ │  Sunbright Energia Solar                                   │
│ │  Enviada 02/05/26 · Aceita 02/05/26 · Validade 30/05/26    │
│ │  [Ver PDF] [Página pública] [Editor completo]              │
│ ╰────────────────────────────────────────────────────────────╯│
│ ╭─ PROP-0005  ○ Recusada (v anterior)  R$ 3.500              ╮│
│ │  ...                                                        │
│ ╰────────────────────────────────────────────────────────────╯│
└─────────────────────────────────────────────────────────────┘

┌─ Organograma do cliente ────────────────────────────────────┐
│ [thumbnail clicável → abre original]                        │
│ Herdado do deal #DEAL-008                                   │
└─────────────────────────────────────────────────────────────┘

┌─ Mockup BETA ──────────────────────────────────────────────┐
│ Link: https://preview.lovable.app/...     [↗ Abrir]         │
│ Galeria de prints (4):                                      │
│ [img] [img] [img] [img]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Lista **todas** as propostas onde `proposals.deal_id = project.source_deal_id` (não só a ativa).
- Cada card de proposta mostra: código, status efetivo (usando `effectiveStatus` + `OrcamentoStatusBadge`), total + mensal em fonte mono à direita, datas-chave (criada/enviada/aceita/recusada), validade.
- Ações por proposta: **Ver PDF** (signed URL via `openProposalPdf`), **Página pública** (abre `/p/:token` em nova aba quando há `access_token`), **Editor completo** (`/financeiro/orcamentos/:id/editar`).
- A versão ativa (mais recente, status ≠ recusada) ganha destaque visual (borda `accent`, badge "Ativa").
- Versões antigas ficam recolhidas em `<details>` "Versões anteriores (N)" se houver mais de 1.
- Estado vazio: card pontilhado "Este projeto ainda não tem proposta vinculada" + link pro deal de origem.

**Organograma e Mockups** são reaproveitados do deal (somente leitura aqui — a edição continua no CRM, com link "Editar no deal #CODE"). Usa o mesmo `AnexoUploader` em modo display, ou simplesmente renderiza thumbnails clicáveis.

### 3. Hook novo `useProjectProposals(projectId)`

Em `src/hooks/projetos/useProjectProposals.ts` — `useQuery` que:
1. Busca `projects.source_deal_id` se não vier do contexto.
2. Faz `select` em `proposals` filtrando por `deal_id`, ordenado por `created_at desc`, ignorando `deleted_at`.
3. Retorna também o organograma_url e mockup do deal num único payload.
4. Chave de cache: `["project_proposals", projectId]` — invalidada via `invalidateProposalCaches` do `cacheInvalidation.ts` (já existe).

### 4. Modernização visual (padrão atual de /projetos)

- Container externo: `rounded-lg border border-border bg-card`.
- Header de seção com `SectionLabel` (uppercase 10px tracking) + descrição.
- Totais em coluna à direita com `text-[10px] uppercase` em cima e `font-mono font-bold tabular-nums` embaixo (igual ao header da `PropostaCard` do CRM).
- Botões: `size="sm" variant="outline"` com ícone à esquerda.
- Sem qualquer edição inline aqui (o editor continua no `/financeiro/orcamentos/:id/editar`) — o objetivo dessa aba em projetos é **consulta + acesso rápido**.
- Responsivo: cards empilham no mobile, ações viram bottom-sheet de ações via menu de 3 pontinhos quando largura < 640px.

### 5. Detalhes técnicos

**Arquivos novos:**
- `src/components/projetos/AbaPropostas.tsx`
- `src/hooks/projetos/useProjectProposals.ts`

**Arquivos editados:**
- `src/pages/ProjetoDetalhe.tsx` — adicionar entry no array de tabs (linha ~1221) + novo `<TabsContent value="proposals">`.

**Sem migration.** Schema atual já tem `projects.source_deal_id`, `proposals.deal_id`, `proposals.access_token` e `deals.organograma_url / mockup_url / mockup_screenshots`. Tudo o que precisamos já está modelado.

**Edge cases tratados:**
- Projeto sem `source_deal_id` (criado manualmente) → empty state explicando que propostas só aparecem aqui quando o projeto vem de um deal.
- Proposta sem `pdf_url` → botão "Ver PDF" desabilitado com tooltip "Gere o PDF no editor completo".
- `access_token` ausente → botão "Página pública" oculto.

## Confirmação

Você falou "**dentro de /projetos**" e a screenshot é do CRM — vou implementar essa visão **dentro do detalhe do projeto** (`/projetos/:id`), reaproveitando os dados do deal de origem. Se você quiser também redesenhar a versão do CRM (`PropostaTabContent`) com o mesmo padrão visual, me avisa que eu replico — mas pelo texto da sua mensagem entendi que o pedido é trazer essa área pra projetos.
