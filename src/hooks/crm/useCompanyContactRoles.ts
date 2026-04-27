import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyContactRole, ContactRole } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function useCompanyContactRoles(companyPersonId?: string) {
  return useQuery({
    queryKey: ['company-contact-roles', companyPersonId],
    enabled: !!companyPersonId,
    queryFn: async (): Promise<CompanyContactRole[]> => {
      const { data, error } = await sb
        .from('company_contact_roles')
        .select('*')
        .eq('company_person_id', companyPersonId)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as CompanyContactRole[];
    },
  });
}

/** Bulk: pega papéis de várias relações de uma vez (otimização para listas) */
export function useCompanyContactRolesBulk(companyPersonIds: string[]) {
  return useQuery({
    queryKey: ['company-contact-roles-bulk', [...companyPersonIds].sort()],
    enabled: companyPersonIds.length > 0,
    queryFn: async (): Promise<Map<string, CompanyContactRole[]>> => {
      const { data, error } = await sb
        .from('company_contact_roles')
        .select('*')
        .in('company_person_id', companyPersonIds)
        .is('deleted_at', null);
      if (error) throw error;
      const m = new Map<string, CompanyContactRole[]>();
      for (const r of (data ?? []) as CompanyContactRole[]) {
        const list = m.get(r.company_person_id) ?? [];
        list.push(r);
        m.set(r.company_person_id, list);
      }
      return m;
    },
  });
}

export function useAddContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ company_person_id, role }: { company_person_id: string; role: ContactRole }) => {
      const { data, error } = await sb
        .from('company_contact_roles')
        .insert({
          organization_id: ORG_ID,
          company_person_id,
          role,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CompanyContactRole;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['company-contact-roles', vars.company_person_id] });
      qc.invalidateQueries({ queryKey: ['company-contact-roles-bulk'] });
    },
  });
}

export function useRemoveContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, company_person_id }: { id: string; company_person_id: string }) => {
      const { error } = await sb
        .from('company_contact_roles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { company_person_id };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['company-contact-roles', res.company_person_id] });
      qc.invalidateQueries({ queryKey: ['company-contact-roles-bulk'] });
    },
  });
}
