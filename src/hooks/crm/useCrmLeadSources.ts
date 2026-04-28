import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as sb } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CrmLeadSource = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

const KEY = ["crm-lead-sources-managed"] as const;

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function useCrmLeadSources(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = false } = opts;
  return useQuery({
    queryKey: [...KEY, { onlyActive }],
    queryFn: async (): Promise<CrmLeadSource[]> => {
      let q = sb.from("crm_lead_sources").select("*").order("display_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmLeadSource[];
    },
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["crm-lead-sources"] });
  qc.invalidateQueries({ queryKey: ["crm-leads"] });
}

export function useCreateLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string | null; icon?: string | null }) => {
      const slug = slugify(payload.name);
      if (!slug) throw new Error("Nome inválido");
      const { data: max } = await sb
        .from("crm_lead_sources")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((max?.display_order ?? 0) as number) + 10;
      const { data, error } = await sb
        .from("crm_lead_sources")
        .insert({
          name: payload.name.trim(),
          slug,
          color: payload.color ?? null,
          icon: payload.icon ?? null,
          display_order: nextOrder,
          is_active: true,
          is_system: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CrmLeadSource;
    },
    onSuccess: () => {
      toast.success("Origem criada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar origem"),
    onSettled: () => invalidate(qc),
  });
}

export function useUpdateLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<Pick<CrmLeadSource, "name" | "color" | "icon" | "is_active" | "display_order">> }) => {
      const { error } = await sb.from("crm_lead_sources").update(payload.patch).eq("id", payload.id);
      if (error) throw error;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar origem"),
    onSettled: () => invalidate(qc),
  });
}

export function useDeleteLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("crm_lead_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Origem removida"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover origem"),
    onSettled: () => invalidate(qc),
  });
}

export function useReorderLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      // Atualizações em paralelo
      const results = await Promise.all(
        items.map((it) => sb.from("crm_lead_sources").update({ display_order: it.display_order }).eq("id", it.id)),
      );
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao reordenar"),
    onSettled: () => invalidate(qc),
  });
}
