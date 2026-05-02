## Objetivo

Transformar a sub-aba **Conteúdo** num CMS verdadeiro: (1) com **preview lado a lado** que **acompanha a seção** em edição, e (2) cobrindo **todas** as variáveis da página pública — não só as institucionais (globais), mas também os textos e números **por-proposta** (boas-vindas, contexto, solução, escopo, itens, preços, parcelamento, prazos, considerações, manutenção, validade).

## Como vai funcionar

### Layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ [Conteúdo · global + esta proposta]  [salvo 14:32]  [📐 lado a lado] [📺]  │
├──────────────┬───────────────────────────────────┬─────────────────────────┤
│ 🔎 Buscar…   │ Hero & navegação                  │  ╭─ PREVIEW AO VIVO ─╮  │
│              │ ─────────────────────────────────│  │  iframe da página  │  │
│ ESTA PROPOSTA│ Etiquetas do hero…                │  │  ↳ rola pra seção  │  │
│ ▸ Hero msg ●│ Texto "role para baixo"           │  │     que estou      │  │
│ ▸ Contexto   │                                   │  │     editando       │  │
│ ▸ Solução    │                                   │  │                    │  │
│ ▸ Escopo     │                                   │  │  [recarregar] [↗] │  │
│ ▸ Investim.  │                                   │  ╰────────────────────╯  │
│ ▸ Cronograma │                                   │                         │
│ ▸ Manutenção │                                   │                         │
│ ▸ Considerações                                  │                         │
│              │                                   │                         │
│ GLOBAL       │                                   │                         │
│ ▸ Hero       │                                   │                         │
│ ▸ Títulos    │                                   │                         │
│ ▸ Sobre      │                                   │                         │
│ ▸ Capacid.   │                                   │                         │
│ ▸ Stack      │                                   │                         │
│ ▸ Próximos   │                                   │                         │
│ ▸ Senha      │                                   │                         │
│ ▸ Rodapé     │                                   │                         │
└──────────────┴───────────────────────────────────┴─────────────────────────┘
```

Dois modos:
- **Lado a lado** (padrão em telas ≥ lg): editor à esquerda + preview à direita.
- **Foco** (toggle): só editor, com botão "Pré-visualizar" no header que pula direto para a aba Acesso & Preview (comportamento atual). Persiste via `usePersistedState`.

Em mobile: preview vira um botão flutuante "Ver preview" que abre uma sheet bottom sheet em tela cheia (sem competir por largura).

### Sincronização com a seção em edição

1. Quando o usuário muda de painel na sidebar (ex.: clica em "Solução"), o componente envia uma mensagem `postMessage({type:"scroll-to", section:"solucao"})` ao iframe.
2. Dentro de `PropostaPublica.tsx` adicionamos um listener:
   - `scroll-to`: faz `document.getElementById(section)?.scrollIntoView({behavior:'smooth', block:'start'})` e adiciona um anel/halo temporário (`.preview-highlight`) na seção por ~1.4s.
   - `force-reload`: recarrega via incremento de query param (já temos `previewBust`).
3. Cada `persist()` envia também `postMessage({type:"settings-changed"})` — o iframe re-fetcha apenas `page_settings` (não o preview inteiro), atualizando textos globais sem perder a posição de scroll.
4. Para campos **por-proposta** (texto editado em tempo real), enviamos `postMessage({type:"proposal-patch", patch:{welcome_message, pain_context, ...}})` — o iframe aplica em memória sem precisar bater no servidor; persiste no banco via autosave normal a cada blur.

### Novas seções editáveis (por-proposta) na sidebar

Criamos um grupo **"Esta proposta"** com painéis dedicados. Cada painel lê/grava direto no `useProposalEditorState` existente (mesmo state que a aba Escopo usa). Como o state é compartilhado pelo editor da página, **persiste igual** à aba Escopo, com autosave on blur (já implementado lá). Painéis:

| Painel | Campos (do state) |
|---|---|
| Mensagem de boas-vindas | `welcomeMessage` |
| Contexto / dor | `painContext` (textarea longa, suporta markdown) |
| Solução | `solutionOverview` (markdown) |
| Resumo executivo (carta base) | `executiveSummary` (markdown — fallback quando IA não rodou) |
| Escopo (itens) | `items[]` — editor compacto: descrição + quantidade + valor unit. Com botão "Abrir em Escopo" para fluxo completo |
| Investimento | `implementationValue`, `installmentsCount`, `firstInstallmentDate` |
| Cronograma | `implementationDays`, `validationDays`, `expiresAt` |
| Manutenção | `maintenanceDescription`, `maintenanceMonthlyValue` |
| Considerações | `considerations[]` (lista de strings) |

> Cada painel mostra o **mesmo input** que existe hoje na tab Escopo (mantém validações), mas envolto na UI nova de painel/dica/preview-highlight. Não duplicamos lógica de salvamento — chamamos `setField` do state já existente, e ele dispara o autosave que a tab Escopo já dispara.

### Botão "Pré-visualizar" do header

Como agora o preview pode estar embutido, o botão muda comportamento:
- Se o modo "lado a lado" estiver ativo → faz scroll do iframe para a seção atual (re-emite `scroll-to`).
- Se estiver em modo "foco" → leva à aba **Acesso & Preview** e dá scroll, igual hoje.

## Arquivos afetados

### Novos

- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PreviewPane.tsx` — componente reutilizável que renderiza o iframe + handshake `postMessage` (recarregar, scroll-to, patch). Aceita `section`, `proposalPatch`, `bust`. Recebe `accessToken` e gera o `previewJwt` via `preview-proposal-as-internal` (mesmo padrão de `SubTabPreview`).
- `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelMensagemBoasVindas.tsx`
- `…/PainelContexto.tsx`
- `…/PainelSolucao.tsx`
- `…/PainelResumoExecutivo.tsx`
- `…/PainelEscopoItens.tsx` (editor compacto de items)
- `…/PainelInvestimento.tsx`
- `…/PainelCronograma.tsx`
- `…/PainelManutencao.tsx`
- `…/PainelConsideracoes.tsx`

