
# Prompt 10A — Propostas: Schema + CRUD interno

## Contexto do que já existe

A página `/financeiro/orcamentos/:id/editar` já está construída e plugada em uma tabela `proposals` que cobre **boa parte** do escopo, mas com diferenças importantes em relação ao que o prompt pede. O plano abaixo trata isso como evolução incremental, não recriação.

**Hoje no banco:**
- `proposals` existe com: `code` (PROP-XXXX), `deal_id`, `company_id`, `client_company_name`, `client_city`, `client_logo_url`, `scope_items` (jsonb), `maintenance_*`, `implementation_days`, `validation_days`, `considerations` (jsonb), `valid_until`, `sent_at`, `accepted_at`, `rejected_at`, `pdf_url`, `template_key`, soft delete, audit columns, RLS autenticada.
- Status atual: `text` com check `('rascunho','enviado','aceito','recusado','expirado','cancelado')` — nomes diferentes do enum pedido.
- Não existem: `proposal_items`, `proposal_views`, `proposal_events`, view `proposal_metrics`, enum `proposal_status`, `access_token`, `access_password_hash`, `mockup_url`, `template_version`, `title`, snapshot `client_name`/`client_city` (já tem mas com nome diferente).
- `deals` **não tem** `proposal_id` (a ligação é só via `proposals.deal_id`).
- Itens vivem em `scope_items jsonb`, não em tabela própria.
- Editor já faz autosave (debounce 2s), tem botões Marcar como enviado / Aceitar / Recusar, dropdown de templates, geração de PDF.
- `DealProposalsSection.tsx` já existe e cria proposta a partir de deal com snapshot do nome da empresa.
- RPC `close_deal_as_won` existe (precisa ser estendido pra marcar proposta como `convertida`).

## O que muda

### 1. Schema — migration única

**Enum `proposal_status`** (novo)
```
rascunho | enviada | visualizada | interesse_manifestado | expirada | convertida | recusada
```
Nota: a forma feminina (`enviada`, `convertida`, `recusada`) é a do prompt; o status atual é masculino (`enviado`, `recusado`). Vou converter via migration: drop check constraint → criar enum → mapear valores (`enviado→enviada`, `aceito→convertida`, `recusado→recusada`, `cancelado→recusada`, `expirado→expirada`) → `ALTER COLUMN ... TYPE proposal_status USING ...`.

**Tabela `proposals` — colunas adicionadas**
- `title text` (nullable; backfill com `client_company_name` pra registros existentes)
- `template_slug text not null default 'inovacao-tecnologica'` (renomear/migrar `template_key` → `template_slug`, normalizando `inovacao_tecnologica` → `inovacao-tecnologica`)
- `template_version text not null default '1.0'`
- `client_name text` (snapshot, populado a partir de `client_company_name` que continua existindo como alias até remoção em prompt futuro)
- `expires_at date` — backfill com `valid_until` (mantém `valid_until` por enquanto; nas mutações novas escrevemos os dois)
- `mockup_url text`
- `access_token text unique` — gerado por trigger BEFORE INSERT (`encode(gen_random_bytes(24),'base64')` com substituições urlsafe)
- `access_password_hash text` (bcrypt via `pgcrypto.crypt(pwd, gen_salt('bf'))`)
- `first_viewed_at timestamptz`, `last_viewed_at timestamptz`, `view_count int default 0`
- Indexes adicionais: `access_token unique`, `status`

Considerações: `considerations` continua `jsonb` (array de strings — formato compatível com `text[]` pedido; mantemos `jsonb` pra evitar migração quebrar autosave).

**Tabela `proposal_items`** (nova — vai conviver com `scope_items` jsonb durante migração soft)
- `id`, `proposal_id FK`, `description text`, `quantity numeric(10,2) default 1`, `unit_price numeric(12,2)`, `total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED`, `order_index int`, audit + soft delete.
- Migration backfill: pra cada `proposals.scope_items[i]`, criar 1 row em `proposal_items` (mapeando `title→description`, `value→unit_price`, `quantity=1`, `order_index=i`).
- Editor passa a ler/gravar em `proposal_items`; `scope_items` jsonb fica desativado (mantido só pra rollback, removido em prompt futuro).

