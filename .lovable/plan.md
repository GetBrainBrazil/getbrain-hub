# Refundação da página de proposta — correções e melhorias

Cinco problemas relatados, divididos em 4 entregas independentes. Cada fase é testável isoladamente.

---

## Fase 1 — Aba Resumo: ações funcionando + densidade

**Problema:** Os 4 botões ("Ver como cliente", "Copiar link", "Pré-visualizar PDF", "Tracking") aparecem desabilitados/sem efeito quando a proposta ainda é rascunho (sem `access_token`), e os outros silenciosamente falham. Também não há feedback visual claro do porquê.

**Correções:**

1. **Botões com link público** ("Ver como cliente", "Copiar link") — em vez de ficarem `disabled` mudos, mostrar tooltip explicativo "Disponível após gerar e enviar a proposta" e, ao clicar, oferecer atalho "Gerar e enviar agora" (abre o `GerarEEnviarDialog`).
2. **Pré-visualizar PDF** — funciona sem link público (gera PDF local). Validar que abre o `PreviewPdfDialog` com dados ao vivo (snapshot do `buildPreviewProposal`). Hoje está corretamente cabeado, mas a tela mostra que nada acontece — investigar se `PreviewPdfDialog` espera campos que não existem no snapshot e adicionar fallback.
3. **Tracking** — habilitar mesmo sem envio (mostrar mensagem "ainda sem visualizações"). Hoje o `PropostaTrackingSheet` provavelmente não aceita proposta sem token.
4. **Layout** — aumentar densidade (cards menores, ícones com cor de marca), e mover "Próximos passos" para o topo quando a proposta é rascunho (orientar Daniel sobre o que falta).
5. **Banner de status** — quando rascunho sem itens / sem validade, exibir card amarelo com checklist do que falta antes de poder enviar.

---

## Fase 2 — Aba Cliente: vínculo com CRM

**Problema:** Hoje a aba só mostra um link tímido para o deal no rodapé. O Daniel quer **selecionar/trocar o lead/empresa no CRM e puxar tudo** (dor, contato, escopo, tipo de projeto…).

**Componente novo:** `CrmDealLinkPicker.tsx`

- Card no topo da aba "Cliente" com 3 estados:
  - **Sem deal vinculado**: combobox de busca em `deals` (filtra ganhos/em negociação), botão "Vincular".
  - **Com deal vinculado**: mostra resumo (código do deal, empresa, contato principal, estágio, dor) com link para abrir o deal em nova aba e botão "Trocar deal".
  - **Conflito** (campos da proposta divergem do deal): banner "Dados desatualizados — sincronizar do CRM?" com diff por campo.
- Botão **"Importar do CRM"** com checkboxes do que sobrescrever:
  - Identidade (nome, CNPJ, cidade, logo da empresa)
  - Contexto comercial (dor, contato decisor, origem, setor) → vai para campos da proposta
  - Escopo sugerido (acceptance criteria do deal viram itens iniciais; pergunta se substitui ou anexa)
  - Tipo de projeto / template recomendado

**Backend:**

- RPC `import_deal_into_proposal(p_proposal_id, p_deal_id, p_fields jsonb)` — espelha a lógica de `create_proposal_from_deal` mas para uma proposta já existente. Atualiza só os campos pedidos, registra em `audit_logs` com `action='deal_import'` e diff do antes/depois.
- Reutiliza joins já existentes em `useProposalDetail` (deal já carrega code, title, stage); estender o `select` para trazer `pain_description`, `company`, `primary_contact`, `acceptance_criteria`.

**Cache invalidation:** após import, invalidar `proposal`, `proposal_items`, `audit_logs` via `invalidateProposalCaches` (criar helper se não existir em `cacheInvalidation.ts`).

---

## Fase 3 — Página Pública (UI/UX + correção do iframe)

**Problema 1 (correção):** o iframe não carrega — provavelmente porque `preview-proposal-as-internal` ainda está retornando 500 em alguns cenários, ou porque `/p/{token}?preview={jwt}` não está reconhecendo o JWT em `PropostaPublica.tsx` para pular o gate de senha.

**Diagnóstico:**

1. Conferir logs da edge function via `supabase--edge_function_logs` para confirmar.
2. Conferir `src/pages/public/PropostaPublica.tsx` — se ele lê `?preview=` e valida o JWT chamando `verify-proposal-access` num modo especial ou se ignora completamente o gate.
3. Se o JWT não for reconhecido, ajustar `verify-proposal-access` para aceitar header `Authorization: Bearer <preview_jwt>` e bypassar o `password_hash`.

**Problema 2 (UX):** card único pesado, sem hierarquia.

**Redesign da aba:**

- **Topo — Status do link** (compact strip): badge "Online" / "Sem link", URL clicável copiável, expira em X dias, contador de views, último acesso.
- **Bloco Acesso do cliente** (hoje): mantido, mas redesenhado como dois cards lado a lado:
  - Card 1: Link público (URL, QR code mini, copiar, abrir em nova aba)
  - Card 2: Senha (mostrar/ocultar, redefinir, copiar)
- **Bloco Mockup interativo**: mantido, melhorar visual.
- **Preview ao vivo**:
  - Toolbar com 3 toggles de viewport (Mobile 375px / Tablet 768px / Desktop 100%) que ajustam `width` do iframe via CSS.
  - Botão "Recarregar" e "Abrir em nova aba" como hoje.
  - Loading skeleton estruturado (não só um spinner).
  - Banner amarelo discreto quando proposta dirty: "Você tem alterações não salvas — o preview mostra a versão salva".
  - Erro de JWT: card com botão "Tentar de novo" + link "Por que isso acontece?" → tooltip explica que o preview usa um token de 5min.

