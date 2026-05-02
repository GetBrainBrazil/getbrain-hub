import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEAL_STAGE_PROBABILITY } from '@/constants/dealStages';
import type { CrmFilters, Deal, DealActivity, DealStage } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function hydrateDeals(rows: any[]): Promise<Deal[]> {
  if (!rows.length) return [];
  const companyIds = Array.from(new Set(rows.map((d) => d.company_id).filter(Boolean)));
  const personIds = Array.from(new Set(rows.map((d) => d.contact_person_id).filter(Boolean)));
  const actorIds = Array.from(new Set(rows.map((d) => d.owner_actor_id).filter(Boolean)));
  const leadIds = Array.from(new Set(rows.map((d) => d.origin_lead_id).filter(Boolean)));
  const dealIds = rows.map((d) => d.id);

  const [{ data: companies }, { data: people }, { data: actors }, { data: leads }, { data: activities }] = await Promise.all([
    companyIds.length ? sb.from('companies').select('id, legal_name, trade_name, relationship_status').in('id', companyIds) : { data: [] },
    personIds.length ? sb.from('people').select('id, full_name, email, phone, role_in_company').in('id', personIds) : { data: [] },
    actorIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] },
    leadIds.length ? sb.from('leads').select('id, source').in('id', leadIds) : { data: [] },
    sb.from('deal_activities').select('*').in('deal_id', dealIds).is('deleted_at', null).order('scheduled_at', { ascending: false }),
  ]);

  const companyMap = new Map((companies ?? []).map((x: any) => [x.id, x]));
  const personMap = new Map((people ?? []).map((x: any) => [x.id, x]));
  const actorMap = new Map((actors ?? []).map((x: any) => [x.id, x]));
  const leadMap = new Map<string, { id: string; source: string | null }>(
    ((leads ?? []) as any[]).map((x) => [x.id, x]),
  );
  const activityMap = new Map<string, DealActivity>();
  for (const a of (activities ?? []) as DealActivity[]) if (!activityMap.has(a.deal_id!)) activityMap.set(a.deal_id!, a);

  return rows.map((d) => ({
    ...d,
    estimated_value: d.estimated_value === null ? null : Number(d.estimated_value),
    estimated_implementation_value: d.estimated_implementation_value === null || d.estimated_implementation_value === undefined ? null : Number(d.estimated_implementation_value),
    estimated_mrr_value: d.estimated_mrr_value === null || d.estimated_mrr_value === undefined ? null : Number(d.estimated_mrr_value),
    company: companyMap.get(d.company_id) ?? null,
    contact: d.contact_person_id ? personMap.get(d.contact_person_id) ?? null : null,
    owner: d.owner_actor_id ? actorMap.get(d.owner_actor_id) ?? null : null,
    origin_source: d.origin_lead_id ? leadMap.get(d.origin_lead_id)?.source ?? null : 'direto',
    last_activity: activityMap.get(d.id) ?? null,
  })) as Deal[];
}

async function fetchDeals(filters?: CrmFilters): Promise<Deal[]> {
  const { data, error } = await sb.from('deals').select('*').is('deleted_at', null).order('stage_changed_at', { ascending: false });
  if (error) throw error;
  let deals = await hydrateDeals(data ?? []);
  if (filters?.ownerIds.length) deals = deals.filter((d) => d.owner_actor_id && filters.ownerIds.includes(d.owner_actor_id));
  if (filters?.sourceIds.length) deals = deals.filter((d) => filters.sourceIds.includes(d.origin_source || 'direto'));
  if (filters?.valueRange) deals = deals.filter((d) => (d.estimated_value ?? 0) >= filters.valueRange![0] && (d.estimated_value ?? 0) <= filters.valueRange![1]);
  if (filters?.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    deals = deals.filter((d) => [d.title, d.code, d.scope_summary ?? '', d.company?.legal_name ?? '', d.company?.trade_name ?? ''].join(' ').toLowerCase().includes(q));
  }
  return deals;
}

export function useDeals(filters?: CrmFilters) {
  return useQuery({ queryKey: ['crm-deals', filters], queryFn: () => fetchDeals(filters), staleTime: 30_000 });
}

