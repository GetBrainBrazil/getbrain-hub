import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyContactRole } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

const SELECT_WITH_REF = `
  id, company_person_id, organization_id, role, role_id, created_at,
  role_ref:crm_contact_roles!company_contact_roles_role_id_fkey ( id, name, slug, color )
`;

function normalize(rows: any[]): CompanyContactRole[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    company_person_id: r.company_person_id,
    organization_id: r.organization_id,
    role_id: r.role_id,
    role: r.role ?? null,
    role_ref: r.role_ref ?? null,
    created_at: r.created_at,
  }));
}

export function useCompanyContactRoles(companyPersonId?: string) {
  return useQuery({
    queryKey: ['company-contact-roles', companyPersonId],
    enabled: !!companyPersonId,
    queryFn: async (): Promise<CompanyContactRole[]> => {
      const { data, error } = await sb
        .from('company_contact_roles')
        .select(SELECT_WITH_REF)
        .eq('company_person_id', companyPersonId)
        .is('deleted_at', null);
      if (error) throw error;
      return normalize(data);
    },
  });
}

export function useCompanyContactRolesBulk(companyPersonIds: string[]) {
  return useQuery({
    queryKey: ['company-contact-roles-bulk', [...companyPersonIds].sort()],
    enabled: companyPersonIds.length > 0,
    queryFn: async (): Promise<Map<string, CompanyContactRole[]>> => {
      const { data, error } = await sb
        .from('company_contact_roles')
        .select(SELECT_WITH_REF)
        .in('company_person_id', companyPersonIds)
        .is('deleted_at', null);
      if (error) throw error;
      const m = new Map<string, CompanyContactRole[]>();
      for (const r of normalize(data)) {
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
    mutationFn: async ({ company_person_id, role_id }: { company_person_id: string; role_id: string }) => {
      const { data, error } = await sb
        .from('company_contact_roles')
        .insert({
          organization_id: ORG_ID,
          company_person_id,
          role_id,
        })
        .select(SELECT_WITH_REF)
        .single();
      if (error) throw error;
      return normalize([data])[0];
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['company-contact-roles', vars.company_person_id] });
      qc.invalidateQueries({ queryKey: ['company-contact-roles-bulk'] });
      qc.invalidateQueries({ queryKey: ['crm-company-contacts-with-roles'] });
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
      qc.invalidateQueries({ queryKey: ['crm-company-contacts-with-roles'] });
    },
  });
}
