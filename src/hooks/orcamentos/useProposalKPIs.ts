import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateScopeTotal } from "@/lib/orcamentos/calculateTotal";

export interface ProposalKPIs {
  orcadoTotal: number;
  orcadoCount: number;
  aceitoTotal: number;
  aceitoCount: number;
  emAbertoTotal: number;
  emAbertoCount: number;
  conversao: number; // %
}

export function useProposalKPIs() {
  return useQuery({
    queryKey: ["proposals_kpis"],
    queryFn: async (): Promise<ProposalKPIs> => {
      const { data, error } = await supabase
        .from("proposals" as any)
        .select("status, scope_items, valid_until")
        .is("deleted_at", null);
      if (error) throw error;

      const today = new Date().toISOString().slice(0, 10);
      const rows = (data || []) as any[];

      const orcaveis = rows.filter(
        (r) => !["cancelado"].includes(r.status)
      );
      const orcadoTotal = orcaveis.reduce(
        (acc, r) => acc + calculateScopeTotal(r.scope_items),
        0
      );

      const aceitos = rows.filter((r) => r.status === "aceito");
      const aceitoTotal = aceitos.reduce(
        (acc, r) => acc + calculateScopeTotal(r.scope_items),
        0
      );

      const emAberto = rows.filter(
        (r) => r.status === "enviado" && r.valid_until >= today
      );
      const emAbertoTotal = emAberto.reduce(
        (acc, r) => acc + calculateScopeTotal(r.scope_items),
        0
      );

      const recusados = rows.filter((r) => r.status === "recusado").length;
      const denom = aceitos.length + recusados;
      const conversao = denom > 0 ? (aceitos.length / denom) * 100 : 0;

      return {
        orcadoTotal,
        orcadoCount: orcaveis.length,
        aceitoTotal,
        aceitoCount: aceitos.length,
        emAbertoTotal,
        emAbertoCount: emAberto.length,
        conversao,
      };
    },
  });
}
