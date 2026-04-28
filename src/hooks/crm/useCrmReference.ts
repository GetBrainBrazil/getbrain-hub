import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyRelationshipStatus, CrmActor, CrmCompany, CrmPerson } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function useCrmActors() {
  return useQuery({
    queryKey: ['crm-actors'],
    queryFn: async (): Promise<CrmActor[]> => {
      const { data, error } = await sb.from('actors').select('id, display_name, avatar_url').is('deleted_at', null).order('display_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCompanies(filters?: { status?: CompanyRelationshipStatus[] }) {
  return useQuery({
    queryKey: ['crm-companies', filters],
    queryFn: async (): Promise<CrmCompany[]> => {
      let q = sb.from('companies').select('id, legal_name, trade_name, relationship_status').is('deleted_at', null).order('legal_name');
      if (filters?.status?.length) q = q.in('relationship_status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCompanyAutocomplete(search: string) {
  return useQuery({
    queryKey: ['crm-company-autocomplete', search],
    queryFn: async (): Promise<CrmCompany[]> => {
      let q = sb.from('companies').select('id, legal_name, trade_name, relationship_status').is('deleted_at', null).order('legal_name').limit(20);
      if (search.trim()) q = q.or(`legal_name.ilike.%${search.trim()}%,trade_name.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { legal_name: string; trade_name?: string | null; cnpj?: string | null; industry?: string | null; website?: string | null; employee_count_range?: string | null; linkedin_url?: string | null; relationship_status?: CompanyRelationshipStatus }) => {
      const { data, error } = await sb.from('companies').insert({
        organization_id: ORG_ID,
        legal_name: payload.legal_name,
        trade_name: payload.trade_name || payload.legal_name,
        cnpj: payload.cnpj || null,
        company_type: 'client',
        relationship_status: payload.relationship_status || 'prospect',
        industry: payload.industry || null,
        website: payload.website || null,
        employee_count_range: payload.employee_count_range || null,
        linkedin_url: payload.linkedin_url || null,
        status: 'active',
      }).select('id, legal_name, trade_name, relationship_status').single();
      if (error) throw error;
      return data as CrmCompany;
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-companies'] }); qc.invalidateQueries({ queryKey: ['crm-companies-full'] }); },
  });
}

export function useBulkDeleteCompanies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ deleted: number; skipped: number }> => {
      if (!ids.length) return { deleted: 0, skipped: 0 };
      const [{ data: leads }, { data: deals }, { data: projects }] = await Promise.all([
        sb.from('leads').select('company_id').in('company_id', ids).is('deleted_at', null),
        sb.from('deals').select('company_id').in('company_id', ids).is('deleted_at', null),
        sb.from('projects').select('company_id').in('company_id', ids).is('deleted_at', null),
      ]);
      const blocked = new Set<string>();
      (leads ?? []).forEach((r: { company_id: string }) => blocked.add(r.company_id));
      (deals ?? []).forEach((r: { company_id: string }) => blocked.add(r.company_id));
      (projects ?? []).forEach((r: { company_id: string }) => blocked.add(r.company_id));
      const deletable = ids.filter((id) => !blocked.has(id));
      const skipped = ids.length - deletable.length;
      if (deletable.length) {
        const { error } = await sb.from('companies').update({ deleted_at: new Date().toISOString() }).in('id', deletable);
        if (error) throw error;
      }
      return { deleted: deletable.length, skipped };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-companies'] });
      qc.invalidateQueries({ queryKey: ['crm-companies-full'] });
      qc.invalidateQueries({ queryKey: ['crm-company-autocomplete'] });
      qc.invalidateQueries({ queryKey: ['crm-metrics'] });
    },
  });
}

export function usePeopleByCompany(companyId: string | null) {
  return useQuery({
    queryKey: ['crm-people-by-company', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CrmPerson[]> => {
      const { data: links, error } = await sb.from('company_people').select('person_id').eq('company_id', companyId);
      if (error) throw error;
      const ids = (links ?? []).map((l: any) => l.person_id);
      if (!ids.length) return [];
      const { data, error: peopleError } = await sb.from('people').select('id, full_name, email, phone, role_in_company').in('id', ids).is('deleted_at', null).order('full_name');
      if (peopleError) throw peopleError;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { company_id: string; full_name: string; email?: string | null; phone?: string | null; role_in_company?: string | null }) => {
      const { data, error } = await sb.from('people').insert({
        organization_id: ORG_ID,
        full_name: payload.full_name,
        email: payload.email || null,
        phone: payload.phone || null,
        role_in_company: payload.role_in_company || null,
      }).select('id, full_name, email, phone, role_in_company').single();
      if (error) throw error;
      await sb.from('company_people').insert({ company_id: payload.company_id, person_id: data.id, role: payload.role_in_company || null, is_primary_contact: true });
      return data as CrmPerson;
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-people-by-company', vars?.company_id] });
    },
  });
}

export function useDistinctLeadSources() {
  return useQuery({
    queryKey: ['crm-lead-sources'],
    queryFn: async (): Promise<string[]> => {
      // Lê origens ativas da tabela gerenciada + slugs históricos ainda em uso nos leads,
      // para que filtros do Pipeline continuem funcionando para leads antigos.
      const [managed, distinct] = await Promise.all([
        sb.from('crm_lead_sources').select('slug').eq('is_active', true).order('display_order'),
        sb.from('leads').select('source').not('source', 'is', null).is('deleted_at', null),
      ]);
      if (managed.error) throw managed.error;
      if (distinct.error) throw distinct.error;
      const set = new Set<string>();
      (managed.data ?? []).forEach((r: any) => r.slug && set.add(String(r.slug)));
      (distinct.data ?? []).forEach((r: any) => r.source && set.add(String(r.source)));
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}
