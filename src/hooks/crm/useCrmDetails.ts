import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEAL_STAGE_PROBABILITY } from '@/constants/dealStages';
import type { ActivityType, CompanyRelationshipStatus, CrmActor, CrmCompany, CrmPerson, Deal, DealActivity, DealStage, Lead, LeadStatus } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

type ProjectRow = { id: string; code: string; name: string; status: string; project_type: string; contract_value: number | null; start_date: string | null; owner_actor_id: string | null; owner?: CrmActor | null };
type AuditRow = { id: string; created_at: string; action: string; entity_type: string; changes: Record<string, unknown> | null; metadata: Record<string, unknown> | null; actor?: CrmActor | null };
type CompanyDetail = CrmCompany & { cnpj: string | null; industry: string | null; employee_count_range: string | null; website: string | null; linkedin_url: string | null; notes: string | null; created_at: string; updated_at: string; sector_id: string | null; client_type: import('@/types/crm').CompanyClientType | null; revenue_range: import('@/types/crm').CompanyRevenueRange | null; digital_maturity: number | null };
type CompanyStats = { leadsOpen: number; dealsOpen: number; dealsOpenValue: number; dealsWon: number; revenueWon: number; projects: number };

async function hydrateDeals(rows: unknown[]): Promise<Deal[]> {
  const list = rows as Deal[];
  if (!list.length) return [];
  const companyIds = Array.from(new Set(list.map((d) => d.company_id).filter(Boolean)));
  const personIds = Array.from(new Set(list.map((d) => d.contact_person_id).filter(Boolean)));
  const actorIds = Array.from(new Set(list.map((d) => d.owner_actor_id).filter(Boolean)));
  const leadIds = Array.from(new Set(list.map((d) => d.origin_lead_id).filter(Boolean)));
  const dealIds = list.map((d) => d.id);
  const [{ data: companies }, { data: people }, { data: actors }, { data: leads }, { data: activities }] = await Promise.all([
    companyIds.length ? sb.from('companies').select('id, legal_name, trade_name, relationship_status').in('id', companyIds) : { data: [] },
    personIds.length ? sb.from('people').select('id, full_name, email, phone, role_in_company').in('id', personIds) : { data: [] },
    actorIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] },
    leadIds.length ? sb.from('leads').select('id, code, source').in('id', leadIds) : { data: [] },
    dealIds.length ? sb.from('deal_activities').select('*').in('deal_id', dealIds).is('deleted_at', null).order('scheduled_at', { ascending: false }) : { data: [] },
  ]);
  const companyMap = new Map<string, CrmCompany>((companies ?? []).map((x: CrmCompany) => [x.id, x]));
  const personMap = new Map<string, CrmPerson>((people ?? []).map((x: CrmPerson) => [x.id, x]));
  const actorMap = new Map<string, CrmActor>((actors ?? []).map((x: CrmActor) => [x.id, x]));
  const leadMap = new Map<string, { id: string; code: string; source: string | null }>((leads ?? []).map((x: { id: string; code: string; source: string | null }) => [x.id, x]));
  const activityMap = new Map<string, DealActivity>();
  for (const a of (activities ?? []) as DealActivity[]) if (a.deal_id && !activityMap.has(a.deal_id)) activityMap.set(a.deal_id, a);
  return list.map((d) => ({ ...d, estimated_value: d.estimated_value === null ? null : Number(d.estimated_value), estimated_implementation_value: d.estimated_implementation_value === null || d.estimated_implementation_value === undefined ? null : Number(d.estimated_implementation_value), estimated_mrr_value: d.estimated_mrr_value === null || d.estimated_mrr_value === undefined ? null : Number(d.estimated_mrr_value), company: companyMap.get(d.company_id) ?? null, contact: d.contact_person_id ? personMap.get(d.contact_person_id) ?? null : null, owner: d.owner_actor_id ? actorMap.get(d.owner_actor_id) ?? null : null, origin_source: d.origin_lead_id ? leadMap.get(d.origin_lead_id)?.source ?? null : 'direto', origin_code: d.origin_lead_id ? leadMap.get(d.origin_lead_id)?.code ?? null : null, last_activity: activityMap.get(d.id) ?? null }));
}

