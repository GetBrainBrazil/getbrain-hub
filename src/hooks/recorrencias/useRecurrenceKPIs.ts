import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";

export interface RecurrenceKPIs {
  mrrAtivo: number;
  custoFixoMensal: number;
  proximos7Dias: { total: number; count: number };
  ativas: number;
  // sparkline placeholders (TODO: substituir por view SQL real, fora do escopo 09C-1B)
  sparkMrr: number[];
  sparkCusto: number[];
}

const SPARK_PLACEHOLDER = [3, 4, 5, 6, 7, 8];

export function useRecurrenceKPIs() {
  return useQuery({
    queryKey: ["financial_recurrences_kpis"],
    queryFn: async (): Promise<RecurrenceKPIs> => {
      const today = format(new Date(), "yyyy-MM-dd");
      const in7 = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const [receitas, despesas, prox7, ativas] = await Promise.all([
        supabase
          .from("financial_recurrences")
          .select("amount")
          .eq("status", "ativa")
          .eq("type", "recurrence")
          .eq("direction", "receita")
          .is("deleted_at", null),
        supabase
          .from("financial_recurrences")
          .select("amount")
          .eq("status", "ativa")
          .eq("type", "recurrence")
          .eq("direction", "despesa")
          .is("deleted_at", null),
        supabase
          .from("movimentacoes")
          .select("valor_previsto")
          .not("recurrence_id", "is", null)
          .eq("status", "pendente")
          .gte("data_vencimento", today)
          .lte("data_vencimento", in7)
          .is("deleted_at", null),
        supabase
          .from("financial_recurrences")
          .select("id", { count: "exact", head: true })
          .eq("status", "ativa")
          .is("deleted_at", null),
      ]);

      const sum = (rows: any[] | null | undefined, field: string) =>
        (rows || []).reduce((acc, r) => acc + Number(r[field] ?? 0), 0);

      return {
        mrrAtivo: sum(receitas.data as any[], "amount"),
        custoFixoMensal: sum(despesas.data as any[], "amount"),
        proximos7Dias: {
          total: sum(prox7.data as any[], "valor_previsto"),
          count: (prox7.data || []).length,
        },
        ativas: ativas.count ?? 0,
        sparkMrr: SPARK_PLACEHOLDER,
        sparkCusto: SPARK_PLACEHOLDER,
      };
    },
  });
}
