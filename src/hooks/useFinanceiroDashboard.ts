import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DashboardKPIs = {
  mes_receita: number;
  mes_despesa: number;
  mes_resultado: number;
  mes_margem_percent: number;
  mes_receita_prevista: number;
  mes_despesa_prevista: number;
  mes_anterior_receita: number;
  mes_anterior_despesa: number;
  mes_anterior_resultado: number;
  saldo_total: number;
  total_a_receber: number;
  total_a_pagar: number;
  receber_vencido: number;
  pagar_vencido: number;
  qtd_receber_vencido: number;
  qtd_pagar_vencido: number;
  inadimplencia_percent: number;
};

export type SerieMensalRow = {
  mes: string;
  receita_realizada: number;
  despesa_realizada: number;
  receita_prevista: number;
  despesa_prevista: number;
  resultado: number;
};

export type FluxoProjetadoRow = {
  dia: string;
  entradas: number;
  saidas: number;
  saldo_acumulado: number;
};

export type ContaSaldo = {
  id: string;
  nome: string;
  banco: string | null;
  tipo: string | null;
  saldo: number;
};

export type ProximoVencimento = {
  id: string;
  descricao: string;
  tipo: "receita" | "despesa";
  data_vencimento: string;
  valor_previsto: number;
  status: string;
  contraparte: string | null;
};

export type RankingItem = { label: string; valor: number; id?: string };
export type AtrasoItem = {
  id: string;
  descricao: string;
  tipo: "receita" | "despesa";
  contraparte: string;
  valor: number;
  dias_atraso: number;
};

const num = (v: unknown) => (v == null ? 0 : Number(v));

export function useFinanceiroKPIs() {
  return useQuery({
    queryKey: ["financeiro_dashboard_kpis"],
    staleTime: 30_000,
    queryFn: async (): Promise<DashboardKPIs> => {
      const { data, error } = await supabase
        .from("financeiro_dashboard" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      const r: any = data || {};
      return {
        mes_receita: num(r.mes_receita),
        mes_despesa: num(r.mes_despesa),
        mes_resultado: num(r.mes_resultado),
        mes_margem_percent: num(r.mes_margem_percent),
        mes_receita_prevista: num(r.mes_receita_prevista),
        mes_despesa_prevista: num(r.mes_despesa_prevista),
        mes_anterior_receita: num(r.mes_anterior_receita),
        mes_anterior_despesa: num(r.mes_anterior_despesa),
        mes_anterior_resultado: num(r.mes_anterior_resultado),
        saldo_total: num(r.saldo_total),
        total_a_receber: num(r.total_a_receber),
        total_a_pagar: num(r.total_a_pagar),
        receber_vencido: num(r.receber_vencido),
        pagar_vencido: num(r.pagar_vencido),
        qtd_receber_vencido: num(r.qtd_receber_vencido),
        qtd_pagar_vencido: num(r.qtd_pagar_vencido),
        inadimplencia_percent: num(r.inadimplencia_percent),
      };
    },
  });
}

export function useSerieMensal(meses = 12, contaId: string | null = null) {
  return useQuery({
    queryKey: ["financeiro_serie_mensal", meses, contaId],
    staleTime: 30_000,
    queryFn: async (): Promise<SerieMensalRow[]> => {
      const { data, error } = await supabase.rpc("financeiro_serie_mensal" as any, {
        p_meses: meses,
        p_conta: contaId,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        mes: r.mes,
        receita_realizada: num(r.receita_realizada),
        despesa_realizada: num(r.despesa_realizada),
        receita_prevista: num(r.receita_prevista),
        despesa_prevista: num(r.despesa_prevista),
        resultado: num(r.resultado),
      }));
    },
  });
}

export function useFluxoProjetado(dias = 90, contaId: string | null = null) {
  return useQuery({
    queryKey: ["financeiro_fluxo_projetado", dias, contaId],
    staleTime: 30_000,
    queryFn: async (): Promise<FluxoProjetadoRow[]> => {
      const { data, error } = await supabase.rpc("financeiro_fluxo_projetado" as any, {
        p_dias: dias,
        p_conta: contaId,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        dia: r.dia,
        entradas: num(r.entradas),
        saidas: num(r.saidas),
        saldo_acumulado: num(r.saldo_acumulado),
      }));
    },
  });
}

