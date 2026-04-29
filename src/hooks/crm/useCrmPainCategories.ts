import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as sb } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CrmPainCategory = {
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

const KEY = ["crm-pain-categories-managed"] as const;

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function useCrmPainCategories(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = false } = opts;
  return useQuery({
    queryKey: [...KEY, { onlyActive }],
    queryFn: async (): Promise<CrmPainCategory[]> => {
      let q = sb.from("crm_pain_categories").select("*").order("display_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmPainCategory[];
    },
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["crm-deals"] });
}

export function useCreatePainCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string | null }): Promise<CrmPainCategory> => {
      const baseSlug = slugify(payload.name);
      if (!baseSlug) throw new Error("Nome inválido");

      // Resolve slug colisões: anexa -2, -3...
      let slug = baseSlug;
      const { data: existing } = await sb
        .from("crm_pain_categories")
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

      const { data: max } = await sb
        .from("crm_pain_categories")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((max?.display_order ?? 0) as number) + 10;

      const { data, error } = await sb
        .from("crm_pain_categories")
        .insert({
          name: payload.name.trim(),
          slug,
          color: payload.color ?? "bg-muted text-muted-foreground border-border",
          display_order: nextOrder,
          is_active: true,
          is_system: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CrmPainCategory;
    },
    onSuccess: () => toast.success("Categoria criada"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar categoria"),
    onSettled: () => invalidate(qc),
  });
}

export function useUpdatePainCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<Pick<CrmPainCategory, "name" | "color" | "is_active" | "display_order">> }) => {
      const { error } = await sb.from("crm_pain_categories").update(payload.patch).eq("id", payload.id);
      if (error) throw error;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar categoria"),
    onSettled: () => invalidate(qc),
  });
}

export function useDeletePainCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("crm_pain_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Categoria removida"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover categoria"),
    onSettled: () => invalidate(qc),
  });
}

export function useReorderPainCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      const results = await Promise.all(
        items.map((it) => sb.from("crm_pain_categories").update({ display_order: it.display_order }).eq("id", it.id)),
      );
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao reordenar"),
    onSettled: () => invalidate(qc),
  });
}
