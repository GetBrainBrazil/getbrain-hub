import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProposalItemRow } from "@/lib/orcamentos/calculateTotal";

export function useProposalItems(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal_items", proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_items" as any)
        .select("*")
        .eq("proposal_id", proposalId!)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProposalItemRow[];
    },
  });
}

export interface ItemDraft {
  id?: string;
  description: string;
  long_description?: string | null;
  quantity: number;
  unit_price: number;
  order_index: number;
}

export function useReplaceProposalItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      items,
    }: {
      proposalId: string;
      items: ItemDraft[];
    }) => {
      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;

      // Estratégia simples: soft-delete tudo e reinsere. Volume baixo (<20 itens
      // por proposta), então não vale gerenciar diff.
      const del = await supabase
        .from("proposal_items" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("proposal_id", proposalId)
        .is("deleted_at", null);
      if (del.error) throw del.error;

      if (items.length === 0) return;

      const rows = items.map((it, i) => ({
        proposal_id: proposalId,
        description: it.description || "Item",
        long_description: it.long_description ?? null,
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
        order_index: i,
        created_by: uid,
        updated_by: uid,
      }));
      const { error } = await supabase
        .from("proposal_items" as any)
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal_items", vars.proposalId] });
      qc.invalidateQueries({ queryKey: ["proposal", vars.proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposals_kpis"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao salvar itens");
    },
  });
}
