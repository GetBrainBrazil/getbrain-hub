import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityType, CrmActor, CrmCompany, Deal, DealActivity, DealStage, LeadStatus } from '@/types/crm';

const sb = supabase as never as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
};

type FunnelMetrics = {
  leads_created_30d: number; leads_created_90d: number; leads_converted_30d: number; leads_converted_90d: number; leads_discarded_total: number;
  leads_novo_current: number; leads_triagem_agendada_current: number; leads_triagem_feita_current: number; leads_ready_stale: number;
  deals_created_30d: number; deals_created_90d: number; deals_won_30d: number; deals_won_90d: number; deals_lost_90d: number;
  revenue_won_30d: number; revenue_won_90d: number; avg_deal_cycle_days: number; deals_stalled_14d: number; deals_overdue: number;
  deals_presencial_agendada_current: number; deals_presencial_feita_current: number; deals_orcamento_enviado_current: number; deals_em_negociacao_current: number;
  overdue_activities: number; lead_conversion_rate_30d: number; deal_win_rate_30d: number;
};

export type SourcePerformance = { source: string; leads_total: number; leads_converted: number; leads_discarded: number; conversion_rate_pct: number; deals_won: number; revenue_generated: number; avg_ticket: number };
export type OwnerPerformance = { owner_actor_id: string; owner_name: string; leads_handled: number; leads_converted: number; deals_handled: number; deals_won: number; deals_lost: number; win_rate_pct: number; revenue_generated: number; activities_completed: number };
export type StageVelocity = { stage: DealStage; deals_passed_through: number; avg_days_in_stage: number; median_days_in_stage: number };
export type CrmAlert = { id: string; tone: 'danger' | 'warning'; icon: string; title: string; count: number; items: { id: string; label: string; href: string; meta: string }[] };
export type RecentActivity = { day: string; items: { id: string; icon: string; label: string; href?: string }[] };
export type CrmDashboardSnapshotMetrics = {
  leads_created: number;
  leads_converted: number;
  deals_created: number;
  deals_open: number;
  deals_won: number;
  deals_lost: number;
  revenue_won: number;
  pipeline_total: number;
  weighted_pipeline: number;
  activities_completed: number;
  lead_conversion_rate: number | null;
  win_rate: number | null;
};
export type CrmDashboardSnapshot = {
  current: CrmDashboardSnapshotMetrics;
  previous: CrmDashboardSnapshotMetrics;
};

const EMPTY_SNAPSHOT_METRICS: CrmDashboardSnapshotMetrics = {
  leads_created: 0,
  leads_converted: 0,
  deals_created: 0,
  deals_open: 0,
  deals_won: 0,
  deals_lost: 0,
  revenue_won: 0,
  pipeline_total: 0,
  weighted_pipeline: 0,
  activities_completed: 0,
  lead_conversion_rate: null,
  win_rate: null,
};

function buildSnapshotMetrics(): CrmDashboardSnapshotMetrics {
  return { ...EMPTY_SNAPSHOT_METRICS };
}

function finalizeSnapshotMetrics(metrics: CrmDashboardSnapshotMetrics): CrmDashboardSnapshotMetrics {
  const closedDeals = metrics.deals_won + metrics.deals_lost;
  return {
    ...metrics,
    lead_conversion_rate: metrics.leads_created > 0 ? Number(((metrics.leads_converted / metrics.leads_created) * 100).toFixed(2)) : null,
    win_rate: closedDeals > 0 ? Number(((metrics.deals_won / closedDeals) * 100).toFixed(2)) : null,
  };
}

