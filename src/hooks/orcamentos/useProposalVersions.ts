import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProposalVersion {
  id: string;
  proposal_id: string;
  version_number: number;
  pdf_url: string;
  pdf_storage_path: string;
  generated_at: string;
  generated_by: string | null;
  snapshot: Record<string, any>;
  created_at: string;
}

export function useProposalVersions(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal_versions", proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_versions" as any)
        .select("*")
        .eq("proposal_id", proposalId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProposalVersion[];
    },
  });
}
