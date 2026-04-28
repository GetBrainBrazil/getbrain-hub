# Esconder barra de filtros nas sub-abas do CRM (exceto Pipeline)

## Mudança

**Arquivo:** `src/pages/crm/CrmLayout.tsx`

Renderizar o bloco "Filters bar" (busca + Dono + Origem + Valor + Limpar, linhas 67-98) apenas quando `currentTab === 'pipeline'`.

Tudo o resto do header (título, descrição, botões "Novo Lead" / "Novo Deal" e os Tabs) continua aparecendo em todas as sub-abas.

## Resultado

- `/crm/pipeline` → header + botões + **barra de filtros** + tabs
- `/crm/dashboard` → header + botões + tabs (sem a barra)
- `/crm/leads` → header + botões + tabs (sem a barra)
- `/crm/calendario` → header + botões + tabs (sem a barra)

## Garantias

- O `useCrmHubStore` (estado dos filtros) é preservado. Ao voltar para o Pipeline, os filtros aplicados anteriormente continuam ativos — nada é resetado.
- Zero mudança em rotas, hooks, queries ou outros componentes.
- Sem impacto em integrações cross-módulo.
