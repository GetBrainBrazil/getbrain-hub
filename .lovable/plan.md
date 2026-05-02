## Direção visual

Inspirado no editorial elegante de imobiliariadorio.com.br — adaptado à identidade GetBrain (dark + neon), mas trazendo o que torna aquele site único:

- **Hero cinematográfico em tela cheia** com headline serif gigantesco e ponto de acento neon (•)
- **Tipografia editorial**: serif de display (Fraunces) para títulos + sans (Inter Tight) para corpo, com "kicker" em caixa-alta espaçada (`tracking-[0.4em]`)
- **Densidade controlada**: muito ar entre seções (160–200px), uma ideia por viewport
- **Micro-detalhes**: pontos de acento neon, separadores ultra-finos, números grandes em fonte mono, "role para baixo" sutil
- **Layout misto**: fundo escuro profundo no hero/CTAs intercalado com seções claras (off-white #f8f7f3) para destaque editorial — tipo revista
- **Logo do cliente em destaque** como protagonista, não como decoração
- **Hover states discretos**, transições longas (700ms+), reveal cinematográfico

## Estrutura nova (uma seção = uma cena)

```text
[1] HERO TELA CHEIA
    - Logo cliente + "PROPOSTA EXCLUSIVA PARA"
    - Headline serif: "Sunbright Engenharia•" (ponto neon)
    - Sub: 1 linha curta poética
    - 3 KPIs minimalistas em linha (sem cards, só números grandes)
    - "ROLE PARA BAIXO" + linha vertical animada

[2] CARTA DE ABERTURA (fundo off-white, serif grande)
    - "Olá, Vanessa." (nome do contato primário do CRM)
    - Resumo executivo em prosa editorial

[3] O CONTEXTO (dark)
    - Eyebrow "01 · CONTEXTO"
    - Headline serif + parágrafo com aspas grandes nas dores

[4] A SOLUÇÃO (off-white)
    - Eyebrow "02 · SOLUÇÃO"
    - Texto editorial

[5] ESCOPO (dark, lista numerada vertical)
    - Cada item como "capítulo" numerado em mono grande
    - Título serif + descrição sans
    - Expand inline elegante (sem accordion barulhento)

[6] INVESTIMENTO (split editorial)
    - Esquerda: número gigante R$ X em serif
    - Direita: tabela limpa com hairline dividers
    - Manutenção como bloco separado abaixo

[7] CRONOGRAMA (timeline horizontal cinematográfica)

[8] SOBRE GETBRAIN (off-white, formato manifesto)

[9] PRÓXIMOS PASSOS (hero invertido)
    - Headline serif "Vamos começar?"
    - 2 CTAs grandes: "Quero avançar" + WhatsApp direto pro Daniel
    - Assinatura: "Daniel · GetBrain" com avatar circular

[10] FOOTER mínimo (estilo o do site da imobiliária)
```

## Navegação

- **Top bar**: minimalista, transparente no hero, sólida ao rolar; logo GetBrain + código proposta + botão PDF
- **Sidebar lateral fixa em desktop**: substituída por **dot navigation vertical** (estilo bullets) à direita, com label que aparece no hover
- **Mobile**: nav em drawer + barra inferior com "Quero avançar" sempre visível

## Tipografia e cores

- **Display**: Fraunces (serif) — peso 400/600 para títulos
- **Body**: Inter Tight (sans) — 400/500
- **Mono**: JetBrains Mono — para números, eyebrows, códigos
- **Paleta**:
  - Dark: `#0a0e1a` (atual) com camadas `#0f1420`
  - Off-white editorial: `#f8f7f3` (intercalar seções)
  - Acento: `--brand` do cliente (default cyan #22D3EE) usado parcimoniosamente, principalmente como ponto/sublinhado
  - Texto dark mode: branco com 92/68/40% opacidade em hierarquia
  - Texto light mode: `#0a0e1a` com 90/60/40%

## Detalhes que fazem diferença (do imobiliariadorio)

- Ponto colorido após títulos (`Headline•`)
- Eyebrow com pontos separadores: `EXCLUSIVIDADE · DISCRIÇÃO · EXCELÊNCIA`
- Indicador "ROLE PARA BAIXO" no hero com linha vertical
- Botões pill com borda fina e hover suave
- Separadores horizontais hairline (1px com 8% opacidade)
- Footer dark com 2 colunas: navegação + contato

## Detalhes técnicos

- Arquivo principal: `src/pages/public/PropostaPublica.tsx` — substituir `ProposalView` mantendo o `PasswordGate` atual e toda lógica de tracking/auth/PDF
- Carregar Fraunces e Inter Tight via Google Fonts no `<head>` do `index.html` (não afeta o app interno, só a página pública usa)
- Manter compatibilidade com todos os campos existentes (`executive_summary`, `pain_context`, `solution_overview`, `items`, `considerations`, `mockup_url`, `maintenance_*`, etc.)
- Buscar nome do contato primário via `usePrimaryContact` (já existe) usando `proposal.company_id` — usado na carta de abertura e assinatura
- Manter `ProposalChatBox` flutuante no canto
- Manter banner de preview no topo quando `isPreview`
- Animações: keep `reveal/reveal-in`, adicionar `reveal-from-left/right` para variar
- Responsividade mobile-first: hero serif escala de 4xl→7xl, sidebar de pontos some em <lg, tabela investimento vira cards
- Sem mudanças de schema, sem novos endpoints, sem migrations

## Fora de escopo

- Não vou mudar o `PasswordGate` (já está bom, igual ao screenshot anterior)
- Não vou mexer no editor interno de proposta nem no `TabResumo`
- Não vou trocar Tailwind por outra lib
