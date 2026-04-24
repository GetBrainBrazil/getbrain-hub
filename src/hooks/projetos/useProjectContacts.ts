import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const ORG_ID = "00000000-0000-0000-0000-000000000001";

export interface ProjectContact {
  link_id: string;
  person_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_in_company: string | null;
  link_role: string | null;
  is_primary_contact: boolean;
  ended_at: string | null;
}

export function useProjectContacts(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["project-contacts", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ProjectContact[]> => {
      const { data: links, error } = await sb
        .from("company_people")
        .select("id, person_id, role, is_primary_contact, ended_at")
        .eq("company_id", companyId)
        .is("ended_at", null);
      if (error) throw error;
      const ids = (links ?? []).map((l: any) => l.person_id);
      if (!ids.length) return [];
      const { data: people, error: pe } = await sb
        .from("people")
        .select("id, full_name, email, phone, role_in_company")
        .in("id", ids)
        .is("deleted_at", null);
      if (pe) throw pe;
      const pmap = new Map((people ?? []).map((p: any) => [p.id, p]));
      return (links ?? [])
        .map((l: any): ProjectContact | null => {
          const p: any = pmap.get(l.person_id);
          if (!p) return null;
          return {
            link_id: l.id,
            person_id: p.id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            role_in_company: p.role_in_company,
            link_role: l.role,
            is_primary_contact: !!l.is_primary_contact,
            ended_at: l.ended_at,
          };
        })
        .filter(Boolean) as ProjectContact[];
    },
    staleTime: 30_000,
  });
}

async function logAudit(entity_type: string, entity_id: string, action: string, changes: any = {}) {
  try {
    const { data: u } = await sb.auth.getUser();
    await sb.from("audit_logs").insert({
      organization_id: ORG_ID,
      entity_type,
      entity_id,
      action,
      changes,
      actor_id: u?.user?.id ?? null,
    });
  } catch {
    // best-effort
  }
}

export function useCreateProjectContact() {
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
      const { data: person, error } = await sb
        .from("people")
        .insert({
          organization_id: ORG_ID,
          full_name: payload.full_name,
          email: payload.email || null,
          phone: payload.phone || null,
          role_in_company: payload.role_in_company || null,
        })
        .select("id, full_name, email, phone, role_in_company")
        .single();
      if (error) throw error;

      if (payload.is_primary_contact) {
        await sb
          .from("company_people")
          .update({ is_primary_contact: false })
          .eq("company_id", payload.company_id)
          .is("ended_at", null);
      }

      const { error: linkErr } = await sb.from("company_people").insert({
        company_id: payload.company_id,
        person_id: person.id,
        role: payload.role_in_company || null,
        is_primary_contact: !!payload.is_primary_contact,
      });
      if (linkErr) throw linkErr;

      await logAudit("person", person.id, "created", { ...payload });
      return person;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-contacts", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-people-by-company", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-company-contacts", vars.company_id] });
    },
  });
}

export function useUpdateProjectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company_id: string;
      person_id: string;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      role_in_company?: string | null;
    }) => {
      const { error } = await sb
        .from("people")
        .update({
          full_name: payload.full_name,
          email: payload.email || null,
          phone: payload.phone || null,
          role_in_company: payload.role_in_company || null,
        })
        .eq("id", payload.person_id);
      if (error) throw error;
      await logAudit("person", payload.person_id, "updated", payload);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-contacts", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-people-by-company", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-company-contacts", vars.company_id] });
    },
  });
}

export function useSetPrimaryContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { company_id: string; link_id: string }) => {
      await sb
        .from("company_people")
        .update({ is_primary_contact: false })
        .eq("company_id", payload.company_id)
        .is("ended_at", null);
      const { error } = await sb
        .from("company_people")
        .update({ is_primary_contact: true })
        .eq("id", payload.link_id);
      if (error) throw error;
      await logAudit("company_people", payload.link_id, "updated", { is_primary_contact: true });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-contacts", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-company-contacts", vars.company_id] });
    },
  });
}

export function useUnlinkProjectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { company_id: string; link_id: string }) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await sb
        .from("company_people")
        .update({ ended_at: today, is_primary_contact: false })
        .eq("id", payload.link_id);
      if (error) throw error;
      await logAudit("company_people", payload.link_id, "deleted", { ended_at: today });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-contacts", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-people-by-company", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["crm-company-contacts", vars.company_id] });
    },
  });
}
