# Catálogo → Cesta no CRM: lógica e próximos passos

## 1. Lógica do fluxo (visão de produto)

A ideia central é separar **"o que vendemos"** (Catálogo, fonte única) de **"o que estamos propondo para esse cliente"** (Cesta, dentro do Deal). O Catálogo nunca é tocado pelo vendedor durante a negociação — ele só **seleciona, ajusta e combina**.

```text
Catálogo (admin/comercial)         Deal no CRM (vendedor)
┌────────────────────────┐         ┌──────────────────────────┐
│ Produto: Agente SDR    │  pick   │  Cesta do Deal           │
│ Preço sugerido R$2,5k  │ ─────►  │  • Agente SDR  R$2.500   │
│ Tags, pitch, escopo    │         │  • Setup     R$1.500     │
└────────────────────────┘         │  Total recorrente / one  │
                                   └──────────────────────────┘
                                           │
                                           ▼
                                   Gera Proposta (módulo atual)
```

Princípios:
- **Cesta vive no Deal**, não no Catálogo. É um snapshot — se o preço do catálogo mudar depois, a cesta antiga não muda sozinha.
- **Vendedor pode editar quantidade, preço e descrição** na cesta sem mexer no catálogo.
- **Um item da cesta sempre lembra de qual produto veio** (`catalog_product_id`) para relatórios futuros ("quantos Agentes SDR vendemos esse mês").
- A proposta gerada já entra com esses itens — substitui a digitação manual.

## 2. Melhor formato de UI para a "seleção de cesta"

Pensando como senior UX:

**Onde colocar:** dentro da ficha do Deal (CrmDealDetail), uma aba/seção "Cesta" entre "Negociação" e "Proposta". Não é um modal isolado — vendedor precisa ver contexto do cliente enquanto monta.

**Layout em 2 colunas (desktop) / sheet (mobile):**

```text
┌─────────────────────────────────┬──────────────────────┐
│ CATÁLOGO (esquerda 60%)         │ CESTA (direita 40%) │
│ ┌─────────────────────────────┐ │ ┌──────────────────┐ │
│ │ 🔍 buscar  [Tipo▾][Cat▾]    │ │ Agente SDR    [×]│ │
│ ├─────────────────────────────┤ │ qtd 1  R$2.500   │ │
│ │ ▣ Agente SDR    R$2,5k/mês  │ │ ──────────────── │ │
│ │   Qualifica leads 24/7      │ │ Setup IA      [×]│ │
│ │   [+ Adicionar]             │ │ qtd 1  R$1.500   │ │
│ ├─────────────────────────────┤ │ ──────────────── │ │
│ │ ▣ Implantação SaaS  R$5–15k │ │ Subtotal recorr. │ │
│ │   [+ Adicionar]             │ │   R$ 2.500/mês   │ │
│ └─────────────────────────────┘ │ Subtotal único   │ │
│                                 │   R$ 1.500       │ │
│                                 │ [Gerar Proposta] │ │
└─────────────────────────────────┴──────────────────────┘
```

**Padrões de UI:**
- **Cards visuais** (não tabela) na grade do catálogo — imagem/ícone, nome, pitch curto (1 linha), preço formatado, badge do tipo. Tabela é boa para gestão; para "shopping" cards convertem melhor.
- **Botão "+ Adicionar"** com micro-animação (item voa pra cesta) — feedback claro.
- **Cesta sticky** à direita (sheet drawer no mobile, com badge contando itens).
- **Inline edit na cesta**: clicar no preço/qtd permite ajustar sem abrir modal.
- **Agrupamento automático** por tipo de cobrança ("Mensais" / "Únicos") — dá ao vendedor visão de MRR vs ticket único.
- **Sugestões inteligentes** (fase 2): "Clientes que levaram Agente SDR também levam: Setup IA" baseado no histórico.

## 3. Refinamento da tela /catalogo (esta entrega)

A tabela atual é boa para **gestão**, mas o catálogo será consumido visualmente — então adicionar **toggle de visualização Tabela ⇄ Galeria**, default galeria:

- Galeria: cards com nome, pitch, preço grande, tipo badge, categoria. Hover mostra ações (editar/duplicar/arquivar).
- Tabela: como está hoje, para quem prefere densidade.
- Persistir preferência via `usePersistedState`.

Isso já prepara visualmente o componente que será reaproveitado no seletor de cesta.

## 4. Produto seed: "Agente SDR"

Inserir via `supabase--insert` (uma só categoria + um produto), para você ver renderizado:

**Categoria:** "Agentes de IA" (cor cyan)

**Produto Agente SDR:**
- code: PRD-0001 (auto)
- name: Agente SDR
- pitch: *"SDR de IA que qualifica leads 24/7 no WhatsApp e agenda reuniões direto na agenda do time comercial."*
- description: texto longo com escopo (qualificação BANT, integração WhatsApp Cloud API, handoff humano, painel de conversões)
- tags: `["ia", "sdr", "whatsapp", "comercial", "automação"]`
- category: Agentes de IA
- sale_type: `recurring_service`
- price_mode: `suggested`
- price_value: 2500
- billing_unit: `mes`
- default_payment_terms: `mensal`
- default_quantity: 1
- status: `active`
- internal_notes: *"Exige setup inicial separado (PRD-Setup IA). Margem alvo 60%."*

## 5. Escopo desta entrega (em ordem)

1. **Migration**: insert da categoria "Agentes de IA" + produto Agente SDR (via `supabase--migration` para versionar — ou `supabase--insert` se preferir só dados).
2. **CatalogoLista.tsx**: adicionar toggle Tabela/Galeria + componente `ProductGalleryCard.tsx`. Galeria é o default.
3. **Documentar** em comentário no topo do arquivo a intenção da cesta para quando formos integrar com o Deal (próxima fase).

**Fora desta entrega** (próxima conversa, virá com plano próprio):
- Tabela `deal_basket_items` no banco
- Componente `BasketDrawer` na ficha do Deal
- Botão "Adicionar à cesta" que aparece no card quando contexto = Deal
- Geração da Proposta a partir da cesta

## Detalhes técnicos

- Toggle de view: `usePersistedState<"grid"|"table">("catalogo:view","grid")`
- `ProductGalleryCard`: usa `SaleTypeBadge` e `PriceDisplay` já existentes; layout responsivo grid (1 col mobile, 2 tablet, 3-4 desktop) com `gap-3`.
- Seed via migration garante reprodutibilidade entre Test/Live.
- Code `PRD-0001` é gerado automaticamente pelo trigger existente — passamos só os campos de domínio.

## Pergunta antes de implementar

Esta entrega cobre **(a) seed do Agente SDR + (b) galeria visual no /catalogo + (c) documentar a estratégia da cesta**. A construção real da cesta no Deal eu faço numa próxima rodada com plano dedicado, ok? Se preferir já entrar direto na cesta do Deal agora me avise que reescrevo o plano focado nisso.
