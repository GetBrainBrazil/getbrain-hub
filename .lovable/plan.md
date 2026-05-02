## O que vamos consertar

Olhando o card "Link público da proposta" (no print que você mandou), tem dois bugs e uma melhoria visual:

### 1. Botão "Abrir em nova aba" e QR Code apontam pro domínio errado
Hoje o link é montado com `window.location.origin`. Quando você está dentro do editor da Lovable, isso vira algo tipo `2a9cb6b7-…lovableproject.com/p/<token>` — que é exatamente o que aparece no seu print. Esse domínio:
- Não é o que o cliente deve receber.
- Pode falhar (preview interno, bloqueio, expira, etc).
- Quando codificado num QR Code, leva o cliente pra um lugar que não é o `hub.getbrain.com.br`.

A constante correta (`https://hub.getbrain.com.br/p`) já existe em `LinkGeradoDialog.tsx`, mas só é usada lá. Vamos centralizar e reutilizar.

### 2. QR Code sem identidade visual
Hoje é um QR genérico preto-e-branco. Vamos colocar a logo da GetBrain (PNG já presente em `src/assets/logo-getbrain.png`) no centro, mantendo a leitura funcional.

---

## Como vamos fazer

### A) Centralizar a URL pública
- Criar `src/lib/orcamentos/publicProposalUrl.ts` exportando:
  - `PUBLIC_PROPOSAL_BASE = "https://hub.getbrain.com.br/p"`
  - `buildPublicProposalUrl(token, opts?: { previewJwt?: string })`
- Substituir os usos atuais que fazem `${window.location.origin}/p/${token}` por essa helper em:
  - `src/components/orcamentos/page/tabs/TabResumo.tsx` (bloco `PublicLinkBlock` — botão "abrir nova aba", QR e cópia do link).
  - `src/components/orcamentos/AcessoClienteCard.tsx` (link mostrado + botão de abrir).
  - `src/lib/orcamentos/previewAsClient.ts` (manter `?preview=<jwt>` na URL canônica).
- Em `LinkGeradoDialog.tsx`, trocar a constante local pela helper compartilhada.

Resultado: o link que você copia/abre/escaneia será sempre `https://hub.getbrain.com.br/p/<token>`, igual ao que o cliente vai receber.

### B) QR Code com logo no meio
- Criar `src/lib/orcamentos/generateBrandedQrDataUrl.ts`:
  1. Gera o QR via `qrcode` com `errorCorrectionLevel: "H"` (suporta ~30% de obstrução, ideal pra logo central).
  2. Desenha o QR num `<canvas>` off-screen.
  3. Carrega a logo (`logo-getbrain.png` importada como módulo) e desenha um quadrado branco com cantos arredondados (~22% do tamanho do QR) no centro pra dar respiro.
  4. Desenha a logo por cima, centralizada, ocupando ~18% do QR.
  5. Retorna `canvas.toDataURL("image/png")`.
- Manter `generateQrDataUrl.ts` como fallback simples (caso a logo falhe em carregar, cair pro QR puro).
- No `PublicLinkBlock` do `TabResumo.tsx`, trocar a chamada para `generateBrandedQrDataUrl`.
- Aumentar a resolução interna do QR pra 480px (renderizado em 176px na tela) pra ficar nítido em telas com `devicePixelRatio` alto e quando o cliente tirar print.

### Detalhes técnicos do QR com logo
- Cores mantidas: `dark: #0a0e1a`, `light: #ffffff` (já consistentes com a marca).
- Quadrado branco atrás da logo com `borderRadius` ~12px e leve sombra interna (1px) pra separar visualmente do QR.
- Logo desenhada via `Image()` + `await image.decode()` pra garantir carregamento antes do `drawImage`.
- Se `image.decode()` rejeitar, retorna o QR sem logo (sem quebrar a UX).

---

## Arquivos afetados

**Criar:**
- `src/lib/orcamentos/publicProposalUrl.ts`
- `src/lib/orcamentos/generateBrandedQrDataUrl.ts`

**Editar:**
- `src/components/orcamentos/page/tabs/TabResumo.tsx` (PublicLinkBlock: URL helper + QR com logo)
- `src/components/orcamentos/AcessoClienteCard.tsx` (URL helper)
- `src/components/orcamentos/LinkGeradoDialog.tsx` (usar helper compartilhada)
- `src/lib/orcamentos/previewAsClient.ts` (usar helper compartilhada, preservando `?preview=`)

**Sem mudanças no backend** — os edge functions já tratam o token corretamente; só estávamos montando a URL com o host errado no client.

---

## Testes manuais que você pode fazer depois
1. No card, clicar no ícone de "abrir nova aba" → deve abrir `https://hub.getbrain.com.br/p/<token>` (não mais `lovableproject.com`).
2. Clicar no QR → o data URL escaneado por celular deve levar ao mesmo domínio.
3. O QR deve mostrar a logo branca/colorida centralizada e ainda ser lido por qualquer app de câmera.
4. "Ver como cliente" continua abrindo com `?preview=<jwt>` no domínio canônico.

Posso aplicar?