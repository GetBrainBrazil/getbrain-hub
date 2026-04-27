import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Usuario {
  id: string;
  full_name: string;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  cargo_id: string | null;
  cargo_nome: string | null;
  cargo_cor: string | null;
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, telefone, avatar_url, ativo, ultimo_acesso, created_at")
        .order("full_name");
      if (error) throw error;

      const { data: vincs } = await supabase.from("usuario_cargos" as any).select("user_id, cargo_id, cargos(nome, cor)");
      const map = new Map<string, any>();
      (vincs || []).forEach((v: any) => map.set(v.user_id, v));

      return (profiles || []).map(p => {
        const v = map.get(p.id);
        return {
          ...p,
          cargo_id: v?.cargo_id ?? null,
          cargo_nome: v?.cargos?.nome ?? null,
          cargo_cor: v?.cargos?.cor ?? null,
        } as Usuario;
      });
    },
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; full_name: string; telefone?: string; cargo_id?: string; avatar_url?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(typeof (data as any).error === "string" ? (data as any).error : JSON.stringify((data as any).error));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; email?: string; password?: string; full_name?: string; telefone?: string | null; ativo?: boolean; cargo_id?: string | null; avatar_url?: string | null }) => {
      const { data, error } = await supabase.functions.invoke("admin-update-user", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(typeof (data as any).error === "string" ? (data as any).error : JSON.stringify((data as any).error));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(typeof (data as any).error === "string" ? (data as any).error : JSON.stringify((data as any).error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
