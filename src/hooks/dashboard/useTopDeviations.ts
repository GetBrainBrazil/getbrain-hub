/**
 * Top tasks com maior desvio entre estimativa e real (em valor absoluto).
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
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select(
          "id, code, title, estimated_hours, actual_hours, project_id",
        )
        .in("sprint_id", sprintIds)
        .eq("status", "done")
        .gt("estimated_hours", 0)
        .is("deleted_at", null);
      if (error) throw error;
      if (!tasks?.length) return [];

      // Project codes
      const projectIds = Array.from(new Set(tasks.map((t) => t.project_id)));
      const { data: projects } = await supabase
        .from("projects")
        .select("id, code")
        .in("id", projectIds);
      const projMap = new Map((projects ?? []).map((p) => [p.id, p.code]));

      // Primary assignees
      const taskIds = tasks.map((t) => t.id);
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("task_id, actor_id, is_primary, deleted_at")
        .in("task_id", taskIds)
        .eq("is_primary", true)
        .is("deleted_at", null);

      const assigneeByTask = new Map<string, string>();
      const actorIds = new Set<string>();
      for (const a of assignees ?? []) {
        assigneeByTask.set(a.task_id, a.actor_id);
        actorIds.add(a.actor_id);
      }
      let actorMap = new Map<string, string>();
      if (actorIds.size > 0) {
        const { data: actors } = await supabase
          .from("actors")
          .select("id, display_name")
          .in("id", Array.from(actorIds));
        actorMap = new Map((actors ?? []).map((a) => [a.id, a.display_name]));
      }

      const rows: TaskDeviation[] = tasks.map((t) => {
        const est = Number(t.estimated_hours ?? 0);
        const act = Number(t.actual_hours ?? 0);
        const dev = act - est;
        const actorId = assigneeByTask.get(t.id);
        return {
          id: t.id,
          code: t.code,
          title: t.title,
          estimated_hours: est,
          actual_hours: act,
          deviation_hours: dev,
          deviation_pct: est > 0 ? (dev / est) * 100 : 0,
          assignee_name: actorId ? actorMap.get(actorId) ?? null : null,
          project_code: projMap.get(t.project_id) ?? null,
        };
      });

      rows.sort(
        (a, b) => Math.abs(b.deviation_hours) - Math.abs(a.deviation_hours),
      );
      return rows.slice(0, limit);
    },
  });
}
