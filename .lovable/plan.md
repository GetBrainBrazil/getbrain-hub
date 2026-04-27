## Problemas identificados

No detalhe do deal (`/crm/deals/:code`):

1. **Barra de marcos (StageStepper)** — `src/components/crm/CrmDetailShared.tsx`
   - Bolinhas de 12px sem rótulo visível: alvo de clique pequeno e nada intuitivo (só `sr-only`).
   - Os dois últimos marcos (`Ganho` e `Perdido`) abrem **modais** (`DealWonDialog` / `LostDialog`) ao serem clicados. Como ficam coladinhos aos demais e não têm feedback visual diferente, qualquer clique perto deles dispara o dialog — daí a sensação de "bug".
   - Não há tooltip nem destaque do estado atual além de um anel sutil.

2. **Slider de Probabilidade** — `DealSidebar` em `src/pages/crm/CrmDealDetail.tsx`
   - Sem rótulos de min/max, track fino, valor pequeno ao lado e step de 5 — fica difícil arrastar sem mira precisa, e o feedback é mínimo.

## Solução

### A) StageStepper redesenhado (alvos grandes, rótulos visíveis, etapas finais separadas)

Reescrever o `StageStepper` em `CrmDetailShared.tsx` para:

- Renderizar **apenas as 4 etapas em progresso** (`presencial_agendada` → `em_negociacao`) na linha de marcos. As etapas terminais (`Ganho` / `Perdido`) **não fazem mais parte do stepper**, evitando cliques acidentais.
- Cada marco vira um **botão grande** (alvo ≥ 36px de altura) com:
  - Bolinha 18px (h-4.5).
  - **Rótulo visível abaixo** (texto pequeno em pt-BR).
  - Tooltip com o nome completo + probabilidade default.
  - Cor cyan (accent) para etapas concluídas/atual, cinza para futuras; estado atual com `font-semibold` e ring accent.
- Linha conectora entre marcos com mais altura (h-1) e cantos arredondados.
- Layout responsivo: em mobile, scroll horizontal (`overflow-x-auto`) para não comprimir os alvos.

Quando o deal estiver fechado (`fechado_ganho` / `fechado_perdido`), exibir **um badge final** em vez do stepper interativo, mostrando o estado terminal — mantendo o botão "Reabrir deal" que já existe na header para voltar a `em_negociacao`.

### B) Slider de Probabilidade mais usável

No `DealSidebar` do `CrmDealDetail.tsx`, trocar o slider por um bloco mais claro:

- Aumentar a área clicável envolvendo o slider em um container com mais padding vertical.
- Mostrar o **valor grande** (ex.: `text-lg font-semibold` cyan) acima/à esquerda.
- Adicionar marcações com os valores de cada stage (20/40/60/75/100) em texto pequeno embaixo, mostrando o ponto correspondente ao stage atual em destaque.
- Manter `step={5}`, mas adicionar handler de `onValueCommit` para salvar **só ao soltar** — evita dezenas de saves enquanto arrasta.
- Adicionar dois botões `-5` / `+5` discretos para ajuste fino sem precisar acertar o thumb.

Visual segue o design system (tokens cyan/accent), nada de cores hardcoded.

## Arquivos alterados

- `src/components/crm/CrmDetailShared.tsx` — redesenho do `StageStepper`.
- `src/pages/crm/CrmDealDetail.tsx` — novo bloco de probabilidade no `DealSidebar`; o `stageChange` continua igual (Ganho/Perdido seguem disponíveis pelos botões "Fechar como Ganho" / "Marcar como Perdido" que já existem na header).

Sem mudanças em banco, rotas ou hooks.