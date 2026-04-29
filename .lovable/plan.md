# Redesign da aba "Receita" — Modal Fechar Deal

A aba atualmente é funcional, mas visualmente apertada e pouco hierárquica: títulos pequenos, cards iguais, "total esperado" perdido em cinza, parcelas em lista solta sem cabeçalho, descontos dentro de uma caixinha sem destaque, e MRR desativado parecendo "quebrado" em vez de opcional.

## O que vai mudar (apenas UI — nenhuma lógica de negócio)

Arquivo único: `src/components/crm/DealWonDialog.tsx` — somente o conteúdo da `<TabsContent value="receita">`.

### 1. Cabeçalhos com identidade visual

Cada coluna ganha um header colorido com gradiente sutil, ícone em "pílula" e badge de tipo:

- **Implementação** → primary (cyan), badge "One-shot", subtítulo "Receita única, paga em parcelas"
- **MRR** → cyan-500, badge "Ativo" (quando ligado), subtítulo "Receita recorrente (MRR)"

### 2. "Hero" do total

O total esperado vira o elemento mais pesado da coluna: número grande em fonte mono, label uppercase pequena. Quando há desconto, aparece à direita em cor warning com sinal "−".

### 3. Parcelas viram tabela com cabeçalho

```text
┌────┬─────────────┬──────────────┬───┐
│ #  │ Valor       │ Vencimento   │ × │
├────┼─────────────┼──────────────┼───┤
│ 1  │ R$ 4.000,00 │ 29/05/2026   │ 🗑 │
├────┼─────────────┼──────────────┼───┤
│ +  Adicionar parcela          Soma │
│                       R$ 4.000,00  │
└────────────────────────────────────┘
```

- Header fixo "# / Valor / Vencimento" em uppercase
- Linhas com hover sutil, divisor entre elas
- Footer com "+ Adicionar" à esquerda e "Soma" destacada à direita
- Botão lixeira muda pra destructive só no hover

### 4. Alerta de divergência mais legível

A mensagem "soma das parcelas ≠ total esperado" passa a usar ícone `AlertTriangle` + texto explicativo em vez do emoji `⚠️`.

### 5. Switches de desconto com estado visual claro

Quando o desconto está ativo, o card inteiro ganha borda âmbar e fundo `warning/5` — fica óbvio que tem algo configurado. Os campos internos ficam separados por divisor sutil.

Tipo do desconto (% / R$) vira um pequeno toggle group com aparência de "pill", em vez de radio solto.

### 6. Duração do MRR como cards selecionáveis

Os dois radios "Indefinido" e "Por X meses" viram cards clicáveis lado a lado, com borda primary quando selecionados — mais intuitivo que radio button puro.

### 7. Estado vazio do MRR

Quando o switch está desligado, em vez de mostrar só uma frase pequena, mostra um estado vazio centralizado com ícone grande e texto explicativo — fica claro que não está "quebrado", está apenas opcional.

### 8. Microajustes consistentes

- Labels passam de `text-[10px]` para `text-[11px] font-medium` (mais legível)
- Inputs todos em `h-9` (eram mistura de h-8/h-9)
- Espaçamentos uniformizados (`p-4`, `space-y-4`)
- Tudo continua usando tokens semânticos (`primary`, `warning`, `destructive`, `muted-foreground`) — nada hardcoded

## O que NÃO muda

- Nenhum estado, handler, validação ou chamada à RPC
- Categorização (`FinanceCategorizationCard`) continua igual nas duas colunas
- Comportamento dos botões, regeneração de parcelas, lógica de desconto inválido — tudo preservado
- Aba "Projeto", "Custos" e "Revisão" não são tocadas neste passo

## Resultado esperado

Mesma funcionalidade, mas:
- Hierarquia clara: header colorido → total grande → parâmetros → tabela → extras
- Parcelas legíveis numa tabela em vez de lista solta
- Descontos com feedback visual quando ativos
- MRR opcional fica óbvio como opcional, e quando ativo parece "irmão" da implementação, não inferior
