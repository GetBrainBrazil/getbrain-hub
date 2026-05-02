## Resumo

Refinar a página pública da proposta com base nos seus 7 pontos: corrigir valor de investimento (vem zerado), gerar carta de abertura com IA, reescrever Contexto/Solução com formatação melhor, transformar escopo em **timeline com IA priorizando entregas que destravam valor**, redesenhar Investimento com parcelas em destaque, repaginar "Sobre GetBrain" com mais elementos visuais, transformar o chat em **bolinha flutuante** com agente de IA realmente funcional, e fazer o botão "Quero avançar" disparar **WhatsApp + mover card no Kanban**.

## 1. Corrigir Investimento zerado

O componente hoje calcula `total = soma dos items`, mas a proposta tem coluna própria `implementation_value` (numeric) na tabela `proposals`, junto com `installments_count` e `first_installment_date`. O `get-proposal-public-data` não está retornando esses campos.

**Ações:**
- Atualizar `supabase/functions/get-proposal-public-data/index.ts` para selecionar e retornar `implementation_value`, `installments_count`, `first_installment_date`.
- No `PropostaPublica.tsx`, usar `implementation_value` como valor de investimento principal (com fallback para soma dos items, se nulo).

## 2. Carta de abertura gerada por IA

Hoje a carta usa `executive_summary` que veio das suas notas internas. Vou criar uma nova edge function **`generate-proposal-opening-letter`** que:

- É chamada uma vez quando a proposta é carregada na página pública (cacheada na coluna nova `proposal.public_opening_letter` para não regerar a cada visita).
- Usa Lovable AI Gateway (`google/gemini-2.5-flash`) com prompt focado em **impacto + retenção**: usa nome do contato primário, nome da empresa, dor identificada, solução proposta e total de investimento. Saída: 3-4 parágrafos curtos, tom consultivo, primeira pessoa do Daniel, sem repetir números (só sensação/visão).
- Filtros de output já existentes (`_shared/ai-output-filters.ts`) são aplicados.
- Migration: adiciona coluna `public_opening_letter text` em `proposals`.

A página passa a renderizar `public_opening_letter` em vez de `executive_summary` na seção Carta. Se ainda não foi gerada, mostra skeleton e dispara geração.

## 3. Contexto + Solução melhor formatados

- **Contexto ("O ponto de partida"):** novo prompt na edge function `generate-proposal-content` (já existe) para gerar `pain_context` como texto explicando a dor + 1 frase de gatilho no final ("...e é exatamente aí que entra o que vamos construir →"). Sem bullets — texto corrido editorial.
- **Solução:** prompt revisado para gerar `solution_overview` como **2 parágrafos de texto corrido + 4-6 bullet points** com os pilares da entrega. O `<Prose>` já renderiza markdown, então só ajustar o prompt para retornar essa estrutura.
- Adicionar botão "Regenerar com IA" no editor interno (`OrcamentoEditarDetalhe`) já existente — apenas ajustar prompt.

## 4. Escopo virando Timeline (com priorização por IA)

Substituir os "capítulos" expandidos pelo formato de **roadmap horizontal/vertical compacto**, gerado por IA que analisa todos os items e agrupa em **fases de entrega** otimizadas para "tempo até o cliente começar a usar".

**Estrutura:**
- Nova edge function `generate-proposal-roadmap` que recebe os items + dependências e retorna JSON estruturado:
  ```
  phases: [
    { name: "Fase 1 — No ar em 7 dias", days: 7, deliverables: ["...", "..."], rationale: "..." },
    { name: "Fase 2 — Inteligência", days: 15, ... },
    { name: "Fase 3 — Refinamento", days: 8, ... }
  ]
  ```
- Cacheada em nova coluna `proposal.public_roadmap jsonb`.
- UI: timeline vertical com 3-5 fases, cada fase ocupa ~1 viewport com:
  - Número grande da fase + duração ("DIA 1 → DIA 7")
  - Título serif da fase
  - 3-5 entregáveis em lista compacta
  - Por que esta fase vem agora (1 frase)
- Linha conectora vertical com pontos brand ligando as fases.
- Muito mais compacto que o accordion atual (cada item ocupava ~120px abertos).

## 5. Investimento redesenhado

Hierarquia nova (parcela em evidência):

```text
INVESTIMENTO
12x R$ 1.250,00          ← serif gigante (~96px), brand color
no cartão ou boleto       ← caption mono

R$ 15.000,00 à vista      ← total menor (~32px), texto suave
+ R$ 600,00/mês           ← mensalidade, mesmo peso do total
```

Se `installments_count` for nulo ou 1, usa só o total à vista como protagonista.

**Composição reformulada:**
- Cards com hairline em vez de tabela seca.
- Cada item: número (mono), descrição, badge "incluso" ou valor (mono), barra fina mostrando proporção do item no total.
- "Mensalidade inclui" vira grid 2 colunas com ícones discretos (do lucide-react: `CheckCircle2`, `Wrench`, `MessageSquare`, `TrendingUp`) em vez de lista plana.

## 6. "Sobre GetBrain" com mais identidade visual

