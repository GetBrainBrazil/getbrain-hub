import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type DealDeletionImpact = {
  proposals: { id: string; code: string; status: string | null }[];
  project: { id: string; code: string; status: string | null } | null;
  originLead: { id: string; code: string } | null;
  activitiesCount: number;
  dependenciesCount: number;
  /** Quando há projeto vinculado, listamos o que está pendurado nele. */
  projectImpact: {
    maintenanceContracts: number;
    movimentacoesPendentes: number;
    movimentacoesPagas: number;
    recurrencesActive: number;
  } | null;
};

/**
 * Calcula o impacto de excluir um deal — usado pelo modal de confirmação
 * do CRM para mostrar ao usuário o que será apagado/desvinculado/bloqueado.
 */
export function useDealDeletionImpact(dealId: string | null | undefined) {
  return useQuery({
    queryKey: ["deal-deletion-impact", dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealDeletionImpact> => {
      const id = dealId!;

      const [
        { data: proposals },
        { data: deal },
        { data: leadOrigin },
        { count: activitiesCount },
        { count: dependenciesCount },
        { data: projectFromSource },
      ] = await Promise.all([
        sb.from("proposals").select("id, code, status").eq("deal_id", id),
        sb.from("deals").select("generated_project_id").eq("id", id).maybeSingle(),
        sb.from("leads").select("id, code").eq("converted_to_deal_id", id).maybeSingle(),
        sb.from("deal_activities").select("id", { count: "exact", head: true }).eq("deal_id", id),
        sb.from("deal_dependencies").select("id", { count: "exact", head: true }).eq("deal_id", id),
        sb.from("projects").select("id, code, status").eq("source_deal_id", id).maybeSingle(),
      ]);

      // Projeto pode estar referenciado por dois caminhos: source_deal_id
      // (FK em projects) ou generated_project_id (FK em deals). Pegamos o
      // primeiro que aparecer.
      let project: DealDeletionImpact["project"] = projectFromSource ?? null;
      if (!project && deal?.generated_project_id) {
        const { data: p } = await sb
          .from("projects")
          .select("id, code, status")
          .eq("id", deal.generated_project_id)
          .maybeSingle();
        project = p ?? null;
      }

      // Impacto financeiro/operacional do projeto (se existir)
      let projectImpact: DealDeletionImpact["projectImpact"] = null;
      if (project) {
        const [
          { count: maintenanceContracts },
          { data: movimentacoes },
          { count: recurrencesActive },
        ] = await Promise.all([
          sb
            .from("maintenance_contracts")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id)
            .is("deleted_at", null),
          sb
            .from("movimentacoes")
            .select("status")
            .eq("projeto_id", project.id)
            .is("deleted_at", null),
          sb
            .from("financial_recurrences")
            .select("id", { count: "exact", head: true })
            .eq("projeto_id", project.id)
            .is("deleted_at", null)
            .eq("status", "ativa"),
        ]);

        const movs = (movimentacoes ?? []) as { status: string | null }[];
        projectImpact = {
          maintenanceContracts: maintenanceContracts ?? 0,
          movimentacoesPendentes: movs.filter((m) => m.status === "pendente").length,
          movimentacoesPagas: movs.filter((m) => m.status === "pago" || m.status === "liquidado").length,
          recurrencesActive: recurrencesActive ?? 0,
        };
      }

      return {
        proposals: (proposals ?? []) as DealDeletionImpact["proposals"],
        project,
        originLead: leadOrigin ?? null,
        activitiesCount: activitiesCount ?? 0,
        dependenciesCount: dependenciesCount ?? 0,
        projectImpact,
      };
    },
    staleTime: 0,
  });
}
