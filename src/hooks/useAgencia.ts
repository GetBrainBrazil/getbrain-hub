import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantSettings {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  iata: string | null;
  email: string | null;
  telefone: string | null;
  logo_url: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

export function useAgencia() {
  return useQuery({
    queryKey: ["tenant_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_settings" as any).select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data || null) as unknown as TenantSettings | null;
    },
  });
}

export function useSaveAgencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TenantSettings> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("tenant_settings" as any).update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant_settings"] }),
  });
}