**Página pública em si (`/p/{token}`):** auditoria visual rápida no `PropostaPublica.tsx` — ajustar tipografia, espaçamento, CTA "Tenho interesse" com cor de marca da proposta (`client_brand_color`).

---

## Fase 4 — Histórico detalhado + revisão do "Conteúdo IA"

**Problema 1 (Histórico):** hoje só mostra mudanças de status. Daniel quer **quem, quando e o quê**, com mais granularidade.

**Mudanças em `AbaHistorico.tsx` + `useProposalAuditLog.ts`:**

- Cobrir mais ações: `update`, `password_set`, `link_generated`, `pdf_generated`, `sent`, `viewed_by_client` (puxar de `proposal_views`), `interest_manifested`, `version_created`, `interaction_added`, `deal_import`, `archived`, `restored`.
- Para cada entrada, mostrar:
  - Avatar + nome do ator (já existe)
  - Ícone + label da ação (mapa em `src/lib/orcamentos/auditFormatters.ts` novo)
  - **Data e hora completas** com `dd/MM/yyyy HH:mm:ss` + relativo ("há 2 horas")
  - Resumo legível em pt-BR ("alterou cliente de X para Y", "gerou versão v3", "enviou link por WhatsApp")
  - Drawer lateral "Ver detalhes" com diff JSON (antes/depois) para entradas de `update` — usa `Sheet` do shadcn
- Filtros no topo: tipo de ação (multiselect), ator (multiselect), período (hoje / 7d / 30d / tudo).
- Agrupamento por dia (header sticky com data, igual `/admin/auditoria`).
- Paginação infinita ou "Carregar mais 50".

**Helpers:**

- `src/lib/orcamentos/auditFormatters.ts` — mapa `action → { icon, label, formatSummary(entry) }` reutilizando padrão de `src/lib/audit/formatters.ts`.
- Estender `useProposalAuditLog` para também buscar `proposal_views` (visualizações do cliente) e mesclar no feed por data.

**Problema 2 (Conteúdo IA):** Daniel achou descartável.

**Decisão:** **remover a aba "Conteúdo IA"** e redistribuir:

- "Boas-vindas", "Resumo executivo", "Contexto e dor", "Visão da solução" → vão para **Aba Escopo** como bloco superior recolhível "Narrativa da proposta" (Daniel já passa muito tempo lá).
- O dropdown "Gerar com IA" vira um botão flutuante no topo do bloco de narrativa, com mesmas opções.
- Atualiza `ProposalTabsBar` para 8 abas: Resumo, Cliente, Escopo, Página Pública, Histórico, Interações, Versões, Configurações.
- Atualiza `getInitialTab` e os deep-links existentes.

---

## Detalhes técnicos

**Arquivos a criar:**

- `src/components/orcamentos/page/CrmDealLinkPicker.tsx`
- `src/components/orcamentos/page/CrmImportDialog.tsx`
- `src/components/orcamentos/page/PublicPagePreviewToolbar.tsx`
- `src/components/orcamentos/page/HistoryEntryRow.tsx`
- `src/components/orcamentos/page/HistoryDetailDrawer.tsx`
- `src/lib/orcamentos/auditFormatters.ts`
- Migration: RPC `import_deal_into_proposal`

**Arquivos a editar:**

- `src/pages/financeiro/OrcamentoEditarDetalhe.tsx` (remover tab `conteudo_ia`, mover narrativa pra escopo)
- `src/components/orcamentos/page/ProposalTabsBar.tsx` (8 abas)
- `src/components/orcamentos/page/tabs/TabResumo.tsx` (botões com fallback)
- `src/components/orcamentos/page/tabs/TabCliente.tsx` (CrmDealLinkPicker no topo)
- `src/components/orcamentos/page/tabs/TabEscopo.tsx` (bloco narrativa + IA)
- `src/components/orcamentos/page/tabs/TabPaginaPublica.tsx` (redesign + viewport toggles)
- `src/components/orcamentos/abas/AbaHistorico.tsx` (feed enriquecido)
- `src/hooks/orcamentos/useProposalAuditLog.ts` (mais ações + proposal_views)
- `src/hooks/orcamentos/useProposalDetail.ts` (estender select do deal)
- `supabase/functions/verify-proposal-access/index.ts` (aceitar JWT de preview)
- `src/pages/public/PropostaPublica.tsx` (validar `?preview=` e usar `client_brand_color`)
- `src/lib/cacheInvalidation.ts` (helper `invalidateProposalCaches`)

**Arquivos a deletar:**

- `src/components/orcamentos/page/tabs/TabConteudoIA.tsx`

**Sequência de execução proposta:**

1. **Fase 1** (Resumo) — 1 entrega curta, baixa risco.
2. **Fase 4** parte A (remover Conteúdo IA + mover narrativa) — antes da Fase 2 para não tocar 2x na mesma estrutura.
3. **Fase 2** (Cliente + CRM) — entrega maior, inclui RPC.
4. **Fase 3** (Página Pública) — depende de diagnóstico do JWT.
5. **Fase 4** parte B (Histórico) — última, isolada.

Cada fase termina com um checkpoint visual no preview.

**Confirmação antes de começar:** seguir nessa ordem ou prefere outra prioridade?

Eu quero usar IA para partes estratégicas desse módulo, caso você veja um modo interessante de usar para me facilitar, me oergunte. eu vquero poder cadastrar templates de propostas também, estou construindo um no canva e o modelo do site eu quero reformular também, depois me diga qual é o melhor modelo de eu fazer isso