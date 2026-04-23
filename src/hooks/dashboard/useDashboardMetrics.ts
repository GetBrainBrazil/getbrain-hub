/**
 * View dev_dashboard_metrics: 1 linha por sprint com agregados completos.
 * Usado pelos KPIs macro e Bloco 1 (Entrega).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  sprint_id: string;
  sprint_code: string;
  sprint_name: string;
  sprint_status: string;
  start_date: string;
  end_date: string;
  actual_end_date: string | null;
  sprint_total_days: number;
  sprint_elapsed_days: number;
  sprint_remaining_days: number;
  tasks_total: number;
  tasks_done: number;
  tasks_in_progress: number;
  tasks_in_review: number;
  tasks_todo: number;
  tasks_backlog: number;
  tasks_cancelled: number;
  tasks_blocked_now: number;
  hours_estimated_total: number;
  hours_actual_total: number;
  rework_total: number;
  tasks_reworked: number;
  avg_cycle_time_hours: number;
  estimation_accuracy_pct: number;
  tasks_done_on_time: number;
  tasks_done_late: number;
  tasks_overdue: number;
}

export function useDashboardMetrics(sprintIds: string[]) {
  return useQuery({
    queryKey: ["dashboard-metrics", sprintIds],
    enabled: sprintIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        // @ts-expect-error - view não está nos types gerados
        .from("dev_dashboard_metrics")
        .select("*")
        .in("sprint_id", sprintIds);
      if (error) throw error;
      return (data ?? []) as unknown as DashboardMetrics[];
    },
  });
}

/**
 * Carrega últimas N sprints (incluindo atual + anteriores) para sparklines/tendências.
 */
export function useRecentSprintsMetrics(limit = 6) {
  return useQuery({
    queryKey: ["dashboard-metrics-recent", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        // @ts-expect-error - view não está nos types
        .from("dev_dashboard_metrics")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      // devolver em ordem cronológica ASC pra sparkline
      return ((data ?? []) as unknown as DashboardMetrics[]).slice().reverse();
    },
  });
}
