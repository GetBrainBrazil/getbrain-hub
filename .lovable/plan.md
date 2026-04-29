# Corrigir fluxo de "Proposta na Mesa" + redesenhar modal

## Problema identificado

No `handleDragEnd` de `src/pages/crm/CrmPipeline.tsx`, a verificação de proposta vinculada só roda **depois** de uma checagem antiga de `estimated_value`. Quando o deal não tinha valor, o sistema abria o modal "Valor obrigatório" (genérico, feio) e nunca chegava na lógica nova de criar proposta — exatamente o que aconteceu no print.

Ordem atual (errada):
```text
perdido? → valor obrigatório? → ganho? → tem proposta?
```

Além disso, o modal "Criar proposta para este deal?" hoje é um `Dialog` minimalista, sem ícone, sem contexto visual do deal nem do valor, e sem captura do valor estimado quando ele não existe.

## Solução

### 1. Unificar o gating do estágio "proposta_na_mesa"

Substituir as duas checagens separadas (linhas 174 e 176-187) por **uma única ramificação** que:

1. Busca em paralelo (`Promise.all`) a contagem de propostas ativas vinculadas ao deal.
2. Decide o que abrir:
   - Sem proposta → abre o **novo modal "Criar proposta"** (que também coleta `estimated_value` se faltar).
   - Com proposta mas sem valor → abre o modal "Valor obrigatório" (mantido, mas redesenhado).
   - Com proposta e com valor → move direto.

Remover o modal `valueRequired` antigo do JSX e os estados `valueRequired` / `requiredValue` se não forem mais necessários (o novo modal cobre os dois casos).

### 2. Redesenhar o modal "Criar proposta para este deal"

Novo componente `src/components/crm/CreateProposalForStageDialog.tsx` com:

- **Header visual**: ícone `FileText` num círculo `bg-accent/10 text-accent`, título e descrição clara.
- **Card de contexto do deal**: nome da empresa, código do deal, estágio atual → "Proposta na Mesa" (com seta), todos com tipografia hierarquizada.
- **Campo de valor estimado** (só aparece quando `deal.estimated_value` está vazio):
  - Label "Valor estimado do orçamento (R$)"
  - Input numérico com prefixo "R$" e formatação BRL.
  - Texto auxiliar: "Esse valor pode ser ajustado depois na proposta."
- **Aviso informativo**: bloco `bg-muted/40 border-l-2 border-accent` explicando "Vamos criar um rascunho e te levar direto para a edição da proposta."
- **Footer**:
  - "Cancelar" (outline)
  - "Criar e abrir proposta" (botão primário com ícone `ArrowRight`, loading state "Criando…")
- **Acessibilidade/UX**: foco automático no input quando ele aparece; `Enter` confirma; bloqueio de fechamento durante `creatingProposal`.

### 3. Ajustar `handleCreateProposalForDeal`

Aceitar um `estimatedValue?: number` opcional. Quando informado, antes de chamar `createDraftProposal` faz `update` no deal setando `estimated_value`. Depois cria a proposta, faz commit do estágio, invalida caches e navega.

### 4. Padronizar o modal "Valor obrigatório" (caso ainda exista)

Se decidirmos manter para o cenário "tem proposta mas não tem valor", aplicar o mesmo estilo (ícone, descrição, prefixo R$, helper text). Mas o caminho mais limpo é **remover** esse modal — o cenário fica coberto pelo novo, e quando há proposta o valor já costuma estar nela.

## Arquivos afetados

- `src/pages/crm/CrmPipeline.tsx` — reordenar `handleDragEnd`, remover modal antigo, plugar novo componente.
- `src/components/crm/CreateProposalForStageDialog.tsx` — **novo** modal redesenhado.

## Resultado esperado

- Arrastar um deal sem proposta para "Proposta na Mesa" sempre abre o **novo modal bonito**, mesmo quando o deal não tem valor estimado.
- O usuário informa o valor (se necessário) e clica em "Criar e abrir proposta" — é levado direto para `/financeiro/orcamentos/:id/editar` com tudo pré-preenchido.
- Modal antigo "Valor obrigatório" some do fluxo de "Proposta na Mesa".
