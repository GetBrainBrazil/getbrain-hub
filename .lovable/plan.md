# Redesign do "Tipo de Projeto" — escalável para muitos tipos

## Problema atual

O componente mostra os 5 primeiros tipos como chips e um botão "Mais N". Quando há 15-30+ tipos cadastrados:

- Os 5 chips fixos viram uma escolha quase aleatória (ordem alfabética/criação) — sem relação com o que o usuário usa de fato.
- A maior parte do trabalho passa a acontecer dentro do popover, anulando a vantagem do "1-clique".
- Em telas mais estreitas (ou com nomes longos), os chips quebram em várias linhas e poluem o card.

## Proposta

Manter o visual atual de chips coloridos com 1-clique, **mas tornar a seleção inline inteligente e o input de busca sempre visível**, em vez de escondido atrás de um botão.

### Layout final

```text
TIPO DE PROJETO
┌──────────────────────────────────────────────────────────────┐
│ 🔍 Buscar tipo...                                            │  ← input sempre visível
└──────────────────────────────────────────────────────────────┘
[● Chatbot WhatsApp ✓]  [● SDR com IA]  [● Sistema gestão]
[● Site institucional]  [● Automação]   [+12 outros ▾]
```

- **Input de busca sempre visível** (compacto, no topo). Digitando, os chips abaixo viram o resultado da busca em tempo real (mesmo grid, mesmas cores). Enter seleciona o primeiro; se admin e nada bater, oferece "Criar".
- **Chips inteligentes** abaixo do input: até 6 (configurável). Seleção por:
  1. Tipo selecionado atualmente (sempre presente).
  2. Top mais usados (fonte: contagem em `deals.project_type_v2`).
  3. Resto preenchido por ordem da tabela.
- **Pill "+N outros"** abre popover compacto listando o restante (ainda como chips, agrupados, scrollável). Sem `Command` pesado — só uma grade de chips clicáveis.
- **Item selecionado fora do top**: quando o usuário escolhe pelo "+N outros", ele "promove" o chip pra linha principal naquela sessão (já existe essa lógica, mantemos).
- **Modo compacto automático**: se houver ≥ 20 tipos cadastrados, esconde a fileira de chips por default e mostra só o input + chip selecionado + botão "Ver todos". Isso evita poluição quando a lista vira realmente grande. Mantém UX limpo e a busca como caminho principal nesse cenário.

### Smart ranking dos chips (top usados)

Usa um hook novo `useProjectTypeUsage()` que consulta uma vez (cache) a contagem por slug em `deals`. Resultado: os 6 chips são sempre os tipos que o usuário/empresa realmente usa. Sem isso, "muitos tipos" significa "5 chips inúteis".

Query simples:
```sql
select project_type_v2 as slug, count(*) as uses
from deals where project_type_v2 is not null
group by project_type_v2
order by uses desc;
```

### Comportamentos finos

- **Atalho de teclado**: input já em foco quando o card abre não, mas focável com `/` quando o card está visível (opcional, marcamos como "nice to have" e implementamos só se simples).
- **Limpar seleção**: o chip selecionado tem um `×` discreto no hover (além de re-clicar pra desmarcar).
- **Vazio com filtro**: estado claro "Nenhum tipo encontrado" + CTA "Criar '<termo>'" (admin).
- **Cor ao buscar**: chips filtrados mantêm cor original; itens fora do filtro somem (não ficam acinzentados — reduz ruído visual).
- **Acessibilidade**: input com `role=combobox`, chips com `aria-pressed`, navegação por Tab + Enter funcional.

### Quando NÃO houver muitos tipos (≤ 6)

Comportamento praticamente idêntico ao atual: input fica visível mas discreto, todos os chips aparecem, sem "+N". Não regredimos a experiência atual quando a lista é pequena.

## Detalhes técnicos

**Arquivos a editar:**

- `src/components/crm/ProjectTypeSelect.tsx` — reescrita do layout e da lógica de ranking; mesma assinatura de props (`value`, `onChange`, `disabled`, `inlineLimit`).
- `src/hooks/crm/useCrmProjectTypes.ts` — adicionar `useProjectTypeUsage()` (query agregada via `supabase.from('deals').select('project_type_v2')` e contagem client-side, cache 5 min). Sem migration nova.

**Sem mudanças em:**

- Schema (tabela `crm_project_types` continua igual).
- `ProjectTypesManager` (página de configurações).
- `DealCard` / `DealHeader` / filtros do pipeline (continuam consumindo o hook existente).

**Limites:**

- `inlineLimit` default sobe de 5 para 6 (cabe melhor em 2 linhas se necessário).
- Threshold do "modo compacto": 20 tipos cadastrados.

**Performance:** `useProjectTypeUsage` roda 1x e fica em cache; staleTime alto. Se a tabela `deals` ficar grande, trocamos por uma RPC/view materializada — mas para o volume atual, client-side basta.

## Fora do escopo

- Ranking por usuário/equipe (só global por enquanto).
- Reordenar chips por drag manualmente no card (já existe na página de configurações).
- Multi-select (tipo de projeto continua single-select; só "categorias da dor" é multi).