**Tabela `proposal_views`** — `id`, `proposal_id FK`, `viewed_at default now()`, `ip_hash text`, `user_agent text`, `session_id text`, `duration_seconds int`, `sections_viewed jsonb`. Sem soft delete. Index em `(proposal_id, viewed_at)`.

**Tabela `proposal_events`** — `id`, `proposal_id FK`, `event_type text`, `metadata jsonb`, `created_at default now()`. Sem soft delete. Index em `(proposal_id, event_type, created_at)`.

**Tabela `deals` — adicionar coluna**
- `proposal_id uuid FK → proposals(id)` (nullable). Backfill: pra cada deal com proposta vinculada (consulta inversa via `proposals.deal_id`), copiar a proposta mais recente.

**View `proposal_metrics`**
```sql
SELECT
  organization_id,
  count(*)                                   AS total_proposals,
  count(*) FILTER (WHERE status='rascunho')  AS total_draft,
  count(*) FILTER (WHERE status='enviada')   AS total_sent,
  count(*) FILTER (WHERE status IN ('visualizada','interesse_manifestado'))  AS total_viewed,
  count(*) FILTER (WHERE status='convertida') AS total_converted,
  sum(items_total) FILTER (WHERE status='enviada')    AS total_value_sent,
  sum(items_total) FILTER (WHERE status='convertida') AS total_value_converted,
  CASE WHEN count(*) FILTER (WHERE status='enviada') = 0 THEN 0
       ELSE count(*) FILTER (WHERE status='convertida')::numeric
            / count(*) FILTER (WHERE status='enviada') END AS conversion_rate,
  avg(view_count) FILTER (WHERE status='enviada') AS avg_view_count
FROM (SELECT p.*, COALESCE((SELECT sum(total) FROM proposal_items WHERE proposal_id=p.id AND deleted_at IS NULL),0) AS items_total
      FROM proposals p WHERE p.deleted_at IS NULL) x
GROUP BY organization_id;
```

### 2. Triggers

1. `proposals_set_access_token` (BEFORE INSERT): se `access_token IS NULL`, gera token urlsafe de 32 chars.
2. `proposals_validate_status_transition` (BEFORE UPDATE): valida transições permitidas. Por enquanto suporta apenas `rascunho ↔ enviada`, `enviada → recusada`, e prepara `enviada → visualizada → interesse_manifestado` e `* → expirada/convertida`. Bloqueia o resto.
3. `proposals_require_password_when_sent` (BEFORE UPDATE): se novo `status='enviada'` e `access_password_hash IS NULL`, `RAISE EXCEPTION`.
4. `proposals_set_sent_at` (BEFORE UPDATE): se `status` mudou pra `enviada` e `sent_at IS NULL`, set `sent_at = now()`.
5. `update_updated_at_column` já existe.
6. Triggers de auditoria em `proposals`, `proposal_items` (insert/update/delete → `audit_logs`).

### 3. RPC e funções auxiliares

- `set_proposal_password(proposal_id uuid, plain_password text)` — `SECURITY DEFINER`, hash com `crypt(... gen_salt('bf'))`, atualiza `access_password_hash`. Usado pelo modal "Marcar como enviada" e "Redefinir senha".
- `close_deal_as_won` — estender pra: `UPDATE proposals SET status='convertida' WHERE deal_id = _deal_id AND status IN ('enviada','visualizada','interesse_manifestado')`.

### 4. Tipos TypeScript

- Regenerar `src/integrations/supabase/types.ts` (automático).
- Criar `src/types/proposals.ts` com:
  - re-exports
  - `ProposalWithItems = Proposal & { items: ProposalItem[] }`
  - `ProposalFormData` shape
  - `proposalSchema` (zod) com regra superRefine: se `status === 'enviada'`, `password` obrigatório (mín 4 chars).

### 5. UI — Lista `/financeiro/orcamentos`

A lista hoje usa `useProposals`. Mantém, mas:
- Filtros e colunas já existem; ajustar status para usar novo enum (badge cores).
- KPIs: substituir o que tem hoje por 4 cards lendo de `proposal_metrics` (rascunho, enviadas, taxa conversão, valor enviado no mês). Sparkline com dado mock por enquanto (aceito pelo prompt).
- "Nova proposta" continua criando rascunho e abrindo editor (já funciona).

### 6. UI — Editor `/financeiro/orcamentos/:id/editar`

Quase tudo já está implementado. Mudanças:

