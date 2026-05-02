## Para que serve esse submódulo (Lead Detail)

Um Lead é a fase **anterior ao Deal**: ainda estamos qualificando se faz sentido investir tempo numa proposta. O detalhe precisa responder, em uma tela, três perguntas:

1. **Quem é** essa oportunidade? (empresa, contato, dono, origem, valor estimado)
2. **Vale qualificar?** (dor declarada, contexto, urgência, fit)
3. **Próximo passo claro** (agendar triagem → executar triagem → converter em Deal **ou** descartar com motivo)

Hoje a tela tem só dois retângulos pretos de Markdown ("Dor" e "Notas") e uma sidebar genérica. Sem fluxo, sem dados conectados, sem visual do sistema.

## Nova estrutura (espelha CrmDealDetail)

```text
┌─ Breadcrumb: CRM › Leads › LEAD-009 ────────────────── x ┐
├─ HEADER ──────────────────────────────────────────────────┤
│  LEAD-009 · Sunbright Engenharia · [Triagem agendada]     │
│  Título do lead (inline edit)                             │
│  R$ 4.000  ·  Daniel  ·  Indicação  ·  criado há 3d       │
│  Próximo passo: "Triagem agendada p/ 05/05 14h" [Ver →]   │
│  [Converter em Deal]  [Agendar triagem]  [Descartar]      │
├─ MAIN (1fr) ─────────────────────┬─ SIDEBAR (360) ───────┤
│ [Detalhes][Atividades][Timeline] │ STATUS DO LEAD        │
│                                  │ ChipGroup 5 estágios  │
│ 01 Qualificação                  │ ─────                 │
│   • Origem (Combobox)            │ EMPRESA               │
│   • Valor estimado (Currency)    │  card c/ link + KPI   │
│   • Urgência (chips B/M/A)       │  porte, indústria     │
│   • Fit (chips Bom/Médio/Ruim)   │ ─────                 │
│                                  │ CONTATO PRINCIPAL     │
│ 02 Dor & Contexto                │  nome, cargo, e-mail  │
│   • Categorias da dor (multi)    │  (multi se houver)    │
│   • Descrição da dor (rich)      │ ─────                 │
│   • Custo R$/mês  +  Horas/mês   │ DONO + colaborador    │
│   • Solução atual                │ ─────                 │
│                                  │ TRIAGEM               │
│ 03 Triagem                       │  Agendada (data/hora) │
│   • Agenda da triagem            │  Aconteceu (data/hora)│
│   • Resumo do que rolou          │  duração / canal      │
│   • Decisão: avançar / descartar │ ─────                 │
│                                  │ METADATA              │
│ 04 Anotações livres              │  criado em / por      │
│   RichTextEditor (sem .md box)   │  última atualização   │
│                                  │                       │
└──────────────────────────────────┴───────────────────────┘
   [Zona de risco] (excluir lead)
```

## Tabs

- **Detalhes** — as 4 zonas acima, todas autosave on blur (padrão Deal).
- **Atividades** — `<ActivityPanel entity={{type:'lead'}} />` já existe.
- **Timeline** — auditoria via `useEntityAudit('lead')`, com agrupamento por dia (mesmo visual do AdminAuditoriaPage).

## Componentes/UI reaproveitados do Deal (sem reinventar)

- `ZoneSection` (numeradas 01..04) — extrair para `src/components/crm/ZoneSection.tsx` para uso compartilhado Deal/Lead.
- `ChipGroup`, `FieldLabel` — idem, mover para `src/components/crm/inlineFields.tsx`.
- `InlineText`, `InlineMoney`, `InlineInteger` — idem.
- `RichTextEditor` (`@/components/ui/rich-text-editor`) substitui os `MarkdownSplitEditor` pretos.
- `PainCategoriesMultiSelect` — já existe, reutilizar igual ao Deal.
- `DealHeader` inspira o novo `LeadHeader` (mesmo padrão de chips + ações).
- `ConvertDialog` mantém-se, mas movido para `src/components/crm/ConvertLeadDialog.tsx` e enriquecido com pré-preenchimento de tudo (origem, owner, dor, valor) + checklist visual de "o que vai migrar".

## Sidebar conectada (cross-módulo, valor real)

