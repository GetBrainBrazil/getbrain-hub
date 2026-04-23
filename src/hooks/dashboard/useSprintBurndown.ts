/**
 * Burndown diário (real vs ideal) da sprint.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BurndownPoint {
  day: string;
  remaining_tasks: number;
  ideal_remaining: number;
  total_tasks: number;
}

export function useSprintBurndown(sprintId: string | null) {
  return useQuery({
    queryKey: ["sprint-burndown", sprintId],
    enabled: !!sprintId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sprint_burndown", {
        p_sprint_id: sprintId!,
      });
      if (error) throw error;
      return (data ?? []) as BurndownPoint[];
    },
  });
}
