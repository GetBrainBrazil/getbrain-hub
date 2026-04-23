/**
 * Tempo médio de ciclo (started→completed) por tipo de task na(s) sprint(s).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TYPES = ["bug", "feature", "refactor", "chore", "docs", "research"] as const;
export type CycleTimeRow = { type: string; avg_hours: number; count: number };

export function useCycleTimeByType(sprintIds: string[]) {
  return useQuery({
    queryKey: ["cycle-by-type", sprintIds],
    enabled: sprintIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<CycleTimeRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("type, started_at, completed_at")
        .in("sprint_id", sprintIds)
        .eq("status", "done")
        .not("started_at", "is", null)
        .not("completed_at", "is", null)
        .is("deleted_at", null);
      if (error) throw error;

      const acc = new Map<string, { sum: number; n: number }>();
      for (const r of data ?? []) {
        const start = new Date(r.started_at!).getTime();
        const end = new Date(r.completed_at!).getTime();
        const hours = (end - start) / 3_600_000;
        if (hours <= 0) continue;
        const cur = acc.get(r.type) ?? { sum: 0, n: 0 };
        cur.sum += hours;
        cur.n += 1;
        acc.set(r.type, cur);
      }
      return TYPES.map((t) => {
        const v = acc.get(t);
        return {
          type: t,
          avg_hours: v && v.n > 0 ? v.sum / v.n : 0,
          count: v?.n ?? 0,
        };
      });
    },
  });
}
