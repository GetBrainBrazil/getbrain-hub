# Redesign /financeiro/propostas — escopo completo

Objetivo: transformar o editor de proposta num cockpit de venda, gerar uma "proposta web" personalizada por cliente, um PDF independente, mockups interativos navegáveis, suporte a anexos (organograma etc.) e replicar tudo isso dentro do card do deal no CRM — só com as propostas daquele cliente/deal.

## 1. Reorganização do editor `/financeiro/orcamentos/:id/editar`

Hoje é um formulão linear de ~890 linhas. Vai virar um layout de **3 áreas fixas** com abas no centro:

```text
┌────────────────────────────────────────────────────────────────┐
│ Header: código · status · template · totais · Salvar · Ações   │
├──────────────┬──────────────────────────────┬──────────────────┤
│ Sidebar      │ Conteúdo (abas)              │ Live Preview     │
│ esquerda     │                              │ (toggle web/pdf) │
│ ─ Cliente    │ • Resumo & Identidade        │                  │
│ ─ Senha      │ • Escopo & Itens             │                  │
│ ─ Validade   │ • Cronograma & Considerações │                  │
│ ─ Link       │ • Mockup interativo          │                  │
│ ─ Tracking   │ • Anexos                     │                  │
│              │ • Versões & Histórico        │                  │
└──────────────┴──────────────────────────────┴──────────────────┘
```

Sidebar esquerda mostra cartões compactos sempre visíveis (cliente + cor + logo, senha com botão olho/copiar/regenerar, link público com QR + copiar, validade, contadores de view). Central usa abas persistidas com `usePersistedState`. Direita mantém `LivePdfPreview` mas ganha toggle "Web | PDF" pra alternar entre o iframe da proposta web e o do PDF.

Mobile (< md): sidebar vira bottom sheet de "Resumo da proposta", preview vira tab extra.

## 2. Proposta Web em subdomínio GetBrain

Hoje a página pública existe em `/p/:token`. Vamos:

- Manter a rota técnica `/p/:token` no app principal.
- Configurar `**propostas.getbrain.com.br**` (custom domain) apontando pro mesmo deploy, redirecionando `propostas.getbrain.com.br/{slug-cliente}` → `/p/{token}` por meio de uma tabela `proposal_public_slugs (slug, proposal_id, token)`. Slug é gerado a partir do nome da empresa + sufixo numérico se colidir. Edge function `resolve-proposal-slug` faz a tradução server-side.
- Esse mesmo subdomínio é o que aparece no QR code do PDF e no botão "Copiar link" do editor.

Visual da proposta web (redesign do `PropostaPublica.tsx`):

- Hero cheio de tela com logo do cliente, cor de marca aplicada como acento, título "Proposta {{empresa}}" e CTA "Começar".
- Seções com scroll-snap: Boas-vindas → Sobre a GetBrain → Sua Dor → Nossa Solução → Escopo (cards com expand) → Cronograma → Investimento → Mockup (embed) → Anexos → Considerações → Aceite/Recusar.
- Sticky nav lateral com índice clicável, igual ao TOC do PDF.
- Seção "Mockup interativo" com embed em iframe + botão "Abrir em nova aba".
- Seção "Anexos" com grid de cards (preview imagem/pdf, tamanho, download).
- Botão flutuante de chat (já existe `ProposalChatBox`) e CTA fixa de aceitar/recusar no rodapé.

## 3. Senha auto-gerada + editável

Já existe `defaultProposalPassword(slug)` e `RedefinirSenhaDialog` + edge `hash-proposal-password`. Vamos:

- Garantir que toda proposta nova nasça com `{slug}@2026` (já acontece no `createProposalFromDeal`; replicar no `NovoOrcamentoModal`).
- Card "Acesso" na sidebar do editor mostrando: senha em texto mascarado (botão olho), copiar, regenerar (volta pro padrão se nome mudar) e "Definir nova senha" (abre o dialog atual).
- Plain password fica salva em coluna nova `access_password_plain` (criptografada at-rest pelo Postgres, mas legível pra quem edita a proposta) — necessária pra você ver/copiar depois. Hash continua em `access_password_hash` pra validação pública.

## 4. Mockup interativo interno (gerador parametrizado)

Decisão: gerador interno React, hospedado dentro do próprio app GetBrain em rota pública sem autenticação `/m/:proposalId`. Domínio: `propostas.getbrain.com.br/m/:slug` (mesmo subdomínio da proposta).

