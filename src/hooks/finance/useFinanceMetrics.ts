/**
 * Hooks React Query do Dashboard Financeiro.
 * Cobrem: resumo financeiro (com comparação), projeção de caixa,
 * receita/despesa por categoria/projeto, saldos por conta e alertas.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  resolvePeriod,
  resolveCompareRange,
  toISODate,
  useFinanceHubStore,
  type FinanceRegime,
  type FinanceScenario,
  type FinanceProjectionHorizon,
} from "./useFinanceHubStore";

const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown) => (v == null ? null : Number(v));

type Filters = {
  account_ids: string[] | null;
  project_ids: string[] | null;
  category_ids: string[] | null;
};

function useFilters(): Filters {
  const accountFilter = useFinanceHubStore((s) => s.accountFilter);
  const projectFilter = useFinanceHubStore((s) => s.projectFilter);
  const categoryFilter = useFinanceHubStore((s) => s.categoryFilter);
  return {
    account_ids: accountFilter.length ? accountFilter : null,
    project_ids: projectFilter.length ? projectFilter : null,
    category_ids: categoryFilter.length ? categoryFilter : null,
  };
}

/* ---------------------------------------------------------------- */
/* Resumo financeiro com comparação                                 */
/* ---------------------------------------------------------------- */

export type FinancialSummary = {
  receita_bruta: number;
  despesa_total: number;
  resultado: number;
  margem_pct: number | null;
  receita_realizada: number;
  despesa_realizada: number;
  receita_pendente: number;
  despesa_pendente: number;
  count_movimentacoes: number;
};

async function fetchSummary(
  start: string,
  end: string,
  regime: FinanceRegime,
  filters: Filters,
): Promise<FinancialSummary> {
  const { data, error } = await supabase.rpc("get_financial_summary" as never, {
    p_start_date: start,
    p_end_date: end,
    p_regime: regime,
    p_account_ids: filters.account_ids,
    p_project_ids: filters.project_ids,
    p_category_ids: filters.category_ids,
  } as never);
  if (error) throw error;
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    receita_bruta: num(r?.receita_bruta),
    despesa_total: num(r?.despesa_total),
    resultado: num(r?.resultado),
    margem_pct: numOrNull(r?.margem_pct),
    receita_realizada: num(r?.receita_realizada),
    despesa_realizada: num(r?.despesa_realizada),
    receita_pendente: num(r?.receita_pendente),
    despesa_pendente: num(r?.despesa_pendente),
    count_movimentacoes: num(r?.count_movimentacoes),
  };
}

export function useFinancialSummary() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const compareWith = useFinanceHubStore((s) => s.compareWith);
  const regime = useFinanceHubStore((s) => s.regime);
  const filters = useFilters();

  const range = resolvePeriod(period, customStart, customEnd);
  const compareRange = resolveCompareRange(range, compareWith);

  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);
  const compStartISO = compareRange ? toISODate(compareRange.start) : null;
  const compEndISO = compareRange ? toISODate(compareRange.end) : null;

  return useQuery({
    queryKey: [
      "finance_summary",
      startISO,
      endISO,
      compStartISO,
      compEndISO,
      regime,
      filters,
    ],
    staleTime: 60_000,
    queryFn: async () => {
      const [current, previous] = await Promise.all([
        fetchSummary(startISO, endISO, regime, filters),
        compStartISO && compEndISO
          ? fetchSummary(compStartISO, compEndISO, regime, filters)
          : Promise.resolve(null),
      ]);
      return {
        current,
        previous,
        range,
        compareRange,
      };
    },
  });
}

/* ---------------------------------------------------------------- */
/* Projeção de caixa                                                */
/* ---------------------------------------------------------------- */

export type CashProjectionPoint = {
  projection_date: string;
  saldo_projetado: number;
  entradas_dia: number;
  saidas_dia: number;
};

