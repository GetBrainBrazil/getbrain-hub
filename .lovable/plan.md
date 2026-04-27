## Problema

Na sidebar (`AppSidebar.tsx`), a marcação de "ativo" usa **igualdade exata** de `location.pathname` com a URL do item. Em rotas de detalhe — por exemplo `/financeiro/orcamentos/:id/editar`, `/projetos/:id`, `/crm/deals/:code`, `/dev/tasks/:code`, `/financeiro/movimentacoes/:id`, `/financeiro/recorrencias/:id` — nenhum submódulo bate exatamente. Resultado: o submódulo perde o destaque (texto cyan + fundo) e o módulo pai também fica sem a faixa lateral de cor.

## Solução

Trocar a regra de "ativo" por **match por prefixo**, escolhendo o submódulo mais específico (URL mais longa que seja prefixo do `pathname`). O módulo pai fica destacado sempre que a rota atual estiver dentro dele.

### Regras de match

- **Submódulo ativo**: o `child` cuja `url` é prefixo de `location.pathname` e tem o maior comprimento entre os irmãos. Para evitar falso match (ex.: `/financeiro` casar com qualquer subitem), exige que o caractere seguinte ao prefixo seja `/` ou fim da string.
- **Módulo pai ativo**: quando `location.pathname` começa com `item.url` (mesmo critério de fronteira). Sempre que o pai está ativo, ele recebe a faixa cyan, **inclusive** quando há um submódulo ativo (hoje só destaca o pai se `!activeChild`).
- **Dashboard** (`/dashboard`) continua com match exato (também aceita `/`).

### Casos cobertos

| Rota atual | Módulo destacado | Submódulo destacado |
|---|---|---|
| `/financeiro/orcamentos/:id/editar` | Financeiro | Orçamentos |
| `/financeiro/movimentacoes/:id` | Financeiro | Contas a Pagar / Receber |
| `/financeiro/recorrencias/:id` | Financeiro | Recorrências |
| `/financeiro/extratos/movimentacao/:id` | Financeiro | Extratos Bancários |
| `/projetos/:id` (e abas) | Projetos | — |
| `/crm/deals/:code`, `/crm/leads/:code`, `/crm/empresas/:id` | CRM | Pipeline / Leads / Empresas |
| `/dev/tasks/:code` | Área Dev | Kanban (default) |

Para `/dev/tasks/:code` não há submódulo natural; nesse caso só o módulo pai fica destacado (não força nenhum submódulo).

## Arquivo alterado

- `src/components/AppSidebar.tsx`
  - Substituir `isExactActive` por helper `isPathInside(url)` (prefix + boundary).
  - Calcular `activeChild` pelo prefixo mais longo.
  - Ajustar `parentActive` para destacar o pai sempre que a rota estiver dentro do módulo.
  - Manter o comportamento exato apenas para o item Dashboard.

Sem mudanças de visual, rotas, ou em outros arquivos.