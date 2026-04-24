/**
 * Hooks React Query do Dashboard Financeiro — Parte 2 (09B).
 * - useProjectProfitability: lucratividade por projeto
 * - useClientFinancialSummary: LTV / inadimplência por cliente
 * - useMonthlyEvolution: série mensal últimos N meses
 * - useUpcomingMovements: próximas movimentações
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  resolvePeriod,
  toISODate,
  useFinanceHubStore,
  type FinanceRegime,
} from "./useFinanceHubStore";

const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown) => (v == null ? null : Number(v));
const str = (v: unknown) => (v == null ? "" : String(v));
const strOrNull = (v: unknown) => (v == null ? null : String(v));

/* ---------------------------------------------------------------- */
/* Lucratividade por projeto                                        */
/* ---------------------------------------------------------------- */

export type ProjectProfitabilityRow = {
  project_id: string;
  project_code: string;
  project_name: string;
  project_status: string;
  company_name: string;
  receita_total: number;
  receita_realizada: number;
  receita_pendente: number;
  despesa_total: number;
  despesa_realizada: number;
  resultado: number;
  margem_pct: number | null;
  pct_recebido: number | null;
  tasks_hours_actual: number;
  count_receitas: number;
  count_despesas: number;
};

export function useProjectProfitability() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const regime = useFinanceHubStore((s) => s.regime);
  const range = resolvePeriod(period, customStart, customEnd);
  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);

  return useQuery({
    queryKey: ["finance", "project_profitability", startISO, endISO, regime],
    queryFn: async (): Promise<ProjectProfitabilityRow[]> => {
      const { data, error } = await supabase.rpc(
        "get_project_profitability" as never,
        {
          p_start_date: startISO,
          p_end_date: endISO,
          p_regime: regime,
        } as never,
      );
      if (error) throw error;
      const arr = (data ?? []) as Record<string, unknown>[];
      return arr.map((r) => ({
        project_id: str(r.project_id),
        project_code: str(r.project_code),
        project_name: str(r.project_name),
        project_status: str(r.project_status),
        company_name: str(r.company_name),
        receita_total: num(r.receita_total),
        receita_realizada: num(r.receita_realizada),
        receita_pendente: num(r.receita_pendente),
        despesa_total: num(r.despesa_total),
        despesa_realizada: num(r.despesa_realizada),
        resultado: num(r.resultado),
        margem_pct: numOrNull(r.margem_pct),
        pct_recebido: numOrNull(r.pct_recebido),
        tasks_hours_actual: num(r.tasks_hours_actual),
        count_receitas: num(r.count_receitas),
        count_despesas: num(r.count_despesas),
      }));
    },
    staleTime: 60_000,
  });
}

/* ---------------------------------------------------------------- */
/* Resumo financeiro por cliente                                    */
/* ---------------------------------------------------------------- */

export type ClientFinancialRow = {
  company_id: string;
  company_name: string;
  relationship_status: string;
  ltv_total: number;
  recebido_periodo: number;
  a_receber_futuro: number;
  atrasado: number;
  atrasado_mais_30d: number;
  dias_atraso_max: number;
  count_projetos: number;
  count_projetos_ativos: number;
  ultimo_pagamento: string | null;
};

export function useClientFinancialSummary() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const range = resolvePeriod(period, customStart, customEnd);
  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);

  return useQuery({
    queryKey: ["finance", "client_summary", startISO, endISO],
    queryFn: async (): Promise<ClientFinancialRow[]> => {
      const { data, error } = await supabase.rpc(
        "get_client_financial_summary" as never,
        { p_start_date: startISO, p_end_date: endISO } as never,
      );
      if (error) throw error;
      const arr = (data ?? []) as Record<string, unknown>[];
      return arr.map((r) => ({
        company_id: str(r.company_id),
        company_name: str(r.company_name),
        relationship_status: str(r.relationship_status),
        ltv_total: num(r.ltv_total),
        recebido_periodo: num(r.recebido_periodo),
        a_receber_futuro: num(r.a_receber_futuro),
        atrasado: num(r.atrasado),
        atrasado_mais_30d: num(r.atrasado_mais_30d),
        dias_atraso_max: num(r.dias_atraso_max),
        count_projetos: num(r.count_projetos),
        count_projetos_ativos: num(r.count_projetos_ativos),
        ultimo_pagamento: strOrNull(r.ultimo_pagamento),
      }));
    },
    staleTime: 60_000,
  });
}

/* ---------------------------------------------------------------- */
/* Evolução mensal                                                  */
/* ---------------------------------------------------------------- */

export type MonthlyEvolutionRow = {
  mes: string;
  mes_label: string;
  receita: number;
  despesa: number;
  resultado: number;
  margem_pct: number | null;
  saldo_fim_mes: number;
};

export function useMonthlyEvolution(months = 12) {
  const regime = useFinanceHubStore((s) => s.regime);
  return useQuery({
    queryKey: ["finance", "monthly_evolution", months, regime],
    queryFn: async (): Promise<MonthlyEvolutionRow[]> => {
      const { data, error } = await supabase.rpc(
        "get_monthly_evolution" as never,
        { p_months: months, p_regime: regime } as never,
      );
      if (error) throw error;
      const arr = (data ?? []) as Record<string, unknown>[];
      return arr.map((r) => ({
        mes: str(r.mes),
        mes_label: str(r.mes_label),
        receita: num(r.receita),
        despesa: num(r.despesa),
        resultado: num(r.resultado),
        margem_pct: numOrNull(r.margem_pct),
        saldo_fim_mes: num(r.saldo_fim_mes),
      }));
    },
    staleTime: 60_000,
  });
}

/* ---------------------------------------------------------------- */
/* Próximas movimentações                                           */
/* ---------------------------------------------------------------- */

export type UpcomingMovementRow = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  categoria_nome: string | null;
  valor: number;
  data_vencimento: string;
  dias_ate_vencimento: number;
  status: string;
  project_code: string | null;
  company_name: string | null;
  is_overdue: boolean;
};

export function useUpcomingMovements(daysAhead: number, includeOverdue: boolean) {
  return useQuery({
    queryKey: ["finance", "upcoming_movements", daysAhead, includeOverdue],
    queryFn: async (): Promise<UpcomingMovementRow[]> => {
      const { data, error } = await supabase.rpc(
        "get_upcoming_movements" as never,
        { p_days_ahead: daysAhead, p_include_overdue: includeOverdue } as never,
      );
      if (error) throw error;
      const arr = (data ?? []) as Record<string, unknown>[];
      return arr.map((r) => ({
        id: str(r.id),
        tipo: str(r.tipo) as "receita" | "despesa",
        descricao: str(r.descricao),
        categoria_nome: strOrNull(r.categoria_nome),
        valor: num(r.valor),
        data_vencimento: str(r.data_vencimento),
        dias_ate_vencimento: num(r.dias_ate_vencimento),
        status: str(r.status),
        project_code: strOrNull(r.project_code),
        company_name: strOrNull(r.company_name),
        is_overdue: Boolean(r.is_overdue),
      }));
    },
    staleTime: 60_000,
  });
}
