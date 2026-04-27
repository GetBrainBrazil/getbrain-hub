import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemAuditLog {
  id: string;
  user_id: string | null;
  user_nome: string | null;
  acao: string;
  modulo: string | null;
  tabela: string | null;
  registro_id: string | null;
  resumo: string | null;
  metadata: any;
  created_at: string;
}

export interface AuditLogFilters {
  search?: string;
  user_id?: string;
  tabela?: string;
  acao?: string;
  from?: string;
  to?: string;
}

export function useAuditLogs(filters: AuditLogFilters = {}, limit = 200) {
  return useQuery({
    queryKey: ["system_audit_logs", filters, limit],
    queryFn: async () => {
      let q = supabase
        .from("system_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (filters.user_id) q = q.eq("user_id", filters.user_id);
      if (filters.tabela) q = q.eq("tabela", filters.tabela);
      if (filters.acao) q = q.eq("acao", filters.acao);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as unknown as SystemAuditLog[];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return rows.filter(
          (r) =>
            r.user_nome?.toLowerCase().includes(s) ||
            r.resumo?.toLowerCase().includes(s) ||
            r.acao.toLowerCase().includes(s) ||
            r.modulo?.toLowerCase().includes(s)
        );
      }
      return rows;
    },
  });
}
