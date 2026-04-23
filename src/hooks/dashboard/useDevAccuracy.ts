/**
 * Função SQL get_dev_estimation_accuracy: precisão de estimativa por dev.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DevAccuracy {
  actor_id: string;
  actor_name: string;
  tasks_counted: number;
  avg_accuracy_pct: number;
  avg_deviation_hours: number;
  tasks_overestimated: number;
  tasks_underestimated: number;
  tasks_accurate: number;
}

export function useDevAccuracy(sprintIds: string[]) {
  return useQuery({
    queryKey: ["dev-accuracy", sprintIds],
    enabled: sprintIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dev_estimation_accuracy", {
        p_sprint_ids: sprintIds,
      });
      if (error) throw error;
      return (data ?? []) as DevAccuracy[];
    },
  });
}
