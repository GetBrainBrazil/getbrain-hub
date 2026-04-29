# Card do CRM: mostrar Implementação + MRR

## Problema

O `DealCard` (usado no Pipeline e em listas) mostra hoje só um número: `estimated_value`. Mas agora o deal tem três campos relacionados a valor:

- `estimated_implementation_value` — valor único de implementação (one-time)
- `estimated_mrr_value` — receita recorrente mensal
- `estimated_value` — valor "legado" / total estimado

Quando os dois novos estão preenchidos, o card mostra só o legado, então parece que "as informações não estão sendo puxadas".

## Solução

Substituir o bloco de valor do `DealCard` por uma exibição inteligente que se adapta ao que está preenchido, mantendo a hierarquia visual e o tamanho compacto do card.

### Regra de exibição

- **Implementação E MRR preenchidos** → mostrar os dois lado a lado, com rótulos curtos (`IMPL` / `MRR`) e o MRR destacado em cyan (cor de receita recorrente). Layout: `IMPL R$ 60.000 + MRR R$ 8.000/mês`.
- **Só Implementação** → `R$ 60.000 impl`
- **Só MRR** → `R$ 8.000 /mês MRR` (em cyan)
- **Nenhum dos dois** → fallback para `estimated_value` (comportamento atual)

### Detalhes de UI/UX

- Rótulos `IMPL` / `MRR` em caixa alta, fonte pequena (10px), cinza/cyan, para não competir com o número.
- Tooltips nos dois rótulos explicando "Valor de implementação (one-time)" e "Receita recorrente mensal" — para alguém novo entender.
- Probabilidade (`%`) e prazo (`fecha em 7d`) ficam juntos à direita, em uma linha só, em cinza pequeno — libera espaço horizontal pros dois valores.
- Quando os dois valores aparecem, eles podem quebrar para a segunda linha em telas estreitas (`flex-wrap`), mantendo legibilidade no mobile sem cortar nada.
- Barra de probabilidade continua igual abaixo.
- Tipografia diminui ligeiramente (de `text-base` para `text-sm`) só no caso "ambos preenchidos", para caber confortavelmente sem aumentar a altura do card.

### Layout (ambos preenchidos)

```text
[CRM-0042]                     [SAAS] ✓
Implantação ERP cliente X
🏢 Acme Ltda

IMPL R$ 60.000  +  MRR R$ 8.000 /mês     80% · fecha em 7d
████████████████████████░░░░  (barra prob.)
─────────────────────────────────────────
→ Reunião com diretor · em 2d         [DA]
```

## Arquivos afetados

- `src/components/crm/DealCard.tsx` — única alteração; substitui o bloco "Value + prob + close date" e a barra de probabilidade pelo bloco novo. Tudo o mais (header, título, empresa, próximo passo, owner) fica igual.

Nenhuma mudança em tipos, hooks ou banco — os campos já existem em `Deal`.