export function useCashProjection(
  daysAhead?: FinanceProjectionHorizon,
  scenarioOverride?: FinanceScenario,
) {
  const horizon = useFinanceHubStore((s) => s.horizon);
  const scenario = useFinanceHubStore((s) => s.scenario);
  const filters = useFilters();
  const finalDays = daysAhead ?? horizon;
  const finalScenario = scenarioOverride ?? scenario;

  return useQuery({
    queryKey: ["finance_projection", finalDays, finalScenario, filters.account_ids],
    staleTime: 60_000,
    queryFn: async (): Promise<CashProjectionPoint[]> => {
      const { data, error } = await supabase.rpc("get_cash_projection" as never, {
        p_days_ahead: finalDays,
        p_scenario: finalScenario,
        p_account_ids: filters.account_ids,
      } as never);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map((r) => ({
        projection_date: String(r.projection_date),
        saldo_projetado: num(r.saldo_projetado),
        entradas_dia: num(r.entradas_dia),
        saidas_dia: num(r.saidas_dia),
      }));
    },
  });
}

/* ---------------------------------------------------------------- */
/* Receita / Despesa por categoria                                  */
/* ---------------------------------------------------------------- */

export type CategoryRow = {
  category_id: string;
  category_name: string;
  valor_total: number;
  valor_realizado: number;
  valor_pendente: number;
  count_movimentacoes: number;
  pct_do_total: number;
};

function useCategoryQuery(rpc: "get_revenue_by_category" | "get_expense_by_category") {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const regime = useFinanceHubStore((s) => s.regime);
  const filters = useFilters();
  const range = resolvePeriod(period, customStart, customEnd);
  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);

  return useQuery({
    queryKey: [rpc, startISO, endISO, regime, filters],
    staleTime: 60_000,
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase.rpc(rpc as never, {
        p_start_date: startISO,
        p_end_date: endISO,
        p_regime: regime,
        p_account_ids: filters.account_ids,
        p_project_ids: filters.project_ids,
      } as never);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map((r) => ({
        category_id: String(r.category_id),
        category_name: String(r.category_name),
        valor_total: num(r.valor_total),
        valor_realizado: num(r.valor_realizado),
        valor_pendente: num(r.valor_pendente),
        count_movimentacoes: num(r.count_movimentacoes),
        pct_do_total: num(r.pct_do_total),
      }));
    },
  });
}

export const useRevenueByCategory = () => useCategoryQuery("get_revenue_by_category");
export const useExpenseByCategory = () => useCategoryQuery("get_expense_by_category");

/* ---------------------------------------------------------------- */
/* Receita / Despesa por projeto                                    */
/* ---------------------------------------------------------------- */

export type ProjectRevenueRow = {
  project_id: string | null;
  project_code: string | null;
  project_name: string;
  valor_total: number;
  valor_recebido: number;
  valor_pendente: number;
  has_overdue: boolean;
  pct_do_total: number;
};

export type ProjectExpenseRow = {
  project_id: string | null;
  project_code: string | null;
  project_name: string;
  valor_total: number;
  valor_realizado: number;
  valor_pendente: number;
  pct_do_total: number;
};

export function useRevenueByProject() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const regime = useFinanceHubStore((s) => s.regime);
  const range = resolvePeriod(period, customStart, customEnd);
  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);

  return useQuery({
    queryKey: ["get_revenue_by_project", startISO, endISO, regime],
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectRevenueRow[]> => {
      const { data, error } = await supabase.rpc("get_revenue_by_project" as never, {
        p_start_date: startISO,
        p_end_date: endISO,
        p_regime: regime,
      } as never);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map((r) => ({
        project_id: r.project_id ? String(r.project_id) : null,
        project_code: r.project_code ? String(r.project_code) : null,
        project_name: String(r.project_name),
        valor_total: num(r.valor_total),
        valor_recebido: num(r.valor_recebido),
        valor_pendente: num(r.valor_pendente),
        has_overdue: Boolean(r.has_overdue),
        pct_do_total: num(r.pct_do_total),
      }));
    },
  });
}

