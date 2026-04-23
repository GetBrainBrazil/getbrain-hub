/**
 * Tasks concluídas por dia nos últimos N dias (default 14).
 * Usado pelo Bloco 1 (área chart de entrega).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DayCount {
  day: string; // YYYY-MM-DD
  count: number;
}

export function useCompletionsPerDay(days = 14) {
  return useQuery({
    queryKey: ["completions-per-day", days],
    staleTime: 60_000,
    queryFn: async (): Promise<DayCount[]> => {
      const since = new Date(Date.now() - days * 86_400_000)
        .toISOString();
      const { data, error } = await supabase
        .from("tasks")
        .select("completed_at")
        .gte("completed_at", since)
        .eq("status", "done")
        .is("deleted_at", null);
      if (error) throw error;

      const buckets = new Map<string, number>();
      // pre-fill últimos N dias com 0
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000)
          .toISOString()
          .slice(0, 10);
        buckets.set(d, 0);
      }
      for (const row of data ?? []) {
        if (!row.completed_at) continue;
        const d = row.completed_at.slice(0, 10);
        if (buckets.has(d)) buckets.set(d, (buckets.get(d) ?? 0) + 1);
      }
      return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
    },
  });
}
