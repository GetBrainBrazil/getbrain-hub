## Objetivo

Fazer todas as máscaras de telefone do sistema reconhecerem automaticamente o código do país. Quando o número tiver 12 ou 13 dígitos começando com `55`, exibir como `+55 (DD) NNNNN-NNNN`. Caso contrário, manter o formato nacional `(DD) NNNNN-NNNN`. Para DDIs estrangeiros (12+ dígitos não iniciando em 55), exibir `+CC NNNN NNNN…`.

## Comportamento esperado

Exemplos de entrada → saída:

```text
21987654321        → (21) 98765-4321        (BR sem DDI, 11 díg)
2133334444         → (21) 3333-4444         (BR fixo, 10 díg)
5521987654321      → +55 (21) 98765-4321    (BR com DDI)
552133334444       → +55 (21) 3333-4444     (BR fixo com DDI)
14155551234        → (14) 15555-1234        (ainda 11 díg → assume nacional)
14155551234567     → +14 1555 5123 4567     (DDI estrangeiro)
```

A máscara aceita digitação progressiva: enquanto o usuário digita, o formato vai se ajustando. Ao chegar em 12+ dígitos com `55` no início, o `+55` aparece e o restante vira nacional.

## Arquivos afetados

1. `src/lib/formatters.ts` — reescrever `formatPhoneBR` com a nova lógica e adicionar helper interno `formatBrNational`.
2. `src/components/config-financeiras/shared.tsx` — substituir `applyPhoneMask` e `formatPhone` por wrappers que chamam `formatPhoneBR` (única fonte de verdade), removendo duplicação.
3. `src/components/shared/CompanyContactsPanel.tsx` — o `PhoneInput` já chama `formatPhoneBR`; ajustar apenas o `slice` que limita entrada para `15` dígitos (hoje: 11).

## Detalhe técnico do novo `formatPhoneBR`

```text
1. Limpa não-dígitos, corta em 15.
2. Se 12 ou 13 díg e começa com "55" → "+55 " + formato nacional dos restantes.
3. Senão, se ≤ 11 díg → formato nacional progressivo.
4. Senão (12+ não-BR) → "+CC " + agrupa restante em blocos de 4.
```

O helper `formatBrNational(d)` cobre os casos parciais já existentes:
- ≤ 2 díg: `(D` / `(DD`
- ≤ 6 díg: `(DD) NNNN`
- ≤ 10 díg: `(DD) NNNN-NNNN`
- 11 díg: `(DD) NNNNN-NNNN`

## Pontos de uso já cobertos automaticamente

Todos os componentes que importam `formatPhoneBR` ou `applyPhoneMask`/`formatPhone` (Clientes, Fornecedores, Colaboradores, CompanyContactsPanel) passam a usar a nova lógica sem necessidade de edição individual, porque os utilitários do `shared.tsx` vão delegar para `formatPhoneBR`.

## Não escopo

- Não vou normalizar dados já salvos no banco — apenas a exibição/entrada.
- Não vou validar se o DDI estrangeiro existe; só formato visual.
- Não vou adicionar seletor de país: o `+55` é detectado pelo prefixo digitado.
