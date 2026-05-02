import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityType, CrmActor, DealActivity } from '@/types/crm';

const sb = supabase as never as { from: (table: string) => any };

type CalendarFilters = { start: Date; end: Date; types?: ActivityType[]; owners?: string[]; statuses?: string[] };

export function useCalendarEvents(filters: CalendarFilters) {
  return useQuery({
    queryKey: ['crm-calendar-events', filters.start.toISOString(), filters.end.toISOString(), filters.types, filters.owners, filters.statuses],
    queryFn: async (): Promise<DealActivity[]> => {
      const startIso = filters.start.toISOString();
      const endIso = filters.end.toISOString();
      let query = sb
        .from('deal_activities')
        .select('*')
        .is('deleted_at', null)
        .or(
          `and(scheduled_at.gte.${startIso},scheduled_at.lt.${endIso}),and(happened_at.gte.${startIso},happened_at.lt.${endIso})`,
        )
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      if (filters.types?.length) query = query.in('type', filters.types);
      if (filters.owners?.length) query = query.in('owner_actor_id', filters.owners);
      const { data, error } = await query;
      if (error) throw error;
      let rows = (data ?? []) as DealActivity[];
      if (filters.statuses?.length) {
        const now = Date.now();
        rows = rows.filter((activity) => {
          const status = activity.happened_at ? 'realizadas' : activity.scheduled_at && new Date(activity.scheduled_at).getTime() < now ? 'atrasadas' : 'agendadas';
          return filters.statuses?.includes(status);
        });
      }
      const dealIds = [...new Set(rows.map((r) => r.deal_id).filter(Boolean))];
      const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))];
      const ownerIds = [...new Set(rows.map((r) => r.owner_actor_id).filter(Boolean))];
      const [{ data: deals }, { data: leads }, { data: actors }] = await Promise.all([
        dealIds.length ? sb.from('deals').select('id, code').in('id', dealIds) : { data: [] },
        leadIds.length ? sb.from('leads').select('id, code').in('id', leadIds) : { data: [] },
        ownerIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', ownerIds) : { data: [] },
      ]);
      const dealMap = new Map<string, { id: string; code: string }>((deals ?? []).map((d: { id: string; code: string }) => [d.id, d]));
      const leadMap = new Map<string, { id: string; code: string }>((leads ?? []).map((l: { id: string; code: string }) => [l.id, l]));
      const actorMap = new Map<string, CrmActor>(((actors ?? []) as CrmActor[]).map((a) => [a.id, a]));
      return rows.map((row) => ({ ...row, deal_code: row.deal_id ? dealMap.get(row.deal_id)?.code ?? null : null, lead_code: row.lead_id ? leadMap.get(row.lead_id)?.code ?? null : null, owner: row.owner_actor_id ? actorMap.get(row.owner_actor_id) ?? null : null }));
    },
    staleTime: 30_000,
  });
}

/** KPIs operacionais do calendário: hoje, atrasadas, esta semana, realizadas últimos 7 dias. */
export function useCalendarKpis(filters: { types?: ActivityType[]; owners?: string[] }) {
  return useQuery({
    queryKey: ['crm-calendar-kpis', filters.types, filters.owners],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
      const sevenAgo = new Date(now); sevenAgo.setDate(now.getDate() - 7);

      const apply = (q: any) => {
        let r = q;
        if (filters.types?.length) r = r.in('type', filters.types);
        if (filters.owners?.length) r = r.in('owner_actor_id', filters.owners);
        return r;
      };

      const [hoje, atrasadas, semana, feitas7d] = await Promise.all([
        apply((sb as any).from('deal_activities').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('happened_at', null)
          .gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString())),
        apply((sb as any).from('deal_activities').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('happened_at', null)
          .lt('scheduled_at', now.toISOString())),
        apply((sb as any).from('deal_activities').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('happened_at', null)
          .gte('scheduled_at', now.toISOString()).lte('scheduled_at', weekEnd.toISOString())),
        apply((sb as any).from('deal_activities').select('id', { count: 'exact', head: true }).is('deleted_at', null)
          .gte('happened_at', sevenAgo.toISOString())),
      ]);

      return {
        hoje: hoje.count ?? 0,
        atrasadas: atrasadas.count ?? 0,
        semana: semana.count ?? 0,
        feitas7d: feitas7d.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}
