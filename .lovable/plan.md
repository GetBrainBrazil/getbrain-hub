Vou substituir o passo "Resumo Escopo" pela geração estruturada de TODOS os campos abaixo, usando um agente IA mais robusto.

## O que muda na UI (`src/pages/crm/CrmDealDetail.tsx`)

- Remover o campo **Resumo Escopo** (`StringListEditor` ligado a `scope_bullets`).
- Manter o campo **Escopo** (`scope_summary`) e o botão **Organizar com IA**.
- Ao clicar em **Organizar com IA**, o agente preenche em uma única chamada:
  - **Entregáveis** (`deliverables`)
  - **Premissas** (`premises`)
  - **Critérios de aceite** (`acceptance_criteria`, em formato `AcceptanceCriterion[]`)
  - **Riscos identificados** (`identified_risks`)
  - **Stack técnico previsto** (`technical_stack`)
- Antes de aplicar, se algum desses campos já tiver itens, abrir um `useConfirm` com escolha:
  - **Substituir tudo** — sobrescreve só os campos não vazios devolvidos pela IA.
  - **Mesclar** — adiciona itens novos (deduplicando por texto normalizado) ao final dos existentes.
  - **Cancelar**.
- Mostrar `toast` de sucesso resumindo quantos itens foram adicionados em cada seção.
- Atualizar `computeCompleteness` para não depender mais de `scope_bullets`.

## O que muda no agente (`supabase/functions/organize-scope/index.ts`)

- Renomear conceitualmente para um agente "Arquiteto de Escopo" e trocar o modelo para um mais forte:
  - **Modelo**: `google/gemini-2.5-pro` (top-tier em raciocínio + contexto longo, ideal para extrair entregáveis, riscos e stack técnico de descrições reais).
- Novo system prompt em PT-BR, com persona de arquiteto de soluções sênior, regras anti-alucinação, formato compacto (uma linha por item) e instruções específicas por seção (ex.: critérios de aceite no formato "Dado/Quando/Então" curto; risco com causa+impacto enxutos; stack só de tecnologias mencionadas ou óbvias pelo contexto).
- Receber também o **contexto do deal** para enriquecer (sem inventar): `business_context`, `pain_description`, `pain_categories`, `project_type` — passados como contexto somente leitura.
- **Tool calling estruturado** com schema único `set_full_scope`:
  ```text
  {
    deliverables:  string[],
    premises:      string[],
    acceptance_criteria: { text: string }[],
    identified_risks:    string[],
    technical_stack:     string[]
  }
  ```
- Validação no servidor: trim, dedup, limites (máx ~12 itens por seção, máx 240 chars cada).
- Para `acceptance_criteria`, o servidor adiciona `id` (uuid), `checked: false`, `checked_at: null`, `checked_by: null` para casar com `AcceptanceCriterion`.
- Manter tratamento dos erros 402/429 e CORS atuais.
- Resposta:
  ```text
  { deliverables, premises, acceptance_criteria, identified_risks, technical_stack }
  ```

## Detalhe técnico do merge na UI

```ts
function dedupAppend(existing: string[], incoming: string[]) {
  const norm = (s: string) => s.trim().toLowerCase();
  const seen = new Set(existing.map(norm));
  return [...existing, ...incoming.filter(i => i && !seen.has(norm(i)))];
}
```

Para `acceptance_criteria`, o dedup compara pelo `text` normalizado.

## Itens não alterados

- Coluna `scope_bullets` permanece no banco para compatibilidade histórica (nada a migrar). Apenas deixa de ser editada/exibida.
- Demais zonas, salvamento autosave, layout e responsividade ficam iguais.

Sem mudanças de schema. Sem novas dependências.