

## Recorrência: gerar retroativo + job mensal dia 01

### Problema

Hoje, ao criar movimentação recorrente com início em `22/05/2025`:
- Frontend cria o pai em 22/05/2025 e gera 119 ocorrências futuras (22/06, 22/07, ...).
- **Não existe nada** rodando no servidor para "completar" o mês corrente nem para gerar a parcela do mês quando ele começa.
- Se a data de início é passada, as parcelas até hoje só existem se o usuário criou uma a uma.

Você quer:
1. Ao criar recorrência com início no passado → preencher **todas as ocorrências entre a data de início e hoje** automaticamente.
2. Todo dia **01** de cada mês → o sistema cria a ocorrência daquele mês para cada recorrência ativa sem prazo (ou ainda dentro do prazo).

### Mudança 1 — Geração já inclui passado (frontend)

Em `MovimentacaoDetalhe.tsx` (linhas 409-436) e `ContasPagar.tsx` (linhas 150-165):

- Hoje o loop começa em `i = 1` (só futuro). Vai passar a iterar a partir da `data_competencia` do pai e gerar **todas as parcelas com vencimento ≤ hoje**, além das futuras até o limite (120 meses ou `recAte`).
- O pai (`i=0`) continua sendo a primeira ocorrência. Se a data do pai for retroativa, ele já fica com vencimento atrasado — e as ocorrências subsequentes preenchem o gap até hoje.
- Status de cada ocorrência:
  - Vencimento `< hoje` → `atrasado`
  - Vencimento `>= hoje` → `pendente`

Isso resolve a parte retroativa **na hora da criação**.

### Mudança 2 — Edge function + cron mensal (dia 01)

Criar edge function `generate-recurring-movimentacoes` que:

1. Busca todas as movimentações **pai** (`movimentacao_pai_id IS NULL`) com `recorrente = true` e `status != 'cancelado'`.
2. Para cada uma:
   - Calcula a próxima competência esperada (mês corrente).
   - Verifica se já existe ocorrência (pai ou filha) com `data_competencia` no mês corrente.
   - Se **não existe** e a recorrência ainda está dentro do prazo (sem `recAte`, ou `recAte >= hoje`), cria a ocorrência do mês corrente clonando os campos do pai e ajustando `data_competencia` / `data_vencimento` (mantendo o mesmo dia do mês do pai; se o mês não tiver aquele dia, usa o último dia do mês).
3. Marca como `is_automatic = true` e `source_module = 'recurrence_job'` para auditoria.

Agendamento via `pg_cron` + `pg_net`:

```sql
select cron.schedule(
  'generate-recurring-movimentacoes-monthly',
  '0 3 1 * *',   -- dia 01 de cada mês, 03:00 UTC (00:00 BRT)
  $$ select net.http_post(
       url := 'https://xwwibclzfcbtkmesmhly.supabase.co/functions/v1/generate-recurring-movimentacoes',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
```

Ativar extensions `pg_cron` e `pg_net` se ainda não estiverem.

### Mudança 3 — Botão "Rodar agora" (opcional, mas útil)

Em `Configurações Financeiras` adicionar botão **"Sincronizar recorrências"** que chama a mesma edge function manualmente. Útil para testar sem esperar o dia 01 e para rodar uma vez agora e completar a sua recorrência do Claude.

### Frequências suportadas pelo job

- Por enquanto **apenas `mensal`** (que é o caso descrito).
- `semanal`, `diario`, `anual`: geração antecipada via frontend continua valendo (já cobrem 10 anos), o cron mensal não toca nelas.

### Comportamento ao desativar/cancelar

- Se a movimentação pai estiver `cancelado` → o job ignora.
- Se quiser parar a recorrência sem cancelar o histórico → adicionar campo `recorrencia_ativa boolean` no pai (default `true`); job só roda quando `true`. **Migration mínima: 1 coluna nullable com default.**

### Confirmações antes de executar

1. **Geração retroativa na criação**: ok preencher tudo entre data inicial e hoje na hora de salvar (pode gerar 10+ parcelas de uma vez se data antiga)?
2. **Coluna `recorrencia_ativa`** para permitir pausar futuro sem mexer no passado, ou prefere usar `status='cancelado'` no pai?
3. **Hora do cron**: 00:00 BRT (03:00 UTC) do dia 01 está bom?

### Arquivos afetados

- **Modificado**: `src/pages/MovimentacaoDetalhe.tsx` — loop de recorrência inclui retroativo + status correto
- **Modificado**: `src/pages/ContasPagar.tsx` — mesma mudança no diálogo rápido
- **Novo**: `supabase/functions/generate-recurring-movimentacoes/index.ts`
- **Novo**: migration ativando `pg_cron`/`pg_net` + agendando job (via supabase insert tool, não migration, conforme regra de cron)
- **Opcional**: migration adicionando `recorrencia_ativa` em `movimentacoes`
- **Opcional**: botão em `ConfiguracoesFinanceiras.tsx` para disparar o job manualmente

