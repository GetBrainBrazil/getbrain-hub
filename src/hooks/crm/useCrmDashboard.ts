import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CrmActor, CrmCompany, Deal, DealActivity, DealStage, LeadStatus } from '@/types/crm';

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

export function useCrmFunnelMetrics() {
  return useQuery({ queryKey: ['crm-funnel-metrics'], queryFn: async (): Promise<FunnelMetrics | null> => { const { data, error } = await sb.from('crm_funnel_metrics').select('*').maybeSingle(); if (error) throw error; return data as FunnelMetrics | null; }, staleTime: 60_000 });
}

export function useCrmSourcePerformance(daysBack: number) {
  return useQuery({ queryKey: ['crm-source-performance', daysBack], queryFn: async (): Promise<SourcePerformance[]> => { const { data, error } = await sb.rpc('get_crm_source_performance', { p_days_back: daysBack }); if (error) throw error; return (data ?? []) as SourcePerformance[]; }, staleTime: 60_000 });
}

export function useCrmOwnerPerformance(daysBack: number) {
  return useQuery({ queryKey: ['crm-owner-performance', daysBack], queryFn: async (): Promise<OwnerPerformance[]> => { const { data, error } = await sb.rpc('get_crm_owner_performance', { p_days_back: daysBack }); if (error) throw error; return (data ?? []) as OwnerPerformance[]; }, staleTime: 60_000 });
}

export function useCrmVelocityByStage(daysBack: number) {
  return useQuery({ queryKey: ['crm-velocity-stage', daysBack], queryFn: async (): Promise<StageVelocity[]> => { const { data, error } = await sb.rpc('get_crm_velocity_by_stage', { p_days_back: daysBack }); if (error) throw error; return (data ?? []) as StageVelocity[]; }, staleTime: 60_000 });
}

export function useCrmDashboardDeals(daysBack: number) {
  return useQuery({ queryKey: ['crm-dashboard-deals', daysBack], queryFn: async (): Promise<Deal[]> => { const { data, error } = await sb.from('deals').select('id, code, title, stage, estimated_value, probability_pct, expected_close_date, stage_changed_at, created_at, closed_at, company_id, owner_actor_id, project_type').is('deleted_at', null).gte('created_at', new Date(Date.now() - daysBack * 86400000).toISOString()).order('created_at', { ascending: false }); if (error) throw error; const rows = (data ?? []) as Deal[]; const companyIds = [...new Set(rows.map((d) => d.company_id).filter(Boolean))]; const actorIds = [...new Set(rows.map((d) => d.owner_actor_id).filter(Boolean))]; const [{ data: companies }, { data: actors }] = await Promise.all([companyIds.length ? sb.from('companies').select('id, legal_name, trade_name, relationship_status').in('id', companyIds) : { data: [] }, actorIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] }]); const companyMap = new Map<string, CrmCompany>(((companies ?? []) as CrmCompany[]).map((c) => [c.id, c])); const actorMap = new Map<string, CrmActor>(((actors ?? []) as CrmActor[]).map((a) => [a.id, a])); return rows.map((d) => ({ ...d, estimated_value: d.estimated_value == null ? null : Number(d.estimated_value), company: companyMap.get(d.company_id) ?? null, owner: d.owner_actor_id ? actorMap.get(d.owner_actor_id) ?? null : null })); }, staleTime: 60_000 });
}

