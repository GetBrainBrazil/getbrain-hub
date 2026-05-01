import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProposalAuditEntry {
  id: string;
  action: string;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
  actor: { id: string | null; name: string; avatar_url: string | null } | null;
}

/**
 * Lê o histórico de auditoria de uma proposta a partir de `audit_logs`,
 * resolvendo o nome/avatar do ator via tabela `actors`.
 */
export function useProposalAuditLog(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal_audit", proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<ProposalAuditEntry[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, changes, metadata, created_at, actor_id")
        .eq("entity_type", "proposal")
        .eq("entity_id", proposalId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const actorIds = Array.from(
        new Set(rows.map((r) => r.actor_id).filter(Boolean))
      );

      let actorMap = new Map<
        string,
        { name: string; avatar_url: string | null }
      >();
      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from("actors")
          .select("id, display_name, avatar_url")
          .in("id", actorIds);
        actorMap = new Map(
          (actors ?? []).map((a: any) => [
            a.id,
            { name: a.display_name ?? "Usuário", avatar_url: a.avatar_url },
          ])
        );
      }

      return rows.map((r) => ({
        id: r.id,
        action: r.action,
        changes: r.changes,
        metadata: r.metadata,
        created_at: r.created_at,
        actor: r.actor_id
          ? {
              id: r.actor_id,
              name: actorMap.get(r.actor_id)?.name ?? "Usuário",
              avatar_url: actorMap.get(r.actor_id)?.avatar_url ?? null,
            }
          : null,
      }));
    },
  });
}
