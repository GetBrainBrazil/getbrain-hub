/**
 * Hooks da tela cheia de task: fetch por code, mutations otimistas por campo,
 * gestão de critérios de aceite (JSONB), labels, autocomplete.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AcceptanceCriterion, Task, TaskAssignee } from "@/types/tasks";
import { useAuth } from "@/contexts/AuthContext";

// Tasks/comments ainda não estão nos types gerados em alguns campos novos.
const sb = supabase as unknown as ReturnType<typeof supabase.from> extends never ? never : typeof supabase;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SB = supabase as any;

async function hydrateTask(raw: Record<string, unknown>): Promise<Task> {
  const taskId = raw.id as string;
  const projectId = raw.project_id as string;

  const [{ data: assigns }, { data: project }] = await Promise.all([
    SB.from("task_assignees")
      .select("id, task_id, actor_id, role, is_primary")
      .eq("task_id", taskId)
      .is("deleted_at", null),
    SB.from("projects").select("id, code, name").eq("id", projectId).maybeSingle(),
  ]);

  const actorIds = Array.from(new Set(((assigns ?? []) as { actor_id: string }[]).map((a) => a.actor_id)));
  const { data: actors } = actorIds.length
    ? await SB.from("actors").select("id, type, display_name, avatar_url").in("id", actorIds)
    : { data: [] };

  const actorMap = new Map<string, TaskAssignee["actor"]>(
    ((actors ?? []) as NonNullable<TaskAssignee["actor"]>[]).map((a) => [a.id, a]),
  );
  const assignees: TaskAssignee[] = ((assigns ?? []) as TaskAssignee[]).map((a) => ({
    ...a,
    actor: actorMap.get(a.actor_id) ?? null,
  }));

  return {
    ...(raw as unknown as Task),
    acceptance_criteria: Array.isArray(raw.acceptance_criteria)
      ? (raw.acceptance_criteria as AcceptanceCriterion[])
      : [],
    labels: Array.isArray(raw.labels) ? (raw.labels as string[]) : [],
    assignees,
    project: project ?? null,
  };
}

/** Fetch por code legível (TASK-XXXX). */
export function useTaskByCode(code: string | undefined) {
  return useQuery({
    queryKey: ["task", code],
    enabled: !!code,
    queryFn: async (): Promise<Task | null> => {
      const { data, error } = await SB.from("tasks").select("*").eq("code", code).is("deleted_at", null).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return hydrateTask(data as Record<string, unknown>);
    },
    staleTime: 30_000,
  });
}

/** Mutation genérica: atualiza campos arbitrários da task com otimismo. */
export function useUpdateTaskFields(taskId: string | undefined, code: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!taskId) throw new Error("taskId obrigatório");
      const { error } = await SB.from("tasks").update(updates).eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      if (!code) return;
      await qc.cancelQueries({ queryKey: ["task", code] });
      const prev = qc.getQueryData<Task>(["task", code]);
      if (prev) qc.setQueryData<Task>(["task", code], { ...prev, ...updates });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && code) qc.setQueryData(["task", code], ctx.prev);
    },
    onSettled: () => {
      if (code) qc.invalidateQueries({ queryKey: ["task", code] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["project-metrics"] });
      if (taskId) qc.invalidateQueries({ queryKey: ["task-activity", taskId] });
    },
  });
}

// ============== Acceptance Criteria ==============

function newCriterionId() {
  return `ac_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useAcceptanceCriteria(task: Task | null | undefined) {
  const qc = useQueryClient();
  const code = task?.code;
  const taskId = task?.id;
  const { user } = useAuth();

  const persist = async (next: AcceptanceCriterion[]) => {
    if (!taskId) return;
    if (code) {
      const prev = qc.getQueryData<Task>(["task", code]);
      if (prev) qc.setQueryData<Task>(["task", code], { ...prev, acceptance_criteria: next });
    }
    const { error } = await SB.from("tasks").update({ acceptance_criteria: next }).eq("id", taskId);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["task", code] });
    if (taskId) qc.invalidateQueries({ queryKey: ["task-activity", taskId] });
  };

  return {
    add: async (text: string) => {
      if (!task || !text.trim()) return;
      const next = [
        ...task.acceptance_criteria,
        {
          id: newCriterionId(),
          text: text.trim(),
          checked: false,
          checked_at: null,
          checked_by: null,
        } as AcceptanceCriterion,
      ];
      await persist(next);
    },
    toggle: async (id: string) => {
      if (!task) return;
      const next = task.acceptance_criteria.map((c) =>
        c.id === id
          ? {
              ...c,
              checked: !c.checked,
              checked_at: !c.checked ? new Date().toISOString() : null,
              checked_by: !c.checked ? user?.id ?? null : null,
            }
          : c,
      );
      await persist(next);
    },
    edit: async (id: string, text: string) => {
      if (!task || !text.trim()) return;
      const next = task.acceptance_criteria.map((c) => (c.id === id ? { ...c, text: text.trim() } : c));
      await persist(next);
    },
    remove: async (id: string) => {
      if (!task) return;
      const next = task.acceptance_criteria.filter((c) => c.id !== id);
      await persist(next);
    },
    reorder: async (orderedIds: string[]) => {
      if (!task) return;
      const map = new Map(task.acceptance_criteria.map((c) => [c.id, c]));
      const next = orderedIds.map((id) => map.get(id)).filter(Boolean) as AcceptanceCriterion[];
      await persist(next);
    },
  };
}

// ============== Labels ==============

export function useDistinctLabels() {
  return useQuery({
    queryKey: ["task-labels-distinct"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await SB.from("tasks").select("labels").is("deleted_at", null);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of (data ?? []) as { labels: string[] }[]) {
        for (const l of row.labels ?? []) set.add(l);
      }
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}

export { sb };