### Editados

- `src/components/orcamentos/page/tabs/pagina-publica/SubTabConteudo.tsx`
  - Recebe `proposal`, `state`, `setField` por props (vindos de `index.tsx`).
  - Sidebar passa a ter dois grupos: "Esta proposta" (novos painéis) e "Global" (os 8 atuais).
  - Renderiza a `PreviewPane` à direita quando modo "lado a lado" ativo.
  - Toggle "Lado a lado / Foco" persistido com `usePersistedState`.
  - A cada mudança de `active`, dispara `previewRef.current?.scrollToSection(map[active])`.
- `src/components/orcamentos/page/tabs/pagina-publica/index.tsx`
  - Repassa `proposal`, `state`, `setField` ao `SubTabConteudo`.
  - Mantém `handleOpenPreview` para o modo foco.
- `src/pages/public/PropostaPublica.tsx`
  - Adiciona listener `window.addEventListener("message", …)` que aceita `scroll-to`, `proposal-patch` e `settings-changed` (somente quando `isPreview`).
  - Quando recebe `proposal-patch`, faz merge no state local da proposta exibida (sem chamar API).
  - Adiciona uma classe `.preview-highlight` (anel cyan + leve scale) aplicada por 1.4s após `scroll-to`.

### Sem mudanças

- Hooks `usePublicPageSettings` e `useProposalEditorState`.
- Edge functions.
- Schema do banco.

## Detalhes técnicos

- **Mapa seção→âncora**:
  ```ts
  const SECTION_ANCHOR: Record<string, string> = {
    // por-proposta
    "p.boas-vindas": "hero",
    "p.contexto":    "contexto",
    "p.solucao":     "solucao",
    "p.resumo":      "carta",
    "p.escopo":      "escopo",
    "p.investimento":"investimento",
    "p.cronograma":  "cronograma",
    "p.manutencao":  "investimento", // mensalidade aparece junto
    "p.consideracoes":"escopo",
    // globais
    "g.hero":        "hero",
    "g.secoes":      "contexto",
    "g.sobre":       "sobre",
    "g.capacidades": "sobre",
    "g.stack":       "sobre",
    "g.proximos":    "proximos",
    "g.senha":       "hero",       // gate só aparece sem JWT — mostramos hero
    "g.rodape":      "proximos",
  };
  ```
- **Origem postMessage**: o iframe é same-origin (preview servido em `/p/:token`), então `event.origin === window.location.origin` para validar.
- **Throttle de patches por-proposta**: ao digitar, faz patch a cada `keyup` com debounce de 300 ms para o iframe ficar fluido sem flooding.
- **Persistência real (banco)** continua sendo on blur via `setField` do `useProposalEditorState`.
- **Highlight visual** no iframe: classe inserida via `<style>` injetado dentro do `PropostaPublica`:
  ```css
  .preview-highlight { box-shadow: inset 0 0 0 2px var(--brand), 0 0 0 6px color-mix(in srgb, var(--brand) 18%, transparent); transition: box-shadow .8s; }
  ```
- **Mobile**: usa `useIsMobile()`. Quando true, preview vai pra `Sheet side="bottom"` acessível pelo botão flutuante; sidebar continua sendo Select.
- **Performance**: o iframe não recarrega ao mudar de painel — só envia `scroll-to`. Recarrega só quando `settings_changed` global (igual hoje) ou quando o token muda.

## Fora do escopo

- Reescrever a tab Escopo (continua funcionando; apenas reaproveitamos seu state).
- Drag-and-drop de itens do escopo (mantém ordem do banco).
- Editor de markdown rico (mantemos `Textarea` com hint sobre markdown, igual hoje).