export function useSaldosPorConta() {
  return useQuery({
    queryKey: ["saldos_por_conta"],
    staleTime: 30_000,
    queryFn: async (): Promise<ContaSaldo[]> => {
      const { data: contas } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("ativo", true);
      const { data: movs } = await supabase
        .from("movimentacoes")
        .select("conta_bancaria_id, tipo, status, valor_realizado, valor_previsto");
      const all = movs || [];
      return (contas || []).map((c) => {
        const rec = all
          .filter((m) => m.tipo === "receita" && m.status === "pago" && m.conta_bancaria_id === c.id)
          .reduce((s, m) => s + num(m.valor_realizado || m.valor_previsto), 0);
        const desp = all
          .filter((m) => m.tipo === "despesa" && m.status === "pago" && m.conta_bancaria_id === c.id)
          .reduce((s, m) => s + num(m.valor_realizado || m.valor_previsto), 0);
        return {
          id: c.id,
          nome: c.nome,
          banco: c.banco,
          tipo: c.tipo,
          saldo: num(c.saldo_inicial) + rec - desp,
        };
      });
    },
  });
}

export function useProximosVencimentos(dias = 7) {
  return useQuery({
    queryKey: ["proximos_vencimentos", dias],
    staleTime: 30_000,
    queryFn: async (): Promise<ProximoVencimento[]> => {
      const hoje = new Date().toISOString().split("T")[0];
      const fim = new Date(Date.now() + dias * 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("movimentacoes")
        .select("id, descricao, tipo, data_vencimento, valor_previsto, status, cliente:clientes(nome), fornecedor:fornecedores(nome)")
        .in("status", ["pendente", "atrasado"])
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", fim)
        .order("data_vencimento")
        .limit(20);
      return (data || []).map((m: any) => ({
        id: m.id,
        descricao: m.descricao,
        tipo: m.tipo,
        data_vencimento: m.data_vencimento,
        valor_previsto: num(m.valor_previsto),
        status: m.status,
        contraparte: m.cliente?.nome || m.fornecedor?.nome || null,
      }));
    },
  });
}

export function useTopRankings() {
  return useQuery({
    queryKey: ["top_rankings"],
    staleTime: 30_000,
    queryFn: async () => {
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0];

      const { data: movs } = await supabase
        .from("movimentacoes")
        .select(
          "tipo, status, valor_previsto, valor_realizado, data_competencia, data_vencimento, categoria:categorias(id, nome, is_transferencia), cliente:clientes(id, nome), fornecedor:fornecedores(id, nome)"
        )
        .gte("data_competencia", inicioMes);

      const list = (movs || []).filter((m: any) => !m.categoria?.is_transferencia);

      // Top 5 categorias de despesa do mês
      const catMap = new Map<string, number>();
      list
        .filter((m: any) => m.tipo === "despesa")
        .forEach((m: any) => {
          const k = m.categoria?.nome || "Sem categoria";
          catMap.set(k, (catMap.get(k) || 0) + num(m.valor_realizado || m.valor_previsto));
        });
      const topCategorias: RankingItem[] = Array.from(catMap.entries())
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Top 5 clientes por receita recebida
      const cliMap = new Map<string, number>();
      list
        .filter((m: any) => m.tipo === "receita" && m.status === "pago" && m.cliente?.nome)
        .forEach((m: any) => {
          const k = m.cliente.nome;
          cliMap.set(k, (cliMap.get(k) || 0) + num(m.valor_realizado || m.valor_previsto));
        });
      const topClientes: RankingItem[] = Array.from(cliMap.entries())
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Top 5 atrasos (todos os tempos, vencidos)
      const { data: vencidos } = await supabase
        .from("movimentacoes")
        .select(
          "id, descricao, tipo, valor_previsto, data_vencimento, cliente:clientes(nome), fornecedor:fornecedores(nome)"
        )
        .in("status", ["pendente", "atrasado"])
        .lt("data_vencimento", new Date().toISOString().split("T")[0])
        .order("valor_previsto", { ascending: false })
        .limit(5);

      const today = new Date();
      const topAtrasos: AtrasoItem[] = (vencidos || []).map((m: any) => {
        const venc = new Date(m.data_vencimento);
        const dias = Math.floor((today.getTime() - venc.getTime()) / 86400000);
        return {
          id: m.id,
          descricao: m.descricao,
          tipo: m.tipo,
          contraparte: m.cliente?.nome || m.fornecedor?.nome || "—",
          valor: num(m.valor_previsto),
          dias_atraso: dias,
        };
      });

      return { topCategorias, topClientes, topAtrasos };
    },
  });
}

export function useContasBancariasOptions() {
  return useQuery({
    queryKey: ["contas_bancarias_options"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });
}