async function hydrateLeads(rows: unknown[]): Promise<Lead[]> {
  const list = rows as Lead[];
  if (!list.length) return [];
  const companyIds = Array.from(new Set(list.map((d) => d.company_id).filter(Boolean)));
  const personIds = Array.from(new Set(list.map((d) => d.contact_person_id).filter(Boolean)));
  const actorIds = Array.from(new Set(list.map((d) => d.owner_actor_id).filter(Boolean)));
  const dealIds = Array.from(new Set(list.map((d) => d.converted_to_deal_id).filter(Boolean)));
  const [{ data: companies }, { data: people }, { data: actors }, { data: deals }] = await Promise.all([
    companyIds.length ? sb.from('companies').select('id, legal_name, trade_name, relationship_status').in('id', companyIds) : { data: [] },
    personIds.length ? sb.from('people').select('id, full_name, email, phone, role_in_company').in('id', personIds) : { data: [] },
    actorIds.length ? sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] },
    dealIds.length ? sb.from('deals').select('id, code').in('id', dealIds) : { data: [] },
  ]);
  const companyMap = new Map<string, CrmCompany>((companies ?? []).map((x: CrmCompany) => [x.id, x]));
  const personMap = new Map<string, CrmPerson>((people ?? []).map((x: CrmPerson) => [x.id, x]));
  const actorMap = new Map<string, CrmActor>((actors ?? []).map((x: CrmActor) => [x.id, x]));
  const dealMap = new Map<string, { id: string; code: string }>((deals ?? []).map((x: { id: string; code: string }) => [x.id, x]));
  return list.map((d) => ({ ...d, estimated_value: d.estimated_value === null ? null : Number(d.estimated_value), company: companyMap.get(d.company_id) ?? null, contact: d.contact_person_id ? personMap.get(d.contact_person_id) ?? null : null, owner: d.owner_actor_id ? actorMap.get(d.owner_actor_id) ?? null : null, converted_deal_code: d.converted_to_deal_id ? dealMap.get(d.converted_to_deal_id)?.code ?? null : null }));
}

export function useDealByCode(code?: string) {
  return useQuery({ queryKey: ['crm-deal-code', code], enabled: !!code, queryFn: async () => { const { data, error } = await sb.from('deals').select('*').eq('code', code).is('deleted_at', null).maybeSingle(); if (error) throw error; const [deal] = await hydrateDeals(data ? [data] : []); return deal ?? null; } });
}

export function useLeadByCode(code?: string) {
  return useQuery({ queryKey: ['crm-lead-code', code], enabled: !!code, queryFn: async () => { const { data, error } = await sb.from('leads').select('*').eq('code', code).is('deleted_at', null).maybeSingle(); if (error) throw error; const [lead] = await hydrateLeads(data ? [data] : []); return lead ?? null; } });
}

export function useAllLeads() {
  return useQuery({ queryKey: ['crm-leads-full'], queryFn: async () => { const { data, error } = await sb.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: false }); if (error) throw error; return hydrateLeads(data ?? []); } });
}

export function useAllCompanies() {
  return useQuery({ queryKey: ['crm-companies-full'], queryFn: async (): Promise<CompanyDetail[]> => { const { data, error } = await sb.from('companies').select('id, legal_name, trade_name, relationship_status, cnpj, industry, employee_count_range, website, linkedin_url, notes, created_at, updated_at').is('deleted_at', null).order('legal_name'); if (error) throw error; return data ?? []; } });
}

export type CompanyAggregate = { dealsOpen: number; dealsWon: number; revenueWon: number; leadsOpen: number };
export function useAllCompaniesAggregates() {
  return useQuery({
    queryKey: ['crm-companies-aggregates'],
    queryFn: async (): Promise<Record<string, CompanyAggregate>> => {
      const [{ data: deals, error: de }, { data: leads, error: le }] = await Promise.all([
        sb.from('deals').select('company_id, stage, estimated_value').is('deleted_at', null),
        sb.from('leads').select('company_id, status').is('deleted_at', null),
      ]);
      if (de) throw de; if (le) throw le;
      const map: Record<string, CompanyAggregate> = {};
      const get = (id: string) => (map[id] ||= { dealsOpen: 0, dealsWon: 0, revenueWon: 0, leadsOpen: 0 });
      for (const d of (deals ?? []) as { company_id: string; stage: DealStage; estimated_value: number | null }[]) {
        const a = get(d.company_id);
        if (d.stage === 'fechado_ganho') { a.dealsWon += 1; a.revenueWon += Number(d.estimated_value ?? 0); }
        else if (d.stage !== 'fechado_perdido') { a.dealsOpen += 1; }
      }
      for (const l of (leads ?? []) as { company_id: string; status: LeadStatus }[]) {
        if (!['descartado', 'convertido'].includes(l.status)) get(l.company_id).leadsOpen += 1;
      }
      return map;
    },
  });
}

