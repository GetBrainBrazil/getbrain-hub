/**
 * /financeiro — Dashboard Financeiro denso (cockpit).
 * Substitui o dashboard antigo. Segue padrão 6.Z do ARCHITECTURE v1.6.
 *
 * Estrutura (09A + 09B):
 *  1. Cabeçalho (período, comparar, regime, filtros)
 *  2. Linha de alertas acionáveis (condicional)
 *  3. 6 KPIs macro com delta + sparkline
 *  4. Bloco 1 — Liquidez (saldo por conta + evolução + composição)
 *  5. Bloco 4 — Fluxo de Caixa Projetado (gráfico + 4 mini-cards)
 *  6. Bloco 2 — Receita (categoria + projeto + recebido vs a receber)
 *  7. Bloco 3 — Despesa (categoria + projeto + top fornecedores + comparativo)
 *  8. Bloco 5 — Por Projeto (margem real, %recebido, saúde) [09B]
 *  9. Bloco 6 — Por Cliente (LTV, inadimplência, dias de atraso) [09B]
 * 10. Bloco 7 — Comparativo Histórico (12 meses + saldo + crescimento) [09B]
 * 11. Bloco 8 — Próximas Movimentações (toggle horizonte) [09B]
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Percent,
  Hourglass,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyChart } from "@/components/dashboard/EmptyChart";
import { SparklineMini } from "@/components/dashboard/SparklineMini";
import {
  BlocoPorProjeto,
  BlocoPorCliente,
  BlocoComparativoHistorico,
  BlocoProximasMovimentacoes,
} from "@/components/dashboard/FinanceBlocks09B";

import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import {
  useFinanceHubStore,
  resolvePeriod,
  type FinancePeriodPreset,
  type FinanceCompareOption,
  type FinanceRegime,
  type FinanceScenario,
  type FinanceProjectionHorizon,
} from "@/hooks/finance/useFinanceHubStore";
import {
  useFinancialSummary,
  useCashProjection,
  useRevenueByCategory,
  useExpenseByCategory,
  useRevenueByProject,
  useExpenseByProject,
  useAccountBalances,
  useTopFornecedores,
  useExpenseCategoryComparison,
  useBalanceSparkline,
  useFinancialAlerts,
  useFinanceReferenceLists,
} from "@/hooks/finance/useFinanceMetrics";

/* ------------------------------------------------------------ */
/* utilidades                                                   */
/* ------------------------------------------------------------ */

const fmtCurrencyCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return formatCurrency(v);
};

const computeDelta = (current: number, previous: number | null) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

const PERIOD_OPTIONS: { value: FinancePeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "this_week", label: "Esta semana" },
  { value: "this_month", label: "Este mês" },
  { value: "last_30", label: "Últimos 30 dias" },
  { value: "last_90", label: "Últimos 90 dias" },
  { value: "last_12m", label: "Últimos 12 meses" },
  { value: "ytd", label: "Este ano (YTD)" },
  { value: "last_year", label: "Ano passado" },
];

const COMPARE_OPTIONS: { value: FinanceCompareOption; label: string }[] = [
  { value: "previous_period", label: "Período anterior" },
  { value: "previous_year", label: "Ano passado" },
  { value: "none", label: "Sem comparação" },
];

const SCENARIOS: { value: FinanceScenario; label: string }[] = [
  { value: "otimista", label: "Otimista" },
  { value: "realista", label: "Realista" },
  { value: "pessimista", label: "Pessimista" },
];

const HORIZONS: FinanceProjectionHorizon[] = [30, 60, 90, 180];

const PIE_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(173, 58%, 39%)",
  "hsl(197, 71%, 52%)",
  "hsl(262, 52%, 60%)",
  "hsl(43, 74%, 49%)",
];

/* ------------------------------------------------------------ */
/* Página                                                       */
/* ------------------------------------------------------------ */

