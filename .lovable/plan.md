# Auditoria unificada em /admin/auditoria

Substituir `/admin/logs` por uma página única **Auditoria** que mostra tudo que foi criado, alterado ou removido em qualquer módulo (CRM, Projetos, Financeiro, Admin), com filtros simples e diff legível.

## Princípios de UX (a pedido seu)

- **Prático, não burocrático**: filtros em uma linha só, scaneável.
- **Padrão "feed" agrupado por dia** — como Linear/GitHub, fácil de bater o olho.
- **Detalhe sob demanda**: lista mostra resumo legível ("Daniel mudou Estágio: X → Y"); o JSON completo aparece num drawer só se você clicar.
- **Sem abas, sem submenus** — um filtro de Módulo cobre tudo.

## Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Auditoria                                       [⤓ Exportar]   │
│ Histórico de tudo que aconteceu no sistema.                    │
├────────────────────────────────────────────────────────────────┤
│ [🔍 Buscar por código, título ou campo...                  ]   │
│ [Módulo: Tudo ▾] [Ação ▾] [Usuário ▾] [Período: 7 dias ▾]      │
├────────────────────────────────────────────────────────────────┤
│ HOJE · 28 abr                                                  │
│  ●  14:32  Daniel  →  CRM · DEAL-008                           │
│            Alterou Responsável de João Pedro para Vitor Correa │
│  ●  14:30  Daniel  →  CRM · DEAL-008                           │
│            Mudou estágio: Em negociação → Fechado ganho        │
│  ●  14:12  Vitor   →  Projetos · PRJ-014                       │
│            Criou tarefa "Configurar webhook"                   │
│                                                                │
│ ONTEM · 27 abr                                                 │
│  ●  18:40  Daniel  →  Financeiro · MOV-2210                    │
│            Removeu (lixeira)                                   │
│ ...                                                            │
│                       [Carregar mais 50]                       │
└────────────────────────────────────────────────────────────────┘
```

Cor do bullet pela ação: **verde** create · **âmbar** update · **vermelho** delete · **azul** status_change · **cinza** outros.

## Drawer ao clicar numa linha

```text
DEAL-008 · Atualização · 28 abr 14:32
Daniel · daniel@getbrain.com.br

CAMPOS ALTERADOS
  Responsável     João Pedro  →  Vitor Correa
  Próximo passo   (vazio)     →  Enviar proposta revisada

[Abrir DEAL-008 ↗]
```

Sem JSON cru visível por padrão — só um botão discreto "Ver JSON" pra quando precisar debug.

## Filtros (1 linha de chips)

- **Módulo**: Tudo · CRM · Projetos · Financeiro · Admin · Configurações
- **Ação**: Tudo · Criou · Alterou · Removeu · Mudou status · Login
- **Usuário**: dropdown com avatar+nome
- **Período**: Hoje · 7d · 30d · 90d · Personalizado (date-range picker)
- **Busca**: full-text por código (DEAL-008, PRJ-014…), título da entidade ou nome do campo alterado

Filtros persistidos via `usePersistedState` (já é padrão do projeto).

## Fonte de dados unificada

Hoje existem **duas tabelas** com o mesmo propósito:
- `audit_logs` — usada por CRM, projetos, financeiro (202+ updates já registrados)
- `system_audit_logs` — usada pela área admin (criação de usuário, mudança de cargo, etc.)

Ambas serão lidas pelo mesmo hook **`useUnifiedAudit`**, normalizando para um único formato:

```ts
type UnifiedAuditEntry = {
  id: string;
  source: 'audit_logs' | 'system_audit_logs';
  module: 'crm' | 'projetos' | 'financeiro' | 'admin' | 'configuracoes';
  submodule: string;       // 'deals', 'tasks', 'movimentacoes'…
  entity_code: string | null; // DEAL-008, PRJ-014…
  entity_title: string | null;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'other';
  actor: { id: string; name: string; avatar_url: string | null } | null;
  changes: Record<string, { from: any; to: any }>;
  created_at: string;
};
```

## Acesso

**Só admins** — proteção via `has_role(auth.uid(), 'admin')` igual ao resto do `/admin/*`. Itens não-admin no menu admin nem aparecem.

## Trabalho técnico

### Arquivos novos
- `src/pages/admin/AdminAuditoriaPage.tsx` — página feed
- `src/components/admin/auditoria/AuditFeedItem.tsx` — linha do feed com bullet, ator, descrição legível
- `src/components/admin/auditoria/AuditDetailDrawer.tsx` — drawer com diff campo-a-campo
- `src/hooks/admin/useUnifiedAudit.ts` — hook único que lê e merge as duas tabelas
- `src/lib/audit/formatters.ts` — funções `describeAction()`, `describeField()`, `formatValue()`, `resolveModule()` que transformam IDs/JSON em texto humano (ex: `owner_actor_id` → "Responsável", UUID de actor → nome do usuário)

### Arquivos editados
- `src/pages/admin/AdminLayout.tsx` — trocar item "Logs" por "Auditoria" com ícone `History`
- `src/App.tsx` — trocar rota `logs` por `auditoria`, manter `/admin/logs` como redirect pra não quebrar links
- `src/pages/admin/AdminLogsPage.tsx` — deletar (substituído)
- `src/components/crm/DealSidebarRich.tsx` — adicionar link "Ver auditoria completa →" abaixo do bloco "Histórico de stage", levando pra `/admin/auditoria?entity_type=deals&entity_id=<id>`
- `mem://index.md` + nova `mem://features/auditoria` — registrar o padrão

### Detalhes técnicos importantes
- **Performance**: paginação por cursor (`created_at` desc + id), 50 por página. Não fazer `select *` — só campos necessários.
- **Resolução de nomes**: bulk-fetch dos `actor_id` referenciados na página atual (1 query extra), mapeado em memória — evita N+1.
- **Resolução de códigos** (DEAL-008, PRJ-014): bulk-fetch das entidades referenciadas; cache de 5min.
- **Formatação humana de campos**: dicionário em `formatters.ts` mapeando colunas técnicas (ex: `pain_cost_brl_monthly` → "Custo da dor (mensal)").
- **Realtime opcional** (V2): `supabase.channel('audit_logs').on('INSERT', ...)` para o feed atualizar sozinho. Fora do escopo desta primeira entrega.

## Integração com telas de detalhe

Sidebar do deal/lead/projeto ganha um link "Ver auditoria completa →" filtrando direto pela entidade. O bloco "Histórico de stage" continua como resumo rápido.

## Fora do escopo

- Realtime (live append) — fica pra V2 se você quiser.
- Restaurar registros deletados a partir do log — não vou implementar, mas o JSON guardado já permite isso futuramente.