export function useCompanyDetail(id?: string) {
  return useQuery({ queryKey: ['crm-company-detail', id], enabled: !!id, queryFn: async (): Promise<CompanyDetail | null> => { const { data, error } = await sb.from('companies').select('id, legal_name, trade_name, relationship_status, cnpj, industry, employee_count_range, website, linkedin_url, notes, created_at, updated_at, sector_id, client_type, revenue_range, digital_maturity').eq('id', id).is('deleted_at', null).maybeSingle(); if (error) throw error; return data ?? null; } });
}

export function useCompanyLeads(id?: string) {
  return useQuery({ queryKey: ['crm-company-leads', id], enabled: !!id, queryFn: async () => { const { data, error } = await sb.from('leads').select('*').eq('company_id', id).is('deleted_at', null).order('created_at', { ascending: false }); if (error) throw error; return hydrateLeads(data ?? []); } });
}

export function useCompanyDeals(id?: string) {
  return useQuery({ queryKey: ['crm-company-deals', id], enabled: !!id, queryFn: async () => { const { data, error } = await sb.from('deals').select('*').eq('company_id', id).is('deleted_at', null).order('stage_changed_at', { ascending: false }); if (error) throw error; return hydrateDeals(data ?? []); } });
}

export function useCompanyProjects(id?: string) {
  return useQuery({ queryKey: ['crm-company-projects', id], enabled: !!id, queryFn: async (): Promise<ProjectRow[]> => { const { data, error } = await sb.from('projects').select('id, code, name, status, project_type, contract_value, start_date, owner_actor_id').eq('company_id', id).is('deleted_at', null).order('created_at', { ascending: false }); if (error) throw error; const rows = (data ?? []) as ProjectRow[]; const actorIds = Array.from(new Set(rows.map((r) => r.owner_actor_id).filter(Boolean))); const { data: actors } = actorIds.length ? await sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] }; const actorMap = new Map<string, CrmActor>((actors ?? []).map((x: CrmActor) => [x.id, x])); return rows.map((r) => ({ ...r, contract_value: r.contract_value === null ? null : Number(r.contract_value), owner: r.owner_actor_id ? actorMap.get(r.owner_actor_id) ?? null : null })); } });
}

export function useCompanyStats(id?: string) {
  return useQuery({ queryKey: ['crm-company-stats', id], enabled: !!id, queryFn: async (): Promise<CompanyStats> => { const [{ data: leads }, { data: deals }, { data: projects }] = await Promise.all([sb.from('leads').select('status').eq('company_id', id).is('deleted_at', null), sb.from('deals').select('stage, estimated_value').eq('company_id', id).is('deleted_at', null), sb.from('projects').select('id').eq('company_id', id).is('deleted_at', null)]); const dealRows = (deals ?? []) as { stage: DealStage; estimated_value: number | null }[]; return { leadsOpen: ((leads ?? []) as { status: LeadStatus }[]).filter((l) => !['descartado', 'convertido'].includes(l.status)).length, dealsOpen: dealRows.filter((d) => !['fechado_ganho', 'fechado_perdido'].includes(d.stage)).length, dealsOpenValue: dealRows.filter((d) => !['fechado_ganho', 'fechado_perdido'].includes(d.stage)).reduce((s, d) => s + Number(d.estimated_value ?? 0), 0), dealsWon: dealRows.filter((d) => d.stage === 'fechado_ganho').length, revenueWon: dealRows.filter((d) => d.stage === 'fechado_ganho').reduce((s, d) => s + Number(d.estimated_value ?? 0), 0), projects: (projects ?? []).length }; } });
}

