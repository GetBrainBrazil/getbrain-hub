/**
 * Hooks do Dashboard executivo do CRM (09F-1).
 * Lê 3 views agregadas + listas auxiliares (deals parados, próximas atividades).
 * Filtros (período/owner/tipo) aplicados client-side em cima dos resultados — as views
 * são pequenas e pré-agregadas por org. Para listas (parados/atividades), o filtro vai no SQL.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealStage } from '@/types/crm';

export type DashboardFilters = {
  periodDays: number; // 7 | 30 | 90
  ownerIds: string[];
  projectTypes: string[];
};

export type CrmDashboardMetrics = {
  organization_id: string;
  deals_abertos_total: number;
  pipeline_value_total: number;
  deals_parados_7d: number;
  atividades_proximos_7d: number;
  ganhos_30d: number;
  fechados_30d: number;
  ganhos_30d_anterior: number;
};

export type CrmPipelineByStage = {
  organization_id: string;
  stage: DealStage;
  deals_count: number;
  stage_value: number;
  avg_days_in_stage: number;
};

export type CrmDashboardSparkline = {
  organization_id: string;
  dia: string;
  deals_parados: number;
  pipeline_value: number;
};

const sb = supabase as unknown as {
  from: (t: string) => any;
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['crm-dashboard-metrics-v2'],
    staleTime: 60_000,
    queryFn: async (): Promise<CrmDashboardMetrics | null> => {
      const { data, error } = await sb.from('crm_dashboard_metrics').select('*').maybeSingle();
      if (error) throw error;
      return (data as CrmDashboardMetrics) ?? null;
    },
  });
}

export function usePipelineByStage() {
  return useQuery({
    queryKey: ['crm-pipeline-by-stage'],
    staleTime: 60_000,
    queryFn: async (): Promise<CrmPipelineByStage[]> => {
      const { data, error } = await sb.from('crm_pipeline_by_stage').select('*');
      if (error) throw error;
      return (data as CrmPipelineByStage[]) ?? [];
    },
  });
}

export function useDashboardSparklines() {
  return useQuery({
    queryKey: ['crm-dashboard-sparklines'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CrmDashboardSparkline[]> => {
      const { data, error } = await sb
        .from('crm_dashboard_sparklines')
        .select('*')
        .order('dia', { ascending: true });
      if (error) throw error;
      return (data as CrmDashboardSparkline[]) ?? [];
    },
  });
}

export type DealParado = {
  id: string;
  code: string;
  title: string;
  stage: DealStage;
  estimated_value: number | null;
  owner_actor_id: string | null;
  company: { legal_name: string | null; trade_name: string | null } | null;
  owner: { display_name: string; avatar_url: string | null } | null;
  last_activity_at: string | null;
  last_activity_type: string | null;
  days_stale: number;
};

export function useDealsParados(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['crm-deals-parados', filters],
    staleTime: 30_000,
    queryFn: async (): Promise<DealParado[]> => {
      let q = sb
        .from('deals')
        .select(
          `id, code, title, stage, estimated_value, owner_actor_id, updated_at,
           company:companies(legal_name, trade_name),
           owner:actors!deals_owner_actor_id_fkey(display_name, avatar_url),
           activities:deal_activities(id, type, happened_at, scheduled_at, created_at, deleted_at)`,
        )
        .is('deleted_at', null)
        .not('stage', 'in', '(ganho,perdido)');

      if (filters.ownerIds.length) q = q.in('owner_actor_id', filters.ownerIds);
      if (filters.projectTypes.length) q = q.overlaps('project_type_v2', filters.projectTypes);

      const { data, error } = await q;
      if (error) throw error;

      const now = Date.now();
      const rows = (data ?? []).map((d: any) => {
        const acts = (d.activities ?? []).filter((a: any) => !a.deleted_at);
        const lastDate = acts.reduce((latest: number, a: any) => {
          const t = new Date(a.happened_at ?? a.created_at).getTime();
          return Math.max(latest, t);
        }, 0);
        const baseDate = lastDate || new Date(d.updated_at).getTime();
        const days = Math.floor((now - baseDate) / 86_400_000);
        const lastAct = acts
          .slice()
          .sort(
            (a: any, b: any) =>
              new Date(b.happened_at ?? b.created_at).getTime() -
              new Date(a.happened_at ?? a.created_at).getTime(),
          )[0];
        return {
          id: d.id,
          code: d.code,
          title: d.title,
          stage: d.stage,
          estimated_value: d.estimated_value,
          owner_actor_id: d.owner_actor_id,
          company: d.company,
          owner: d.owner,
          last_activity_at: lastAct ? (lastAct.happened_at ?? lastAct.created_at) : null,
          last_activity_type: lastAct?.type ?? null,
          days_stale: days,
        } as DealParado;
      });

      return rows
        .filter((r) => r.days_stale >= 7)
        .sort((a, b) => b.days_stale - a.days_stale)
        .slice(0, 10);
    },
  });
}

export type ProximaAtividade = {
  id: string;
  type: string;
  title: string;
  scheduled_at: string;
  deal_id: string | null;
  deal: { code: string; title: string } | null;
  owner: { display_name: string; avatar_url: string | null } | null;
};

export function useProximasAtividades(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['crm-proximas-atividades', filters],
    staleTime: 30_000,
    queryFn: async (): Promise<ProximaAtividade[]> => {
      const now = new Date();
      const inAWeek = new Date(now.getTime() + 7 * 86_400_000);

      let q = sb
        .from('deal_activities')
        .select(
          `id, type, title, scheduled_at, owner_actor_id, deal_id,
           deal:deals!inner(code, title, owner_actor_id, project_type_v2, deleted_at)`,
        )
        .is('deleted_at', null)
        .is('happened_at', null)
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', inAWeek.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []).filter((a: any) => a.deal && !a.deal.deleted_at);
      if (filters.ownerIds.length)
        rows = rows.filter((a: any) => filters.ownerIds.includes(a.deal.owner_actor_id));
      if (filters.projectTypes.length)
        rows = rows.filter((a: any) =>
          (a.deal.project_type_v2 ?? []).some((s: string) => filters.projectTypes.includes(s)),
        );

      rows = rows.slice(0, 10);

      // Lookup owners (activity.owner_actor_id || deal.owner_actor_id)
      const ownerIds = Array.from(
        new Set(
          rows
            .map((a: any) => a.owner_actor_id ?? a.deal.owner_actor_id)
            .filter(Boolean),
        ),
      );
      const ownersMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      if (ownerIds.length) {
        const { data: actors } = await sb
          .from('actors')
          .select('id, display_name, avatar_url')
          .in('id', ownerIds);
        (actors ?? []).forEach((a: any) =>
          ownersMap.set(a.id, { display_name: a.display_name, avatar_url: a.avatar_url }),
        );
      }

      return rows.map((a: any) => {
        const oid = a.owner_actor_id ?? a.deal.owner_actor_id;
        return {
          id: a.id,
          type: a.type,
          title: a.title,
          scheduled_at: a.scheduled_at,
          deal_id: a.deal_id,
          deal: a.deal ? { code: a.deal.code, title: a.deal.title } : null,
          owner: oid ? (ownersMap.get(oid) ?? null) : null,
        };
      });
    },
  });
}
