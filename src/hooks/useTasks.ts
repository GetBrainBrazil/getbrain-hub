/**
 * Hooks de tasks/sprints/assignees plugados a Supabase.
 * Tasks/Sprints/Assignees ainda não estão nos types gerados — uso `as any`
 * pontual só pra cliente Supabase.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Sprint, Task, TaskAssignee, TaskStatus } from "@/types/tasks";

const sb = supabase as any;

export interface TaskFilters {
  project_id?: string | null;
  sprint_id?: string | null;
  status?: TaskStatus[];
}

async function fetchTasks(filters: TaskFilters = {}): Promise<Task[]> {
  let q = sb
    .from("tasks")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (filters.project_id) q = q.eq("project_id", filters.project_id);
  if (filters.sprint_id !== undefined && filters.sprint_id !== null) q = q.eq("sprint_id", filters.sprint_id);
  if (filters.status?.length) q = q.in("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  const tasks: Task[] = (data ?? []) as Task[];
  if (tasks.length === 0) return tasks;

  const ids = tasks.map((t) => t.id);
  const projectIds = Array.from(new Set(tasks.map((t) => t.project_id)));

  const [{ data: assigns }, { data: projects }] = await Promise.all([
    sb
      .from("task_assignees")
      .select("id, task_id, actor_id, role, is_primary")
      .in("task_id", ids)
      .is("deleted_at", null),
    sb.from("projects").select("id, code, name").in("id", projectIds),
  ]);

  const actorIds = Array.from(new Set(((assigns ?? []) as any[]).map((a) => a.actor_id)));
  const { data: actors } = actorIds.length
    ? await sb.from("actors").select("id, type, display_name, avatar_url").in("id", actorIds)
    : { data: [] as any[] };
  const actorMap = new Map((actors ?? []).map((a: any) => [a.id, a]));
  const projMap = new Map((projects ?? []).map((p: any) => [p.id, p]));

  const assignByTask = new Map<string, TaskAssignee[]>();
  for (const a of (assigns ?? []) as TaskAssignee[]) {
    const list = assignByTask.get(a.task_id) ?? [];
    list.push({ ...a, actor: actorMap.get(a.actor_id) ?? null });
    assignByTask.set(a.task_id, list);
  }

  return tasks.map((t) => ({
    ...t,
    assignees: assignByTask.get(t.id) ?? [],
    project: projMap.get(t.project_id) ?? null,
  }));
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    staleTime: 30_000,
  });
}

export function useSprints() {
  return useQuery({
    queryKey: ["sprints"],
    queryFn: async (): Promise<Sprint[]> => {
      const { data, error } = await sb
        .from("sprints")
        .select("*")
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sprint[];
    },
    staleTime: 60_000,
  });
}

export function useActiveSprint() {
  const { data } = useSprints();
  return data?.find((s) => s.status === "active") ?? null;
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await sb.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      snapshots.forEach(([key, list]) => {
        if (!list) return;
        qc.setQueryData<Task[]>(
          key as any,
          list.map((t) => (t.id === id ? { ...t, status } : t)),
        );
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, snap]) => qc.setQueryData(key as any, snap));
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["project-metrics"] });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Task> & { project_id: string; title: string; assignee_actor_ids?: string[] },
    ) => {
      const { assignee_actor_ids, ...taskPayload } = payload as any;
      const { data, error } = await sb.from("tasks").insert(taskPayload).select().single();
      if (error) throw error;
      if (assignee_actor_ids?.length) {
        const rows = assignee_actor_ids.map((actor_id: string, i: number) => ({
          task_id: data.id,
          actor_id,
          is_primary: i === 0,
        }));
        await sb.from("task_assignees").insert(rows);
      }
      return data as Task;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["project-metrics"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { error } = await sb.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["project-metrics"] });
    },
  });
}