export function useCompanyContacts(id?: string) {
  return useQuery({ queryKey: ['crm-company-contacts', id], enabled: !!id, queryFn: async (): Promise<CrmPerson[]> => { const { data: links, error } = await sb.from('company_people').select('person_id, role').eq('company_id', id); if (error) throw error; const ids = (links ?? []).map((l: { person_id: string }) => l.person_id); if (!ids.length) return []; const { data, error: peopleError } = await sb.from('people').select('id, full_name, email, phone, role_in_company').in('id', ids).is('deleted_at', null).order('full_name'); if (peopleError) throw peopleError; return data ?? []; } });
}

export function useActivitiesForEntity(type: 'deal' | 'lead' | 'company', id?: string) {
  return useQuery({ queryKey: ['crm-activities', type, id], enabled: !!id, queryFn: async (): Promise<DealActivity[]> => { if (type === 'deal') { const { data, error } = await sb.from('deal_activities').select('*').eq('deal_id', id).is('deleted_at', null).order('scheduled_at', { ascending: false }); if (error) throw error; return data ?? []; } if (type === 'lead') { const { data, error } = await sb.from('deal_activities').select('*').eq('lead_id', id).is('deleted_at', null).order('scheduled_at', { ascending: false }); if (error) throw error; return data ?? []; } const [{ data: deals }, { data: leads }] = await Promise.all([sb.from('deals').select('id').eq('company_id', id).is('deleted_at', null), sb.from('leads').select('id').eq('company_id', id).is('deleted_at', null)]); const dealIds = (deals ?? []).map((d: { id: string }) => d.id); const leadIds = (leads ?? []).map((l: { id: string }) => l.id); if (!dealIds.length && !leadIds.length) return []; let query = sb.from('deal_activities').select('*').is('deleted_at', null).order('scheduled_at', { ascending: false }); const clauses: string[] = []; if (dealIds.length) clauses.push(`deal_id.in.(${dealIds.join(',')})`); if (leadIds.length) clauses.push(`lead_id.in.(${leadIds.join(',')})`); const { data, error } = await query.or(clauses.join(',')); if (error) throw error; return data ?? []; } });
}

export function useEntityAudit(type: 'deal' | 'lead' | 'company', id?: string) {
  return useQuery({ queryKey: ['crm-audit', type, id], enabled: !!id, queryFn: async (): Promise<AuditRow[]> => { const entityType = type === 'company' ? 'companies' : type === 'deal' ? 'deals' : 'leads'; const { data, error } = await sb.from('audit_logs').select('id, created_at, action, entity_type, changes, metadata, actor_id').eq('entity_type', entityType).eq('entity_id', id).order('created_at', { ascending: false }); if (error) throw error; const rows = (data ?? []) as (AuditRow & { actor_id: string | null })[]; const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))); const { data: actors } = actorIds.length ? await sb.from('actors').select('id, display_name, avatar_url').in('id', actorIds) : { data: [] }; const actorMap = new Map<string, CrmActor>((actors ?? []).map((x: CrmActor) => [x.id, x])); return rows.map((r) => ({ ...r, actor: r.actor_id ? actorMap.get(r.actor_id) ?? null : null })); } });
}

/**
 * Aplica patch otimista nas listagens de deals em cache (pipeline, kanban, etc.)
 * para que toda a UI responda instantaneamente, não só a tela de detalhe.
 */
function patchDealInLists(qc: ReturnType<typeof useQueryClient>, dealId: string, patch: Partial<Deal>) {
  qc.setQueriesData<Deal[] | undefined>({ queryKey: ['crm-deals'] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((d) => (d.id === dealId ? { ...d, ...patch } : d));
  });
  qc.setQueriesData<Lead[] | undefined>({ queryKey: ['crm-company-deals'] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((d: any) => (d.id === dealId ? { ...d, ...patch } : d));
  });
}

function patchLeadInLists(qc: ReturnType<typeof useQueryClient>, leadId: string, patch: Partial<Lead>) {
  qc.setQueriesData<Lead[] | undefined>({ queryKey: ['crm-leads-full'] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((l) => (l.id === leadId ? { ...l, ...patch } : l));
  });
  qc.setQueriesData<Lead[] | undefined>({ queryKey: ['crm-company-leads'] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((l) => (l.id === leadId ? { ...l, ...patch } : l));
  });
}