export function useExpenseByProject() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const regime = useFinanceHubStore((s) => s.regime);
  const range = resolvePeriod(period, customStart, customEnd);
  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);

  return useQuery({
    queryKey: ["get_expense_by_project", startISO, endISO, regime],
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectExpenseRow[]> => {
      const { data, error } = await supabase.rpc("get_expense_by_project" as never, {
        p_start_date: startISO,
        p_end_date: endISO,
        p_regime: regime,
      } as never);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map((r) => ({
        project_id: r.project_id ? String(r.project_id) : null,
        project_code: r.project_code ? String(r.project_code) : null,
        project_name: String(r.project_name),
        valor_total: num(r.valor_total),
        valor_realizado: num(r.valor_realizado),
        valor_pendente: num(r.valor_pendente),
        pct_do_total: num(r.pct_do_total),
      }));
    },
  });
}

/* ---------------------------------------------------------------- */
/* Saldos por conta                                                 */
/* ---------------------------------------------------------------- */

export type AccountBalance = {
  conta_id: string;
  conta_nome: string;
  banco: string | null;
  tipo: string | null;
  saldo_atual: number;
  saldo_anterior: number;
  variacao_pct: number | null;
};

export function useAccountBalances() {
  return useQuery({
    queryKey: ["account_balances"],
    staleTime: 60_000,
    queryFn: async (): Promise<AccountBalance[]> => {
      const { data, error } = await supabase.rpc("get_account_balances" as never, {
        p_days_history: 90,
      } as never);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map((r) => ({
        conta_id: String(r.conta_id),
        conta_nome: String(r.conta_nome),
        banco: r.banco ? String(r.banco) : null,
        tipo: r.tipo ? String(r.tipo) : null,
        saldo_atual: num(r.saldo_atual),
        saldo_anterior: num(r.saldo_anterior),
        variacao_pct: numOrNull(r.variacao_pct),
      }));
    },
  });
}

/* ---------------------------------------------------------------- */
/* Top fornecedores (despesa)                                       */
/* ---------------------------------------------------------------- */

export type TopFornecedor = {
  id: string;
  nome: string;
  total: number;
  count: number;
  ultima: string | null;
};

export function useTopFornecedores() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const regime = useFinanceHubStore((s) => s.regime);
  const range = resolvePeriod(period, customStart, customEnd);
  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);
  const dateField = regime === "caixa" ? "data_pagamento" : "data_competencia";

  return useQuery({
    queryKey: ["top_fornecedores", startISO, endISO, regime],
    staleTime: 60_000,
    queryFn: async (): Promise<TopFornecedor[]> => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select(
          "id, valor_previsto, valor_realizado, status, data_competencia, data_pagamento, fornecedor:fornecedores(id, nome), colaborador:colaboradores(id, nome)",
        )
        .eq("tipo", "despesa")
        .gte(dateField, startISO)
        .lte(dateField, endISO);
      if (error) throw error;

      const map = new Map<string, TopFornecedor>();
      for (const m of (data ?? []) as Array<Record<string, unknown>>) {
        const f = m.fornecedor as { id: string; nome: string } | null;
        const c = m.colaborador as { id: string; nome: string } | null;
        const ent = f ?? c;
        if (!ent) continue;
        const valor =
          m.status === "pago"
            ? num(m.valor_realizado ?? m.valor_previsto)
            : num(m.valor_previsto);
        const dataRef =
          regime === "caixa"
            ? (m.data_pagamento as string | null)
            : (m.data_competencia as string | null);
        const cur = map.get(ent.id) ?? {
          id: ent.id,
          nome: ent.nome,
          total: 0,
          count: 0,
          ultima: null,
        };
        cur.total += valor;
        cur.count += 1;
        if (dataRef && (!cur.ultima || dataRef > cur.ultima)) cur.ultima = dataRef;
        map.set(ent.id, cur);
      }
      return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
    },
  });
}

