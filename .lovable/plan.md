## Pessoas de Contato no Projeto

Adicionar gestão de pessoas de contato do cliente direto na Visão Geral do projeto, reaproveitando o modelo já existente do CRM (`people` + `company_people`).

### Onde colocar

Novo **card "Pessoas de contato"** na Visão Geral do projeto, posicionado na coluna principal logo abaixo do card "Cliente" / "Informações", acima de "Financeiro". É o local mais natural porque os contatos pertencem à empresa-cliente vinculada ao projeto.

Adicionalmente, na **sidebar direita** (Propriedades), abaixo da linha "Cliente", mostrar o contato principal de forma compacta (nome + cargo, com tooltip exibindo email/telefone) para acesso rápido.

### Como vai funcionar

O card lista as pessoas vinculadas à `company_id` do projeto via `company_people`. Cada linha mostra avatar/inicial, nome, cargo, email e telefone, com badge "Principal" para o `is_primary_contact`.

Ações no card:
- **Adicionar contato**: formulário inline (sem modal) com Nome, Cargo, Email, Telefone — cria em `people` + vincula em `company_people` para a empresa do projeto.
- **Editar**: clicar em qualquer campo da linha entra em modo edição inline (mesmo padrão dos outros cards da página).
- **Marcar como principal**: estrela/toggle que atualiza `is_primary_contact` (desmarca os demais da mesma empresa).
- **Remover do projeto/empresa**: remove o vínculo `company_people` (soft via `ended_at`); a pessoa continua existindo no CRM.

Máscaras automáticas: telefone BR `(11) 99999-9999` e validação de email com zod.

### Integração cross-módulo

Como `people` e `company_people` são as MESMAS tabelas usadas pelo CRM (Leads, Deals), qualquer contato cadastrado aqui:
- Aparece automaticamente nos seletores de contato do CRM (`NewLeadDialog`, `NewDealDialog`, `usePeopleByCompany`).
- Aparece na página de detalhe da empresa (`CrmCompanyDetail`).
- Reciprocamente, contatos cadastrados pelo CRM já aparecem aqui.

Não há duplicação de dados — é uma única fonte de verdade por empresa.

### Detalhes técnicos

**Sem migração de banco** — tabelas `people` e `company_people` já existem com RLS adequada.

**Novo hook** `src/hooks/projetos/useProjectContacts.ts`:
- `useProjectContacts(companyId)`: lista pessoas via join `company_people` → `people` (reusa lógica de `useCrmReference.usePeopleByCompany` mas retorna também `is_primary_contact` e `role`).
- `useUpsertContact()`: cria/atualiza pessoa + vínculo.
- `useSetPrimaryContact()`: transação que zera primários da empresa e marca o escolhido.
- `useUnlinkContact()`: seta `ended_at = today` em `company_people`.

**Novo componente** `src/components/projetos/CardContatos.tsx` consumido por `ProjetoDetalhe.tsx`. Segue o padrão visual dos cards existentes (`CardBlock`, `PropRow`).

**Sidebar**: adicionar `SidebarRow label="Contato principal"` em `ProjetoDetalhe.tsx` linha ~2145, consumindo o mesmo hook.

**Arquivos alterados**:
- novo `src/hooks/projetos/useProjectContacts.ts`
- novo `src/components/projetos/CardContatos.tsx`
- editar `src/pages/ProjetoDetalhe.tsx` (inserir card + linha sidebar)
- editar `src/lib/formatters.ts` (helper `formatPhoneBR` se ainda não existir)

**Auditoria**: cada criação/edição/remoção registra em `audit_logs` com `entity_type = 'person'` ou `'company_people'`, seguindo o padrão já usado para contratos.
