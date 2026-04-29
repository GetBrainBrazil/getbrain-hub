# Refatorar "Nova dependência" para tela cheia + melhorar card/lista

## Objetivo

Substituir o modal atual de criar/editar dependência por uma **tela cheia (full-screen overlay)** mais espaçosa e organizada, adicionar campos relevantes que faltam, e redesenhar a listagem externa em formato de **cards visuais** ao invés da tabela densa atual.

---

## 1. Novo formulário em tela cheia

Substituir o `<Dialog>` atual por um overlay que cobre 100% da viewport (mesma rota, sem navegação). Vantagens:
- Mantém o contexto do deal (sem perder scroll/estado da página).
- Espaço para layout em duas colunas e campos novos.
- Fecha com ESC, botão "X" no topo, ou clique em "Cancelar".

### Layout da tela cheia

```text
┌─────────────────────────────────────────────────────────────┐
│  ←  Nova dependência · DEAL-008 Cliente XYZ            [X]  │
│  O que precisa ser combinado/recebido para o projeto rodar  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── COLUNA ESQUERDA ────────┐ ┌─── COLUNA DIREITA ─────┐ │
│  │ TIPO (chips coloridos)      │ │ STATUS                  │ │
│  │ [Acesso] [Dado] [Pessoa]…   │ │ [Aguardando] [Combinado]│ │
│  │                             │ │ [Liberado]              │ │
│  │ DESCRIÇÃO *                 │ │                         │ │
│  │ [textarea grande, 4 linhas] │ │ PRIORIDADE  (novo)      │ │
│  │                             │ │ [Baixa][Média][Alta][🔥]│ │
│  │ IMPACTO SE NÃO CUMPRIDO     │ │                         │ │
│  │ (novo, textarea)            │ │ PRAZO COMBINADO         │ │
│  │                             │ │ [date]                  │ │
│  │ RESPONSÁVEL (cliente)       │ │ DATA DA SOLICITAÇÃO     │ │
│  │ Nome  |  Função/cargo       │ │ (novo, default = hoje)  │ │
│  │ E-mail (novo) | Telefone(novo)│                         │ │
│  │                             │ │ DONO INTERNO (novo)     │ │
│  │ NOTAS                       │ │ Quem do nosso time      │ │
│  │ [textarea]                  │ │ acompanha (select user) │ │
│  │                             │ │                         │ │
│  │ LINKS / REFERÊNCIAS (novo)  │ │ BLOQUEIA INÍCIO? (novo) │ │
│  │ + adicionar URL             │ │ [ ] Sim, é blocker      │ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                       [Cancelar]   [Adicionar dependência]  │
└─────────────────────────────────────────────────────────────┘
```

### Campos novos propostos

| Campo | Tipo | Por quê |
|---|---|---|
| `priority` | enum (`baixa`/`media`/`alta`/`critica`) | Nem toda dependência é igual; ajuda a priorizar visualmente. |
| `impact_if_missing` | text | Documenta o risco caso não seja cumprida (alimenta análise de risco). |
| `responsible_email` | text | Permite acionar direto por e-mail. |
| `responsible_phone` | text | Idem WhatsApp/ligação. |
| `requested_at` | date (default: hoje) | Quando começamos a pedir — útil para SLA/cobrança. |
| `internal_owner_actor_id` | uuid (FK actors) | Quem do nosso time persegue isso. |
| `is_blocker` | boolean | Se marcado, bloqueia início do projeto e ganha destaque visual. |
| `links` | text[] | URLs de referência (planilha, doc, conversa). |

Tudo opcional exceto `description` e `dependency_type` (já obrigatórios).

---

## 2. Redesenho da listagem (cards ao invés de tabela)

A tabela atual é densa e perde informação visual. Substituir por **grid de cards** (1 col mobile, 2 cols ≥md, 3 cols ≥xl).

### Anatomia do card

