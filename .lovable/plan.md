

## Plano: Copiar exatamente o estilo clean do modal da referência

### Problema
O modal atual tem inputs com fundo bege (`bg-[#FDF8F4]`), botão marrom escuro, e um estilo "pesado" que não combina com o layout limpo da referência.

### O que muda

**Estilo dos inputs:**
- Remover `bg-[#FDF8F4]` de todos os inputs — usar fundo branco/transparente com borda simples (`border-gray-300`)
- Altura e tipografia mais leves

**Título do modal:**
- Ícone de documento (📄) + "Nova Conta a Pagar" no header, estilo simples como na referência

**Seções:**
- Headers "DADOS PRINCIPAIS" e "PRAZOS E VALORES" com ícone pequeno + texto cinza, exatamente como no print
- Separadores finos e discretos

**Campos — sem Empresa Proprietária:**
- Fornecedor (largura total menos o botão "+") + botão "+"
- Descrição da Movimentação (largura total)
- 3 colunas: Valor Previsto | Data de Competência | Data de Vencimento
- Conta Bancária (select pequeno, alinhado à esquerda)

**Botão principal:**
- Trocar o marrom (`bg-[#7C2D12]`) por um estilo mais clean/escuro ou manter consistente com o tema do app

**Remover:**
- Seção de Observações Internas e Recorrência do visual imediato (ou mover para baixo, discreto) — o print não mostra essas seções

### Arquivo
- `src/pages/Movimentacoes.tsx` — função `renderModalForm` (linhas 327-506) e os DialogContent dos modais de criação e edição