export default function FinanceiroVisaoGeral() {
  const navigate = useNavigate();
  const {
    period,
    customStart,
    customEnd,
    compareWith,
    regime,
    accountFilter,
    projectFilter,
    categoryFilter,
    setPeriod,
    setCompareWith,
    setRegime,
    setAccountFilter,
    setProjectFilter,
    setCategoryFilter,
    resetFilters,
  } = useFinanceHubStore();

  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const summaryQ = useFinancialSummary();
  const balancesQ = useAccountBalances();
  const projectionQ = useCashProjection();
  const sparkQ = useBalanceSparkline();
  const revCatQ = useRevenueByCategory();
  const expCatQ = useExpenseByCategory();
  const revProjQ = useRevenueByProject();
  const expProjQ = useExpenseByProject();
  const fornQ = useTopFornecedores();
  const catCompQ = useExpenseCategoryComparison();
  const alertsQ = useFinancialAlerts();
  const refsQ = useFinanceReferenceLists();

  const current = summaryQ.data?.current;
  const previous = summaryQ.data?.previous ?? null;

  /* --------- KPIs derivados --------- */

  const saldoTotal = useMemo(
    () => (balancesQ.data ?? []).reduce((s, a) => s + a.saldo_atual, 0),
    [balancesQ.data],
  );
  const saldoAnterior = useMemo(
    () => (balancesQ.data ?? []).reduce((s, a) => s + a.saldo_anterior, 0),
    [balancesQ.data],
  );
  const saldoDelta = computeDelta(saldoTotal, saldoAnterior);

  // Runway: saldo / despesa média mensal últimos 3 meses (aprox. via média mensal do current)
  const runway = useMemo(() => {
    if (!current) return null;
    const despMensal = current.despesa_total / Math.max(1, monthsInRange(range.start, range.end));
    if (despMensal <= 0) return Infinity;
    if (current.receita_bruta >= current.despesa_total) return Infinity;
    return saldoTotal / despMensal;
  }, [current, range, saldoTotal]);

  /* --------- handlers --------- */

  const filtersActive =
    accountFilter.length || projectFilter.length || categoryFilter.length;

  const goCategoria = (catId: string) =>
    navigate(`/financeiro/movimentacoes?categoria=${catId}`);
  const goConta = (contaId: string) =>
    navigate(`/financeiro/extratos?conta=${contaId}`);
  const goProjeto = (code: string | null) =>
    code && navigate(`/projetos/${code}`);

  /* --------- alertas projeção zero --------- */

  const projectionData = projectionQ.data ?? [];
  const firstNeg = projectionData.find((p) => p.saldo_projetado < 0);
  const minPoint = projectionData.reduce<typeof projectionData[number] | null>(
    (acc, p) => (acc === null || p.saldo_projetado < acc.saldo_projetado ? p : acc),
    null,
  );
  const lastPoint = projectionData[projectionData.length - 1];
  const totalEntradas = projectionData.reduce((s, p) => s + p.entradas_dia, 0);
  const totalSaidas = projectionData.reduce((s, p) => s + p.saidas_dia, 0);

  /* ============================================================== */
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ============== Cabeçalho ============== */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Liquidez, receita, despesa e projeção — {range.label.toLowerCase()} ·{" "}
              <span className="font-medium">
                {regime === "competencia" ? "Regime de competência" : "Regime de caixa"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as FinancePeriodPreset)}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={compareWith}
              onValueChange={(v) => setCompareWith(v as FinanceCompareOption)}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    Comparar: {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Toggle Regime — destacado */}
            <div className="inline-flex h-9 items-center rounded-md border bg-background p-0.5 text-xs">
              {(["competencia", "caixa"] as FinanceRegime[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegime(r)}
                  className={cn(
                    "h-full rounded px-3 font-medium transition-colors",
                    regime === r
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r === "competencia" ? "Competência" : "Caixa"}
                </button>
              ))}
            </div>

            <Select
              value={accountFilter[0] ?? "__all__"}
              onValueChange={(v) =>
                setAccountFilter(v === "__all__" ? [] : [v])
              }
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as contas</SelectItem>
                {(refsQ.data?.contas ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={projectFilter[0] ?? "__all__"}
              onValueChange={(v) =>
                setProjectFilter(v === "__all__" ? [] : [v])
              }
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos projetos</SelectItem>
                {(refsQ.data?.projetos ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter[0] ?? "__all__"}
              onValueChange={(v) =>
                setCategoryFilter(v === "__all__" ? [] : [v])
              }
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas categorias</SelectItem>
                {(refsQ.data?.categorias ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtersActive ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => summaryQ.refetch()}
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ============== Alertas ============== */}
        {(alertsQ.data ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
              Alertas
            </span>
            {(alertsQ.data ?? []).map((a) => (
              <span
                key={a.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                  a.severity === "danger"
                    ? "border-destructive/40 bg-background text-destructive"
                    : "border-amber-500/40 bg-background text-amber-600 dark:text-amber-400",
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {a.label}
              </span>
            ))}
          </div>
        )}

        {/* ============== KPIs macro ============== */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <KpiCard
            label="Saldo em contas"
            value={fmtCurrencyCompact(saldoTotal)}
            delta={saldoDelta}
            sparkData={sparkQ.data}
            hint={`${(balancesQ.data ?? []).length} contas`}
            loading={balancesQ.isLoading}
          />
          <KpiCard
            label="Receita do período"
            value={current ? fmtCurrencyCompact(current.receita_bruta) : "—"}
            delta={current && previous ? computeDelta(current.receita_bruta, previous.receita_bruta) : null}
            goodWhen="up"
            hint={current ? `${current.count_movimentacoes} movs` : undefined}
            loading={summaryQ.isLoading}
          />
          <KpiCard
            label="Despesa do período"
            value={current ? fmtCurrencyCompact(current.despesa_total) : "—"}
            delta={current && previous ? computeDelta(current.despesa_total, previous.despesa_total) : null}
            goodWhen="down"
            loading={summaryQ.isLoading}
          />
          <KpiCard
            label="Resultado"
            value={current ? fmtCurrencyCompact(current.resultado) : "—"}
            delta={current && previous ? computeDelta(current.resultado, previous.resultado) : null}
            goodWhen="up"
            loading={summaryQ.isLoading}
          />
          <MarginKpi summary={current} previous={previous} loading={summaryQ.isLoading} />
          <RunwayKpi runway={runway} loading={balancesQ.isLoading || summaryQ.isLoading} />
        </div>

        {/* ============== Bloco 1 — Liquidez ============== */}
        <DashboardSection
          title="Liquidez"
          question="Onde está o dinheiro neste momento."
        >
          {/* Saldo por conta */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {balancesQ.isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (balancesQ.data ?? []).length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6">
                  <EmptyChart message="Nenhuma conta bancária cadastrada" />
                </CardContent>
              </Card>
            ) : (
              (balancesQ.data ?? []).map((a) => {
                const negative = a.saldo_atual < 0;
                const variation = a.saldo_atual - a.saldo_anterior;
                return (
                  <button
                    key={a.conta_id}
                    onClick={() => goConta(a.conta_id)}
                    className={cn(
                      "rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/5",
                      negative ? "border-destructive/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{a.conta_nome}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.banco ?? "—"} · {a.tipo ?? "corrente"}
                        </p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 text-xl font-bold tabular-nums",
                        negative && "text-destructive",
                      )}
                    >
                      {formatCurrency(a.saldo_atual)}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px] tabular-nums",
                        variation < 0
                          ? "text-destructive"
                          : variation > 0
                            ? "text-emerald-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {variation >= 0 ? "+" : ""}
                      {formatCurrency(variation)} · 90d
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Composição */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Composição por conta</CardTitle>
            </CardHeader>
            <CardContent>
              {balancesQ.isLoading ? (
                <Skeleton className="h-[200px]" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={(balancesQ.data ?? [])
                        .filter((a) => a.saldo_atual > 0)
                        .map((a) => ({
                          name: a.conta_nome,
                          value: a.saldo_atual,
                        }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {(balancesQ.data ?? []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <p className="mt-2 text-center text-lg font-bold tabular-nums">
                {formatCurrency(saldoTotal)}
              </p>
              <p className="text-center text-[11px] text-muted-foreground">
                Total consolidado
              </p>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* ============== Bloco 4 — Fluxo Projetado ============== */}
        <DashboardSection
          title="Fluxo de caixa projetado"
          question="Como vou estar nos próximos meses, considerando compromissos já registrados."
        >
          <Card className="col-span-12">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                Projeção dia-a-dia · cenário {SCENARIOS.find((s) => s.value === useFinanceHubStore.getState().scenario)?.label}
              </CardTitle>
              <div className="flex items-center gap-2">
                <ScenarioToggle />
                <HorizonToggle />
              </div>
            </CardHeader>
            <CardContent>
              {projectionQ.isLoading ? (
                <Skeleton className="h-[320px]" />
              ) : projectionData.length === 0 ? (
                <EmptyChart message="Sem movimentações futuras registradas" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="projection_date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d: string) =>
                        new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      }
                      interval={Math.max(0, Math.floor(projectionData.length / 10))}
                    />
                    <YAxis
                      yAxisId="flow"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="balance"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      labelFormatter={(d: string) =>
                        new Date(d + "T00:00:00").toLocaleDateString("pt-BR")
                      }
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine
                      yAxisId="balance"
                      y={0}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="entradas_dia"
                      name="Entradas"
                      fill="hsl(173, 58%, 45%)"
                      stackId="flow"
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="saidas_dia"
                      name="Saídas"
                      fill="hsl(var(--destructive))"
                      stackId="flow"
                    />
                    <Line
                      yAxisId="balance"
                      type="monotone"
                      dataKey="saldo_projetado"
                      name="Saldo acumulado"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {firstNeg && (
                <p className="mt-2 text-xs text-destructive">
                  ⚠ Saldo fica negativo em{" "}
                  {new Date(firstNeg.projection_date + "T00:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <MiniStat
            label="Entradas previstas"
            value={fmtCurrencyCompact(totalEntradas)}
            tone="positive"
          />
          <MiniStat
            label="Saídas previstas"
            value={fmtCurrencyCompact(totalSaidas)}
            tone="negative"
          />
          <MiniStat
            label="Saldo projetado no fim"
            value={lastPoint ? fmtCurrencyCompact(lastPoint.saldo_projetado) : "—"}
            tone={lastPoint && lastPoint.saldo_projetado < 0 ? "negative" : "positive"}
          />
          <MiniStat
            label="Dia com menor saldo"
            value={
              minPoint
                ? `${fmtCurrencyCompact(minPoint.saldo_projetado)}`
                : "—"
            }
            hint={
              minPoint
                ? new Date(minPoint.projection_date + "T00:00:00").toLocaleDateString(
                    "pt-BR",
                  )
                : undefined
            }
            tone={minPoint && minPoint.saldo_projetado < 0 ? "negative" : "neutral"}
          />
        </DashboardSection>

        {/* ============== Bloco 2 — Receita ============== */}
        <DashboardSection
          title="Receita"
          question="Quanto está entrando e de onde."
        >
          {/* Por categoria */}
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Receita por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {revCatQ.isLoading ? (
                <Skeleton className="h-[260px]" />
              ) : (revCatQ.data ?? []).length === 0 ? (
                <EmptyChart message="Sem receitas no período" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={revCatQ.data}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category_name"
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="valor_total"
                      fill="hsl(var(--accent))"
                      onClick={(d: unknown) => {
                        const id = (d as { payload?: { category_id?: string } })?.payload?.category_id;
                        if (id) goCategoria(id);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Por projeto */}
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Receita por projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {revProjQ.isLoading ? (
                <Skeleton className="h-[260px]" />
              ) : (revProjQ.data ?? []).length === 0 ? (
                <EmptyChart message="Nenhuma receita vinculada a projetos no período" />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 text-left">Projeto</th>
                      <th className="py-1.5 text-right">Recebido</th>
                      <th className="py-1.5 text-right">A receber</th>
                      <th className="py-1.5 text-right">Total</th>
                      <th className="py-1.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revProjQ.data ?? []).map((p) => (
                      <tr
                        key={p.project_id}
                        onClick={() => goProjeto(p.project_code)}
                        className="cursor-pointer border-b hover:bg-accent/5"
                      >
                        <td className="py-1.5">
                          {p.has_overdue && (
                            <span className="mr-1 text-destructive" title="Tem recebíveis vencidos">
                              🚨
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {p.project_code}
                          </span>{" "}
                          {p.project_name}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-emerald-500">
                          {formatCurrency(p.valor_recebido)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(p.valor_pendente)}
                        </td>
                        <td className="py-1.5 text-right font-medium tabular-nums">
                          {formatCurrency(p.valor_total)}
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {p.pct_do_total.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Recebido vs A Receber */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recebido vs a receber</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryQ.isLoading ? (
                <Skeleton className="h-[200px]" />
              ) : !current || current.receita_bruta === 0 ? (
                <EmptyChart message="Sem receitas no período" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Recebido", value: current.receita_realizada },
                          { name: "A receber", value: current.receita_pendente },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                      >
                        <Cell fill="hsl(173, 58%, 45%)" />
                        <Cell fill="hsl(var(--muted-foreground))" />
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-center">
                    <p className="text-lg font-bold tabular-nums">
                      {Math.round(
                        (current.receita_realizada / current.receita_bruta) * 100,
                      )}
                      %
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      do período já recebido
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* ============== Bloco 3 — Despesa ============== */}
        <DashboardSection
          title="Despesa"
          question="Para onde está indo o dinheiro."
        >
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Despesa por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {expCatQ.isLoading ? (
                <Skeleton className="h-[260px]" />
              ) : (expCatQ.data ?? []).length === 0 ? (
                <EmptyChart message="Sem despesas no período" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={expCatQ.data}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category_name"
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="valor_total"
                      fill="hsl(var(--destructive))"
                      onClick={(d: unknown) => {
                        const id = (d as { payload?: { category_id?: string } })?.payload?.category_id;
                        if (id) goCategoria(id);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Despesa por projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {expProjQ.isLoading ? (
                <Skeleton className="h-[260px]" />
              ) : (expProjQ.data ?? []).length === 0 ? (
                <EmptyChart message="Sem despesas no período" />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 text-left">Projeto</th>
                      <th className="py-1.5 text-right">Realizado</th>
                      <th className="py-1.5 text-right">Pendente</th>
                      <th className="py-1.5 text-right">Total</th>
                      <th className="py-1.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expProjQ.data ?? []).map((p, i) => (
                      <tr
                        key={p.project_id ?? `none-${i}`}
                        onClick={() => goProjeto(p.project_code)}
                        className={cn(
                          "border-b",
                          p.project_code && "cursor-pointer hover:bg-accent/5",
                        )}
                      >
                        <td className="py-1.5">
                          {p.project_code ? (
                            <>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {p.project_code}
                              </span>{" "}
                              {p.project_name}
                            </>
                          ) : (
                            <span className="italic text-muted-foreground">
                              {p.project_name}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatCurrency(p.valor_realizado)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(p.valor_pendente)}
                        </td>
                        <td className="py-1.5 text-right font-medium tabular-nums">
                          {formatCurrency(p.valor_total)}
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {p.pct_do_total.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 10 fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              {fornQ.isLoading ? (
                <Skeleton className="h-[260px]" />
              ) : (fornQ.data ?? []).length === 0 ? (
                <EmptyChart message="Sem despesas com fornecedores no período" />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 text-left">Fornecedor</th>
                      <th className="py-1.5 text-right">Total</th>
                      <th className="py-1.5 text-right">Movs</th>
                      <th className="py-1.5 text-right">Última</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fornQ.data ?? []).map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="py-1.5">{f.nome}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatCurrency(f.total)}
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {f.count}
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {f.ultima
                            ? new Date(f.ultima + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Comparativo com{" "}
                {compareWith === "previous_year" ? "ano passado" : "período anterior"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summaryQ.data?.compareRange ? (
                <EmptyChart message="Selecione um período de comparação" />
              ) : catCompQ.isLoading ? (
                <Skeleton className="h-[260px]" />
              ) : (catCompQ.data ?? []).length === 0 ? (
                <EmptyChart message="Sem dados para comparar" />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 text-left">Categoria</th>
                      <th className="py-1.5 text-right">Atual</th>
                      <th className="py-1.5 text-right">Anterior</th>
                      <th className="py-1.5 text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(catCompQ.data ?? []).slice(0, 10).map((c) => {
                      const grew = c.delta_abs > 0;
                      return (
                        <tr key={c.category_id} className="border-b">
                          <td className="py-1.5">{c.category_name}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {formatCurrency(c.current)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(c.previous)}
                          </td>
                          <td
                            className={cn(
                              "py-1.5 text-right tabular-nums font-medium",
                              grew ? "text-destructive" : "text-emerald-500",
                            )}
                          >
                            {grew ? "+" : ""}
                            {c.delta_pct === null
                              ? "novo"
                              : `${c.delta_pct.toFixed(0)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* ============== Bloco 5 — Por Projeto ============== */}
        <BlocoPorProjeto />

        {/* ============== Bloco 6 — Por Cliente ============== */}
        <BlocoPorCliente />

        {/* ============== Bloco 7 — Comparativo Histórico ============== */}
        <BlocoComparativoHistorico />

        {/* ============== Bloco 8 — Próximas Movimentações ============== */}
        <BlocoProximasMovimentacoes />
      </div>
    </TooltipProvider>
  );
}

/* ============================================================== */
/* Sub-componentes                                                */
/* ============================================================== */

function MarginKpi({
  summary,
  previous,
  loading,
}: {
  summary: { receita_bruta: number; margem_pct: number | null } | undefined;
  previous: { margem_pct: number | null } | null;
  loading?: boolean;
}) {
  const value = summary?.margem_pct;
  const display =
    value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
  const hint =
    value === null || value === undefined
      ? summary && summary.receita_bruta === 0
        ? "Sem receita no período"
        : "Margem fora de faixa razoável"
      : undefined;
  const delta =
    summary?.margem_pct !== null && previous?.margem_pct
      ? Math.round((summary!.margem_pct! - previous.margem_pct!) * 10) / 10
      : null;
  return (
    <UiTooltip>
      <TooltipTrigger asChild>
        <div>
          <KpiCard
            label="Margem operacional"
            value={display}
            delta={delta}
            goodWhen="up"
            hint={hint}
            loading={loading}
          />
        </div>
      </TooltipTrigger>
      {hint ? <TooltipContent side="bottom">{hint}</TooltipContent> : null}
    </UiTooltip>
  );
}

function RunwayKpi({
  runway,
  loading,
}: {
  runway: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return <KpiCard label="Runway" value="…" loading />;
  }
  if (runway === null) {
    return <KpiCard label="Runway" value="—" hint="Sem dado" />;
  }
  if (!Number.isFinite(runway)) {
    return (
      <UiTooltip>
        <TooltipTrigger asChild>
          <div>
            <KpiCard
              label="Runway"
              value="∞"
              hint="Receita cobre despesa"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Receita ≥ despesa no período: caixa não está sendo consumido.
        </TooltipContent>
      </UiTooltip>
    );
  }
  return (
    <KpiCard
      label="Runway"
      value={runway.toFixed(1)}
      unit="meses"
      hint="No ritmo atual de despesa"
    />
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="col-span-6 md:col-span-3">
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-lg font-bold tabular-nums",
            tone === "negative" && "text-destructive",
            tone === "positive" && "text-emerald-500",
          )}
        >
          {value}
        </p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ScenarioToggle() {
  const scenario = useFinanceHubStore((s) => s.scenario);
  const setScenario = useFinanceHubStore((s) => s.setScenario);
  return (
    <div className="inline-flex h-8 items-center rounded-md border bg-background p-0.5 text-[11px]">
      {SCENARIOS.map((s) => (
        <button
          key={s.value}
          onClick={() => setScenario(s.value)}
          className={cn(
            "h-full rounded px-2 font-medium transition-colors",
            scenario === s.value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function HorizonToggle() {
  const horizon = useFinanceHubStore((s) => s.horizon);
  const setHorizon = useFinanceHubStore((s) => s.setHorizon);
  return (
    <div className="inline-flex h-8 items-center rounded-md border bg-background p-0.5 text-[11px]">
      {HORIZONS.map((h) => (
        <button
          key={h}
          onClick={() => setHorizon(h)}
          className={cn(
            "h-full rounded px-2 font-medium transition-colors",
            horizon === h
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {h}d
        </button>
      ))}
    </div>
  );
}

function monthsInRange(start: Date, end: Date) {
  const days = (end.getTime() - start.getTime()) / 86400000 + 1;
  return Math.max(1, days / 30);
}
