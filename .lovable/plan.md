

## Plano: Refazer modal "Nova Conta a Pagar" seguindo exatamente o layout da referência

### O que será feito

Reescrever completamente o conteúdo do modal em `src/pages/ContasPagar.tsx` para seguir pixel a pixel o layout das imagens enviadas:

### Layout exato baseado nas imagens

**Seção 1 — DADOS PRINCIPAIS**
- Header: ícone 📋 + "DADOS PRINCIPAIS" (uppercase, small, muted)
- Linha com separador
- Row 1: **Fornecedor \*** (ocupa ~70% largura) + botão **"+"** (ao lado direito) — sem campo "Empresa Proprietária"
- Row 2: **Descrição da Movimentação \*** (largura total)

**Seção 2 — PRAZOS E VALORES**
- Header: ícone 📅 + "PRAZOS E VALORES" (uppercase, small, muted)
- Linha com separador
- Row 1 (3 colunas iguais): **Valor Previsto (R$) \*** | **Data de Competência \*** | **Data de Vencimento \***
- Row 2: **Conta Bancária** (select, ~1/3 da largura, alinhado à esquerda)

**Seção 3 — OBSERVAÇÕES INTERNAS**
- Header: "OBSERVAÇÕES INTERNAS" (uppercase, small, muted, cor primária/cyan)
- Textarea com placeholder "Observações adicionais..."

**Seção 4 — RECORRÊNCIA** (manter como está, abaixo)

**Footer** — separado por border-top:
- Botões alinhados à direita: **"Cancelar"** (outline) + **"Confirmar Cadastro"** (primário/vermelho escuro como na ref)

### Ajustes visuais
- Modal largo (`max-w-[820px]`), padding generoso (`p-8`)
- Labels com `text-[13px] font-semibold` e cor escura
- Inputs com fundo levemente bege/warm (`bg-[#FDF8F4]` ou similar, bordas suaves)
- Botão "Confirmar Cadastro" com fundo escuro/marrom (`bg-[#7C2D12]` ou similar)
- Adicionar campo `observacoes` ao form state (texto livre, salvo na coluna `observacoes` da tabela movimentacoes)

### Arquivo editado
- `src/pages/ContasPagar.tsx`

