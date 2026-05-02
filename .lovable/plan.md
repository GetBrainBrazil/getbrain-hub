## Problema atual

A sub-aba **Conteúdo** hoje é uma pilha de 8 accordions, todos com tipografia muito pequena (10–11px), labels em cinza fraco, sem hierarquia clara, sem busca e sem nenhuma forma de ver o impacto da edição. O usuário precisa abrir/fechar acordeões para chegar em qualquer campo, e não consegue identificar visualmente em qual seção da página pública cada bloco aparece.

## Objetivo

Transformar essa tela num **editor de CMS profissional** — claro, navegável, com preview integrada, e com cada campo "amarrado" visualmente à seção correspondente da página pública.

## Novo layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Conteúdo global · afeta todas as propostas]    [⟳ salvo 14:32] [👁]   │
├──────────────┬─────────────────────────────────────────────────────────┤
│ 🔎 Buscar…   │ Hero & navegação                                        │
│              │ ─────────────────────────────────────────────────────   │
│ ▸ Hero       │ Etiquetas exibidas no topo                              │
│ ▸ Seções     │ [ Estratégia × ] [ Tecnologia × ] [ Resultado × ] [+]   │
│ ▸ Sobre   ●  │                                                         │
│ ▸ Capacid.   │ Texto de "role para baixo"                              │
│ ▸ Stack      │ ┌────────────────────────────────────────────────────┐  │
│ ▸ Próximos   │ │ Role para baixo                                    │  │
│ ▸ Senha      │ └────────────────────────────────────────────────────┘  │
│ ▸ Rodapé     │                                                         │
│              │ 💡 Dica: aparece logo abaixo do título principal.       │
│ ────────     │                                                         │
│ 👁 Abrir     │                                                         │
│ pré-visual   │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### 1. Navegação lateral (em vez de accordions)
- Sidebar fixa à esquerda (≥md), com 8 itens agrupados em **3 categorias**:
  - **Estrutura da página**: Hero, Títulos das seções, CTA Próximos passos
  - **Institucional**: Sobre a GetBrain, Cards de capacidades, Stack tecnológico
  - **Acesso & contato**: Tela de senha, Rodapé & contato
- Cada item mostra ícone, nome, e um **dot accent** quando tem alteração não persistida.
- Em mobile, a sidebar vira um `Select` no topo (mesma navegação, sem perder espaço).

### 2. Busca global de campos
- Input no topo da sidebar filtra os itens por nome **e** por palavra contida em qualquer label/placeholder/valor atual. Resolve "onde mudo o texto X?".

### 3. Painel de edição (direita)
- Cada bloco tem **header** com título 16px + descrição curta + ícone, separador, e os campos com **labels 12px legíveis** (não 10px cinza fraco).
- Cada grupo de campo recebe uma **dica contextual** ("aparece logo abaixo do hero", "exibido no rodapé") — ajuda o usuário a entender impacto.
- Inputs/textarea com tamanho confortável (`h-9`, `text-sm`), espaçamento `space-y-4` em vez de `space-y-2`.
- Indicador de salvamento por campo: bordinha verde piscando 1s após o blur quando salvou (mais sutil que o toast atual).

### 4. Editor de "Títulos das seções" repaginado
Hoje é uma tabela de 9 linhas estilo planilha. Vira um **grid de cards**, um por seção, cada um com:
- Pequeno preview de como o eyebrow + título vão renderizar (texto pequeno mono uppercase + título em serif).
- Dois inputs lado-a-lado abaixo.
- Ordem reflete a ordem real da página pública.

### 5. Cards de capacidades
- Mantém o picker de ícone, mas o card fica maior (mostra preview real do ícone num círculo com o tom accent), com handle de drag para reordenar (em vez dos 2 botões up/down sempre visíveis).
- Botão "+ Adicionar" vira tile pontilhado no fim do grid.

### 6. Editor de tags (eyebrows, stack)
- Pílulas com altura confortável (`h-7`), input embutido com placeholder "+ adicionar".
- Mostra contador `(3)` ao lado do label.

### 7. Header da sub-aba
- Faixa única com:
  - chip "🌐 Conteúdo global · afeta todas as propostas"
  - status de save (Salvando… / Salvo às HH:mm)
  - botão **"Pré-visualizar"** que abre a sub-aba Preview já no estado atual (em vez do usuário ter que clicar manualmente em outra tab)

## Arquivos afetados

- **Reescrita**: `src/components/orcamentos/page/tabs/pagina-publica/SubTabConteudo.tsx`
  - troca Accordion por layout sidebar + painel
  - implementa busca, agrupamento, indicadores
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/SidebarConteudo.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelHero.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelSecoes.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelSobre.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelCapacidades.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelStack.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelProximos.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelSenha.tsx`
- **Novo**: `src/components/orcamentos/page/tabs/pagina-publica/conteudo/PainelRodape.tsx`
- **Refino visual**: editores existentes (`EditorTags`, `EditorTextoLista`, `EditorCapabilities`, `EditorSecoes`) — paddings, tamanhos, drag handle nos cards.
- **Atualização**: `index.tsx` ganha prop para abrir a sub-aba Preview a partir do botão do header.

## Detalhes técnicos

- **Estado da seção ativa** persistido com `usePersistedState("proposal-pagina-publica-conteudo-secao", "hero")` para o usuário voltar onde estava.
- **Busca** usa `useMemo` filtrando contra um índice in-memory `{ id, label, group, keywords[] }`.
- **Dirty dot**: cada painel chama `onDirty(id)` enquanto valor local difere do salvo; limpa ao receber confirmação do `usePublicPageSettings`.
- **Drag handle** dos capabilities usa `@dnd-kit/sortable` se já presente; caso contrário, mantém setas mas movidas para um menu kebab no canto.
- Mobile: `useIsMobile()` troca sidebar por Select sticky no topo. Cards stack em 1 coluna; tabela de seções vira lista vertical.
- Nada muda no schema, no hook `usePublicPageSettings`, na edge function ou na página pública — é puramente UI/UX da aba admin.

## Fora do escopo

- Sub-abas Acesso e Pré-visualização (não foram apontadas como problema).
- Adicionar novos campos editáveis (mantemos exatamente os mesmos do schema atual).