**Conectar itens à nova tabela**
- Substituir leitura/escrita de `scope_items` jsonb por hooks de `proposal_items` (`useProposalItems(proposalId)` com mutations CRUD). `ScopeItemsEditor` recebe `items` + handlers (sem mudar UI).
- Total continua via `sum(items.total)`.

**Novos campos no formulário**
- Input "Título da proposta" (`title`) — antes do campo Cliente.
- Seção "Mockup BETA" abaixo de "Considerações": input simples `mockup_url` com helper "Aparecerá como CTA destacado na página pública e como QR code no PDF".
- Campo "Validade" já existe — passa a gravar em `expires_at` (e `valid_until` por compat).

**Modal "Marcar como enviada"** (substitui o `confirm` atual)
- Componente novo `MarcarComoEnviadaDialog`:
  - Input senha (mín 4 chars, show/hide)
  - Confirmação da `expires_at`
  - Texto: "Esta proposta vai gerar um link de acesso. A senha será criptografada e não poderá ser recuperada — apenas redefinida."
  - Ao confirmar: chama `set_proposal_password` RPC → update status='enviada' (trigger seta `sent_at`) → registra `proposal_events { event_type:'sent' }` → fecha → abre `LinkGeradoDialog` mostrando `https://hub.getbrain.com.br/p/{access_token}` com botão "Copiar link" (rota não existe ainda, ok).

**Modal "Redefinir senha"**
- Visível só se `status='enviada'`. Botão no header. Abre dialog com input senha → chama `set_proposal_password`.

**Header**
- Badge de status já reflete o real (mantém).
- Botões "Aceitar"/"Recusar" são removidos do fluxo manual de status (aceitar agora vem de `convertida` via deal won; recusar continua como botão "Marcar recusada").

### 7. Integração com CRM

`DealProposalsSection.tsx` já mostra propostas e cria nova com snapshot. Mudanças:
- Após criar proposta, gravar `deals.proposal_id = proposta.id` (a coluna nova).
- Card "Proposta vinculada" na zona Comercial: se `deal.proposal_id` existir, mostra code/status/valor/link. Se não, mostra botão "Criar proposta a partir deste deal" (pré-preenche `client_name`, `client_city` via `companies`, `title`=deal.title).
- Componente `DealProposalsSection` continua existindo na zona Comercial — agrupar visualmente como "Proposta vinculada" (a primária) + lista das demais abaixo.

### 8. Não implementar
Tudo do 10B/10C/10D conforme prompt. Estrutura de `access_token`, `proposal_views`, `proposal_events` e `pdf_url` fica criada mas dormente.

## Critérios de pronto — STATUS

- [x] Migration aplicada: enum `proposal_status`, tabelas `proposal_items`, `proposal_views`, `proposal_events`, view `proposal_metrics`, `deals.proposal_id`, triggers de senha/transição/access_token.
- [x] `proposal_items` populada via backfill dos `scope_items` jsonb existentes.
- [x] Editor `/financeiro/orcamentos/:id/editar` lê e grava em `proposal_items` (autosave continua).
- [x] Novos campos `title` e `mockup_url` no editor.
- [x] Modal "Marcar como enviada" com senha + validade → `LinkGeradoDialog` com URL pública reservada.
- [x] Modal "Redefinir senha" disponível pra propostas enviadas.
- [x] `createDraftProposal.ts` espelha o item de implementação em `proposal_items`.
- [x] `PropostaTabContent` (CRM) também usa o novo fluxo com senha + redefinir.
- [x] `close_deal_as_won` marca propostas vinculadas como `convertida` (via trigger DB).
- [x] Rota pública `/p/{access_token}` fica reservada — implementação no 10B.

## Riscos / decisões

- **Status migration**: `aceito` antigo vira `convertida` (assume que só virou aceito por close de deal). Se houver casos manuais, vão ficar com nomenclatura nova mesmo.
- **scope_items vs proposal_items**: vamos manter o jsonb populado em paralelo nesta sprint pra rollback rápido. Removido em prompt futuro depois de bake-time.
- **`title` vs `client_company_name`**: prompt pede `title` (ex: "Inovação Tecnológica" — o template). Vou usar `title` como nome do projeto/proposta (free text, default = `client_name`); o template segue em `template_slug`.
- **bcrypt**: depende de `pgcrypto` extension. Habilito na migration se ainda não estiver.
