import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecurrenceDetail(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["financial_recurrence", id],
    queryFn: async () => {
      const [recRes, movRes] = await Promise.all([
        supabase
          .from("financial_recurrences")
          .select(
            `*,
            cliente:clientes(id, nome),
            fornecedor:fornecedores(id, nome),
            projeto:projects(id, code, name),
            categoria:categorias(id, nome),
            centro_custo:centros_custo(id, nome),
            conta_bancaria:contas_bancarias(id, nome),
            meio_pagamento:meios_pagamento(id, nome)`
          )
          .eq("id", id!)
          .maybeSingle(),
        supabase
          .from("movimentacoes")
          .select("*")
          .eq("recurrence_id", id!)
          .order("installment_number", { ascending: true, nullsFirst: false })
          .order("data_vencimento", { ascending: true }),
      ]);
      if (recRes.error) throw recRes.error;
      if (movRes.error) throw movRes.error;
      if (!recRes.data) throw new Error("Recorrência não encontrada");
      return { recurrence: recRes.data as any, installments: (movRes.data || []) as any[] };
    },
  });
}
