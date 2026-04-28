import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as sb } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CrmContactRole = {
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

const KEY = ["crm-contact-roles-managed"] as const;

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

export function useCrmContactRoles(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = false } = opts;
  return useQuery({
    queryKey: [...KEY, { onlyActive }],
    queryFn: async (): Promise<CrmContactRole[]> => {
      let q = (sb as any).from("crm_contact_roles").select("*").order("display_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmContactRole[];
    },
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["crm-company-contacts-with-roles"] });
  qc.invalidateQueries({ queryKey: ["company-contact-roles"] });
  qc.invalidateQueries({ queryKey: ["company-contact-roles-bulk"] });
}

export function useCreateContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string | null }) => {
      const name = payload.name.trim();
      if (!name) throw new Error("Nome obrigatório");
      let baseSlug = slugify(name);
      if (!baseSlug) baseSlug = `papel_${Date.now()}`;
      // garantir unicidade
      let slug = baseSlug;
      let i = 1;
      while (true) {
        const { data: ex } = await (sb as any)
          .from("crm_contact_roles").select("id").eq("slug", slug).maybeSingle();
        if (!ex) break;
        i += 1;
        slug = `${baseSlug}_${i}`;
      }
      const { data: max } = await (sb as any)
        .from("crm_contact_roles")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((max?.display_order ?? 0) as number) + 10;
      const { data, error } = await (sb as any)
        .from("crm_contact_roles")
        .insert({
          name,
          slug,
          color: payload.color ?? null,
          display_order: nextOrder,
          is_active: true,
          is_system: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CrmContactRole;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar papel"),
    onSettled: () => invalidate(qc),
  });
}

export function useUpdateContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<Pick<CrmContactRole, "name" | "color" | "is_active" | "display_order">> }) => {
      const { error } = await (sb as any).from("crm_contact_roles").update(payload.patch).eq("id", payload.id);
      if (error) throw error;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar papel"),
    onSettled: () => invalidate(qc),
  });
}

export function useDeleteContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (sb as any).from("crm_contact_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Papel removido"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover papel"),
    onSettled: () => invalidate(qc),
  });
}

export function useReorderContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      const results = await Promise.all(
        items.map((it) => (sb as any).from("crm_contact_roles").update({ display_order: it.display_order }).eq("id", it.id)),
      );
      const err = results.find((r: any) => r.error)?.error;
      if (err) throw err;
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao reordenar"),
    onSettled: () => invalidate(qc),
  });
}
