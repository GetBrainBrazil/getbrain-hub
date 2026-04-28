## Problema

1. Ao marcar um contato como **principal**, há atraso visível porque o `useUpdateDealField` invalida cache só no `onSettled` (espera o round-trip do banco) — não há optimistic update.
2. Não existe forma de **desmarcar** o contato principal: a estrela só "ativa" e o botão "Definir como principal" no form some quando já está principal.
3. O ícone de estrela no card já é renderizado como label visual (não-clicável após a refatoração para "card clicável"), então o usuário não tem alvo direto.

## Solução

### A. Resposta instantânea (`src/hooks/crm/useCrmDetails.ts`)
Adicionar **optimistic update** ao `useUpdateDealField` (mesmo padrão já aplicado em `useUpdateCompanyField`):
- `onMutate`: cancela queries do deal, salva snapshot anterior, aplica `{...previous, ...updates}` na cache imediatamente.
- `onError`: rollback para o snapshot.
- `onSettled`: mantém invalidação atual.

Resultado: a estrela "Principal" muda instantaneamente ao clicar.

### B. Toggle do principal (`src/components/shared/CompanyContactsPanel.tsx`)
1. **`handleTogglePrimary`**: se o contato já é o principal e está em modo CRM (`onMakePrimary` definido), chamar `onMakePrimary(null as any)` para limpar. Ajustar tipo de `onMakePrimary` para aceitar `string | null`.
2. **No form de edição** (rodapé): quando `isAlreadyPrimary` for `true`, mostrar botão "**Remover como principal**" (ícone `StarOff`) em vez de esconder. Continua chamando `onMakePrimary` — o consumidor decide entre setar/limpar via `isAlreadyPrimary`.
3. **Card colapsado**: tornar o badge "Principal" clicável (com `e.stopPropagation()`) para alternar direto sem precisar abrir o form. Adicionar `title="Clique para remover como principal"` e cursor pointer.

### C. Consumer no CRM (`src/components/crm/ZoneCliente.tsx` + `CompanyContactsManager.tsx`)
- Mudar assinatura de `onMakePrimary` para `(personId: string | null) => void`.
- Em `setPrimaryContact`: salva `contact_person_id: personId` (passa `null` para limpar).

## Arquivos editados

- `src/hooks/crm/useCrmDetails.ts` — optimistic update no `useUpdateDealField`.
- `src/components/shared/CompanyContactsPanel.tsx` — toggle do principal (handler, botão "Remover como principal" no form, badge clicável no card).
- `src/components/crm/CompanyContactsManager.tsx` — propaga novo tipo `string | null`.
- `src/components/crm/ZoneCliente.tsx` — `setPrimaryContact` aceita `null`.

## Não escopo

- Não mexo no fluxo de "principal" no módulo de Projetos (lá é `is_primary_contact` na tabela `company_people`, comportamento diferente — usuário só reclamou do CRM).
- Não mudo o ícone de estrela visual do card além de torná-lo um botão de toggle.
