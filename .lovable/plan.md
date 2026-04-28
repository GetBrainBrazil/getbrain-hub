# Eliminar delay ao selecionar campos de relacionamento

## Causa raiz

Os hooks de update (`useUpdateDealField`, `useUpdateLeadField`, `useUpdateCompanyField`) já fazem **optimistic update** — mas só sobre os IDs (`owner_actor_id`, `company_id`, `contact_person_id`).

O `<SelectValue>` da sidebar mostra `deal.owner.display_name` (objeto hidratado via join), e esse objeto **não** é atualizado no `onMutate`. Resultado: o ID muda na hora, mas o nome/avatar exibido só troca depois que o `invalidateQueries` rebusca a query inteira do servidor (~300-800ms). Esse é o "delay" que o usuário sente em vários selects do sistema.

Mesma raiz se aplica a:

- **Owner / Responsável** (`owner_actor_id` → `owner`)
- **Empresa** do deal/lead (`company_id` → `company`)
- **Contato principal** (`contact_person_id` → `contact`)
- **Lead**: owner, company, contact (mesmo padrão em `useUpdateLeadField`)
- **Company detail**: setor (`sector_id`)

## O que muda

### 1. Hidratar objetos relacionados no `onMutate`

Reescrever o `onMutate` dos três hooks (`useUpdateDealField`, `useUpdateLeadField`, `useUpdateCompanyField`) para que, quando o update mexer num campo de relacionamento, o objeto correspondente também seja atualizado na cache lendo de outras queries já carregadas (actors, companies, people).

Exemplo da lógica (Deal):
```ts
onMutate: async ({ updates }) => {
  const key = ['crm-deal-code', code];
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<Deal>(key);
  if (!previous) return { previous };

  const patch: Partial<Deal> = { ...updates };

  if ('owner_actor_id' in updates) {
    const actors = qc.getQueryData<CrmActor[]>(['crm-actors']) ?? [];
    patch.owner = updates.owner_actor_id
      ? actors.find(a => a.id === updates.owner_actor_id) ?? null
      : null;
  }
  if ('company_id' in updates) {
    // mesma ideia lendo de ['crm-companies-full']
  }
  if ('contact_person_id' in updates) {
    // lendo de ['crm-company-contacts', previous.company_id]
  }

  qc.setQueryData<Deal>(key, { ...previous, ...patch });
  return { previous };
},
```

Repetir o padrão em `useUpdateLeadField` (que hoje **nem tem optimistic update**) e `useUpdateCompanyField`.

### 2. Adicionar optimistic update ao `useUpdateLeadField`

Hoje só tem `onSettled` → todos os campos do lead têm delay. Adicionar `onMutate` + `onError` no mesmo padrão do `useUpdateDealField`, com hidratação dos relacionamentos.

### 3. Atualizar caches de listagem na hora também

No `onMutate` do deal, também aplicar o patch nas listagens em cache (`['crm-deals']`, `['crm-deals-pipeline']`) usando `setQueriesData` com matcher por `queryKey`, para que o pipeline/kanban também responda na hora — não só a tela de detalhe.

### 4. Reduzir refetch desnecessário

No `onSettled`, manter apenas `invalidateQueries` para a query principal e listagens; remover invalidações de queries grandes (metrics, audit) quando o campo alterado não as afeta. Hoje qualquer update do deal invalida `['crm-metrics']` e força refetch — o que contribui pra sensação de "trava".

## Arquivos afetados

- `src/hooks/crm/useCrmDetails.ts` — reescrita dos 3 hooks de update.

## Detalhes técnicos

- Usar `qc.getQueryData` para ler caches sem disparar refetch.
- Usar `qc.setQueriesData({ queryKey: ['crm-deals'] }, fn)` para alcançar todas as variantes de listagem.
- Garantir que `previous` seja restaurado em `onError` para todas as caches modificadas.
- Não tocar nas RLS nem na lógica de servidor — mudança puramente client-side.
- Tipos: usar `Partial<Deal>` / `Partial<Lead>` / `Partial<CompanyDetail>` como hoje; o patch de relacionamento expande para o objeto completo (`owner`, `company`, `contact`).

## Fora do escopo

- Selects de outras áreas do sistema (financeiro, projetos) — se você confirmar que sente o mesmo delay lá, podemos aplicar o mesmo padrão num próximo passo. Esta tarefa foca no CRM (deal, lead, company), que é onde os campos de "responsável" e relacionamentos vivem.
