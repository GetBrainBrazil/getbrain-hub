/**
 * Top tasks com maior desvio entre estimativa e real (em valor absoluto).
 * Usado pelo Bloco 3.9.2.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskDeviation {
  id: string;
  code: string;
  title: string;
  estimated_hours: number;
  actual_hours: number;
  deviation_hours: number;
  deviation_pct: number;
  assignee_name: string | null;
  project_code: string | null;
}

export function useTopDeviations(sprintIds: string[], limit = 5) {
  return useQuery({
    queryKey: ["top-deviations", sprintIds, limit],
    enabled: sprintIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<TaskDeviation[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id, code, title, estimated_hours, actual_hours,
          project_id,
          projects:project_id ( code ),
          task_assignees!inner ( is_primary, actor_id, deleted_at )
        `)
        .in("sprint_id", sprintIds)
        .eq("status", "done")
        .gt("estimated_hours", 0)
        .is("deleted_at", null);
      if (error) throw error;

      // Pegar nomes dos assignees primary em batch
      const rows = (data ?? []).filter((t) =>
        t.task_assignees?.some((a) => a.is_primary && !a.deleted_at),
      );
      const actorIds = Array.from(
        new Set(
          rows.flatMap((t) =>
            (t.task_assignees ?? [])
              .filter((a) => a.is_primary && !a.deleted_at)
              .map((a) => a.actor_id),
          ),
        ),
      );
      let actorMap = new Map<string, string>();
      if (actorIds.length) {
        const { data: actors } = await supabase
          .from("actors")
          .select("id, display_name")
          .in("id", actorIds);
        actorMap = new Map((actors ?? []).map((a) => [a.id, a.display_name]));
      }

      const enriched: TaskDeviation[] = rows.map((t) => {
        const est = Number(t.estimated_hours ?? 0);
        const act = Number(t.actual_hours ?? 0);
        const dev = act - est;
        const primary = t.task_assignees?.find((a) => a.is_primary && !a.deleted_at);
        return {
          id: t.id,
          code: t.code,
          title: t.title,
          estimated_hours: est,
          actual_hours: act,
          deviation_hours: dev,
          deviation_pct: est > 0 ? (dev / est) * 100 : 0,
          assignee_name: primary ? actorMap.get(primary.actor_id) ?? null : null,
          project_code: (t.projects as { code: string } | null)?.code ?? null,
        };
      });

      enriched.sort(
        (a, b) => Math.abs(b.deviation_hours) - Math.abs(a.deviation_hours),
      );
      return enriched.slice(0, limit);
    },
  });
}
