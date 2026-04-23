/**
 * 6 tipos de alertas acionáveis. Cada um devolve a lista de tasks afetadas.
 * Drill-down no drawer mostra essas listas.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlertTask {
  id: string;
  code: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  is_blocked: boolean;
  blocked_since: string | null;
  blocked_reason: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  updated_at: string;
  created_at: string;
  project_id: string;
  sprint_id: string | null;
}

export type AlertKind =
  | "overdue"
  | "blocked_long"
  | "estimate_burst"
  | "stale_review"
  | "reworked"
  | "urgent_bug_open";

export interface DashboardAlerts {
  overdue: AlertTask[];
  blocked_now: AlertTask[];
  blocked_long: AlertTask[];
  estimate_burst: AlertTask[];
  stale_review: AlertTask[];
  reworked: AlertTask[];
  urgent_bug_open: AlertTask[];
}

const SELECT = `
  id, code, title, status, type, priority,
  is_blocked, blocked_since, blocked_reason,
  due_date, estimated_hours, actual_hours,
  updated_at, created_at, project_id, sprint_id
`;

export function useDashboardAlerts(sprintId: string | null) {
  return useQuery({
    queryKey: ["dashboard-alerts", sprintId],
    enabled: !!sprintId,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardAlerts> => {
      const today = new Date().toISOString().slice(0, 10);
      const ago1d = new Date(Date.now() - 1 * 86_400_000).toISOString();
      const ago2d = new Date(Date.now() - 2 * 86_400_000).toISOString();
      const ago3d = new Date(Date.now() - 3 * 86_400_000).toISOString();

      // Buscamos tudo da sprint e filtramos client-side (queries pequenas)
      const { data, error } = await supabase
        .from("tasks")
        .select(SELECT)
        .eq("sprint_id", sprintId!)
        .is("deleted_at", null);
      if (error) throw error;

      const all = (data ?? []) as unknown as AlertTask[];
      const open = all.filter((t) => !["done", "cancelled"].includes(t.status));

      return {
        overdue: open.filter(
          (t) => t.due_date && t.due_date < today,
        ),
        blocked_now: open.filter((t) => t.is_blocked),
        blocked_long: open.filter(
          (t) => t.is_blocked && t.blocked_since && t.blocked_since < ago3d,
        ),
        estimate_burst: open.filter(
          (t) =>
            t.estimated_hours &&
            t.estimated_hours > 0 &&
            t.actual_hours > t.estimated_hours * 1.5,
        ),
        stale_review: all.filter(
          (t) => t.status === "in_review" && t.updated_at < ago2d,
        ),
        reworked: all.filter((t) => (t as AlertTask & { rework_count?: number }) && false),
        urgent_bug_open: open.filter(
          (t) =>
            t.type === "bug" &&
            t.priority === "urgent" &&
            t.created_at < ago1d,
        ),
      };
    },
  });
}

/**
 * Busca tasks reabertas (rework_count > 0) da sprint.
 * Separado porque rework_count não está no select base do alerta.
 */
export function useReworkedTasks(sprintId: string | null) {
  return useQuery({
    queryKey: ["reworked-tasks", sprintId],
    enabled: !!sprintId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, code, title, rework_count, project_id, status")
        .eq("sprint_id", sprintId!)
        .gt("rework_count", 0)
        .is("deleted_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });
}
