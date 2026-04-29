## Objetivo

Na zona "Solução & Escopo" do CRM Deal Detail (`/crm/deals/:code`):
- Renomear **"Resumo do escopo"** → **"Escopo"** (campo de texto livre, onde o usuário escreve tudo).
- Remover os campos **Escopo IN** e **Escopo OUT**.
- Adicionar abaixo um bloco **"Resumo Escopo"** em **bullet points editáveis (CRUD)**.
- Adicionar botão **"Organizar com IA"** que lê o texto livre de "Escopo" e gera bullets curtos (≈1 linha por etapa) no "Resumo Escopo".
- Permitir adicionar bullets manualmente também.

## O que vai mudar

### 1. Banco (migration)
- Adicionar coluna `scope_bullets jsonb DEFAULT '[]'::jsonb` na tabela `deals` (lista de strings).
- Manter `scope_in` / `scope_out` na tabela por compatibilidade (RPCs `close_deal_as_won` referenciam), mas a UI deixa de usar/editar.
- Atualizar `src/lib/audit/formatters.ts` com label para `scope_bullets` ("Resumo do escopo (bullets)").

### 2. Edge Function — `organize-scope`
Nova function em `supabase/functions/organize-scope/index.ts`:
- Recebe `{ scope_text: string }`.
- Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) via tool calling para garantir saída estruturada `{ bullets: string[] }`.
- Prompt do sistema (pt-BR): "Você organiza descrições de escopo em bullets curtos. **Cada bullet deve ter no máximo uma linha** resumindo uma etapa/entrega. Use mais de uma linha apenas se for absolutamente necessário. Não invente itens que não estejam no texto. Responda em português."
- Trata 429 (rate-limit) e 402 (créditos) devolvendo mensagem amigável.
- `verify_jwt = true` (padrão; usuário autenticado).

### 3. UI — `src/pages/crm/CrmDealDetail.tsx`
Substituir o bloco atual (linhas ~310-342):

```text
[ Escopo ] (textarea grande, multiline)
                                    [ ✨ Organizar com IA ]

[ Resumo Escopo ]
 • bullet 1                            [✏️] [🗑️]
 • bullet 2                            [✏️] [🗑️]
 [+ Adicionar manualmente]
```

- Campo "Escopo" continua salvando em `deal.scope_summary` (mantém histórico de auditoria).
- Botão "Organizar com IA" (ícone Sparkles, variant outline):
  - Desabilitado se `scope_summary` < 20 chars.
  - Estado `loading` com spinner enquanto a edge function responde.
  - Se já existirem bullets, abre `useConfirm()` perguntando "Substituir os bullets existentes?" (Substituir / Mesclar / Cancelar).
  - Em sucesso: faz `save({ scope_bullets: novosBullets })` e mostra toast de sucesso.
  - Em erro 402/429: toast com mensagem específica.

### 4. Componente — `ScopeBulletsEditor`
Novo `src/components/crm/ScopeBulletsEditor.tsx`, reaproveitando o padrão do já existente `StringListEditor` (CRUD de lista de strings: add, edit inline, remove, reordenar opcional). Estilo consistente com os outros blocos da zona.

### 5. Tipos
- `src/types/crm.ts`: adicionar `scope_bullets: string[] | null` ao tipo `Deal`.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration.

### 6. computeCompleteness
Atualizar `computeCompleteness` (linha 441) para aceitar bullets como sinal de "solução pronta":
```text
solucaoOk = project_type_v2 preenchido
         && (scope_summary >= 40 chars OU scope_bullets.length >= 3)
         && (deliverables >= 3 OU acceptance_criteria >= 3)
```

### 7. Cache invalidation
Após mutações, chamar `invalidateCrmCaches` (já em uso pelo `useDealAutosave`).

## Fora de escopo
- Não alterar `AbaEscopo.tsx` de Projetos (mantém `scope_in`/`scope_out` lá; usuário pediu mudança no CRM, conforme screenshot).
- Não remover colunas `scope_in`/`scope_out` do banco (RPCs dependem; remoção pode vir depois).

## Arquivos
- **Novo**: `supabase/migrations/<timestamp>_deal_scope_bullets.sql`
- **Nova edge function**: `supabase/functions/organize-scope/index.ts`
- **Novo componente**: `src/components/crm/ScopeBulletsEditor.tsx`
- **Editar**: `src/pages/crm/CrmDealDetail.tsx`, `src/types/crm.ts`, `src/lib/audit/formatters.ts`