Como funciona:

- Tabela nova `proposal_mockups (id, proposal_id, brand_color, logo_url, modules jsonb, generated_at, version)`.
- Aba "Mockup interativo" no editor tem um wizard simples:
  1. Confirma logo + cor de marca (puxa da proposta).
  2. Lista os módulos: pré-preenchida a partir dos itens do escopo (cada item vira um módulo). Você pode renomear, reordenar, marcar tipo (CRUD, Dashboard, Aprovações, Calendário, Relatório, Configurações).
  3. Define perfis de usuário (default: Admin, Operador, Visualizador) — afeta o painel "Usuários".
- "Gerar mockup" salva o JSON e libera o link. Não tem build externo, é uma rota React que lê esse JSON e renderiza dinamicamente.

Telas geradas (todas client-side, sem backend, dados fakes mas coerentes):

- **Login**: tela limpa branca, logo do cliente, cor de marca nos botões, qualquer e-mail/senha entra.
- **Shell do app**: sidebar com módulos do escopo + "Usuários" + "Configurações" + avatar.
- **Dashboard**: cards de KPI + gráficos (Recharts) com dados sintéticos coerentes ao setor do cliente.
- **Cada módulo CRUD**: lista (tabela com filtros), drawer de criação, detalhe com abas, ações em lote — tudo navegável, com `useState` local pra simular create/edit/delete.
- **Aprovações**: kanban drag-and-drop fake.
- **Usuários**: tabela com convidar/desativar/role.
- **Admin**: configurações de empresa, integrações (toggles fake), permissões por perfil.

Lógica que faz parecer real: estado local persiste durante a sessão (localStorage por proposalId), filtros/ordenação funcionam, drawers abrem com formulários validados, toasts de sucesso. Sem backend, sem Lovable API externa — controle total e zero dependência de chave.

Botão "Abrir mockup" no editor + link no PDF + embed na proposta web.

## 5. Anexos (organograma e outros)

- Bucket privado novo `proposal-attachments` com path `{proposal_id}/{uuid}-{filename}`.
- Tabela `proposal_attachments (id, proposal_id, file_path, mime_type, size_bytes, label, kind, display_order, created_at, created_by)` onde `kind` ∈ `organograma | documento | imagem | outro`.
- Aba "Anexos" no editor: drag-and-drop, preview thumbnail (imagens via signed URL, PDFs via ícone), edição inline de label, reordenação por drag, exclusão.
- Edge function `get-proposal-attachment-public` que valida o token de acesso e devolve URL assinada (60s) — pra a página pública não precisar abrir o bucket.
- Na proposta web: seção "Documentos" com grid de cards (preview + label + download).
- No PDF: nova página "Anexos" listando label, ícone do tipo, tamanho — quando for imagem (organograma típico), embarca a imagem inline; quando for PDF, mostra cartão com link clicável que aponta pro subdomínio da proposta.

## 6. Card do CRM — Painel completo do deal

`DealProposalsSection` é substituído por `DealProposalsPanel` mostrando **só** as propostas daquele deal (filtro `deal_id` já existe). Para cada proposta, um card expansível com:

- Header: código, status badge, valor total + mensal, validade.
- Linha de ações primárias: Copiar link público, Copiar senha, Abrir mockup, Baixar PDF, Regenerar PDF, Marcar enviada/aceita/recusada.
- Tabs internas (collapsible): **Resumo** (cliente + escopo resumido), **Anexos** (mesma lista da aba do editor, com upload), **Tracking** (views + chat resumido), **Versões** (lista + download de cada uma).
- Ações de edição inline no próprio card: trocar template, editar título, editar validade, redefinir senha, alterar cor de marca, regenerar mockup. Mudanças usam `useUpdateProposal` direto, com autosave + toast.
- Botão "Abrir editor completo" leva pra `/financeiro/orcamentos/:id/editar` quando precisar mexer em escopo/itens detalhados (que tem editor mais pesado).

Botão "Gerar nova proposta a partir deste deal" mantém o fluxo atual (edge `create_proposal_from_deal`), agora com confirmação visual de senha gerada.

## 7. Detalhes técnicos

### Migrations