```text
┌──────────────────────────────────────────┐
│ [ACESSO A SISTEMA]  🔥 BLOCKER     ⋯ ▾  │  ← chip tipo + badge blocker + menu
│                                          │
│ Acesso ao CRM atual via API. Liberar     │  ← descrição (clamp 2)
│ usuário com permissão read.              │
│                                          │
│ 👤 João Silva · CTO                      │  ← responsável (se houver)
│ 📅 12/05/2026 · em 3d                    │  ← prazo + countdown
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ ● Combinado          [Alta] 🟠     │   │  ← footer: status + prioridade
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

Detalhes visuais:
- Borda esquerda colorida (4px) refletindo a **prioridade** (cinza/azul/amarelo/vermelho).
- Atrasadas: borda destrutiva piscando sutilmente + ícone ⚠.
- Liberadas: card com `opacity-70` e descrição com `line-through` suave.
- Hover: leve elevação (`shadow-md`) + ação rápida "Marcar como liberado" inline.
- Menu `⋯`: Editar, Marcar como liberado, Duplicar, Remover.

### Header da seção

Mantém o mesmo título "04 Dependências externas" mas adiciona:
- Mini-resumo segmentado: `5 total · 2 atrasadas · 1 blocker`.
- Filtro rápido (chips toggleable): `Todas | Pendentes | Atrasadas | Blockers | Liberadas`.
- Botão "+ Adicionar" abre a tela cheia.

### Empty state

Mantém o atual (botão tracejado), mas com ícone maior e texto mais convidativo.

---

## 3. Mudanças técnicas

### Banco de dados (migração)

Adicionar colunas em `deal_dependencies`:
```sql
ALTER TABLE deal_dependencies
  ADD COLUMN priority text NOT NULL DEFAULT 'media',
  ADD COLUMN impact_if_missing text,
  ADD COLUMN responsible_email text,
  ADD COLUMN responsible_phone text,
  ADD COLUMN requested_at date DEFAULT CURRENT_DATE,
  ADD COLUMN internal_owner_actor_id uuid REFERENCES actors(id),
  ADD COLUMN is_blocker boolean NOT NULL DEFAULT false,
  ADD COLUMN links text[] DEFAULT '{}';
```
RLS já existente herda automaticamente.

### Tipos & constantes

- `src/types/crm.ts`: estender `DealDependency` com os novos campos + novo type `DealDependencyPriority`.
- `src/constants/dealEnumLabels.ts`: adicionar `DEPENDENCY_PRIORITY_LABEL/OPTIONS/COLOR`.

### Componentes

- **Novo** `src/components/crm/DependencyFullScreenForm.tsx` — overlay full-screen (`fixed inset-0 z-50 bg-background`), com header sticky, body scrollável em 2 colunas, footer sticky. Reutiliza `DialogPrimitive` para gerenciar foco/ESC, mas com `DialogContent` customizado (sem max-width).
- **Novo** `src/components/crm/DependencyCard.tsx` — card individual com toda anatomia descrita.
- **Refatorar** `src/components/crm/ZoneDependencias.tsx`:
  - Remove `DependencyDialog` interno e a tabela.
  - Renderiza grid de `DependencyCard`.
  - Adiciona barra de filtro segmentada (state local).
  - Abre `DependencyFullScreenForm` no lugar do antigo dialog.

### Hook

`src/hooks/crm/useDealDependencies.ts`: estender payloads de create/update com os novos campos opcionais. Sem breaking changes.

### Cache invalidation

Manter `qc.invalidateQueries({ queryKey: ['deal-dependencies', dealId] })` já existente. Nenhum cross-module impactado.

---

## 4. Responsividade

- **Mobile (<md)**: form full-screen vira coluna única (campos empilhados); cards em 1 coluna; filtro segmentado vira scroll horizontal.
- **Tablet (md)**: form em 2 colunas; cards em 2 colunas.
- **Desktop (xl)**: cards em 3 colunas.

---

## 5. Fora de escopo

- Anexos de arquivos na dependência (links já cobrem 90% dos casos).
- Histórico/auditoria por dependência (audit_logs gerais já cobrem).
- Notificação automática para responsável (futuro).