Adicionar à seção `sobre`:
- **3 cards de capacidades** lado a lado com ícones grandes (lucide: `Brain`, `Zap`, `Code2`) e 1 frase cada: "IA aplicada ao seu negócio", "Velocidade de execução", "Engenharia de verdade".
- **Faixa de números** estilo manifesto: "X projetos · Y clientes · Z anos focados em IA" em mono grande.
- **Stack visual**: badges discretos das tecnologias (OpenAI, Supabase, React, etc.) numa linha horizontal scrollável.
- **Background pattern**: grid sutil + gradiente brand + um SVG decorativo de neurônio/grafo no canto.
- Manter parágrafos do `ABOUT_GETBRAIN_PARAGRAPHS` mas em coluna ao lado dos elementos visuais (grid 5/7).

## 7. Chat IA — bolinha flutuante funcional

**Problema atual:** o `ProposalChatBox` é uma barra fixa no rodapé que conflita com o conteúdo e provavelmente está com bug por isso. Reescrever como bolinha flutuante.

**Novo formato (`ProposalChatBubble.tsx`):**
- Bolinha 56px no canto inferior direito, gradiente brand, ícone `Sparkles` + leve pulse.
- Click abre drawer 380×560px (mobile: bottom sheet full width).
- Header: avatar IA + "Assistente da proposta · online".
- Mensagens com bubble pattern padrão (user direita brand, assistente esquerda cinza).
- Sugestões iniciais clicáveis: "Qual o prazo?", "O que está incluso?", "Como funciona o pagamento?".
- Botões de escalation aparecem quando IA detecta dúvida fora de escopo: "Falar com Daniel" → dispara `manifested_interest` + abre WhatsApp.
- Persistência local da conversa (sessionStorage por sessionToken).

**Edge function `proposal-chat` já existe e está funcional** — vou só validar que os parâmetros do request estão corretos e ajustar o system prompt para incluir o roadmap e a parcela. O bug provavelmente é de payload/state no front; vou auditar o flow ao reescrever o componente.

## 8. "Quero avançar" funcional (WhatsApp + Kanban)

Hoje só dispara `interest_manifested` que faz audit log. Falta:
1. Notificação WhatsApp pra você
2. Mover o deal no Kanban

**Ações:**
- A função `track-proposal-view` **já dispara `notify-daniel` com kind `manifested_interest`** quando recebe `event=interest_manifested`, e o `notify-daniel` **já tenta WhatsApp via Z-API**. Preciso validar:
  - Z-API secrets (`Z_API_DANIEL_INSTANCE_ID`, `Z_API_DANIEL_TOKEN`, `Z_API_DANIEL_PHONE`) configurados — vou rodar `fetch_secrets` e, se faltarem, pedir.
  - Settings `notify_on_manifested_interest = true` em `proposal_ai_settings`.

- **Mover o card no Kanban:** estender `track-proposal-view` para, no caso `interest_manifested`, atualizar o `deal` ligado à proposta (`proposals.deal_id`) movendo `stage` para `'gelado'` (label "Negociação") se estava em `proposta_na_mesa` ou `ajustando`. Registra activity no deal: "Cliente manifestou interesse pela proposta {code}".

- **Número fake no WhatsApp do front:** o link `wa.me/5511999999999` é placeholder. Trocar por uma constante centralizada (env ou hardcoded em `getbrain-info.ts`) com o número real do Daniel. Vou perguntar via questions.

## Detalhes técnicos

**Migrations:**
```sql
ALTER TABLE proposals 
  ADD COLUMN public_opening_letter text,
  ADD COLUMN public_roadmap jsonb;
```

**Novas edge functions:**
- `generate-proposal-opening-letter` — IA, cacheia em `public_opening_letter`
- `generate-proposal-roadmap` — IA, cacheia em `public_roadmap`

**Edge functions atualizadas:**
- `get-proposal-public-data` — retornar `implementation_value`, `installments_count`, `first_installment_date`, `public_opening_letter`, `public_roadmap`
- `track-proposal-view` — no `interest_manifested`, mover deal stage e registrar activity
- `proposal-chat` — system prompt enriquecido com roadmap e parcela
- `generate-proposal-content` — prompts de pain_context e solution_overview revisados

**Componentes:**
- `PropostaPublica.tsx` — usar `implementation_value`, novo bloco de Investimento, integrar `<Roadmap>`, remover `ProposalChatBox` antigo
- Novo: `ProposalRoadmap.tsx` — timeline editorial
- Novo: `ProposalChatBubble.tsx` — bolinha + drawer
- Novo: `AboutGetBrainSection.tsx` — seção redesenhada com cards + stats + stack
- Atualizar `getbrain-info.ts` com WhatsApp real

**Não vou mexer:**
- PasswordGate (continua igual)
- Tracking/auth/PDF
- Editor interno de proposta (só ajusto prompts no backend)

## Perguntas antes de implementar

Vou perguntar via `ask_questions`:
1. Qual o WhatsApp real do Daniel (pra trocar o `5511999999999`)?
2. Os secrets Z-API estão configurados? (vou checar antes)
3. Quando o cliente clica "Quero avançar", o deal deve ir pra `gelado` (Negociação) ou direto pra `ganho`?