export function useCrmDashboardAlerts() {
  return useQuery({ queryKey: ['crm-dashboard-alerts'], queryFn: async (): Promise<CrmAlert[]> => { const now = new Date().toISOString(); const stale = new Date(Date.now() - 14 * 86400000).toISOString(); const leadStale = new Date(Date.now() - 7 * 86400000).toISOString(); const [{ data: overdueDeals }, { data: stalledDeals }, { data: readyLeads }, { data: lateActivities }] = await Promise.all([sb.from('deals').select('id, code, title, expected_close_date').is('deleted_at', null).not('stage', 'in', '(fechado_ganho,fechado_perdido)').lt('expected_close_date', new Date().toISOString().slice(0, 10)).limit(20), sb.from('deals').select('id, code, title, stage_changed_at').is('deleted_at', null).not('stage', 'in', '(fechado_ganho,fechado_perdido)').lt('stage_changed_at', stale).limit(20), sb.from('leads').select('id, code, title, updated_at').is('deleted_at', null).eq('status', 'triagem_feita' satisfies LeadStatus).lt('updated_at', leadStale).limit(20), sb.from('deal_activities').select('id, title, scheduled_at, deal_id, lead_id').is('deleted_at', null).lt('scheduled_at', now).is('happened_at', null).limit(20)]); const alerts: CrmAlert[] = []; type AlertRow = { id: string; code?: string; title: string; expected_close_date?: string; stage_changed_at?: string; updated_at?: string; scheduled_at?: string }; const push = (id: string, tone: CrmAlert['tone'], icon: string, title: string, rows: AlertRow[], href: (r: AlertRow) => string, meta: (r: AlertRow) => string) => { if (rows.length) alerts.push({ id, tone, icon, title, count: rows.length, items: rows.map((r) => ({ id: r.id, label: r.code ? `${r.code} · ${r.title}` : r.title, href: href(r), meta: meta(r) })) }); }; push('overdue', 'danger', '⏰', 'deals com prazo vencido', overdueDeals ?? [], (r) => `/crm/deals/${r.code}`, (r) => r.expected_close_date ?? 'sem prazo'); push('stalled', 'warning', '🐌', 'deals parados há mais de 14 dias', stalledDeals ?? [], (r) => `/crm/deals/${r.code}`, (r) => r.stage_changed_at ? new Date(r.stage_changed_at).toLocaleDateString('pt-BR') : '-'); push('ready', 'warning', '🎯', 'leads prontos aguardando conversão', readyLeads ?? [], (r) => `/crm/leads/${r.code}`, (r) => r.updated_at ? new Date(r.updated_at).toLocaleDateString('pt-BR') : '-'); push('late', 'warning', '📞', 'atividades atrasadas', lateActivities ?? [], () => '/crm/calendario', (r) => r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('pt-BR') : '-'); return alerts; }, staleTime: 60_000 });
}

export function useCrmRecentActivity(days: number) {
  return useQuery({ queryKey: ['crm-recent-activity', days], queryFn: async (): Promise<RecentActivity[]> => { const since = new Date(Date.now() - days * 86400000).toISOString(); const [{ data: audits }, { data: activities }] = await Promise.all([sb.from('audit_logs').select('id, created_at, action, entity_type, entity_id').in('entity_type', ['deals', 'leads']).gte('created_at', since).order('created_at', { ascending: false }).limit(80), sb.from('deal_activities').select('id, title, type, happened_at, deal_id, lead_id').is('deleted_at', null).not('happened_at', 'is', null).gte('happened_at', since).order('happened_at', { ascending: false }).limit(80)]); const items = [...((audits ?? []) as any[]).map((a) => ({ id: a.id, date: a.created_at, icon: a.entity_type === 'deals' ? '🎯' : '👤', label: `${a.entity_type === 'deals' ? 'Deal' : 'Lead'} ${String(a.action).toLowerCase()}` })), ...((activities ?? []) as any[]).map((a) => ({ id: a.id, date: a.happened_at, icon: a.type === 'reuniao_presencial' ? '👥' : a.type === 'ligacao' ? '📞' : a.type === 'email' ? '📧' : '💬', label: a.title }))]; const groups = new Map<string, RecentActivity['items']>(); for (const item of items) { const day = new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); groups.set(day, [...(groups.get(day) ?? []), { id: item.id, icon: item.icon, label: item.label }]); } return Array.from(groups.entries()).map(([day, groupItems]) => ({ day, items: groupItems })); }, staleTime: 60_000 });
}

export function useCrmUpcomingActivities(limit: number) {
  return useQuery({ queryKey: ['crm-upcoming-activities', limit], queryFn: async (): Promise<DealActivity[]> => { const { data, error } = await sb.from('deal_activities').select('*').is('deleted_at', null).gt('scheduled_at', new Date().toISOString()).is('happened_at', null).order('scheduled_at', { ascending: true }).limit(limit); if (error) throw error; return (data ?? []) as DealActivity[]; }, staleTime: 60_000 });
}

export function useUpdateCalendarActivity() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, updates }: { id: string; updates: Partial<DealActivity> }) => { const { error } = await sb.from('deal_activities').update(updates).eq('id', id); if (error) throw error; }, onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-calendar-events'] }); qc.invalidateQueries({ queryKey: ['crm-upcoming-activities'] }); qc.invalidateQueries({ queryKey: ['crm-dashboard-alerts'] }); } });
}
