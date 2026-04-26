import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecurrenceStatus = "ativa" | "pausada" | "encerrada" | "cancelada";
export type RecurrenceType = "recurrence" | "installment";
export type RecurrenceDirection = "receita" | "despesa";

export interface RecurrenceFilters {
  status?: RecurrenceStatus | "todas";
  type?: RecurrenceType | "todas";
  direction?: RecurrenceDirection | "todas";
  search?: string;
  showDeleted?: boolean;
}

export interface RecurrenceRow {
  id: string;
  code: string;
  description: string;
  type: RecurrenceType;
  direction: RecurrenceDirection;
  amount: number;
  frequency: string;
  status: RecurrenceStatus;
  start_date: string;
  end_date: string | null;
  total_installments: number | null;
  deleted_at: string | null;
  cliente: { id: string; nome: string } | null;
  fornecedor: { id: string; nome: string } | null;
  projeto: { id: string; code: string; name: string } | null;
  categoria: { id: string; nome: string } | null;
  next_due?: string | null;
  installments_paid?: number;
  installments_total_count?: number;
}

export function useRecurrences(filters: RecurrenceFilters) {
  return useQuery({
    queryKey: ["financial_recurrences", filters],
    queryFn: async () => {
      let q = supabase
        .from("financial_recurrences")
        .select(
          `*,
          cliente:clientes(id, nome),
          fornecedor:fornecedores(id, nome),
          projeto:projects(id, code, name),
          categoria:categorias(id, nome)`
        )
        .order("code", { ascending: false });

      if (!filters.showDeleted) q = q.is("deleted_at", null);
      if (filters.status && filters.status !== "todas") q = q.eq("status", filters.status);
      if (filters.type && filters.type !== "todas") q = q.eq("type", filters.type);
      if (filters.direction && filters.direction !== "todas") q = q.eq("direction", filters.direction);
      if (filters.search?.trim()) {
        const s = filters.search.trim().replace(/[,()]/g, "");
        q = q.or(`description.ilike.%${s}%,code.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as unknown as RecurrenceRow[];
      // enrich with next_due + installment progress (single batched query)
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return rows;

      const { data: movs } = await supabase
        .from("movimentacoes")
        .select("recurrence_id, status, data_vencimento, installment_number, installments_total")
        .in("recurrence_id", ids)
        .is("deleted_at", null);

      const byRec = new Map<string, { paid: number; total: number; nextDue: string | null }>();
      (movs || []).forEach((m: any) => {
        const cur = byRec.get(m.recurrence_id) || { paid: 0, total: m.installments_total ?? 0, nextDue: null };
        if (m.status === "pago") cur.paid += 1;
        if (m.status === "pendente") {
          if (!cur.nextDue || m.data_vencimento < cur.nextDue) cur.nextDue = m.data_vencimento;
        }
        cur.total = Math.max(cur.total, m.installments_total ?? 0);
        byRec.set(m.recurrence_id, cur);
      });

      return rows.map((r) => {
        const ext = byRec.get(r.id);
        return {
          ...r,
          next_due: ext?.nextDue ?? null,
          installments_paid: ext?.paid ?? 0,
          installments_total_count: ext?.total ?? r.total_installments ?? 0,
        };
      });
    },
  });
}