async function hydrateActivityRelations(rows: DealActivity[]): Promise<DealActivity[]> {
  if (!rows.length) return [];

  const dealIds = [...new Set(rows.map((row) => row.deal_id).filter(Boolean))];
  const leadIds = [...new Set(rows.map((row) => row.lead_id).filter(Boolean))];
  const ownerIds = [...new Set(rows.map((row) => row.owner_actor_id).filter(Boolean))];

  const [{ data: deals }, { data: leads }, { data: actors }] = await Promise.all([
    dealIds.length ? sb.from('deals').select('id, code').in('id', dealIds) : { data: [] },
    leadIds.length ? sb.from('leads').select('id, code').in('id', leadIds) : { data: [] },
    ownerIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', ownerIds) : { data: [] },
  ]);

  const dealMap = new Map<string, { id: string; code: string }>((deals ?? []).map((deal: { id: string; code: string }) => [deal.id, deal]));
  const leadMap = new Map<string, { id: string; code: string }>((leads ?? []).map((lead: { id: string; code: string }) => [lead.id, lead]));
  const actorMap = new Map<string, CrmActor>(((actors ?? []) as CrmActor[]).map((actor) => [actor.id, actor]));

  return rows.map((row) => ({
    ...row,
    deal_code: row.deal_id ? dealMap.get(row.deal_id)?.code ?? null : null,
    lead_code: row.lead_id ? leadMap.get(row.lead_id)?.code ?? null : null,
    owner: row.owner_actor_id ? actorMap.get(row.owner_actor_id) ?? null : null,
  }));
}

export function useCrmFunnelMetrics() {
  return useQuery({
    queryKey: ['crm-funnel-metrics'],
    queryFn: async (): Promise<FunnelMetrics | null> => {
      const { data, error } = await sb.from('crm_funnel_metrics').select('*').maybeSingle();
      if (error) throw error;
      return data as FunnelMetrics | null;
    },
    staleTime: 60_000,
  });
}

export function useCrmSourcePerformance(daysBack: number) {
  return useQuery({
    queryKey: ['crm-source-performance', daysBack],
    queryFn: async (): Promise<SourcePerformance[]> => {
      const { data, error } = await sb.rpc('get_crm_source_performance', { p_days_back: daysBack });
      if (error) throw error;
      return (data ?? []) as SourcePerformance[];
    },
    staleTime: 60_000,
  });
}

export function useCrmOwnerPerformance(daysBack: number) {
  return useQuery({
    queryKey: ['crm-owner-performance', daysBack],
    queryFn: async (): Promise<OwnerPerformance[]> => {
      const { data, error } = await sb.rpc('get_crm_owner_performance', { p_days_back: daysBack });
      if (error) throw error;
      return (data ?? []) as OwnerPerformance[];
    },
    staleTime: 60_000,
  });
}

export function useCrmVelocityByStage(daysBack: number) {
  return useQuery({
    queryKey: ['crm-velocity-stage', daysBack],
    queryFn: async (): Promise<StageVelocity[]> => {
      const { data, error } = await sb.rpc('get_crm_velocity_by_stage', { p_days_back: daysBack });
      if (error) throw error;
      return (data ?? []) as StageVelocity[];
    },
    staleTime: 60_000,
  });
}

export function useCrmDashboardDeals(daysBack: number) {
  return useQuery({
    queryKey: ['crm-dashboard-deals', daysBack],
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await sb
        .from('deals')
        .select('id, code, title, stage, estimated_value, probability_pct, expected_close_date, stage_changed_at, created_at, closed_at, company_id, owner_actor_id, project_type')
        .is('deleted_at', null)
        .gte('created_at', new Date(Date.now() - daysBack * 86400000).toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Deal[];
      const companyIds = [...new Set(rows.map((deal) => deal.company_id).filter(Boolean))];
      const actorIds = [...new Set(rows.map((deal) => deal.owner_actor_id).filter(Boolean))];
      const [{ data: companies }, { data: actors }] = await Promise.all([
        companyIds.length ? sb.from('companies').select('id, legal_name, trade_name, relationship_status').in('id', companyIds) : { data: [] },
        actorIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] },
      ]);
      const companyMap = new Map<string, CrmCompany>(((companies ?? []) as CrmCompany[]).map((company) => [company.id, company]));
      const actorMap = new Map<string, CrmActor>(((actors ?? []) as CrmActor[]).map((actor) => [actor.id, actor]));
      return rows.map((deal) => ({
        ...deal,
        estimated_value: deal.estimated_value == null ? null : Number(deal.estimated_value),
        company: companyMap.get(deal.company_id) ?? null,
        owner: deal.owner_actor_id ? actorMap.get(deal.owner_actor_id) ?? null : null,
      }));
    },
    staleTime: 60_000,
  });
}

