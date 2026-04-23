/**
 * Hooks de comentários da tela cheia de task.
 * Postar/editar/excluir são otimistas. Soft-delete via `deleted_at`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskComment } from "@/types/tasks";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SB = supabase as any;

async function actorIdForAuthUser(authUserId: string | undefined | null): Promise<string | null> {
  if (!authUserId) return null;
  const { data } = await SB.from("humans").select("actor_id").eq("auth_user_id", authUserId).maybeSingle();
  return (data?.actor_id as string | undefined) ?? null;
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await SB.from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (data ?? []) as TaskComment[];
      const actorIds = Array.from(new Set(list.map((c) => c.actor_id)));
      if (!actorIds.length) return list;
      const { data: actors } = await SB.from("actors").select("id, type, display_name, avatar_url").in("id", actorIds);
      const map = new Map<string, TaskComment["actor"]>(
        ((actors ?? []) as NonNullable<TaskComment["actor"]>[]).map((a) => [a.id, a]),
      );
      return list.map((c) => ({ ...c, actor: map.get(c.actor_id) ?? null }));
    },
  });
}

export function useCreateTaskComment(taskId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!taskId) throw new Error("taskId obrigatório");
      const text = body.trim();
      if (!text) throw new Error("Comentário vazio");
      const actorId = await actorIdForAuthUser(user?.id);
      if (!actorId) throw new Error("Sem actor associado ao usuário logado");
      const { error } = await SB.from("task_comments").insert({
        task_id: taskId,
        actor_id: actorId,
        body: text,
      });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
      if (taskId) qc.invalidateQueries({ queryKey: ["task-activity", taskId] });
    },
  });
}

export function useUpdateTaskComment(taskId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const text = body.trim();
      if (!text) throw new Error("Comentário vazio");
      const { error } = await SB.from("task_comments").update({ body: text }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });
}

export function useDeleteTaskComment(taskId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await SB.from("task_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });
}

/** Retorna o actor_id do usuário logado (se humano cadastrado). */
export function useCurrentActorId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-actor-id", user?.id],
    enabled: !!user?.id,
    queryFn: () => actorIdForAuthUser(user?.id),
    staleTime: 5 * 60_000,
  });
}
