

## Objetivo
Replicar na aba **Fornecedores** o mesmo padrão de drawer (visualização → edição) já usado em **Clientes**, garantindo paridade visual e funcional total.

## Mudanças no banco
A tabela `fornecedores` hoje só tem `email`/`telefone` (texto único) e não tem campos de endereço estruturados. Precisamos migrar para suportar múltiplos contatos e endereço completo (mesmas colunas de `clientes`):

**Migração** (adicionar colunas, preservando os campos atuais):
- `razao_social text`
- `emails text[] default '{}'`
- `telefones text[] default '{}'`
- `cep text`, `estado text`, `cidade text`, `numero text`, `bairro text`, `complemento text`, `endereco text`

(Os campos `email` e `telefone` antigos continuam, sincronizados com `emails[0]`/`telefones[0]` no save, igual ao padrão de Clientes.)

## Mudanças em `src/pages/ConfiguracoesFinanceiras.tsx`

Reescrever apenas o componente `FornecedoresTab` (linhas 906–981), espelhando o `ClientesTab` (linhas ~520–900):

1. **Estados**: `drawerOpen`, `drawerMode` (`view` | `create` | `edit`), `selectedItem`, `editForm`, `deleteDialogOpen`, `copied`, `newEmail`, `newPhone`, `filterTipo`, `filterStatus`.

2. **Tabela**:
   - Linhas com `cursor-pointer hover:bg-muted/50` e ícone `Eye` que aparece no hover (`opacity-0 group-hover:opacity-100`).
   - Switch de Ativo/Inativo com `stopPropagation`.
   - Mensagem vazia: "Nenhum fornecedor encontrado para os filtros selecionados".

3. **Filtros** (acima da tabela, antes do botão "Novo Fornecedor"):
   - Dropdown `Todos os Tipos` (Todos / PF / PJ).
   - Dropdown `Todos os Status` (Todos / Ativo / Inativo).
   - Combinados com o `search` global (nome, CPF/CNPJ, e-mail).

4. **Drawer** (`Sheet` lateral direito, largura 520px):
   - **Modo View**: Nome, Tipo (badge), Razão Social (se PJ), Documento formatado, lista de E-mails, lista de Telefones formatados, Endereço completo formatado, Observações, Status. Botão `Copiar Dados` com troca de ícone Copy↔Check por 2s e toast "Dados do fornecedor copiados!". Footer: `Excluir` (esquerda, destrutivo) | `Fechar` + `Editar Fornecedor` (direita).
   - **Modo Edit/Create** (mesmo layout do form de Clientes adaptado):
     - Linha: Nome* + Tipo (PF/PJ).
     - Linha: Razão Social (apenas se PJ) + Documento (label CPF/CNPJ dinâmico, máscara correspondente).
     - E-mails: label + botão "+ Adicionar", input com Enter, lista removível, fallback "Nenhum e-mail cadastrado". Validação de formato.
     - Telefones: idem com máscara `(00) 00000-0000`.
     - Seção **Endereço** (título bold): CEP + Estado (dropdown UFs) + Cidade na primeira linha; Endereço + Número + Bairro na segunda; Complemento na terceira (largura total).
     - Observações (textarea ~4 linhas).
     - Toggle Ativo/Inativo (apenas em edit).
     - Botões: `Cancelar` (volta para view) | `Salvar Alterações`. Toast "Fornecedor atualizado com sucesso".

5. **Exclusão**: `AlertDialog` "Tem certeza que deseja excluir o fornecedor [Nome]? Esta ação não pode ser desfeita." → toast "Fornecedor excluído com sucesso".

6. **Reuso**: aproveitar as helpers já presentes no arquivo (`formatCpfCnpj`, `applyCpfCnpjMask`, `formatPhone`, `applyPhoneMask`, `applyCepMask`, `ESTADOS_BR`, `buildAddressString`) — extraí-las para escopo de módulo se ainda estiverem dentro de `ClientesTab`, ou referenciá-las diretamente.

## Arquivos
- **Migração**: adicionar colunas em `fornecedores`.
- **Editado**: `src/pages/ConfiguracoesFinanceiras.tsx` (apenas o componente `FornecedoresTab`; nenhuma outra aba é tocada).