export function useCrmDashboardSnapshot(daysBack: number) {
  return useQuery({
    queryKey: ['crm-dashboard-snapshot', daysBack],
    queryFn: async (): Promise<CrmDashboardSnapshot> => {
      const now = Date.now();
      const currentStart = now - daysBack * 86400000;
      const previousStart = currentStart - daysBack * 86400000;

      const [{ data: leads, error: leadsError }, { data: deals, error: dealsError }, { data: activities, error: activitiesError }] = await Promise.all([
        sb.from('leads').select('id, created_at, status, converted_at').is('deleted_at', null).gte('created_at', new Date(previousStart).toISOString()),
        sb
          .from('deals')
          .select('id, created_at, closed_at, stage, estimated_value, probability_pct')
          .is('deleted_at', null)
          .gte('created_at', new Date(previousStart).toISOString()),
        sb
          .from('deal_activities')
          .select('id, happened_at')
          .is('deleted_at', null)
          .or(`happened_at.gte.${new Date(previousStart).toISOString()},scheduled_at.gte.${new Date(previousStart).toISOString()}`),
      ]);

      if (leadsError) throw leadsError;
      if (dealsError) throw dealsError;
      if (activitiesError) throw activitiesError;

      const current = buildSnapshotMetrics();
      const previous = buildSnapshotMetrics();

      const getBucket = (dateValue: string | null | undefined) => {
        if (!dateValue) return null;
        const timestamp = new Date(dateValue).getTime();
        if (timestamp >= currentStart && timestamp <= now) return current;
        if (timestamp >= previousStart && timestamp < currentStart) return previous;
        return null;
      };

      for (const lead of (leads ?? []) as { created_at: string; status: LeadStatus; converted_at: string | null }[]) {
        const createdBucket = getBucket(lead.created_at);
        if (createdBucket) createdBucket.leads_created += 1;

        if (lead.status === 'convertido' && lead.converted_at) {
          const convertedBucket = getBucket(lead.converted_at);
          if (convertedBucket) convertedBucket.leads_converted += 1;
        }
      }

      for (const deal of (deals ?? []) as { created_at: string; closed_at: string | null; stage: DealStage; estimated_value: number | null; probability_pct: number }[]) {
        const createdBucket = getBucket(deal.created_at);
        const estimatedValue = Number(deal.estimated_value ?? 0);

        if (createdBucket) {
          createdBucket.deals_created += 1;
          if (!['fechado_ganho', 'fechado_perdido'].includes(deal.stage)) {
            createdBucket.deals_open += 1;
            createdBucket.pipeline_total += estimatedValue;
            createdBucket.weighted_pipeline += estimatedValue * (Number(deal.probability_pct ?? 0) / 100);
          }
        }

        if (deal.closed_at && deal.stage === 'fechado_ganho') {
          const wonBucket = getBucket(deal.closed_at);
          if (wonBucket) {
            wonBucket.deals_won += 1;
            wonBucket.revenue_won += estimatedValue;
          }
        }

        if (deal.closed_at && deal.stage === 'fechado_perdido') {
          const lostBucket = getBucket(deal.closed_at);
          if (lostBucket) lostBucket.deals_lost += 1;
        }
      }

      for (const activity of (activities ?? []) as { happened_at: string | null }[]) {
        if (!activity.happened_at) continue;
        const bucket = getBucket(activity.happened_at);
        if (bucket) bucket.activities_completed += 1;
      }

      return {
        current: finalizeSnapshotMetrics(current),
        previous: finalizeSnapshotMetrics(previous),
      };
    },
    staleTime: 60_000,
  });
}