/* ---------------------------------------------------------------- */
/* Comparativo despesa por categoria vs período anterior            */
/* ---------------------------------------------------------------- */

export type CategoryComparison = {
  category_id: string;
  category_name: string;
  current: number;
  previous: number;
  delta_abs: number;
  delta_pct: number | null;
};

export function useExpenseCategoryComparison() {
  const period = useFinanceHubStore((s) => s.period);
  const customStart = useFinanceHubStore((s) => s.customStart);
  const customEnd = useFinanceHubStore((s) => s.customEnd);
  const compareWith = useFinanceHubStore((s) => s.compareWith);
  const regime = useFinanceHubStore((s) => s.regime);
  const range = resolvePeriod(period, customStart, customEnd);
  const compRange = resolveCompareRange(range, compareWith);

  const startISO = toISODate(range.start);
  const endISO = toISODate(range.end);
  const compStart = compRange ? toISODate(compRange.start) : null;
  const compEnd = compRange ? toISODate(compRange.end) : null;

  return useQuery({
    queryKey: ["expense_category_comparison", startISO, endISO, compStart, compEnd, regime],
    staleTime: 60_000,
    enabled: Boolean(compStart && compEnd),
    queryFn: async (): Promise<CategoryComparison[]> => {
      const args = {
        p_start_date: startISO,
        p_end_date: endISO,
        p_regime: regime,
        p_account_ids: null,
        p_project_ids: null,
      };
      const argsPrev = {
        ...args,
        p_start_date: compStart,
        p_end_date: compEnd,
      };
      const [{ data: cur, error: e1 }, { data: prev, error: e2 }] = await Promise.all([
        supabase.rpc("get_expense_by_category" as never, args as never),
        supabase.rpc("get_expense_by_category" as never, argsPrev as never),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const prevMap = new Map<string, number>();
      for (const r of (prev ?? []) as Array<Record<string, unknown>>) {
        prevMap.set(String(r.category_id), num(r.valor_total));
      }
      const curRows = (cur ?? []) as Array<Record<string, unknown>>;
      const allIds = new Set([
        ...curRows.map((r) => String(r.category_id)),
        ...Array.from(prevMap.keys()),
      ]);
      const result: CategoryComparison[] = [];
      for (const id of allIds) {
        const row = curRows.find((r) => String(r.category_id) === id);
        const currentVal = row ? num(row.valor_total) : 0;
        const previousVal = prevMap.get(id) ?? 0;
        result.push({
          category_id: id,
          category_name: row
            ? String(row.category_name)
            : `(removida)`,
          current: currentVal,
          previous: previousVal,
          delta_abs: currentVal - previousVal,
          delta_pct:
            previousVal === 0
              ? null
              : Math.round(((currentVal - previousVal) / previousVal) * 100 * 100) / 100,
        });
      }
      return result.sort((a, b) => b.delta_abs - a.delta_abs);
    },
  });
}

/* ---------------------------------------------------------------- */
/* Sparkline de saldo total (90d)                                   */
/* ---------------------------------------------------------------- */

export function useBalanceSparkline() {
  const filters = useFilters();
  return useQuery({
    queryKey: ["balance_sparkline", filters.account_ids],
    staleTime: 60_000,
    queryFn: async () => {
      // Aproveitamos get_cash_projection com p_days_ahead=0 retorna 1 ponto (hoje).
      // Para sparkline histórico, calculamos 12 pontos (90/12) com calculate_account_balance.
      const points: number[] = [];
      const today = new Date();
      const accountsRes = await supabase
        .from("contas_bancarias")
        .select("id")
        .eq("ativo", true);
      const accountIds = (accountsRes.data ?? []).map((a) => a.id);
      const filterIds = filters.account_ids;
      const ids = filterIds ?? accountIds;

      // Snapshot a cada 8 dias nos últimos 90
      for (let i = 90; i >= 0; i -= 8) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const iso = toISODate(d);
        const results = await Promise.all(
          ids.map(
            (aid) =>
              supabase.rpc("calculate_account_balance" as never, {
                p_conta_id: aid,
                p_ate_data: iso,
              } as never) as Promise<{ data: number | null; error: unknown }>,
          ),
        );
        const total = results.reduce((s, r) => s + num(r.data), 0);
        points.push(total);
      }
      return points;
    },
  });
}

/* ---------------------------------------------------------------- */
/* Alertas acionáveis                                               */
/* ---------------------------------------------------------------- */

export type FinanceAlert = {
  id: string;
  kind:
    | "negative_account"
    | "projected_negative"
    | "overdue_receivable"
    | "expense_spike";
  severity: "danger" | "warning";
  label: string;
};

export function useFinancialAlerts() {
  const balances = useAccountBalances();
  const projection = useCashProjection();

  return useQuery({
    queryKey: [
      "finance_alerts",
      balances.data,
      projection.data?.length,
      projection.data?.[projection.data.length - 1]?.saldo_projetado,
    ],
    enabled: balances.isSuccess && projection.isSuccess,
    staleTime: 60_000,
    queryFn: async (): Promise<FinanceAlert[]> => {
      const alerts: FinanceAlert[] = [];

      // 1) Conta com saldo negativo
      for (const a of balances.data ?? []) {
        if (a.saldo_atual < 0) {
          alerts.push({
            id: `neg-${a.conta_id}`,
            kind: "negative_account",
            severity: "danger",
            label: `${a.conta_nome} com saldo negativo`,
          });
        }
      }

      // 2) Saldo projetado fica negativo em X dias
      const negPoint = (projection.data ?? []).find((p) => p.saldo_projetado < 0);
      if (negPoint) {
        const d = new Date(negPoint.projection_date);
        const today = new Date();
        const days = Math.max(
          1,
          Math.round((d.getTime() - today.getTime()) / 86400000),
        );
        alerts.push({
          id: "proj-neg",
          kind: "projected_negative",
          severity: "danger",
          label: `Saldo projetado fica negativo em ${days} ${days === 1 ? "dia" : "dias"}`,
        });
      }

      // 3) Recebíveis vencidos > 7 dias
      const today = new Date();
      const limite = new Date(today);
      limite.setDate(limite.getDate() - 7);
      const { data: vencidos } = await supabase
        .from("movimentacoes")
        .select("id, valor_previsto")
        .eq("tipo", "receita")
        .neq("status", "pago")
        .lt("data_vencimento", toISODate(limite));
      if (vencidos && vencidos.length > 0) {
        const total = vencidos.reduce(
          (s, m) => s + num((m as Record<string, unknown>).valor_previsto),
          0,
        );
        alerts.push({
          id: "overdue-7",
          kind: "overdue_receivable",
          severity: "warning",
          label: `${vencidos.length} recebíveis (R$ ${total.toLocaleString(
            "pt-BR",
            { minimumFractionDigits: 2 },
          )}) vencidos há mais de 7 dias`,
        });
      }

      return alerts;
    },
  });
}

/* ---------------------------------------------------------------- */
/* Reference: contas/projetos/categorias para filtros               */
/* ---------------------------------------------------------------- */

export function useFinanceReferenceLists() {
  return useQuery({
    queryKey: ["finance_reference_lists"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [contasRes, projetosRes, categoriasRes] = await Promise.all([
        supabase.from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("projects").select("id, code, name").order("code"),
        supabase.from("categorias").select("id, nome, tipo").eq("ativo", true).order("nome"),
      ]);
      return {
        contas: contasRes.data ?? [],
        projetos: projetosRes.data ?? [],
        categorias: categoriasRes.data ?? [],
      };
    },
  });
}
