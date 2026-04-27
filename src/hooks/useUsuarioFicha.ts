import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsuarioFicha {
  id: string;
  full_name: string;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
  ativo: boolean;
  cep: string | null;
  pais: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
  plano_saude: string | null;
  cargo_id: string | null;
  cargo_nome: string | null;
  cargo_cor: string | null;
}

export function useUsuarioFicha(userId?: string) {
  return useQuery({
    queryKey: ["usuario_ficha", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!p) return null;
      const { data: v } = await supabase
        .from("usuario_cargos" as any)
        .select("cargo_id, cargos(nome, cor)")
        .eq("user_id", userId!)
        .maybeSingle();
      return {
        ...p,
        cargo_id: (v as any)?.cargo_id ?? null,
        cargo_nome: (v as any)?.cargos?.nome ?? null,
        cargo_cor: (v as any)?.cargos?.cor ?? null,
      } as UsuarioFicha;
    },
  });
}

export function useUpdatePerfilCampos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<UsuarioFicha> }) => {
      const { cargo_id, cargo_nome, cargo_cor, ...rest } = patch as any;
      const { error } = await supabase.from("profiles").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["usuario_ficha", v.id] });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}
