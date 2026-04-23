/**
 * Timeline da aba Atividade — lê audit_logs filtrado por entity_type='task'.
 * Hidrata com display_name dos atores.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskActivityEntry } from "@/types/tasks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SB = supabase as any;

export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-activity", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskActivityEntry[]> => {
      const { data, error } = await SB.from("audit_logs")
        .select("id, action, actor_id, changes, metadata, created_at")
        .eq("entity_type", "task")
        .eq("entity_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as TaskActivityEntry[];
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
      if (!actorIds.length) return rows;
      const { data: actors } = await SB.from("actors").select("id, display_name, avatar_url").in("id", actorIds);
      const map = new Map<string, TaskActivityEntry["actor"]>(
        ((actors ?? []) as NonNullable<TaskActivityEntry["actor"]>[]).map((a) => [a.id, a]),
      );
      return rows.map((r) => ({ ...r, actor: r.actor_id ? map.get(r.actor_id) ?? null : null }));
    },
    staleTime: 30_000,
  });
}
