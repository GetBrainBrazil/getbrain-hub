import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrimaryContact {
  companyPersonId: string;
  personId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

/**
 * Carrega o contato principal (`is_primary_contact = true`) de uma company.
 * Se não houver primário, cai para o primeiro `company_people` ativo
 * (ended_at NULL) com email ou telefone.
 *
 * Retorna `null` quando a company não tem nenhum contato cadastrado.
 */
export function usePrimaryContact(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["company_primary_contact", companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async (): Promise<PrimaryContact | null> => {
      const { data, error } = await supabase
        .from("company_people" as any)
        .select(
          `id, person_id, is_primary_contact, role, ended_at,
           person:people!company_people_person_id_fkey(id, full_name, email, phone, deleted_at)`
        )
        .eq("company_id", companyId!)
        .is("ended_at", null)
        .order("is_primary_contact", { ascending: false });
      if (error) throw error;
      const rows = ((data || []) as any[]).filter((r) => !r.person?.deleted_at);
      if (rows.length === 0) return null;

      // 1) primário, 2) qualquer com email, 3) qualquer com telefone, 4) primeiro
      const primary = rows.find((r) => r.is_primary_contact);
      const withEmail = rows.find((r) => r.person?.email);
      const withPhone = rows.find((r) => r.person?.phone);
      const chosen = primary || withEmail || withPhone || rows[0];
      const p = chosen.person;
      if (!p) return null;
      return {
        companyPersonId: chosen.id,
        personId: p.id,
        fullName: p.full_name || "Contato",
        email: p.email || null,
        phone: p.phone || null,
        role: chosen.role || null,
      };
    },
  });
}
