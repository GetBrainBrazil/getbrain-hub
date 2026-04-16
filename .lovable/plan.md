

## Objetivo
Substituir a aba **Plano de Contas** por **Colaboradores** em `ConfiguracoesFinanceiras`, replicando o padrão de drawer (visualização → edição) já usado em Clientes/Fornecedores, com seções extras de **Dados Bancários** e **Informações Contratuais**.

## Mudanças no banco

**Nova tabela `colaboradores`:**
- `id uuid pk default gen_random_uuid()`
- `nome text not null`
- `cargo text`
- `cpf text`
- `emails text[] default '{}'`, `telefones text[] default '{}'`
- Endereço: `cep`, `estado`, `cidade`, `endereco`, `numero`, `bairro`, `complemento` (todos text)
- Bancário: `banco text`, `agencia text`, `conta text`, `tipo_conta text default 'corrente'`, `chaves_pix text[] default '{}'`
- Contratual: `data_admissao date`, `salario_base numeric default 0`, `created_by uuid` (para regra de visibilidade do salário)
- `observacoes text`, `ativo boolean default true`, `created_at`, `updated_at` timestamps
- RLS: `ALL` para `auth.uid() IS NOT NULL` (mesmo padrão das outras tabelas)
- Trigger `update_updated_at_column` em update

## Mudanças em `src/pages/ConfiguracoesFinanceiras.tsx`

1. **`tabConfig`**: trocar a entrada `plano` por `colaboradores: { label: "Colaboradores", button: "+ Novo Colaborador", icon: UserRound }`. Importar `UserRound` e `Landmark` (para seção bancária do form) — `Users` permanece para Clientes.
2. **Remover** completamente o componente `PlanoContasTab` e seu `<TabsContent value="plano">`. Substituir por `<TabsContent value="colaboradores"><ColaboradoresTab search={search} /></TabsContent>`.
3. **Atualizar `usePersistedState`**: se o valor salvo for `"plano"`, normalizar para `"colaboradores"` na inicialização (evita aba quebrada para quem já usou).
4. **Novo componente `ColaboradoresTab`** — cópia adaptada do `ClientesTab`/`FornecedoresTab` com:
   - Estados: `drawerOpen`, `drawerMode`, `selectedItem`, `editForm` (com todos os novos campos), `deleteDialogOpen`, `copied` (apenas para o copy bancário), `newEmail`, `newPhone`, `newPix`, `filterCargo`, `filterStatus`.
   - Tabela: Nome | Cargo | CPF formatado | E-mail (primeiro) | Telefone (primeiro) | Status | hover Eye + switch ativo (com stopPropagation). Vazio: "Nenhum colaborador encontrado para os filtros selecionados."
   - Filtros acima da tabela: dropdown **Todos os Cargos** (lista derivada de `items.map(i => i.cargo).filter(Boolean)` única) + dropdown **Todos os Status**, combinados com `search` (nome, CPF, e-mail, cargo).
   - **Drawer view**: Nome, Cargo, CPF formatado, lista de e-mails, lista de telefones formatados, **seção Dados Bancários** (título bold + ícone `Landmark`) com Banco/Agência/Conta/Tipo da Conta/Chaves PIX, **botão "Copiar Dados Bancários"** (outline, ícone `Copy`↔`Check` por 2s, toast "Dados bancários copiados!" — copia apenas Nome+Banco+Agência+Conta+Tipo+PIX), Endereço completo formatado (ou "Nenhum endereço cadastrado"), Data de Admissão (DD/MM/AAAA), **Salário Base** (formatCurrency, **só renderiza se `selectedItem.created_by === user.id`** — buscar `auth.getUser()` no load), Observações ou "Sem observações", Status. Footer: **Excluir** (esquerda, destrutivo) | **Fechar** + **Editar Colaborador** (direita).
   - **Drawer edit/create**: Nome (largura total) → Cargo + CPF (máscara reusando `applyCpfCnpjMask` forçando PF) → E-mails (label + "+ Adicionar", lista removível, validação) → Telefones (idem, máscara `(00) 00000-0000`). **Seção Dados Bancários** (título bold + `Landmark`): Banco + Agência + Conta lado a lado → Tipo da Conta (dropdown Corrente/Poupança, largura parcial) → Chaves PIX (label + "+ Adicionar", input placeholder "CPF, e-mail, telefone, chave aleatória...", lista removível). **Seção Endereço**: CEP + Estado (dropdown `ESTADOS_BR`) + Cidade → Endereço + Número + Bairro → Complemento. **Informações contratuais**: Data de Admissão (date input nativo) + Salário Base (input com máscara monetária BRL — usar mesmo padrão usado em outras telas) → Observações (textarea ~4 linhas) → Toggle Ativo/Inativo (apenas em edit). Botões: **Cancelar** (volta para view ou fecha se create) | **Salvar** / **Salvar Alterações** (primário). Toast "Colaborador cadastrado com sucesso" / "Colaborador atualizado com sucesso". No insert, gravar `created_by: (await supabase.auth.getUser()).data.user?.id`.
   - **Exclusão**: `AlertDialog` "Tem certeza que deseja excluir o colaborador [Nome]? Esta ação não pode ser desfeita." → toast "Colaborador excluído com sucesso".
   - Reuso das helpers já existentes no arquivo: `applyCpfCnpjMask` (forçando 11 dígitos), `formatPhone`, `applyPhoneMask`, `applyCepMask`, `ESTADOS_BR`, `buildAddressString`. Se estiverem dentro de `ClientesTab`, extrair para escopo de módulo.

## Arquivos
- **Migração**: criar tabela `colaboradores` + RLS + trigger.
- **Editado**: `src/pages/ConfiguracoesFinanceiras.tsx` (remover `PlanoContasTab`, adicionar `ColaboradoresTab`, atualizar `tabConfig` e ícones).

Nenhuma outra aba ou funcionalidade é alterada.

