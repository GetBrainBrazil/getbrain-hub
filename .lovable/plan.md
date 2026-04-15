

## Plano: Submódulo "Configurações" no módulo Financeiro

### O que será feito

Criar uma nova página `Configurações Financeiras` dentro do módulo Financeiro (`/financeiro/configuracoes`) com as abas: **Contas Bancárias**, **Plano de Contas**, **Clientes**, **Fornecedores**, **Centros de Custo** e **Categorias** — conforme os prints de referência. Os dados cadastrados aqui alimentarão os selects e campos do módulo financeiro.

### Mudanças

1. **Criar `src/pages/ConfiguracoesFinanceiras.tsx`**
   - Layout: título "Configurações Financeiras" + subtítulo + botão dinâmico ("+ Nova Conta", "+ Novo Cliente", etc.)
   - Tabs horizontais: Contas Bancárias | Plano de Contas | Clientes | Fornecedores | Centros de Custo | Categorias
   - Barra de busca global abaixo das tabs (filtra a tab ativa)
   - Cada tab com sua tabela, filtros específicos e dialog de criação
   - Migrar/reutilizar a lógica existente de `Configuracoes.tsx` (ContasBancariasTab, CategoriasTab, CentrosCustoTab, FornecedoresTab) + adicionar Clientes e Plano de Contas
   - Tab ativa persistida com `usePersistedState`

2. **Atualizar sidebar** (`src/components/AppSidebar.tsx`)
   - Adicionar "Configurações" ao array `financeiroItems` com url `/financeiro/configuracoes`

3. **Atualizar rotas** (`src/App.tsx`)
   - Adicionar rota `/financeiro/configuracoes` apontando para `ConfiguracoesFinanceiras`
   - Importar o novo componente

4. **Remover duplicações de `Configuracoes.tsx`**
   - Manter apenas a aba "Minha Conta" e "Meios de Pagamento" na página geral de Configurações (itens que não são financeiros)
   - As tabs financeiras (Contas Bancárias, Categorias, Centros de Custo, Fornecedores) serão movidas para a nova página

### Detalhes das tabs (conforme prints)

| Tab | Colunas da tabela | Filtros | Botão |
|---|---|---|---|
| Contas Bancárias | Nome, Banco, Tipo, Moeda, Saldo Inicial | Todos os Bancos, Todos os Tipos, Todas | + Nova Conta |
| Plano de Contas | Código, Nome, Tipo, Natureza | — | + Novo Plano |
| Clientes | Nome, Tipo, Documento, Contato, Cidade/UF | Todos os tipos | + Novo Cliente |
| Fornecedores | Nome, Tipo, Documento, Email, Telefone, Cidade/UF | Todos os tipos | + Novo Fornecedor |
| Centros de Custo | Código, Nome, Descrição | Todos responsáveis | + Novo Centro |
| Categorias | Nome, Tipo, Ativo | — | + Nova |

### Arquivos
- `src/pages/ConfiguracoesFinanceiras.tsx` — novo
- `src/components/AppSidebar.tsx` — adicionar item no menu
- `src/App.tsx` — adicionar rota
- `src/pages/Configuracoes.tsx` — simplificar (remover tabs financeiras)

