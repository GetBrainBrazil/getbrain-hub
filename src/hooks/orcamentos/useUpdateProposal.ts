import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from("proposals" as any)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal", vars.id] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposals_kpis"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao salvar orçamento");
    },
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proposals" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposals_kpis"] });
    },
  });
}

export function useDuplicateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: orig, error: e1 } = await supabase
        .from("proposals" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (e1) throw e1;
      const o = orig as any;
      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;
      const { data: ins, error: e2 } = await supabase
        .from("proposals" as any)
        .insert({
          organization_id: o.organization_id,
          deal_id: null,
          company_id: o.company_id,
          status: "rascunho",
          client_company_name: o.client_company_name,
          client_logo_url: o.client_logo_url,
          client_city: o.client_city,
          scope_items: o.scope_items,
          maintenance_monthly_value: o.maintenance_monthly_value,
          maintenance_description: o.maintenance_description,
          implementation_days: o.implementation_days,
          validation_days: o.validation_days,
          considerations: o.considerations,
          valid_until: new Date(Date.now() + 30 * 86400000)
            .toISOString()
            .slice(0, 10),
          created_by: uid,
          updated_by: uid,
        })
        .select("id")
        .single();
      if (e2) throw e2;
      return (ins as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposals_kpis"] });
    },
  });
}
