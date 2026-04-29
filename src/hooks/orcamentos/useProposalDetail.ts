import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalRow } from "./useProposals";

export interface ProposalDetail extends ProposalRow {
  organization_id: string;
  scope_items: Array<{ title: string; description?: string; value: number }>;
  maintenance_description: string | null;
  implementation_days: number;
  validation_days: number;
  considerations: string[];
  rejection_reason: string | null;
  updated_at: string;
  template_key: string;
}

export function useProposalDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["proposal", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals" as any)
        .select(
          `*,
          company:companies(id, trade_name, legal_name),
          deal:deals(id, code, title, stage),
          project:projects(id, code, name)`
        )
        .eq("id", id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProposalDetail | null;
    },
    retry: 1,
  });
}
