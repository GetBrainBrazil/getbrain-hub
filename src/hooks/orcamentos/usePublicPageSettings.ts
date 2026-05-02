/**
 * Hook para ler e atualizar `public_page_settings` (singleton por organização).
 *
 * - Lê via select direto (RLS permite a qualquer authenticated)
 * - Update via upsert por `organization_id` (RLS exige admin)
 * - Autosave on blur: cada chamada de `update(field, value)` persiste
 *   imediatamente, atualiza o cache local e invalida queries dependentes
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeWithDefaults, type PublicPageSettings } from "@/lib/publicPageDefaults";
import { toast } from "sonner";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const QK = ["public_page_settings", ORG_ID] as const;

export function usePublicPageSettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_page_settings" as any)
        .select("*")
        .eq("organization_id", ORG_ID)
        .maybeSingle();
      if (error) throw error;
      return mergeWithDefaults(data as Partial<PublicPageSettings> | null);
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<PublicPageSettings>) => {
      const { data, error } = await supabase
        .from("public_page_settings" as any)
        .update(patch as any)
        .eq("organization_id", ORG_ID)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: QK });
      const prev = qc.getQueryData<PublicPageSettings>(QK);
      if (prev) qc.setQueryData(QK, { ...prev, ...patch });
      return { prev };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK, ctx.prev);
      toast.error("Falha ao salvar", { description: (err as Error).message });
    },
    onSuccess: () => {
      // Notifica iframe de preview e qualquer outro consumidor
      qc.invalidateQueries({ queryKey: QK });
    },
  });

  /** Atualiza um campo único; retorna a Promise pra permitir await. */
  const update = <K extends keyof PublicPageSettings>(
    field: K,
    value: PublicPageSettings[K],
  ) => mutation.mutateAsync({ [field]: value } as any);

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update,
    isSaving: mutation.isPending,
    lastSavedAt: mutation.isSuccess ? new Date() : null,
  };
}
