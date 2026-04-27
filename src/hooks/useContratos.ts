import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsuarioContrato {
  id: string;
  user_id: string;
  tipo: string;
  cargo: string | null;
  data_inicio: string;
  data_fim: string | null;
  salario: number | null;
  observacoes: string | null;
  anexo_url: string | null;
  created_at: string;
}

export function useContratos(userId?: string) {
  return useQuery({
    queryKey: ["usuario_contratos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuario_contratos" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as UsuarioContrato[];
    },
  });
}

export function useSaveContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<UsuarioContrato> & { user_id: string; data_inicio: string; tipo: string }) => {
      if (input.id) {
        const { error } = await supabase.from("usuario_contratos" as any).update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("usuario_contratos" as any).insert(input);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["usuario_contratos", v.user_id] }),
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; user_id: string }) => {
      const { error } = await supabase.from("usuario_contratos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["usuario_contratos", v.user_id] }),
  });
}
