import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyContactRole, CrmPerson } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export interface CompanyContactWithRoles {
  /** id da relação company_people */
  link_id: string;
  is_primary_contact: boolean;
  person: CrmPerson;
  roles: CompanyContactRole[];
}

/** Retorna a lista de contatos de uma empresa já com os papéis (roles) anexados. */
export function useCompanyContactsWithRoles(companyId?: string) {
  return useQuery({
    queryKey: ['crm-company-contacts-with-roles', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyContactWithRoles[]> => {
      const { data: links, error } = await sb
        .from('company_people')
        .select('id, person_id, is_primary_contact')
        .eq('company_id', companyId)
        .is('ended_at', null);
      if (error) throw error;
      const linkRows = (links ?? []) as { id: string; person_id: string; is_primary_contact: boolean }[];
      if (!linkRows.length) return [];
      const personIds = linkRows.map((l) => l.person_id);
      const linkIds = linkRows.map((l) => l.id);
      const [{ data: people, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        sb.from('people').select('id, full_name, email, phone, role_in_company').in('id', personIds).is('deleted_at', null),
        sb.from('company_contact_roles')
          .select(`id, company_person_id, organization_id, role, role_id, created_at, role_ref:crm_contact_roles!company_contact_roles_role_id_fkey ( id, name, slug, color )`)
          .in('company_person_id', linkIds)
          .is('deleted_at', null),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const personMap = new Map<string, CrmPerson>(((people ?? []) as CrmPerson[]).map((p) => [p.id, p]));
      const rolesMap = new Map<string, CompanyContactRole[]>();
      for (const raw of (roles ?? []) as any[]) {
        const r: CompanyContactRole = {
          id: raw.id,
          company_person_id: raw.company_person_id,
          organization_id: raw.organization_id,
          role_id: raw.role_id,
          role: raw.role ?? null,
          role_ref: raw.role_ref ?? null,
          created_at: raw.created_at,
        };
        const list = rolesMap.get(r.company_person_id) ?? [];
        list.push(r);
        rolesMap.set(r.company_person_id, list);
      }
      return linkRows
        .map((l) => ({
          link_id: l.id,
          is_primary_contact: l.is_primary_contact,
          person: personMap.get(l.person_id)!,
          roles: rolesMap.get(l.id) ?? [],
        }))
        .filter((c) => !!c.person)
        .sort((a, b) => Number(b.is_primary_contact) - Number(a.is_primary_contact)
          || a.person.full_name.localeCompare(b.person.full_name, 'pt-BR'));
    },
    staleTime: 30_000,
  });
}

/** Cria pessoa + vincula à empresa, devolvendo já o link_id. */
export function useCreateContactForCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company_id: string;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      role_in_company?: string | null;
      is_primary_contact?: boolean;
    }) => {
      const { data: person, error: pErr } = await sb
        .from('people')
        .insert({
          organization_id: ORG_ID,
          full_name: payload.full_name.trim(),
          email: payload.email?.trim() || null,
          phone: payload.phone?.trim() || null,
          role_in_company: payload.role_in_company?.trim() || null,
        })
        .select('id, full_name, email, phone, role_in_company')
        .single();
      if (pErr) throw pErr;
      const { data: link, error: lErr } = await sb
        .from('company_people')
        .insert({
          company_id: payload.company_id,
          person_id: person.id,
          is_primary_contact: !!payload.is_primary_contact,
          role: payload.role_in_company?.trim() || null,
        })
        .select('id')
        .single();
      if (lErr) throw lErr;
      return { person: person as CrmPerson, link_id: link.id as string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-company-contacts-with-roles', vars.company_id] });
      qc.invalidateQueries({ queryKey: ['crm-company-contacts', vars.company_id] });
      qc.invalidateQueries({ queryKey: ['crm-people-by-company', vars.company_id] });
    },
  });
}
