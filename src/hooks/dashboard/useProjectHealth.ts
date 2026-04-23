/**
 * Saúde por projeto: bugs, rework, consumo de horas.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectHealth {
  project_id: string;
  project_code: string;
  project_name: string;
  tasks_total: number;
  tasks_done: number;
  tasks_bugs: number;
  tasks_rework: number;
  hours_estimated: number;
  hours_actual: number;
  consumption_pct: number;
  bug_rate_pct: number;
  rework_rate_pct: number;
}

export function useProjectHealth(sprintIds: string[]) {
  return useQuery({
    queryKey: ["project-health", sprintIds],
    enabled: sprintIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_health_summary", {
        p_sprint_ids: sprintIds,
      });
      if (error) throw error;
      return (data ?? []) as ProjectHealth[];
    },
  });
}
