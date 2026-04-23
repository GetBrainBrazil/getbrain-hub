/**
 * Desvio médio (em %) entre actual e estimated por tipo de task.
 * Positivo = subestimou. Negativo = superestimou.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TYPES = ["bug", "feature", "refactor", "chore", "docs", "research"] as const;
export type DeviationRow = { type: string; avg_pct: number; count: number };

export function useDeviationByType(sprintIds: string[]) {
  return useQuery({
    queryKey: ["deviation-by-type", sprintIds],
    enabled: sprintIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<DeviationRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("type, estimated_hours, actual_hours")
        .in("sprint_id", sprintIds)
        .eq("status", "done")
        .gt("estimated_hours", 0)
        .is("deleted_at", null);
      if (error) throw error;

      const acc = new Map<string, { sum: number; n: number }>();
      for (const r of data ?? []) {
        const est = Number(r.estimated_hours ?? 0);
        const act = Number(r.actual_hours ?? 0);
        if (est <= 0) continue;
        const pct = ((act - est) / est) * 100;
        const cur = acc.get(r.type) ?? { sum: 0, n: 0 };
        cur.sum += pct;
        cur.n += 1;
        acc.set(r.type, cur);
      }
      return TYPES.map((t) => {
        const v = acc.get(t);
        return {
          type: t,
          avg_pct: v && v.n > 0 ? v.sum / v.n : 0,
          count: v?.n ?? 0,
        };
      });
    },
  });
}
