# Plano — "Hub Comercial" dentro do card do deal

## Visão geral

Hoje o detalhe do deal (`/crm/deals/:code`) é um scroll vertical com 5 zonas (Cliente, Dor, Solução, Dependências, Comercial). Você quer poder controlar **proposta**, **organograma** e **mockup beta** sem sair desse card.

Solução: reorganizar o detalhe em **abas** e criar uma aba nova chamada **"Proposta & Anexos"** que vira o hub comercial completo do deal. Faseado em 3 prompts.

A rota `/financeiro/orcamentos/:id/editar` continua viva (quem entra pelo módulo financeiro não perde fluxo). É o **mesmo conteúdo, dois pontos de entrada**.

---

## Fase 1 — Abas + Proposta embutida (este loop)

### O que muda na navegação do deal

Substitui o scroll vertical atual por 2 abas no topo do card (logo abaixo do `DealHeader`):

```text
┌─────────────────────────────────────────────────┐
│ DEAL-004 — Sistema X — Empresa Y          [Won]│  ← DealHeader (fica)
├─────────────────────────────────────────────────┤
│ [ Descoberta ]  [ Proposta & Anexos ]          │  ← Tabs novas
├─────────────────────────────────────────────────┤
│                                                 │
│  conteúdo da aba ativa                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Aba "Descoberta"**: Cliente + Dor + Solução + Dependências + Comercial (as 5 zonas que existem hoje, intactas). Default ao abrir.
- **Aba "Proposta & Anexos"**: hub novo (descrito abaixo).

Sidebar direita (`DealSidebarRich`) fica visível em ambas as abas.

Persistência: aba ativa salva via `usePersistedState` (regra do projeto) + querystring `?tab=proposta` pra deep link.

### Conteúdo da aba "Proposta & Anexos" (Fase 1)

Estrutura em 3 blocos verticais:

**Bloco 1 — Proposta comercial ativa**

- Se **não existe** proposta: card vazio com botão grande "Criar proposta deste deal" (gera proposta `rascunho` puxando empresa, deal_id e abre o editor inline embaixo).
- Se **existe** proposta(s): mostra a mais recente expandida + lista colapsável das anteriores (versões).

A proposta ativa renderiza **inline** (não redireciona) com:
- Header: código, status badge, valor total calculado, validade, botões `Enviar` / `Aceitar` / `Rejeitar` / `Baixar PDF` / `Gerar PDF`.
- Editor de escopo (`ScopeItemsEditor` que já existe) com autosave on blur.
- Campo manutenção mensal (já existe).
- Considerações (já existe).

Reusa **100% dos componentes existentes** de `src/components/orcamentos/` (ScopeItemsEditor, ConsiderationsEditor, OrcamentoStatusBadge, useGeneratePDF, useUpdateProposal). Não duplica lógica.

**Bloco 2 — Organograma do cliente** (placeholder na Fase 1)

Card com mensagem: "Organograma chega na Fase 2. Por enquanto, suba o PNG do Draw.io aqui:" + um único upload de imagem que salva em `deal.organograma_url` (campo novo). Já resolve 80% do uso.

**Bloco 3 — Mockup BETA** (placeholder na Fase 1)

Card com 2 campos:
- Link do Lovable preview (URL).
- Galeria de prints (upload múltiplo de PNG).

Salvos em `deal.mockup_url` + `deal.mockup_screenshots[]` (campos novos).

### Mudanças técnicas (Fase 1)

**Schema (migration):**
```sql
ALTER TABLE deals ADD COLUMN organograma_url text;
ALTER TABLE deals ADD COLUMN mockup_url text;
ALTER TABLE deals ADD COLUMN mockup_screenshots text[] DEFAULT '{}';
-- bucket de storage 'deal-attachments' (private, RLS por organization_id)
```

**Componentes novos:**
- `src/components/crm/DealTabs.tsx` — wrapper com Tabs (Descoberta / Proposta).
- `src/components/crm/proposta/PropostaTabContent.tsx` — orquestra os 3 blocos.
- `src/components/crm/proposta/PropostaInlineEditor.tsx` — editor de proposta inline (extrai lógica de `OrcamentoEditarDetalhe.tsx` num componente reusável; ambos passam a usar).
- `src/components/crm/proposta/AnexoUploader.tsx` — upload genérico pro storage.

**Refatoração:**
- `src/pages/crm/CrmDealDetail.tsx` passa o conteúdo das 5 zonas pra um componente `DescobertaTabContent.tsx` e renderiza o `DealTabs`.
- `src/pages/financeiro/OrcamentoEditarDetalhe.tsx` passa a renderizar `PropostaInlineEditor` (mesma UI dos dois lados).

**Sem mudanças em:**
- `DealHeader`, `DealSidebarRich`, hooks de CRM existentes, fluxo de close_deal_as_won, módulo `/financeiro/orcamentos` (lista).

### Validação Fase 1

Antes de declarar pronto:
1. Abrir DEAL-004 → vê aba "Descoberta" ativa com as 5 zonas iguais ao que era antes.
2. Clicar "Proposta & Anexos" → vê estado vazio.
3. Criar proposta → editor abre inline, edita escopo, valor recalcula.
4. Refresh da página com `?tab=proposta` → cai direto na aba.
5. Abrir mesma proposta por `/financeiro/orcamentos/:id/editar` → mesma UI, edita do mesmo jeito.
6. Subir PNG no organograma → aparece. Mockup link/screenshots → idem.
7. Mobile (375px): tabs viram bottom-sheet ou scroll horizontal, blocos empilham.

---

## Fase 2 — Organograma estruturado (próximo prompt)

Decisão **adiada** pra depois de você sentir o uso real do upload simples na Fase 1. Quando voltar, escolho entre:
- Manter só upload de PNG do Draw.io (se atender).
- Tabela enriquecida de contatos (papel na decisão, influência 1-5, relação).
- Embed de Draw.io (se eles tiverem viewer público) ou geração via mermaid a partir da tabela.

Não compro essa decisão agora porque ela depende de quanto a galera **vai usar de verdade** o organograma no fluxo de vendas.

---

## Fase 3 — Mockup BETA estruturado (próximo prompt)

Mesma lógica. Fase 1 já entrega link Lovable + galeria. Se for suficiente, encerra. Se quiser estruturar telas (nome + propósito + screenshot) ou checklist de funcionalidades pra mostrar pro cliente, vira prompt próprio.

---

## Detalhes técnicos consolidados (Fase 1)

| Item | Decisão |
|---|---|
| Tabs | `Tabs` do shadcn, persistido por `usePersistedState` + querystring |
| Proposta inline | Mesmo componente em 2 rotas (CRM e Financeiro) |
| Storage | Bucket `deal-attachments`, private, RLS por `organization_id` |
| Auto-save | On blur (regra do projeto, igual descoberta) |
| Audit | Já existe trigger em `proposals` e `deals` — nada a fazer |
| Soft delete | Proposta usa `deleted_at` (já existe) |
| Mobile | Tabs scroll-x, blocos full-width empilhados |
| Sem mock data | Tudo vem do banco real; estados vazios são empty states de verdade |

---

## O que NÃO está no escopo da Fase 1

- Editor visual de organograma (drag-and-drop nós/edges).
- Editor visual de mockup/wireframe.
- Embed live do Lovable preview (vai ser link clicável + thumbnail).
- Versionamento de organograma/mockup (só substitui).
- Comparar versões de proposta lado-a-lado (já existe `useProposalVersions`, basta listar; comparação visual fica pra depois se precisar).
- Mover ou esconder a rota `/financeiro/orcamentos` (continua igual).

---

## Entrega Fase 1

- Migration SQL (3 colunas + bucket de storage com RLS).
- 4 componentes novos + 2 refatorados.
- Tipos TS regenerados.
- Resumo no chat: queries de validação rodadas, screenshots das 2 abas em desktop e mobile, dívidas técnicas registradas.
- Aguarda seu OK antes de começar Fase 2.