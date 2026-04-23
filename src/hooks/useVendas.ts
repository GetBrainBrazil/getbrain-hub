import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VendaStatus = "rascunho" | "confirmada" | "cancelada";
export type TipoVenda = "implementacao" | "recorrente" | "avulso";

export interface Venda {
  id: string;
  numero: string;
  project_id: string;
  cliente_id: string | null;
  tipo_venda: TipoVenda;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  data_venda: string;
  data_primeira_parcela: string | null;
  categoria_id: string | null;
  centro_custo_id: string | null;
  conta_bancaria_id: string | null;
  meio_pagamento_id: string | null;
  maintenance_contract_id: string | null;
  status: VendaStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project?: { id: string; code: string; name: string } | null;
  cliente?: { id: string; nome: string } | null;
  parcelas_total?: number;
  parcelas_pagas?: number;
}

export interface VendasDashboard {
  total_vendido: number;
  total_recebido: number;
  total_a_receber: number;
  total_atrasado: number;
  ticket_medio: number;
  qtd_vendas: number;
}

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: async (): Promise<Venda[]> => {
      const { data, error } = await (supabase as any)
        .from("vendas")
        .select("*")
        .is("deleted_at", null)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      const vendas = (data || []) as Venda[];

      if (vendas.length === 0) return [];

      // Hydrate projects
      const projectIds = Array.from(new Set(vendas.map((v) => v.project_id).filter(Boolean)));
      const clienteIds = Array.from(new Set(vendas.map((v) => v.cliente_id).filter(Boolean) as string[]));
      const vendaIds = vendas.map((v) => v.id);

      const [projectsRes, clientesRes, movsRes] = await Promise.all([
        projectIds.length
          ? supabase.from("projects").select("id, code, name").in("id", projectIds)
          : Promise.resolve({ data: [], error: null } as any),
        clienteIds.length
          ? supabase.from("clientes").select("id, nome").in("id", clienteIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from("movimentacoes")
          .select("source_entity_id, status")
          .eq("source_module", "vendas")
          .in("source_entity_id", vendaIds),
      ]);

      const projMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]));
      const cliMap = new Map((clientesRes.data || []).map((c: any) => [c.id, c]));
      const counts = new Map<string, { total: number; pagas: number }>();
      (movsRes.data || []).forEach((m: any) => {
        const cur = counts.get(m.source_entity_id) || { total: 0, pagas: 0 };
        cur.total += 1;
        if (m.status === "pago") cur.pagas += 1;
        counts.set(m.source_entity_id, cur);
      });

      return vendas.map((v) => ({
        ...v,
        project: (projMap.get(v.project_id) as any) || null,
        cliente: v.cliente_id ? ((cliMap.get(v.cliente_id) as any) || null) : null,
        parcelas_total: counts.get(v.id)?.total ?? 0,
        parcelas_pagas: counts.get(v.id)?.pagas ?? 0,
      }));
    },
  });
}

export function useVendaDetail(id: string | null) {
  return useQuery({
    queryKey: ["venda", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: venda, error } = await (supabase as any)
        .from("vendas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!venda) return null;

      const [{ data: parcelas }, { data: project }, { data: cliente }] = await Promise.all([
        supabase
          .from("movimentacoes")
          .select("*")
          .eq("source_module", "vendas")
          .eq("source_entity_id", id!)
          .order("data_vencimento", { ascending: true }),
        supabase.from("projects").select("id, code, name, company_id").eq("id", venda.project_id).maybeSingle(),
        venda.cliente_id
          ? supabase.from("clientes").select("id, nome").eq("id", venda.cliente_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      return { ...venda, parcelas: parcelas || [], project, cliente } as Venda & { parcelas: any[] };
    },
  });
}

export function useVendasDashboard(inicio: string | null, fim: string | null) {
  return useQuery({
    queryKey: ["vendas_dashboard", inicio, fim],
    queryFn: async (): Promise<VendasDashboard> => {
      const { data, error } = await (supabase as any).rpc("vendas_dashboard", {
        p_inicio: inicio,
        p_fim: fim,
      });
      if (error) throw error;
      const row = (data?.[0] || {}) as Partial<VendasDashboard>;
      return {
        total_vendido: Number(row.total_vendido || 0),
        total_recebido: Number(row.total_recebido || 0),
        total_a_receber: Number(row.total_a_receber || 0),
        total_atrasado: Number(row.total_atrasado || 0),
        ticket_medio: Number(row.ticket_medio || 0),
        qtd_vendas: Number(row.qtd_vendas || 0),
      };
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["vendas"] });
  qc.invalidateQueries({ queryKey: ["vendas_dashboard"] });
  qc.invalidateQueries({ queryKey: ["venda"] });
  qc.invalidateQueries({ queryKey: ["movimentacoes"] });
  qc.invalidateQueries({ queryKey: ["financeiro_dashboard_kpis"] });
}

export function useCreateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Venda> & { confirm?: boolean }) => {
      const { confirm, ...payload } = input;
      const { data, error } = await (supabase as any)
        .from("vendas")
        .insert({ ...payload, status: confirm ? "confirmada" : "rascunho" })
        .select()
        .single();
      if (error) throw error;
      if (confirm) {
        const { error: rpcErr } = await (supabase as any).rpc("vendas_gerar_parcelas", {
          p_venda_id: data.id,
        });
        if (rpcErr) throw rpcErr;
      }
      return data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Venda criada com sucesso");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar venda"),
  });
}

export function useConfirmVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: updErr } = await (supabase as any)
        .from("vendas")
        .update({ status: "confirmada" })
        .eq("id", id);
      if (updErr) throw updErr;
      const { error } = await (supabase as any).rpc("vendas_gerar_parcelas", { p_venda_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Venda confirmada — parcelas geradas");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao confirmar venda"),
  });
}

export function useCancelVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("vendas_cancelar", { p_venda_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Venda cancelada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao cancelar venda"),
  });
}

export function useImportarVendasExistentes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("vendas_importar_existentes");
      if (error) throw error;
      return Number(data || 0);
    },
    onSuccess: (criadas) => {
      invalidateAll(qc);
      toast.success(`${criadas} venda(s) importada(s) dos projetos existentes`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao importar vendas"),
  });
}