export function useDeal(id: string | null) {
  return useQuery({
    queryKey: ['crm-deal', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from('deals').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const [deal] = await hydrateDeals(data ? [data] : []);
      return deal ?? null;
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Deal> & { title: string; company_id: string; stage: DealStage }) => {
      const { data, error } = await sb.from('deals').insert({
        organization_id: ORG_ID,
        title: payload.title,
        company_id: payload.company_id,
        contact_person_id: payload.contact_person_id || null,
        owner_actor_id: payload.owner_actor_id || null,
        stage: payload.stage,
        estimated_value: payload.estimated_value ?? null,
        probability_pct: payload.probability_pct ?? DEAL_STAGE_PROBABILITY[payload.stage],
        expected_close_date: payload.expected_close_date || null,
        project_type: payload.project_type || null,
        scope_summary: payload.scope_summary || null,
      }).select().single();
      if (error) throw error;
      return data as Deal;
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-deals'] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      const { error } = await sb.from('deals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSettled: (_d, _e, vars) => { qc.invalidateQueries({ queryKey: ['crm-deals'] }); qc.invalidateQueries({ queryKey: ['crm-deal', vars?.id] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, lost_reason, estimated_value }: { id: string; stage: DealStage; lost_reason?: string; estimated_value?: number }) => {
      const updates: any = { stage, probability_pct: DEAL_STAGE_PROBABILITY[stage] };
      if (lost_reason !== undefined) updates.lost_reason = lost_reason;
      if (estimated_value !== undefined) updates.estimated_value = estimated_value;
      const { error } = await sb.from('deals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage, lost_reason, estimated_value }) => {
      await qc.cancelQueries({ queryKey: ['crm-deals'] });
      const snapshots = qc.getQueriesData<Deal[]>({ queryKey: ['crm-deals'] });
      snapshots.forEach(([key, list]) => {
        if (!list) return;
        qc.setQueryData(key, list.map((d) => d.id === id ? { ...d, stage, probability_pct: DEAL_STAGE_PROBABILITY[stage], lost_reason: lost_reason ?? d.lost_reason, estimated_value: estimated_value ?? d.estimated_value } : d));
      });
      // Patch otimista também no detalhe do deal (qualquer code em cache)
      const detailEntries = qc.getQueriesData<Deal>({ queryKey: ['crm-deal-code'] });
      const detailSnapshots: Array<[readonly unknown[], Deal | undefined]> = [];
      detailEntries.forEach(([key, prev]) => {
        if (!prev || prev.id !== id) return;
        detailSnapshots.push([key, prev]);
        qc.setQueryData(key, {
          ...prev,
          stage,
          probability_pct: DEAL_STAGE_PROBABILITY[stage],
          lost_reason: lost_reason ?? prev.lost_reason,
          estimated_value: estimated_value ?? prev.estimated_value,
        });
      });
      return { snapshots, detailSnapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, snap]) => qc.setQueryData(key, snap));
      ctx?.detailSnapshots?.forEach(([key, snap]) => qc.setQueryData(key, snap));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deal-code'] });
      qc.invalidateQueries({ queryKey: ['crm-metrics'] });
      qc.invalidateQueries({ queryKey: ['crm-deal-audit'] });
    },
  });
}

export class DealDeleteBlockedError extends Error {
  constructor(message: string, public reason: 'has_project') {
    super(message);
    this.name = 'DealDeleteBlockedError';
  }
}

/**
 * Apaga o deal. Dois modos:
 *  - mode: 'safe' (default) — falha se houver projeto vinculado (proteção).
 *  - mode: 'cascade' — chama RPC que apaga o projeto + manutenção + contas +
 *    recorrências + propostas + atividades + dependências + deal numa
 *    transação atômica. Use só quando o usuário confirmar explicitamente.
 */
export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode = 'safe' }: { id: string; mode?: 'safe' | 'cascade' }) => {
      if (mode === 'cascade') {
        const { data, error } = await sb.rpc('cascade_delete_deal', { p_deal_id: id });
        if (error) throw error;
        return data as {
          project_deleted: boolean;
          project_id: string | null;
          movimentacoes_deleted: number;
          recurrences_deleted: number;
          contracts_deleted: number;
          proposals_deleted: number;
        };
      }

      // SAFE MODE — bloqueia se houver projeto vinculado.
      const { data: linkedProject } = await sb
        .from('projects')
        .select('id, code')
        .eq('source_deal_id', id)
        .maybeSingle();
      if (linkedProject) {
        throw new DealDeleteBlockedError(
          `Existe projeto vinculado (${linkedProject.code}). Use a exclusão em cascata ou apague o projeto primeiro.`,
          'has_project',
        );
      }

      await sb.from('deal_activities').delete().eq('deal_id', id);
      await sb.from('deal_dependencies').delete().eq('deal_id', id);
      const { error } = await sb.from('deals').delete().eq('id', id);
      if (error) throw error;
      return null;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deal-code'] });
      qc.invalidateQueries({ queryKey: ['crm-metrics'] });
      qc.invalidateQueries({ queryKey: ['crm-deals-indicators'] });
      qc.invalidateQueries({ queryKey: ['crm-dashboard-exec'] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-leads-full'] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projetos'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['recorrencias'] });
      if (vars?.id) qc.invalidateQueries({ queryKey: ['crm-deal', vars.id] });
    },
  });
}
