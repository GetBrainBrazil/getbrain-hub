

## Reorganizar "Time & Contratos": fundir no Operacional + mover Contratos pro Financeiro

A aba "Time & Contratos" some. O conteúdo é redistribuído:

- **Contratos de Manutenção** → vira módulo dentro de **Financeiro** (com geração automática de recorrência mensal nas Contas a Receber)
- **Time alocado** → vira card dentro da aba **Operacional**, sem sobrecarregar o layout

### Mudança 1 — Aba "Operacional" ganha card de Time

Na `AbaOperacional.tsx`, adicionar uma seção compacta **abaixo dos 4 painéis** (não dentro do grid 2×2, para não desbalancear):

```text
┌──────────────────────────────────────────────────────┐
│ 👥 TIME ALOCADO                    [+ Alocar Ator]   │
│                                                        │
│ [avatar] Vitor Hugo · Dev Full-Stack · 50%           │
│         0 tarefas · 0h · custo: —      [Desalocar]   │
│ [avatar] Daniel · PM · 20%                            │
│         0 tarefas · 0h · custo: —      [Desalocar]   │
│                                                        │
│ Estado vazio: ícone + "Nenhum ator alocado"          │
└──────────────────────────────────────────────────────┘
```

- Lista densa (1 linha por ator), mesmo padrão visual da aba antiga
- Botão "+ Alocar Ator" abre `AlocarAtorDialog` (já existe)
- "Desalocar" usa o handler existente
- Métricas por ator (tarefas/horas/custo) ficam zeradas com "—" até Área Dev plugar

Como o Operacional hoje recebe só `projectId`, vou expandir o componente para também receber `allocs` + handlers (`onAllocate`, `onDeallocate`) — ProjetoDetalhe continua dono do estado e da carga.

### Mudança 2 — Remover aba "Time & Contratos"

Em `ProjetoDetalhe.tsx`:
- Remover o item `["team", "Time & Contratos", ...]` da `TabsList`
- Remover o `<TabsContent value="team">` inteiro (linhas ~1496-1641)
- `NovoContratoDialog`, `AlocarAtorDialog` continuam importados (Alocar usado no Operacional; Contrato vai migrar de uso)

Ordem final das abas: Visão Geral · Escopo · **Operacional** · Marcos · Dependências · Riscos · Integrações · Atividade

### Mudança 3 — Novo módulo Financeiro: Contratos de Manutenção

**Nova página** `src/pages/ContratosManutencao.tsx` em `/financeiro/contratos`:

- Listagem de todos os `maintenance_contracts` (todos os projetos), com filtros por status (ativo/pausado/encerrado) e cliente
- Colunas: Projeto · Cliente · Mensalidade líquida · Início · Fim · Status · MRR contribuído
- Total no topo: **MRR ativo** (soma das mensalidades líquidas dos contratos `active`)
- Botão "Novo Contrato" abre `NovoContratoDialog` (precisa virar genérico — escolher projeto)
- Linha clicável → drawer/modal de detalhe com edição inline (mensalidade, desconto, bolsões, datas, status, observações)
- Adicionar entrada no `AppSidebar` em Financeiro: "Contratos"

### Mudança 4 — Geração automática de recorrência no Financeiro

Quando um `maintenance_contract` é criado/atualizado para `status='active'`, gerar automaticamente lançamentos em `movimentacoes`:

- 1 movimentação por mês entre `start_date` e `end_date` (ou 12 meses à frente se sem `end_date`)
- `tipo='receita'`, `status='pendente'`, `valor_previsto = monthly_fee × (1 - discount/100)`
- `data_vencimento` = mesmo dia de cada mês a partir do `start_date`
- `data_competencia` = primeiro dia do mês de competência
- `descricao` = `"Manutenção mensal — {projeto.code} — {mês/ano}"`
- `cliente_id` = cliente do projeto
- `source_module='maintenance_contracts'`, `source_entity_type='maintenance_contract'`, `source_entity_id=contract.id`
- `is_automatic=true`, `recorrente=true`, `frequencia_recorrencia='mensal'`

**Implementação**: trigger SQL `AFTER INSERT OR UPDATE OF status, monthly_fee, monthly_fee_discount_percent, start_date, end_date` em `maintenance_contracts`:

1. Apaga (ou marca como cancelado) movimentações futuras pendentes vinculadas a esse contrato
2. Recria as parcelas a partir do mês corrente
3. **Nunca** mexe em movimentações já com `status='pago'`

**Quando contrato vira `cancelled`/`paused`**: cancela apenas as parcelas futuras pendentes.

Com isso, as parcelas já fluem para `project_metrics` via `source_entity_id` e aparecem no painel Financeiro do Operacional automaticamente.

### Mudança 5 — Card "Contratos" no Operacional

Dentro do **painel Financeiro** da aba Operacional, abaixo da margem real, adicionar uma linha resumo:

```
Contrato de manutenção:  R$ 750/mês ativo · até [data]   [Gerir →]
```

ou (se sem contrato): `"Sem contrato de manutenção"  [Criar contrato →]`

O link **[Gerir →]** leva para `/financeiro/contratos?projectId=<id>` filtrando por esse projeto. O **[Criar →]** abre o `NovoContratoDialog` direto na página atual.

### Mudança 6 — Ajustar `NovoContratoDialog`

Adicionar prop opcional `defaultProjectId`. Quando vem definida, esconde o seletor de projeto e usa o valor; quando ausente, mostra um `<Select>` de projetos ativos (para uso na página de Contratos do Financeiro).

### Arquivos afetados

**Modificados:**
- `src/pages/ProjetoDetalhe.tsx` — remove aba Team, passa `allocs`/handlers ao Operacional
- `src/components/projetos/AbaOperacional.tsx` — recebe props de time, renderiza card de Time + linha de contrato no painel Financeiro
- `src/components/projetos/NovoContratoDialog.tsx` — suporte a uso global (com seletor de projeto)
- `src/components/AppSidebar.tsx` — nova entrada "Contratos" em Financeiro
- `src/App.tsx` — rota `/financeiro/contratos`

**Criados:**
- `src/pages/ContratosManutencao.tsx` — listagem + detalhe de contratos
- Migration SQL: trigger `maintenance_contract_recurrence_sync` em `maintenance_contracts` que mantém parcelas em `movimentacoes`

### Pontos de UX preservados

- Time não desaparece — está no Operacional, contexto certo (ver "como o projeto está indo" inclui ver o time)
- Quem cria contrato no projeto continua tendo o atalho (botão no painel Financeiro do Operacional)
- Daniel ganha visão consolidada de **MRR total** no Financeiro, sem ter que abrir projeto a projeto
- Recorrência mensal nasce do contrato — zero trabalho manual

### Confirmação antes de executar (read-only mode)

Confirme só duas decisões antes de eu implementar:

1. **Janela de geração de parcelas sem `end_date`**: 12 meses à frente, regenerando mensalmente (trigger detecta mês corrente e completa até 12 meses no futuro)? Ou outra janela?
2. **Comportamento ao alterar `monthly_fee` em contrato ativo**: regenera só parcelas futuras pendentes (mantém pagas intactas) — ok?

