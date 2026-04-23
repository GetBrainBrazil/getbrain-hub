/**
 * Carga atual por dev na sprint selecionada.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DevCapacity {
  actor_id: string;
  actor_name: string;
  avatar_url: string | null;
  tasks_open: number;
  tasks_in_progress: number;
  tasks_blocked: number;
  hours_remaining: number;
  hours_actual_sprint: number;
  hours_planned_sprint: number;
}

export function useDevCapacity(sprintId: string | null) {
  return useQuery({
    queryKey: ["dev-capacity", sprintId],
    enabled: !!sprintId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dev_capacity", {
        p_sprint_id: sprintId!,
      });
      if (error) throw error;
      return (data ?? []) as DevCapacity[];
    },
  });
}
