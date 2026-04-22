-- =====================================================================
-- VIEW: project_metrics
-- Agrega métricas operacionais por projeto em tempo real.
-- Princípio 2.15 do ARCHITECTURE.md: views SQL, nunca triggers para derivados.
--
-- MÓDULOS ATIVOS (alimentando dados):
--   - Financeiro (movimentacoes via source_entity_id/source_entity_type)
--   - Marcos (project_milestones)
--   - Dependências (project_dependencies)
--   - Riscos (project_risks)
--   - Integrações (project_integrations)
--   - Contratos de manutenção (maintenance_contracts)
--   - Time (project_actors)
--
-- MÓDULOS PLACEHOLDER (retornam 0/—):
--   - Tarefas (Área Dev) — Prompt 03
--   - Suporte (tickets)
--   - Tokens consumidos
--
-- TODO (prompt futuro de normalização do Financeiro):
--   1. Adicionar deleted_at em movimentacoes (princípio 2.7 do ARCHITECTURE.md)
--   2. Adicionar constraint CHECK em movimentacoes.tipo e .status
--   3. Migrar nomes/convenções do Financeiro aos padrões do ARCHITECTURE.md
--
-- NOTA: tabela movimentacoes não possui deleted_at — filtro omitido propositalmente.
-- =====================================================================

