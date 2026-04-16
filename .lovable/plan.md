

## Diagnóstico

Ao trocar entre as abas "A Pagar" e "A Receber", o `useEffect` na linha 67 dispara `loadAll()`, que faz 7 queries ao banco + 1 RPC call (`update_status_atrasado`). Durante esse tempo de carregamento:

1. Os **KPIs** e a **tabela** continuam mostrando os dados antigos (da aba anterior) até a resposta chegar, causando um "flash" de dados incorretos
2. A RPC `update_status_atrasado` é síncrona e bloqueia todas as outras queries (ela roda antes do `Promise.all`)
3. Não há indicador de loading — o usuário vê dados velhos "congelados" até tudo atualizar de uma vez

## Plano de correção

### 1. Adicionar estado de loading e limpar dados ao trocar de aba

- Adicionar `const [loading, setLoading] = useState(true)` 
- No início de `loadAll()`, setar `setLoading(true)` e `setMovs([])` para zerar imediatamente os dados da aba anterior
- No final de `loadAll()`, setar `setLoading(false)`

### 2. Otimizar a função `loadAll()`

- Mover a RPC `update_status_atrasado` para dentro do `Promise.all` em vez de executá-la antes de tudo (ela é independente das queries)
- Isso elimina a espera sequencial

### 3. Mostrar skeleton/loading nos KPIs e tabela

- Enquanto `loading === true`, exibir os KPIs com valor "—" ou skeleton pulse
- Na tabela, mostrar um estado de carregamento em vez de dados antigos

### Arquivo editado
- `src/pages/Movimentacoes.tsx` — adicionar estado loading, limpar movs ao trocar aba, paralelizar RPC, mostrar indicador visual durante carregamento

