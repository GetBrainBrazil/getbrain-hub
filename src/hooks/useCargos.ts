import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cargo {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: number;
  cor: string;
  is_system: boolean;
}

export interface CargoPermissao {
  id: string;
  cargo_id: string;
  modulo: string;
  acao: string;
}

export const MODULOS = [
  { key: "financeiro", label: "Financeiro" },
  { key: "projetos", label: "Projetos" },
  { key: "crm", label: "CRM" },
  { key: "dev", label: "Área Dev" },
  { key: "vendas", label: "Vendas" },
  { key: "relatorios", label: "Relatórios" },
  { key: "configuracoes", label: "Configurações" },
  { key: "usuarios", label: "Usuários" },
] as const;

export const ACOES = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
  { key: "admin", label: "Admin" },
] as const;

export function useCargos() {
  return useQuery({
    queryKey: ["cargos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargos" as any).select("*").order("nivel", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Cargo[];
    },
  });
}

export function useCargoPermissoes(cargoId?: string) {
  return useQuery({
    queryKey: ["cargo_permissoes", cargoId],
    enabled: !!cargoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cargo_permissoes" as any).select("*").eq("cargo_id", cargoId!);
      if (error) throw error;
      return (data || []) as unknown as CargoPermissao[];
    },
  });
}

export function useAllCargoPermissoes() {
  return useQuery({
    queryKey: ["cargo_permissoes_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargo_permissoes" as any).select("*");
      if (error) throw error;
      return (data || []) as unknown as CargoPermissao[];
    },
  });
}

export function useSaveCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; nome: string; descricao?: string; nivel: number; cor: string; permissoes: { modulo: string; acao: string }[] }) => {
      let cargoId = input.id;
      if (cargoId) {
        const { error } = await supabase.from("cargos" as any).update({
          nome: input.nome, descricao: input.descricao, nivel: input.nivel, cor: input.cor,
        }).eq("id", cargoId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("cargos" as any).insert({
          nome: input.nome, descricao: input.descricao, nivel: input.nivel, cor: input.cor,
        }).select("id").single();
        if (error) throw error;
        cargoId = (data as any).id;
      }
      await supabase.from("cargo_permissoes" as any).delete().eq("cargo_id", cargoId!);
      if (input.permissoes.length) {
        const rows = input.permissoes.map(p => ({ cargo_id: cargoId, modulo: p.modulo, acao: p.acao }));
        const { error } = await supabase.from("cargo_permissoes" as any).insert(rows);
        if (error) throw error;
      }
      return cargoId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cargos"] });
      qc.invalidateQueries({ queryKey: ["cargo_permissoes_all"] });
    },
  });
}

export function useDeleteCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase.from("usuario_cargos" as any).select("*", { count: "exact", head: true }).eq("cargo_id", id);
      if ((count ?? 0) > 0) throw new Error("Existem usuários vinculados a este cargo");
      const { error } = await supabase.from("cargos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cargos"] }),
  });
}
