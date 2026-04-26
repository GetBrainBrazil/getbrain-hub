import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  qc.invalidateQueries({ queryKey: ["financial_recurrences"] });
  qc.invalidateQueries({ queryKey: ["financial_recurrences_kpis"] });
  qc.invalidateQueries({ queryKey: ["movimentacoes"] });
  if (id) qc.invalidateQueries({ queryKey: ["financial_recurrence", id] });
};

export function useUpdateRecurrenceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("financial_recurrences")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ id }) => {
      invalidateAll(qc, id);
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar status"),
  });
}

export function useUpdateRecurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, any> }) => {
      const { error } = await supabase
        .from("financial_recurrences")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: ({ id }) => {
      invalidateAll(qc, id);
      toast.success("Recorrência atualizada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });
}

export function useDeleteRecurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_recurrences")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Recorrência removida");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });
}