export function useCrmDashboardAlerts() {
  return useQuery({
    queryKey: ['crm-dashboard-alerts'],
    queryFn: async (): Promise<CrmAlert[]> => {
      const now = new Date().toISOString();
      const stale = new Date(Date.now() - 14 * 86400000).toISOString();
      const leadStale = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: overdueDeals }, { data: stalledDeals }, { data: readyLeads }, { data: lateActivities }] = await Promise.all([
        sb.from('deals').select('id, code, title, expected_close_date').is('deleted_at', null).not('stage', 'in', '(fechado_ganho,fechado_perdido)').lt('expected_close_date', new Date().toISOString().slice(0, 10)).limit(20),
        sb.from('deals').select('id, code, title, stage_changed_at').is('deleted_at', null).not('stage', 'in', '(fechado_ganho,fechado_perdido)').lt('stage_changed_at', stale).limit(20),
        sb.from('leads').select('id, code, title, updated_at').is('deleted_at', null).eq('status', 'triagem_feita' satisfies LeadStatus).lt('updated_at', leadStale).limit(20),
        sb.from('deal_activities').select('id, title, scheduled_at, deal_id, lead_id').is('deleted_at', null).lt('scheduled_at', now).is('happened_at', null).limit(20),
      ]);
      const alerts: CrmAlert[] = [];
      type AlertRow = { id: string; code?: string; title: string; expected_close_date?: string; stage_changed_at?: string; updated_at?: string; scheduled_at?: string };
      const push = (id: string, tone: CrmAlert['tone'], icon: string, title: string, rows: AlertRow[], href: (row: AlertRow) => string, meta: (row: AlertRow) => string) => {
        if (rows.length) {
          alerts.push({
            id,
            tone,
            icon,
            title,
            count: rows.length,
            items: rows.map((row) => ({
              id: row.id,
              label: row.code ? `${row.code} · ${row.title}` : row.title,
              href: href(row),
              meta: meta(row),
            })),
          });
        }
      };
      push('overdue', 'danger', '⏰', 'deals com prazo vencido', overdueDeals ?? [], (row) => `/crm/deals/${row.code}`, (row) => row.expected_close_date ?? 'sem prazo');
      push('stalled', 'warning', '🐌', 'deals parados há mais de 14 dias', stalledDeals ?? [], (row) => `/crm/deals/${row.code}`, (row) => (row.stage_changed_at ? new Date(row.stage_changed_at).toLocaleDateString('pt-BR') : '-'));
      push('ready', 'warning', '🎯', 'leads prontos aguardando conversão', readyLeads ?? [], (row) => `/crm/leads/${row.code}`, (row) => (row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : '-'));
      push('late', 'warning', '📞', 'atividades atrasadas', lateActivities ?? [], () => '/crm/calendario', (row) => (row.scheduled_at ? new Date(row.scheduled_at).toLocaleString('pt-BR') : '-'));
      return alerts;
    },
    staleTime: 60_000,
  });
}