/**
 * Hidrata os objetos relacionados (owner, company, contact) lendo de outras
 * caches já carregadas, para que o optimistic update reflita imediatamente
 * o nome/avatar exibido no Select — eliminando o "delay" percebido.
 */
function hydrateDealPatch(
  qc: ReturnType<typeof useQueryClient>,
  previous: Deal,
  updates: Partial<Deal>,
): Partial<Deal> {
  const patch: Partial<Deal> = { ...updates };

  if ('owner_actor_id' in updates) {
    const actors = (qc.getQueryData<CrmActor[]>(['crm-actors']) ?? []) as CrmActor[];
    patch.owner = updates.owner_actor_id
      ? actors.find((a) => a.id === updates.owner_actor_id) ?? null
      : null;
  }
  if ('company_id' in updates) {
    const companies =
      (qc.getQueryData<CrmCompany[]>(['crm-companies-full']) ?? []) as CrmCompany[];
    patch.company = updates.company_id
      ? companies.find((c) => c.id === updates.company_id) ?? null
      : null;
  }
  if ('contact_person_id' in updates) {
    const companyId = (updates.company_id ?? previous.company_id) as string | null;
    const contacts =
      (qc.getQueryData<CrmPerson[]>(['crm-company-contacts', companyId]) ?? []) as CrmPerson[];
    patch.contact = updates.contact_person_id
      ? contacts.find((p) => p.id === updates.contact_person_id) ?? null
      : null;
  }

  return patch;
}

export function useUpdateDealField(code?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      const { error } = await sb.from('deals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      const key = ['crm-deal-code', code];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Deal>(key);
      if (!previous) return { previous };

      const patch = hydrateDealPatch(qc, previous, updates);
      qc.setQueryData<Deal>(key, { ...previous, ...patch });
      patchDealInLists(qc, id, patch);

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['crm-deal-code', code], ctx.previous);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-code', code] });
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      // Só invalida métricas quando o campo realmente afeta números agregados.
      const u = vars?.updates ?? {};
      const affectsMetrics =
        'stage' in u || 'estimated_value' in u || 'estimated_implementation_value' in u ||
        'estimated_mrr_value' in u || 'probability_pct' in u;
      if (affectsMetrics) qc.invalidateQueries({ queryKey: ['crm-metrics'] });
      if (u.company_id) qc.invalidateQueries({ queryKey: ['crm-company-detail', u.company_id] });
    },
  });
}

export function useUpdateLeadField(code?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { error } = await sb.from('leads').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      const key = ['crm-lead-code', code];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Lead>(key);
      if (!previous) return { previous };

      const patch: Partial<Lead> = { ...updates };
      if ('owner_actor_id' in updates) {
        const actors = (qc.getQueryData<CrmActor[]>(['crm-actors']) ?? []) as CrmActor[];
        patch.owner = updates.owner_actor_id
          ? actors.find((a) => a.id === updates.owner_actor_id) ?? null
          : null;
      }
      if ('company_id' in updates) {
        const companies = (qc.getQueryData<CrmCompany[]>(['crm-companies-full']) ?? []) as CrmCompany[];
        patch.company = updates.company_id
          ? companies.find((c) => c.id === updates.company_id) ?? null
          : null;
      }
      if ('contact_person_id' in updates) {
        const companyId = (updates.company_id ?? previous.company_id) as string | null;
        const contacts = (qc.getQueryData<CrmPerson[]>(['crm-company-contacts', companyId]) ?? []) as CrmPerson[];
        patch.contact = updates.contact_person_id
          ? contacts.find((p) => p.id === updates.contact_person_id) ?? null
          : null;
      }

      qc.setQueryData<Lead>(key, { ...previous, ...patch });
      patchLeadInLists(qc, id, patch);

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['crm-lead-code', code], ctx.previous);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-lead-code', code] });
      qc.invalidateQueries({ queryKey: ['crm-leads-full'] });
      const u = vars?.updates ?? {};
      if ('status' in u || 'estimated_value' in u) {
        qc.invalidateQueries({ queryKey: ['crm-metrics'] });
      }
    },
  });
}