- **Empresa**: card clicável com nome, indústria, porte, status do relacionamento, badge "X deals · Y projetos · MRR R$ Z" via `useCompanyStats(company_id)` (já existe).
- **Contato principal**: usa `usePrimaryContact` (já existe). Mostra nome, papel, e-mail, telefone com ações `mailto:` / `tel:`. Botão "Trocar contato" abre Combobox de pessoas da empresa.
- **Dono**: `useCrmActors`, com avatar.
- **Triagem**: dois `Input type=datetime-local` + auto-cálculo de "atrasada/há tantos dias".
- **Histórico relacionado**: lista compacta de últimos 3 leads/deals da mesma empresa (via `useCompanyLeads` / `useCompanyDeals`), para contexto.

## Header rico

- Code mono + chip empresa (link) + status badge colorido por estágio.
- Linha de meta: valor, dono (avatar), origem, idade do lead.
- **Banner de próximo passo**: lê `triagem_scheduled_at` / `triagem_happened_at` / `status` e gera um CTA claro:
  - novo → "Agendar triagem"
  - triagem_agendada → "Triagem em 2 dias — preparar"
  - triagem_feita → "Pronto para converter em Deal"
  - descartado → motivo + botão "Reabrir"
  - convertido → link p/ deal gerado
- Botões: `Converter em Deal` (habilitado só em `triagem_feita`, com tooltip explicativo se não), `Agendar triagem` (abre datetime), `Descartar` (motivo obrigatório).

## Novos campos opcionais (sem migration obrigatória)

Preferimos não inflar schema agora — usamos campos existentes:
- `urgency` e `fit` ficam armazenados em `notes` como JSON estruturado **só se** o usuário pedir persistência. Por padrão usamos o que já existe: `pain_description`, `pain_categories` (Lead **não** tem hoje — checar e, se faltar, adicionar via migration: `pain_categories text[]`, `pain_cost_brl_monthly numeric`, `pain_hours_monthly int`, `current_solution text`, `urgency text`, `fit text`).

→ **Faremos a migration**: estende `leads` com as mesmas colunas qualitativas do Deal, para que o handoff Lead→Deal seja 1:1 (já temos `close_deal_as_won` espelhando isso na outra ponta).

## Responsividade

- Mobile: header empilhado, ações em barra fixa no rodapé, sidebar vira `Sheet` acionado por botão "Detalhes" (padrão usado em outros módulos do sistema), tabs com scroll horizontal.
- Desktop ≥1024: layout 2 colunas como hoje.

## Arquivos a criar / editar

**Editar**
- `src/pages/crm/CrmLeadDetail.tsx` — reescrita completa.
- `src/types/crm.ts` — Lead recebe campos qualitativos novos.
- `src/hooks/crm/useLeads.ts` / `useCrmDetails.ts` — `useUpdateLeadField` deve aceitar todos os novos campos (já genérico).

**Criar**
- `src/components/crm/ZoneSection.tsx` — extraído do Deal.
- `src/components/crm/inlineFields.tsx` — `InlineText`, `InlineMoney`, `InlineInteger`, `ChipGroup`, `FieldLabel`.
- `src/components/crm/LeadHeader.tsx` — header rico com banner de próximo passo.
- `src/components/crm/LeadSidebar.tsx` — sidebar conectada.
- `src/components/crm/ConvertLeadDialog.tsx` — extraído + enriquecido.
- `supabase/migrations/<ts>_lead_qualification_fields.sql` — colunas qualitativas no `leads`.

**Refatorar (depois, sem quebrar)**
- `CrmDealDetail.tsx` passa a importar `ZoneSection` / `inlineFields` dos novos paths (apaga as cópias internas).

## Critérios de aceite

- Tela do lead segue exatamente o vocabulário visual do Deal (zonas numeradas, chips, autosave, sem caixa preta de Markdown).
- Toda edição salva on blur, sem botão "Salvar" por seção.
- Header sempre mostra **um único próximo passo claro** baseado no status.
- Sidebar mostra dados reais conectados de Empresa, Contato e Dono — clicáveis.
- Conversão para Deal copia 100% dos novos campos qualitativos.
- Mobile: usável com uma mão, sidebar em Sheet.
- Lead descartado mostra motivo destacado e botão de reabrir; lead convertido mostra link clicável para o deal.
