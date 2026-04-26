import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

export interface ProposalFilters {
  status?: ProposalStatus | "todos";
  search?: string;
}

export interface ProposalRow {
  id: string;
  code: string;
  status: ProposalStatus;
  client_company_name: string;
  client_logo_url: string | null;
  client_city: string | null;
  scope_items: Array<{ title: string; description?: string; value: number }>;
  maintenance_monthly_value: number | null;
  valid_until: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  deal_id: string | null;
  company_id: string | null;
  project_id: string | null;
  deleted_at: string | null;
  company?: { id: string; trade_name: string | null; legal_name: string } | null;
  deal?: { id: string; code: string; title: string; stage: string } | null;
}

export function useProposals(filters: ProposalFilters) {
  return useQuery({
    queryKey: ["proposals", filters],
    queryFn: async () => {
      let q = supabase
        .from("proposals" as any)
        .select(
          `*,
          company:companies(id, trade_name, legal_name),
          deal:deals(id, code, title, stage)`
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "todos" && filters.status !== "expirado") {
        q = q.eq("status", filters.status);
      }
      if (filters.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`code.ilike.%${s}%,client_company_name.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as unknown as ProposalRow[];

      // Filtrar 'expirado' client-side (status='enviado' + valid_until < hoje)
      const today = new Date().toISOString().slice(0, 10);
      if (filters.status === "expirado") {
        rows = rows.filter((r) => r.status === "enviado" && r.valid_until < today);
      }
      return rows;
    },
  });
}