export function useUpdateCompanyField(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, updates }: { companyId: string; updates: Partial<CompanyDetail> }) => {
      const { error } = await sb.from('companies').update(updates).eq('id', companyId);
      if (error) throw error;
    },
    onMutate: async ({ companyId, updates }) => {
      const key = ['crm-company-detail', id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CompanyDetail>(key);
      if (previous) {
        qc.setQueryData<CompanyDetail>(key, { ...previous, ...(updates as CompanyDetail) });
      }
      // Espelha na listagem geral também.
      qc.setQueriesData<CompanyDetail[] | undefined>(
        { queryKey: ['crm-companies-full'] },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((c) => (c.id === companyId ? { ...c, ...(updates as CompanyDetail) } : c));
        },
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['crm-company-detail', id], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-company-detail', id] });
      qc.invalidateQueries({ queryKey: ['crm-companies-full'] });
    },
  });
}

export function useCloseDealAsWon() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ dealId, projectData, installments }: { dealId: string; projectData: Record<string, unknown>; installments: { amount: number; due_date: string }[] }) => { const { data, error } = await sb.rpc('close_deal_as_won', { p_deal_id: dealId, p_project_data: projectData, p_installments: installments }); if (error) throw error; return data as { project_id: string; project_code: string; installments_created: number }; }, onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-deals'] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); qc.invalidateQueries({ queryKey: ['crm-companies-full'] }); qc.invalidateQueries({ queryKey: ['projects'] }); } });
}

export function useConvertLeadToDealFull() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ leadId, dealData }: { leadId: string; dealData: Record<string, unknown> }) => { const { data, error } = await sb.rpc('convert_lead_to_deal', { p_lead_id: leadId, p_deal_data: dealData }); if (error) throw error; const { data: deal, error: dealError } = await sb.from('deals').select('code').eq('id', data).single(); if (dealError) throw dealError; return deal.code as string; }, onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-leads-full'] }); qc.invalidateQueries({ queryKey: ['crm-deals'] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); } });
}

export function useCreateActivityFull(entity: { type: 'deal' | 'lead'; id: string }) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (payload: { title: string; type: ActivityType; description?: string | null; scheduled_at?: string | null; happened_at?: string | null; duration_minutes?: number | null; outcome?: string | null; owner_actor_id?: string | null; participants?: string[] }) => { const { data, error } = await sb.from('deal_activities').insert({ ...payload, organization_id: ORG_ID, deal_id: entity.type === 'deal' ? entity.id : null, lead_id: entity.type === 'lead' ? entity.id : null }).select().single(); if (error) throw error; return data as DealActivity; }, onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-activities'] }); qc.invalidateQueries({ queryKey: ['crm-deals'] }); } });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, updates }: { id: string; updates: Partial<DealActivity> }) => { const { error } = await sb.from('deal_activities').update(updates).eq('id', id); if (error) throw error; }, onSettled: () => qc.invalidateQueries({ queryKey: ['crm-activities'] }) });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await sb.from('deal_activities').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }, onSettled: () => qc.invalidateQueries({ queryKey: ['crm-activities'] }) });
}

export function useSoftDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await sb.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }, onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-deals'] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); } });
}

export { DEAL_STAGE_PROBABILITY };

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Pré-checagem: bloqueia se houver leads, deals ou projetos vinculados
      const [{ data: leads }, { data: deals }, { data: projects }] = await Promise.all([
        sb.from('leads').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
        sb.from('deals').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
        sb.from('projects').select('id').eq('company_id', id).is('deleted_at', null).limit(1),
      ]);
      if ((leads?.length || 0) + (deals?.length || 0) + (projects?.length || 0) > 0) {
        throw new Error('Empresa possui leads, deals ou projetos vinculados. Exclua-os primeiro.');
      }
      // Limpa vínculos de contato e papéis de contato
      await sb.from('company_people').delete().eq('company_id', id);
      const { error } = await sb.from('companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-companies-full'] });
      qc.invalidateQueries({ queryKey: ['crm-company-detail'] });
      qc.invalidateQueries({ queryKey: ['crm-metrics'] });
    },
  });
}