create or replace view public.project_metrics as
select
  p.id as project_id,
  p.code as project_code,

  -- ===== FINANCEIRO =====
  coalesce(p.contract_value, 0) as revenue_contracted,

  -- Receita recebida: status = 'pago', preferindo valor_realizado
  coalesce((
    select sum(coalesce(nullif(m.valor_realizado, 0), m.valor_previsto))
    from public.movimentacoes m
    where m.source_entity_id = p.id
      and m.source_entity_type in ('project', 'maintenance_contract')
      and m.tipo = 'receita'
      and m.status = 'pago'
  ), 0) as revenue_received,

  -- Receita pendente: qualquer status que não seja terminal
  coalesce((
    select sum(m.valor_previsto)
    from public.movimentacoes m
    where m.source_entity_id = p.id
      and m.source_entity_type in ('project', 'maintenance_contract')
      and m.tipo = 'receita'
      and m.status not in ('pago', 'cancelado')
  ), 0) as revenue_pending,

  -- Custo de integrações ativas (mensal estimado)
  coalesce((
    select sum(pi.estimated_cost_monthly_brl)
    from public.project_integrations pi
    where pi.project_id = p.id
      and pi.status = 'ativa'
      and pi.deleted_at is null
  ), 0) as cost_integrations_monthly,

  -- Custo total estimado: despesas projetadas (qualquer status) + integrações ativas
  (
    coalesce((
      select sum(m.valor_previsto)
      from public.movimentacoes m
      where m.source_entity_id = p.id
        and m.source_entity_type in ('project', 'maintenance_contract')
        and m.tipo = 'despesa'
    ), 0)
    +
    coalesce((
      select sum(pi.estimated_cost_monthly_brl)
      from public.project_integrations pi
      where pi.project_id = p.id
        and pi.status = 'ativa'
        and pi.deleted_at is null
    ), 0)
  ) as cost_total_estimated,

  -- Margem real = receita recebida - custos efetivamente pagos - integrações ativas
  (
    coalesce((
      select sum(coalesce(nullif(m.valor_realizado, 0), m.valor_previsto))
      from public.movimentacoes m
      where m.source_entity_id = p.id
        and m.source_entity_type in ('project', 'maintenance_contract')
        and m.tipo = 'receita'
        and m.status = 'pago'
    ), 0)
    -
    coalesce((
      select sum(coalesce(nullif(m.valor_realizado, 0), m.valor_previsto))
      from public.movimentacoes m
      where m.source_entity_id = p.id
        and m.source_entity_type in ('project', 'maintenance_contract')
        and m.tipo = 'despesa'
        and m.status = 'pago'
    ), 0)
    -
    coalesce((
      select sum(pi.estimated_cost_monthly_brl)
      from public.project_integrations pi
      where pi.project_id = p.id
        and pi.status = 'ativa'
        and pi.deleted_at is null
    ), 0)
  ) as margin_real,

  -- ===== TAREFAS (Área Dev — Prompt 03) =====
  -- TODO: substituir 0 por counts da tabela tasks quando criada
  0 as tasks_total,
  0 as tasks_done,
  0 as tasks_in_progress,
  0 as tasks_blocked,
  0 as tasks_backlog,
  0::numeric as hours_estimated,
  0::numeric as hours_actual,
  0::numeric as tasks_completion_percent,

  -- ===== MARCOS =====
  coalesce((
    select count(*)::int from public.project_milestones pm
    where pm.project_id = p.id and pm.status = 'concluido' and pm.deleted_at is null
  ), 0) as milestones_done,

  coalesce((
    select count(*)::int from public.project_milestones pm
    where pm.project_id = p.id and pm.deleted_at is null
  ), 0) as milestones_total,

  (select jsonb_build_object(
      'id', pm.id, 'title', pm.title,
      'target_date', pm.target_date, 'status', pm.status
   )
   from public.project_milestones pm
   where pm.project_id = p.id
     and pm.status in ('planejado', 'em_andamento', 'atrasado')
     and pm.deleted_at is null
   order by pm.target_date asc nulls last
   limit 1
  ) as next_milestone,

  -- ===== DEPENDÊNCIAS =====
  coalesce((
    select count(*)::int from public.project_dependencies pd
    where pd.project_id = p.id
      and pd.is_blocking = true
      and pd.status in ('pendente','solicitado','em_andamento','atrasado','bloqueante')
      and pd.deleted_at is null
  ), 0) as blocking_dependencies,

  coalesce((
    select count(*)::int from public.project_dependencies pd
    where pd.project_id = p.id and pd.deleted_at is null
  ), 0) as total_dependencies,

  -- ===== RISCOS =====
  coalesce((
    select count(*)::int from public.project_risks pr
    where pr.project_id = p.id
      and pr.severity in ('alta','critica')
      and pr.status in ('identificado','em_mitigacao','materializado')
      and pr.deleted_at is null
  ), 0) as high_risks_active,

  coalesce((
    select count(*)::int from public.project_risks pr
    where pr.project_id = p.id and pr.deleted_at is null
  ), 0) as total_risks,

  -- ===== INTEGRAÇÕES =====
  coalesce((
    select count(*)::int from public.project_integrations pi
    where pi.project_id = p.id and pi.deleted_at is null
  ), 0) as integrations_total,

  coalesce((
    select count(*)::int from public.project_integrations pi
    where pi.project_id = p.id and pi.status = 'ativa' and pi.deleted_at is null
  ), 0) as integrations_active,

  -- ===== TICKETS DE SUPORTE (futuro) =====
  0 as tickets_open,
  0 as tickets_resolved_30d,
  0::numeric as avg_resolution_hours,

  -- ===== TOKENS DE IA (futuro) =====
  0::numeric as tokens_consumed_month_brl,
  coalesce((
    select mc.token_budget_brl
    from public.maintenance_contracts mc
    where mc.project_id = p.id
      and mc.status = 'active'
      and mc.deleted_at is null
    limit 1
  ), 0) as tokens_budget_brl,
  0::numeric as tokens_consumption_percent,

  -- ===== TIME ALOCADO =====
  coalesce((
    select count(distinct pa.actor_id)::int
    from public.project_actors pa
    where pa.project_id = p.id and pa.ended_at is null
  ), 0) as actors_allocated,

  -- ===== METADADOS =====
  p.estimated_delivery_date,
  p.start_date,
  p.status as project_status,
  p.created_at,
  p.updated_at,
  p.deleted_at
from public.projects p
where p.deleted_at is null;

comment on view public.project_metrics is
'View agregadora de métricas por projeto em tempo real. Princípios 2.14 e 2.15 do ARCHITECTURE.md. Módulos ativos: Financeiro, Marcos, Dependências, Riscos, Integrações, Contratos, Time. Placeholders (0): Tarefas, Suporte, Tokens.';

grant select on public.project_metrics to authenticated;
grant select on public.project_metrics to anon;