```sql
-- Slugs públicos
create table proposal_public_slugs (
  slug text primary key,
  proposal_id uuid not null references proposals(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on proposal_public_slugs(proposal_id);

-- Mockups
create table proposal_mockups (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals(id) on delete cascade,
  brand_color text not null default '#06b6d4',
  logo_url text,
  modules jsonb not null default '[]'::jsonb,
  user_profiles jsonb not null default '[]'::jsonb,
  version int not null default 1,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anexos
create table proposal_attachments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  file_path text not null,
  mime_type text not null,
  size_bytes int not null,
  label text not null,
  kind text not null default 'documento',
  display_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on proposal_attachments(proposal_id, display_order);

-- Senha em texto pra você ver/copiar (hash continua sendo a fonte de verdade pública)
alter table proposals add column access_password_plain text;
```

Tudo com RLS `authenticated_all` (alinhado com o resto da tabela `proposals`). Bucket `proposal-attachments` privado, sem políticas públicas — acesso só via edge function que valida token.

### Edge functions novas/atualizadas

- `resolve-proposal-slug`: dado `{slug}`, devolve `{token}` ou 404.
- `get-proposal-attachment-public`: dado `{token, attachment_id}`, valida acesso e devolve signed URL.
- `register-proposal-pdf-version`: já existe; passa a incluir snapshot de anexos e mockup version.
- `create-proposal-mockup`: opcional, só pra criar a row inicial e o slug em uma transação.

### Rotas novas

- `/m/:slug` — mockup interativo público (sem auth).
- `propostas.getbrain.com.br/{slug}` — proposta web (resolve via edge → `/p/:token`).

### Componentes a criar

- `src/components/orcamentos/editor/ProposalEditorShell.tsx` (3 colunas)
- `src/components/orcamentos/editor/sidebar/{ClienteCard,SenhaCard,LinkCard,ValidadeCard,TrackingCard}.tsx`
- `src/components/orcamentos/editor/abas/{AbaIdentidade,AbaEscopo,AbaCronograma,AbaMockup,AbaAnexos,AbaVersoes}.tsx` (consolidando os atuais)
- `src/components/orcamentos/anexos/{AnexosUploader,AnexoCard,AnexosGrid}.tsx`
- `src/components/orcamentos/mockup/{MockupWizard,ModuleEditor,ProfilesEditor}.tsx`
- `src/components/mockup/{MockupShell,MockupLogin,MockupDashboard,MockupCRUDModule,MockupKanban,MockupUsers,MockupAdmin}.tsx` (renderer público)
- `src/components/orcamentos/crm/DealProposalsPanel.tsx` (substitui `DealProposalsSection`)
- `src/pages/public/MockupPublico.tsx`

### Hooks novos

- `useProposalAttachments(proposalId)`, `useUploadAttachment`, `useDeleteAttachment`
- `useProposalMockup(proposalId)`, `useUpsertMockup`, `useGeneratePublicSlug`
- `useResetProposalPassword` (envolve a edge `hash-proposal-password` + atualiza `access_password_plain`)

### Custom domain

- `propostas.getbrain.com.br` precisa ser configurado no painel de domínios do Lovable (não consigo automatizar). Vou avisar o passo a passo no fim da implementação.

## 8. O que NÃO entra agora

- Geração de mockup via API do Lovable (decisão: gerador interno é suficiente e mais robusto agora).
- Editor visual drag-and-drop de telas do mockup (a estrutura é dirigida pelos módulos do escopo, não por design livre).
- Refinamentos do template PDF além das páginas novas de Mockup e Anexos (cabe num próximo turno).

## 9. Ordem de implementação

1. Migrations (slugs, mockups, anexos, password_plain) + bucket + RLS.
2. Anexos: hooks + aba no editor + render na proposta web + página de anexos no PDF.
3. Senha: card na sidebar + persistência do plain + botões.
4. Mockup: tabela + wizard no editor + renderer público em `/m/:slug` + embed na proposta web.
5. Slug público + edge `resolve-proposal-slug` + ajuste do QR.
6. Redesign do shell do editor (3 colunas + abas consolidadas).
7. Redesign da proposta web (`PropostaPublica.tsx`).
8. `DealProposalsPanel` substituindo `DealProposalsSection` no card do CRM.
9. Custom domain `propostas.getbrain.com.br` (passo manual seu).

Cada bloco é independente o suficiente pra eu entregar, você revisar e seguir. Posso ir do 1 ao 4 num primeiro turno se aprovar tudo.  
  
Eu preciso de um botão para abrir o site e ver qual seria  a visão do cliente também