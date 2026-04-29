import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as sb } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateCrmCaches } from "@/lib/cacheInvalidation";
import { randomPresetColor } from "@/lib/crm/presetColors";

export type CrmProjectType = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

const KEY = ["crm-project-types-managed"] as const;

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function useCrmProjectTypes(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = false } = opts;
  return useQuery({
    queryKey: [...KEY, { onlyActive }],
    queryFn: async (): Promise<CrmProjectType[]> => {
      let q = (sb as any).from("crm_project_types").select("*").order("display_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmProjectType[];
    },
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  invalidateCrmCaches(qc);
}

export function useCreateProjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string | null }): Promise<CrmProjectType> => {
      const baseSlug = slugify(payload.name);
      if (!baseSlug) throw new Error("Nome inválido");

      let slug = baseSlug;
      const { data: existing } = await (sb as any)
        .from("crm_project_types")
        .select("slug")
        .like("slug", `${baseSlug}%`);
      if (existing && existing.length > 0) {
        const taken = new Set(existing.map((r: any) => r.slug));
        if (taken.has(slug)) {
          let n = 2;
          while (taken.has(`${baseSlug}-${n}`)) n++;
          slug = `${baseSlug}-${n}`;
        }
      }

      const { data: max } = await (sb as any)
        .from("crm_project_types")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((max?.display_order ?? 0) as number) + 10;

      const { data, error } = await (sb as any)
        .from("crm_project_types")
        .insert({
          name: payload.name.trim(),
          slug,
          color: payload.color ?? randomPresetColor(),
          display_order: nextOrder,
          is_active: true,
          is_system: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CrmProjectType;
    },
    onSuccess: () => toast.success("Tipo de projeto criado"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar tipo"),
    onSettled: () => invalidate(qc),
  });
}

export function useUpdateProjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<Pick<CrmProjectType, "name" | "color" | "is_active" | "display_order">> }) => {
      const { error } = await (sb as any).from("crm_project_types").update(payload.patch).eq("id", payload.id);
      if (error) throw error;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar tipo"),
    onSettled: () => invalidate(qc),
  });
}

export function useDeleteProjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (sb as any).from("crm_project_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Tipo removido"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover tipo"),
    onSettled: () => invalidate(qc),
  });
}

export function useReorderProjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      const results = await Promise.all(
        items.map((it) => (sb as any).from("crm_project_types").update({ display_order: it.display_order }).eq("id", it.id)),
      );
      const err = results.find((r: any) => r.error)?.error;
      if (err) throw err;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao reordenar"),
    onSettled: () => invalidate(qc),
  });
}
