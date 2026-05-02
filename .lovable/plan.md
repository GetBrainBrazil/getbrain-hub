## Objetivo

Adicionar um botão **"Gerar com IA"** no card **"Módulos inclusos"** (TabEscopo) que, com um clique, gera uma descrição curta e prática para cada módulo da lista — usando o contexto do escopo do CRM (deal vinculado) + o título do módulo.

## Como vai funcionar (UX)

No header do card "Módulos inclusos", ao lado do toggle "Exibir valor por módulo", aparece um novo botão `Sparkles · Gerar descrições com IA`.

- **Sem módulos na lista:** botão desabilitado, tooltip "Adicione módulos primeiro".
- **Sem deal vinculado:** habilitado, mas avisa no modal de confirmação que vai gerar de forma genérica.
- **Ao clicar:** modal de confirmação mostrando:
  - Quantidade de módulos que serão processados.
  - Custo estimado (preço por item × N).
  - Aviso "Vai sobrescrever descrições existentes" + checkbox "Pular módulos que já têm descrição" (default: marcado, mais seguro).
- **Ao confirmar:** chama a edge function uma única vez (modo batch), recebe uma descrição por módulo, atualiza `state.scopeItems[i].description` para cada item, autosave dispara normalmente.
- **Loading:** botão vira `Loader2 · Claude está escrevendo… (3/7)` com contador.
- **Sucesso:** toast "7 descrições geradas. Revise antes de enviar." Itens ficam expandidos automaticamente para o usuário ver o que foi escrito.
- **Falha parcial:** se algum item der erro, gera os demais e mostra toast "5 de 7 descrições geradas. 2 falharam — tente novamente."

## Arquitetura técnica

### 1. Edge function `generate-proposal-content` — novo modo `item_descriptions_batch`

Adicionar um novo `generation_type`:
- `item_descriptions_batch` — gera descrição de **todos** os módulos do escopo de uma vez, em uma única chamada ao gateway.
- Recebe opcional `item_indices?: number[]` no body para gerar só de alguns (usado quando "pular existentes" está marcado).
- Recebe opcional `scope_titles: string[]` no body — porque os módulos do escopo (`state.scopeItems`) vivem no campo `proposals.scope_items` (JSON), **não** em `proposal_items`. Isso é importante: a função hoje lê `proposal_items` (tabela), mas os módulos exibidos no editor são `scope_items` no JSON.
- Prompt instrui retornar JSON: `{ "descriptions": [{ "index": 0, "text": "..." }, ...] }`.
- Cada descrição: 2-3 frases, prática, sem inventar funcionalidade, baseada em `deal.scope_summary`, `deal.deliverables`, `deal.business_context` e `deal.pain_description`.
- Aplica os mesmos filtros de output (`filterAiOutput`) por descrição.
- Persiste **uma** linha em `proposal_ai_generations` agregando custo total.
- Retorna `{ content: { descriptions: [{index, text}] }, was_filtered, ... }`.

### 2. `src/lib/orcamentos/generateContent.ts`

Adicionar tipo e helper:
```ts
export type GenerationType = ... | "item_descriptions_batch";

export async function generateItemDescriptionsBatch(params: {
  proposalId: string;
  scopeTitles: string[];
  itemIndices?: number[];
}): Promise<{ descriptions: Array<{index: number; text: string}>; was_filtered: boolean; filter_reasons: string[]; }>
```
Atualizar `estimateGenerationCostBrl` para aceitar `(type, itemCount?)` retornando `~R$ 0.03 × N` para o batch.

### 3. Novo componente `GerarDescricoesIaButton.tsx`

Em `src/components/orcamentos/`, recebe:
- `proposalId`
- `items: ScopeItem[]`
- `hasDealLink: boolean`
- `onDescriptionsGenerated(updatedItems: ScopeItem[])`

Renderiza o botão + Dialog de confirmação + estado de loading. Reusa o visual do `GerarComIaDropdown` existente para consistência.

### 4. `TabEscopo.tsx` — integração

- Importa `GerarDescricoesIaButton`.
- Recebe novas props já disponíveis no editor state: `proposalId` e `dealClientLink` (para saber se há deal vinculado).
- Renderiza o botão no header do card "Módulos inclusos", à esquerda do toggle de valor.
- Callback `onDescriptionsGenerated` chama `setItems(novaLista)` — mesmo fluxo de autosave que já existe.

### 5. `OrcamentoEditarDetalhe.tsx` — passar props

Já passa `state` para TabEscopo; só adicionar `proposalId={proposalId}` e `hasDealLink={Boolean(state.dealClientLink)}` ao componente.

### 6. Audit log

A própria edge function já registra em `audit_logs` com `action: "ai_content_generated"` e `metadata.generation_type`. Sem mudanças extras.

## Fora do escopo

- Não toca em `proposal_items` (tabela legada usada pelo PDF antigo).
- Não muda o dropdown `GerarComIaDropdown` existente (continua para conteúdos textuais como resumo executivo).
- Sem regenerar descrições item-a-item via UI (batch resolve o caso real). O endpoint singular `item_description` continua funcionando como está.

## Arquivos afetados

- `supabase/functions/generate-proposal-content/index.ts` (edita)
- `src/lib/orcamentos/generateContent.ts` (edita)
- `src/components/orcamentos/GerarDescricoesIaButton.tsx` (novo)
- `src/components/orcamentos/page/tabs/TabEscopo.tsx` (edita)
- `src/pages/financeiro/OrcamentoEditarDetalhe.tsx` (edita — passar props)
