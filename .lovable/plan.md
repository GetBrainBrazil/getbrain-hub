## Diagnóstico dos botões

Investiguei a proposta `PROP-0006`:
- `access_token` **existe** no banco (`YwZzgqHA...`), então `hasLink=true` e os botões **estão habilitados**.
- "Ver como cliente" **na verdade funciona** (POST `preview-proposal-as-internal` → 200, JWT gerado), mas chama `window.open(...)` e o navegador provavelmente está bloqueando o popup. Sem feedback no toast, parece que "não abriu nada".
- "Copiar link" mostra `/p/YwZzgqHA…` no subtítulo. Isso **é** o link real (truncado), não aleatório — o usuário só não sabe que aquele texto é o destino que vai pro clipboard, e o `…` parece ser um placeholder/preview qualquer.
- "Pré-visualizar PDF" abre o dialog, fica em "Renderizando PDF…" e o usuário fechou antes de terminar (vi no replay). A renderização React-PDF de uma proposta cheia é lenta (>5s) e atualmente roda na thread principal sem limite de tempo nem mensagem de erro útil. Também há um bug cosmético: o QR aponta para `/p/{proposal.id}` em vez de `/p/{access_token}`.
- "Tracking" abre, mas o console mostra warning de `forwardRef` no `PropostaTrackingSheet` (Empty component) — não impede o uso, mas suja o console.

## Plano de UX/UI

### 1. Ações rápidas — feedback claro e ações secundárias

Reformular `ActionButton` em `TabResumo.tsx` para deixar comportamento óbvio e adicionar ações úteis:

**a. Ver como cliente** (`onPreviewAsClient`):
- Adicionar estado `loading` no botão enquanto a edge function roda (toast `loading → success/error`).
- Se `window.open` retornar `null` (popup bloqueado), mostrar toast com botão "Abrir mesmo assim" que dispara `window.location.href` ou copia o URL para o clipboard.
- No subtitle: trocar "Pré-autenticado" por "Abre em nova aba" para deixar claro o comportamento.

**b. Copiar link** — virar um botão composto:
- Mostrar o link **completo legível** abaixo do título (ex.: `core.getbrain.com.br/p/YwZzgqHA…`), com um ícone secundário "abrir" ao lado do "copiar".
- Após copiar, mudar visual por 2s para "✓ Copiado" (state local).
- Adicionar ícone "QR" pequeno que abre um popover com QR code do link (gerado via `qrcode` que já existe em `useGenerateProposalPDF`).

**c. Pré-visualizar PDF** — renderização mais resiliente:
- Trocar o spinner genérico por mensagem com etapas: "Montando layout… → Renderizando páginas… → Pronto".
- Adicionar `try/catch` real no `PreviewPdfDialog` que mostra erro detalhado em vez de só fechar.
- Adicionar timeout de 30s com toast "Demorou demais — baixar em vez disso?" + botão para chamar `handleDownloadPdf`.
- Fix do QR no `renderProposalPdfPreview`: usar `proposal.access_token` quando existir, fallback para `proposal.id` apenas em rascunhos novos.
- Adicionar botão "Baixar" e "Abrir em nova aba" no header do dialog (usando o blob URL gerado).

**d. Tracking**:
- Fix do warning de `forwardRef` no `PropostaTrackingSheet` (envolver `Empty` em `forwardRef` ou trocar por `<div>`).
- Mostrar contador no subtitle quando há eventos: "3 visualizações · última 2h atrás" em vez de só "Quem viu / interagiu".

### 2. Layout dos botões — mais informativo, menos genérico

Trocar a grid de 4 cartões iguais por um layout em duas zonas:

```text
┌───────────────────────────────────────────────────────────────────┐
│  Link público da proposta                            [QR] [↗] [⧉] │
│  core.getbrain.com.br/p/YwZzgqHAqCgAeyXIHSvSO7CYiFGL2_id          │
│  Pré-autenticado — válido até 01/06/2026 · 0 visualizações        │
└───────────────────────────────────────────────────────────────────┘
┌─────────────┬──────────────────┬──────────────────────────────────┐
│ Ver como    │ Pré-visualizar   │ Tracking & histórico             │
│ cliente ↗   │ PDF (versão atual)│ 0 visualizações                  │
└─────────────┴──────────────────┴──────────────────────────────────┘
```

- Bloco superior dedicado ao **link** mostra a URL completa visível, com 3 ações inline: copiar, abrir em nova aba, mostrar QR.
- Bloco inferior fica com 3 ações de contexto, cada uma com ícone + título + sub explicativo.
- Quando `!hasLink` (proposta nunca enviada), o bloco superior vira um card cinza com "Esta proposta ainda não tem link público" + CTA "Gerar e enviar".

### 3. Card de Vínculo com CRM — mais prático

Refatorar `CrmDealLinkPicker.tsx`:

**Quando há vínculo:**
- Cabeçalho com avatar/logo da empresa, código do deal, título, estágio, valor estimado (todos numa linha visualmente coesa, em vez do parágrafo atual).
- Linha secundária com **3 chips clicáveis**: `Abrir deal no CRM ↗` · `Importar dados` · `Trocar deal` · `Desvincular`.
- Quando não há campos novos para importar (proposta já tem todos os dados sincronizados), o chip "Importar dados" fica desabilitado com tooltip "Tudo já foi importado".
- Mostrar pequeno "diff" inline: badge "3 campos novos disponíveis para importar" se a proposta foi vinculada mas não importou ainda, ou se o deal mudou.

**Quando não há vínculo:**
- Estado vazio mais convidativo: ícone grande, título "Nenhum deal vinculado", subtítulo curto sobre o benefício, botão primário "Vincular deal do CRM".

**Picker (popover):**
- Mostrar logo da empresa em cada item (já temos `company.logo_url`).
- Adicionar valor estimado e estágio com cor (badge colorido por estágio: azul/amarelo/verde/vermelho conforme `deal_stages`).
- Search com placeholder mais específico: "Buscar por código (DEAL-...), título ou empresa".

### 4. Fix técnicos

- `src/hooks/orcamentos/useGenerateProposalPDF.tsx`: trocar `accessUrl = .../p/${proposal.id}` por `proposal.access_token ?? proposal.id`.
- `src/components/orcamentos/PropostaTrackingSheet.tsx`: envolver `Empty` em `forwardRef` ou usar `div` simples para silenciar warning.
- Toast com loading no `handlePreviewAsClient` em `OrcamentoEditarDetalhe.tsx`.

## Arquivos afetados

- `src/components/orcamentos/page/tabs/TabResumo.tsx` — novo bloco de link público + grid reduzida.
- `src/components/orcamentos/page/CrmDealLinkPicker.tsx` — header redesenhado, picker enriquecido.
- `src/components/orcamentos/PreviewPdfDialog.tsx` — estados visíveis, timeout, botões de baixar/abrir.
- `src/pages/financeiro/OrcamentoEditarDetalhe.tsx` — handler de preview com loading + fallback popup bloqueado.
- `src/hooks/orcamentos/useGenerateProposalPDF.tsx` — fix do QR usando access_token.
- `src/components/orcamentos/PropostaTrackingSheet.tsx` — fix forwardRef warning + retornar contador para o subtitle.

## Resultado esperado

- Link público visível por extenso, com copiar/abrir/QR em um único bloco.
- Preview do PDF mostra progresso real, com escape via download se travar.
- Vínculo do CRM com header limpo e visualmente rico, ações em chips.
- "Ver como cliente" com loading e fallback se o popup for bloqueado.
- Console limpo de warnings.
