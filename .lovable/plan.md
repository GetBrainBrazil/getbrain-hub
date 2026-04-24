## Objetivo

No card "Informações do Projeto" da tela de detalhe (`/projetos/:id`), o campo **Cliente** hoje é apenas leitura. Vou torná-lo editável dentro do mesmo modo "Editar" do bloco, permitindo:

1. Trocar o cliente por outra empresa já cadastrada (busca por nome).
2. Criar uma nova empresa diretamente no formulário, sem sair da tela.

## Comportamento

Ao clicar em **Editar** no bloco "Informações do Projeto":

- O campo Cliente vira um **combobox com busca** (lista de `companies`, ordenadas, filtradas conforme o usuário digita).
- Mostra `trade_name || legal_name`. Item atualmente selecionado fica destacado.
- Logo abaixo do combobox aparece um botão pequeno **"+ Nova empresa"**.
- Ao clicar em "+ Nova empresa", abre um mini-form inline (mesmo padrão do `NewLeadDialog`):
  - Campos: **Nome da empresa** (obrigatório), CNPJ, Indústria, Website.
  - Botão **Criar empresa** insere em `companies` com `company_type='cliente'`, `status='active'`, `relationship_status='cliente'`, `organization_id=getbrain_org_id()`.
  - Após criar, a nova empresa é automaticamente selecionada no combobox e o mini-form fecha.
- Ao clicar **Salvar** no bloco, o `patchProject` passa a incluir `company_id` quando alterado, e o estado local de `company` é atualizado para refletir o novo cliente sem reload de página (mantendo o padrão otimista já em vigor).
- Ao clicar **Cancelar**, o draft do company_id e o mini-form de criação são resetados.

Fora do modo edição, a exibição do Cliente continua igual (ícone Building2 + nome). Nada muda no header, sidebar ou demais blocos.

## Implementação técnica

Arquivo único: `src/pages/ProjetoDetalhe.tsx`.

1. **Estado novo**:
   - `draftCompanyId: string` (sincronizado em `syncDrafts` a partir de `project.company_id`).
   - `companies: Array<{id, legal_name, trade_name}>` carregado uma vez (no `load()` ou em `useEffect` separado, ordenado por nome).
   - `companyQuery: string` para o filtro do combobox.
   - `newCompanyOpen: boolean` e `newCompanyForm: { legal_name, cnpj, industry, website }`.

2. **UI no `PropRow label="Cliente"`** (linhas 1093-1098): condicional em `editing === "info"`:
   - Modo leitura: como hoje.
   - Modo edição: usar `Popover` + `Command` (cmdk, já instalado via shadcn — verificar `src/components/ui/command.tsx`) ou um `Select` com `Input` de busca. Preferência por `Popover`+`Command` (padrão combobox shadcn) para suportar busca de muitas empresas. Botão "+ Nova empresa" abaixo, e mini-form colapsável.

3. **`patchProject`**: incluir `company_id: draftCompanyId` no payload `update`. Após sucesso, atualizar `setCompany` localmente (buscando da lista `companies` em memória pelo id, evitando ida ao banco).

4. **Criação de empresa**: função `async function createCompany()`:
   ```ts
   const { data, error } = await supabase
     .from("companies")
     .insert({
       legal_name: form.legal_name.trim(),
       trade_name: null,
       cnpj: form.cnpj || null,
       industry: form.industry || null,
       website: form.website || null,
       company_type: "cliente",
       status: "active",
       relationship_status: "cliente",
       organization_id: <getbrain_org_id via RPC ou constante>,
     })
     .select("id, legal_name, trade_name")
     .single();
   ```
   Em sucesso: `setCompanies(prev => [...prev, data])`, `setDraftCompanyId(data.id)`, fecha mini-form, toast.

   - Verificar como o resto do código obtém `organization_id`. O hook `useCompanies` (em `src/hooks/...`) já deve fazer isso; vou reutilizar a mesma lógica. Se houver função RPC `getbrain_org_id()`, usar `supabase.rpc('getbrain_org_id')`. Se outros componentes (NewLeadDialog) já têm `useCreateCompany`, reaproveitar esse hook em vez de SQL inline.

5. **Validação**: botão Salvar do bloco fica desabilitado se `draftCompanyId` for vazio (cliente é obrigatório no schema, `company_id NOT NULL`).

6. **Sem mudanças no schema** — `company_type='cliente'` já existe no enum (usado por `NewLeadDialog`, etc.).

## Fora de escopo

- Editar dados da empresa existente (nome, CNPJ etc.) a partir desta tela — para isso o usuário continua indo em `/crm/empresas/:id`.
- Mudança no header ou sidebar.
- Migração de schema.
