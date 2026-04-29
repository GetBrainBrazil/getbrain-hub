## Objetivo

Tornar **Tipo de projeto** (`project_type_v2`) um campo dinâmico, igual ao que fizemos com **Categorias da dor**: gerenciável em Configurações, criável on-the-fly e com cores customizáveis. Diferença principal de UX: **continua sendo seleção única** (um deal tem um tipo) e o campo `project_type_custom` deixa de existir (vira só "criar nova opção").

Aproveito a oportunidade pra refinar o que ficou meio cru no campo de dores:

- **Trocar os chips estáticos** que ocupam uma linha enorme por um seletor compacto que sempre mostra a opção atual com sua cor — sem precisar abrir popover só pra ver o que está selecionado.
- **Quick-pick + busca no mesmo lugar**: as opções mais usadas continuam visíveis como atalhos (1 clique), mas com busca/criação acessível por um botão "Mais opções..." que abre o combobox completo. Evita o problema atual das dores onde tudo é escondido atrás de um popover.
- **Indicador visual de cor** consistente: pontinho colorido + label, igual padrão de status do GitHub/Linear.

## Mudanças no banco

1. Nova tabela `crm_project_types` (mesmo schema das outras de referência: `name`, `slug`, `color`, `display_order`, `is_active`, `is_system`).
2. Seed com os 6 tipos atuais (`whatsapp_chatbot`, `ai_sdr`, `sistema_gestao`, `automacao_processo`, `integracao_sistemas`) preservando as cores existentes. **"Outro" entra desativado** (mesma decisão das dores — quem quiser cria um tipo específico).
3. Converter `deals.project_type_v2` de enum para `text` (preservando os slugs existentes).
4. Migrar `project_type_custom`: para deals que tinham `project_type_v2='outro'` + `project_type_custom` preenchido, criar registros em `crm_project_types` (slugificados) e apontar `project_type_v2` pra eles. Depois, dropar a coluna `project_type_custom`.
5. RLS no padrão das outras tabelas de referência (select autenticado, write só admin, sem deletar `is_system=true`).
6. Atualizar a função `close_deal_as_won` (já lida com `project_type` como string, então o impacto é mínimo — só garantir que o slug é repassado).

## Mudanças no front

### Componente novo `ProjectTypeSelect`

Substitui o `ChipGroup` atual em `CrmDealDetail.tsx`. Layout proposto:

```text
TIPO DE PROJETO
[● Chatbot WhatsApp] [● SDR com IA] [● Sistema de gestão]  [+ mais opções ▾]
                  ^selecionado (com ring + cor cheia)        ^abre combobox c/ busca + criar
```

- Mostra até **5 opções como chips** (as `display_order` mais altas / mais usadas) — clique alterna seleção.
- O selecionado fica destacado com ring e a cor própria; os demais ficam como outline sutil.
- Botão **"Mais opções"** abre o `ComboboxCreate` (mesmo já usado nas dores) com busca e criação inline para admins.
- Se o tipo selecionado não está entre os chips (ex: criado custom), ele aparece automaticamente entre os chips visíveis.

### Página de gerenciamento

`/configuracoes/pessoas/tipos-de-projeto` — copia 1:1 o padrão do `PainCategoriesManager` (drag-and-drop ordem, editar nome/cor, ativar/desativar, proteger `is_system`).

### Hook `useCrmProjectTypes`

Espelho de `useCrmPainCategories`: list, create, update, delete, reorder. Cache invalidado via `invalidateCrmCaches`.

### Limpeza dos lugares que usam o enum

| Arquivo | Mudança |
|---|---|
| `src/types/crm.ts` | `DealProjectType` vira `string`; remover `project_type_custom` do `Deal`. |
| `src/constants/dealEnumLabels.ts` | Remover `PROJECT_TYPE_V2_LABEL/OPTIONS/COLOR` (vira dinâmico). Manter um `getProjectTypeMeta(slug, list)` helper se útil. |
| `src/pages/crm/CrmDealDetail.tsx` | Trocar `ChipGroup` + bloco `isOutro/project_type_custom` pelo novo `ProjectTypeSelect`. |
| `src/pages/crm/CrmPipeline.tsx` | Filtro lateral passa a usar lista vinda do hook (não mais constante). |
| `src/components/crm/DealCard.tsx` | Chip do header lê cor/label da lista carregada (igual já faz com dores agora). |
| `src/components/crm/DealHeader.tsx` | Mesma adaptação. |
| `src/hooks/crm/useCrmDashboardExec.ts` | Filtro `projectTypes` continua igual (já usa string). |

## Ordem de execução

1. Migration: nova tabela + seed + converter coluna + migrar `project_type_custom` + drop da coluna.
2. Criar hook + componente de gerenciamento + rota em Configurações.
3. Criar `ProjectTypeSelect` e plugar em `CrmDealDetail`.
4. Adaptar leitura em `DealCard`, `DealHeader`, `CrmPipeline` (chip e filtros dinâmicos).
5. Atualizar memória do projeto (`crm-reference-tables`) somando `project_types` à lista de tabelas no padrão.

## Não muda

- Audit logs (label "Tipo de projeto" continua igual em `formatters.ts`).
- Coluna legada `project_type` (texto livre, usada por `projects`) — fora do escopo.
- Comportamento do handoff CRM→Projeto.
