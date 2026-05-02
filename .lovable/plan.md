## Objetivo

Hoje a página pública (`/p/{token}`) tem **vários textos hard-coded** espalhados pelo `PropostaPublica.tsx`: textos institucionais da GetBrain (about), 6 cards de capacidades, lista de 17 tecnologias, microcopy do hero, scroll cue, headlines de seção ("O ponto de partida", "O que vamos construir", "Capítulos da entrega", "Os números", "A jornada", "Vamos começar?"), texto da seção "Próximos passos", labels do footer, etc.

Vou centralizar **todo conteúdo institucional editável** numa tabela `public_page_settings` (configuração global única, por organização) e remodelar a tab "Página Pública" pra ser o editor visual completo desses conteúdos + a parte específica da proposta atual (link, senha, mockup, preview).

Conteúdos **específicos da proposta** (carta IA, escopo, contexto, solução, valores) continuam onde estão — eles já são editáveis pelas outras tabs.

## O que vai ser editável

**Conteúdo institucional global** (afeta todas as propostas, edita uma vez):
- Hero: eyebrows ("Estratégia · Tecnologia · Resultado"), scroll cue ("Role para baixo")
- Headlines/eyebrows de cada seção (Carta, Contexto, Solução, Escopo, Investimento, Cronograma, Sobre, Próximos passos)
- Sobre a GetBrain: parágrafos descritivos (lista editável)
- Cards de capacidades: lista editável (ícone, título, descrição) — começa com os 6 atuais
- Stack tecnológico: lista editável de tags
- Próximos passos: título e dois parágrafos explicativos
- Footer: tagline, labels de contato
- Tela de senha: título, subtítulo, label do botão
- Contato global: WhatsApp, email, número exibido (vem de `GETBRAIN_INFO`, mas editável aqui também)

**Conteúdo específico da proposta** (já existe, mantém):
- Carta IA, contexto, solução, escopo, valores → outras tabs

## Mudanças no banco

Nova tabela `public_page_settings` (singleton por organização):

```sql
create table public.public_page_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique, -- garante 1 registro por org
  hero_eyebrows text[] default array['Estratégia','Tecnologia','Resultado'],
  hero_scroll_cue text default 'Role para baixo',
  section_titles jsonb default '{...}'::jsonb,    -- { contexto: "O ponto de partida", ... }
  section_eyebrows jsonb default '{...}'::jsonb,  -- { contexto: "Contexto", ... }
  about_paragraphs text[],                          -- substitui ABOUT_GETBRAIN_PARAGRAPHS
  capabilities jsonb,                               -- [{icon:"Brain", title, desc}, ...]
  tech_stack text[],                                -- ["React","TypeScript",...]
  next_steps_title text default 'Vamos começar?',
  next_steps_paragraphs text[],
  footer_tagline text,
  footer_contact_label text,
  password_gate_title text default 'Proposta protegida',
  password_gate_subtitle text default 'Digite a senha que você recebeu junto com o link.',
  password_gate_button text default 'Acessar proposta',
  contact_whatsapp text,
  contact_email text,
  contact_display_name text,
  updated_at timestamptz default now(),
  updated_by uuid
);
```

RLS: SELECT por authenticated; INSERT/UPDATE/DELETE só admin. Trigger `updated_at`. Seed inicial automático na primeira leitura via edge.

A edge function `get-proposal-public-data` passa a também retornar esses settings (join via `organization_id`), pra serem consumidos junto com os dados da proposta.

## Mudanças no frontend

### 1. `PropostaPublica.tsx`
- Substitui todos os textos hard-coded por leitura do novo objeto `pageSettings` que vem do payload.
- Fallback pros valores atuais caso a tabela ainda não tenha registro (compatibilidade).
- Capabilities renderizadas dinamicamente, com lookup de ícone via mapa `lucide-react`.

### 2. Nova tab "Página Pública" (remodelada)

Reorganizada com sub-abas internas, layout limpo e prático:

```text
┌──────────────────────────────────────────────────────┐
│  [Acesso]  [Conteúdo Global]  [Pré-visualização]    │  ← sub-tabs
├──────────────────────────────────────────────────────┤
│                                                      │
│   conteúdo da sub-aba ativa                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- **Acesso** (atual conteúdo): link, senha, mockup, ver como cliente.
- **Conteúdo Global** (NOVO): editor visual, em accordions colapsáveis por bloco:
  - Hero & navegação (eyebrows, scroll cue)
  - Títulos das seções (grid 2 colunas: eyebrow + title por seção)
  - Sobre a GetBrain (TextArea para lista de parágrafos, drag-to-reorder)
  - Cards de capacidades (cards inline editáveis: ícone picker, título, descrição, botão "+ Adicionar")
  - Stack tecnológico (tags com input, igual chips/badges editáveis)
  - Próximos passos (campos do CTA final)
  - Tela de senha (título, subtítulo, botão)
  - Footer & contato (WhatsApp, email, tagline)
  - Cada bloco com **autosave on blur** (padrão da memória `inline-edit-and-tabs`)
  - Indicador "Salvo às HH:MM" no topo
  - Aviso "Estas alterações afetam todas as propostas"
- **Pré-visualização** (atual iframe): preview ao vivo que reflete as alterações em tempo real (recarrega ao salvar).

### 3. Hooks novos
- `usePublicPageSettings()` — react-query, lê settings, expõe `update(field, value)` com autosave + invalidate.
- Helper `iconMap` em `src/lib/iconMap.ts` mapeando strings → componentes lucide.

## Fluxo do usuário

1. Você abre uma proposta → tab Página Pública.
2. Sub-aba "Conteúdo Global" → edita parágrafos do "Sobre", troca um card de capacidade, adiciona uma tecnologia.
3. Cada blur salva no banco automaticamente.
4. Sub-aba "Pré-visualização" → vê a página atualizada (botão refresh + auto-refresh ao trocar de sub-aba).
5. Toda outra proposta (atual e futura) já reflete essas mudanças.

## UI/UX da nova tab

- Visual consistente com o resto do editor (Card cinza-escuro, mesma tipografia).
- Toolbar fixa no topo com: badge "Conteúdo global · afeta todas as propostas", indicador de save, botão "Resetar para padrão".
- Bloco "Cards de capacidades" usa grid responsivo de mini-cards com hover overlay pra editar/excluir/reordenar.
- Bloco "Stack tecnológico" usa input estilo "tags": digite + Enter pra adicionar, X pra remover, drag pra reordenar.
- Bloco "Sobre a GetBrain" usa lista de TextArea com botões + (entre parágrafos) e × (remover).
- Mobile-first: accordions colapsam por padrão no mobile, desktop pode abrir vários ao mesmo tempo.

## Arquivos novos/alterados

**Banco:**
- migration: criar `public_page_settings` + RLS + trigger updated_at + seed function.

**Edge:**
- `get-proposal-public-data/index.ts`: incluir `page_settings` no payload.

**Frontend:**
- novo: `src/lib/iconMap.ts`
- novo: `src/hooks/orcamentos/usePublicPageSettings.ts`
- novo: `src/components/orcamentos/page/tabs/pagina-publica/` com:
  - `index.tsx` (sub-tabs)
  - `SubTabAcesso.tsx` (extrai parte atual)
  - `SubTabConteudo.tsx` (editor)
  - `SubTabPreview.tsx` (extrai iframe atual)
  - `editores/EditorTextoLista.tsx` (lista editável de parágrafos)
  - `editores/EditorCapabilities.tsx` (cards)
  - `editores/EditorTags.tsx` (chips de tech stack)
  - `editores/EditorSecao.tsx` (eyebrow + title pairs)
- alterar: `src/components/orcamentos/page/tabs/TabPaginaPublica.tsx` → vira wrapper que renderiza o novo `pagina-publica/index.tsx`.
- alterar: `src/pages/public/PropostaPublica.tsx` → consumir `pageSettings` do payload, fallback pros defaults atuais.
- deprecar (manter apenas como fallback constants): `src/content/about-getbrain.tsx`.

## Observações

- Mantenho `GETBRAIN_INFO` em `src/lib/getbrain-info.ts` como fonte para PDFs e emails (essas coisas precisam de constante de build). A tela pública lê do `pageSettings` quando disponível, com fallback pro `GETBRAIN_INFO`.
- Settings é singleton **por organização** (não por proposta) — uma única configuração global para o cliente ver consistente entre propostas.
- Se quiser no futuro overrides por proposta (ex.: mudar o "Sobre" só pra um cliente específico), adicionamos campos opcionais em `proposals` que prevalecem sobre os settings — mas isso fica fora desse escopo.