export function useCrmRecentActivity(days: number) {
  return useQuery({
    queryKey: ['crm-recent-activity', days],
    queryFn: async (): Promise<RecentActivity[]> => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [{ data: audits }, { data: activities }] = await Promise.all([
        sb.from('audit_logs').select('id, created_at, action, entity_type, entity_id').in('entity_type', ['deals', 'leads']).gte('created_at', since).order('created_at', { ascending: false }).limit(80),
        sb.from('deal_activities').select('id, title, type, happened_at, deal_id, lead_id').is('deleted_at', null).not('happened_at', 'is', null).gte('happened_at', since).order('happened_at', { ascending: false }).limit(80),
      ]);

      const auditRows = (audits ?? []) as { id: string; created_at: string; action: string; entity_type: string; entity_id: string }[];
      const activityRows = (activities ?? []) as (DealActivity & { happened_at: string })[];
      const dealIds = [
        ...new Set([
          ...auditRows.filter((row) => row.entity_type === 'deals').map((row) => row.entity_id),
          ...activityRows.map((row) => row.deal_id).filter(Boolean),
        ]),
      ];
      const leadIds = [
        ...new Set([
          ...auditRows.filter((row) => row.entity_type === 'leads').map((row) => row.entity_id),
          ...activityRows.map((row) => row.lead_id).filter(Boolean),
        ]),
      ];

      const [{ data: deals }, { data: leads }] = await Promise.all([
        dealIds.length ? sb.from('deals').select('id, code').in('id', dealIds) : { data: [] },
        leadIds.length ? sb.from('leads').select('id, code').in('id', leadIds) : { data: [] },
      ]);

      const dealMap = new Map<string, string>((deals ?? []).map((deal: { id: string; code: string }) => [deal.id, deal.code]));
      const leadMap = new Map<string, string>((leads ?? []).map((lead: { id: string; code: string }) => [lead.id, lead.code]));

      const items = [
        ...auditRows.map((audit) => ({
          id: audit.id,
          date: audit.created_at,
          icon: audit.entity_type === 'deals' ? '🎯' : '👤',
          label: `${audit.entity_type === 'deals' ? 'Deal' : 'Lead'} ${String(audit.action).toLowerCase()}`,
          href: audit.entity_type === 'deals' ? `/crm/deals/${dealMap.get(audit.entity_id)}` : `/crm/leads/${leadMap.get(audit.entity_id)}`,
        })),
        ...activityRows.map((activity) => ({
          id: activity.id,
          date: activity.happened_at,
          icon: activity.type === 'reuniao_presencial' ? '👥' : activity.type === 'ligacao' ? '📞' : activity.type === 'email' ? '📧' : '💬',
          label: activity.title,
          href: activity.deal_id ? `/crm/deals/${dealMap.get(activity.deal_id)}` : activity.lead_id ? `/crm/leads/${leadMap.get(activity.lead_id)}` : '/crm/calendario',
        })),
      ].filter((item) => item.href && !item.href.endsWith('undefined'));

      const groups = new Map<string, RecentActivity['items']>();
      for (const item of items) {
        const day = new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
        groups.set(day, [...(groups.get(day) ?? []), { id: item.id, icon: item.icon, label: item.label, href: item.href }]);
      }

      return Array.from(groups.entries()).map(([day, groupItems]) => ({ day, items: groupItems }));
    },
    staleTime: 60_000,
  });
}

export function useCrmUpcomingActivities(limit: number) {
  return useQuery({
    queryKey: ['crm-upcoming-activities', limit],
    queryFn: async (): Promise<DealActivity[]> => {
      const { data, error } = await sb.from('deal_activities').select('*').is('deleted_at', null).gt('scheduled_at', new Date().toISOString()).is('happened_at', null).order('scheduled_at', { ascending: true }).limit(limit);
      if (error) throw error;
      return hydrateActivityRelations((data ?? []) as DealActivity[]);
    },
    staleTime: 60_000,
  });
}

export function useUpdateCalendarActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DealActivity> }) => {
      const { error } = await sb.from('deal_activities').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-calendar-events'] });
      qc.invalidateQueries({ queryKey: ['crm-upcoming-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-dashboard-alerts'] });
      qc.invalidateQueries({ queryKey: ['crm-recent-activity'] });
    },
  });
}

export function useCreateCalendarActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; type: ActivityType; scheduled_at: string; duration_minutes?: number | null; owner_actor_id?: string | null; description?: string | null }) => {
      const { data, error } = await sb.from('deal_activities').insert({ ...payload, organization_id: '00000000-0000-0000-0000-000000000001', deal_id: null, lead_id: null }).select().single();
      if (error) throw error;
      return data as DealActivity;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-calendar-events'] });
      qc.invalidateQueries({ queryKey: ['crm-upcoming-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-dashboard-alerts'] });
    },
  });
}
