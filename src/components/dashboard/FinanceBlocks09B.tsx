/**
 * Blocos 5-8 do dashboard financeiro (Prompt 09B).
 * Cada componente é independente e consome seus próprios hooks.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyChart } from "@/components/dashboard/EmptyChart";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import {
  useProjectProfitability,
  useClientFinancialSummary,
  useMonthlyEvolution,
  useUpcomingMovements,
  type ProjectProfitabilityRow,
  type ClientFinancialRow,
} from "@/hooks/finance/useFinanceExtras";

/* ============================================================== */
/* Helpers                                                        */
/* ============================================================== */

function MiniKpi({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative" | "neutral" | "warning";
  className?: string;
}) {
  return (
    <Card className={cn("col-span-12 sm:col-span-6 lg:col-span-3", className)}>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-lg font-bold tabular-nums",
            tone === "negative" && "text-destructive",
            tone === "positive" && "text-emerald-500",
            tone === "warning" && "text-amber-500",
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function marginTone(pct: number | null): "positive" | "neutral" | "negative" {
  if (pct == null) return "neutral";
  if (pct >= 40) return "positive";
  if (pct < 20) return "negative";
  return "neutral";
}

function marginColor(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 40) return "text-emerald-500";
  if (pct < 20) return "text-destructive";
  return "text-amber-500";
}

function recebidoColor(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 100) return "text-emerald-500";
  if (pct >= 60) return "text-amber-500";
  return "text-destructive";
}

function projectHealth(row: ProjectProfitabilityRow): "green" | "yellow" | "red" {
  const margem = row.margem_pct;
  const recebido = row.pct_recebido;
  if (margem != null && margem < 0) return "red";
  if (recebido != null && recebido < 60 && row.receita_pendente > 0) return "red";
  const goodMargem = margem != null && margem >= 40;
  const goodRecebido = recebido != null && recebido >= 60;
  if (goodMargem && goodRecebido) return "green";
  return "yellow";
}

function HealthDot({ status }: { status: "green" | "yellow" | "red" }) {
  const cls = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-destructive",
  }[status];
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", cls)} />;
}

function atrasoColor(dias: number): string {
  if (dias <= 0) return "text-muted-foreground";
  if (dias < 30) return "text-amber-500";
  if (dias < 60) return "text-destructive";
  return "text-destructive font-bold";
}

/* ============================================================== */
/* BLOCO 5 — Por Projeto                                          */
/* ============================================================== */

type SortKey =
  | "resultado"
  | "receita"
  | "despesa"
  | "margem"
  | "recebido"
  | "horas";

export function BlocoPorProjeto() {
  const navigate = useNavigate();
  const { data, isLoading } = useProjectProfitability();
  const [sortKey, setSortKey] = useState<SortKey>("resultado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const arr = [...(data ?? [])];
    arr.sort((a, b) => {
      const get = (r: ProjectProfitabilityRow) =>
        ({
          resultado: r.resultado,
          receita: r.receita_total,
          despesa: r.despesa_total,
          margem: r.margem_pct ?? -Infinity,
          recebido: r.pct_recebido ?? -Infinity,
          horas: r.tasks_hours_actual,
        }[sortKey]);
      const va = get(a);
      const vb = get(b);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const lucrativos = rows.filter((r) => (r.margem_pct ?? -1) > 0).length;
  const noVermelho = rows.filter((r) => (r.margem_pct ?? 0) < 0).length;
  const maisLucrativo = rows
    .filter((r) => r.resultado > 0)
    .sort((a, b) => b.resultado - a.resultado)[0];
  const emAtencao = rows.filter((r) => (r.margem_pct ?? 0) < 0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <DashboardSection
      title="Por Projeto"
      question="Qual projeto dá ou custa dinheiro? Margem real no período."
    >
      {/* KPIs mini */}
      <MiniKpi
        label="Projetos lucrativos"
        value={String(lucrativos)}
        hint={`${rows.length} projetos no período`}
        tone="positive"
        className="lg:col-span-4"
      />
      <MiniKpi
        label="Projetos no vermelho"
        value={String(noVermelho)}
        tone={noVermelho > 0 ? "negative" : "neutral"}
        hint={noVermelho > 0 ? "Margem negativa" : "Tudo no azul"}
        className="lg:col-span-4"
      />
      <MiniKpi
        label="Mais lucrativo"
        value={maisLucrativo ? formatCurrency(maisLucrativo.resultado) : "—"}
        hint={maisLucrativo?.project_code ?? "—"}
        tone="positive"
        className="lg:col-span-4"
      />

      {/* Tabela */}
      <Card className="col-span-12">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyChart message="Nenhum projeto com movimentação no período." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Projeto</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("receita")}
                  >
                    Receita{arrow("receita")}
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("despesa")}
                  >
                    Despesa{arrow("despesa")}
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("resultado")}
                  >
                    Resultado{arrow("resultado")}
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("margem")}
                  >
                    Margem{arrow("margem")}
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("recebido")}
                  >
                    % Receb.{arrow("recebido")}
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("horas")}
                  >
                    Horas{arrow("horas")}
                  </th>
                  <th className="px-3 py-2 text-center">Saúde</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const health = projectHealth(r);
                  return (
                    <tr
                      key={r.project_id}
                      onClick={() => navigate(`/projetos/${r.project_id}`)}
                      className="border-t hover:bg-accent/40 cursor-pointer"
                    >
                      <td className="px-3 py-2 font-medium">{r.project_code}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.company_name}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.project_status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(r.receita_total)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(r.despesa_total)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums font-semibold",
                          r.resultado < 0 && "text-destructive",
                          r.resultado > 0 && "text-emerald-500",
                        )}
                      >
                        {formatCurrency(r.resultado)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          marginColor(r.margem_pct),
                        )}
                      >
                        {r.margem_pct == null
                          ? "—"
                          : `${r.margem_pct.toFixed(0)}%`}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          recebidoColor(r.pct_recebido),
                        )}
                      >
                        {r.pct_recebido == null
                          ? "—"
                          : `${r.pct_recebido.toFixed(0)}%`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {r.tasks_hours_actual > 0
                          ? `${r.tasks_hours_actual.toFixed(0)}h`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <HealthDot status={health} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Alerta atenção */}
      <Card
        className={cn(
          "col-span-12 border",
          emAtencao.length > 0
            ? "border-destructive/40 bg-destructive/5"
            : "border-emerald-500/40 bg-emerald-500/5",
        )}
      >
        <CardContent className="p-3">
          {emAtencao.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Todos os projetos lucrativos neste período. 🎉
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {emAtencao.length} projeto
                {emAtencao.length > 1 ? "s" : ""} com margem negativa
              </div>
              <ul className="space-y-1 text-xs">
                {emAtencao.map((p) => (
                  <li
                    key={p.project_id}
                    className="flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => navigate(`/projetos/${p.project_id}`)}
                  >
                    <span className="font-medium">{p.project_code}</span>
                    <span className="text-muted-foreground">{p.company_name}</span>
                    <span className="text-destructive">
                      margem {p.margem_pct?.toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-destructive">
                      {formatCurrency(p.resultado)}
                    </span>
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardSection>
  );
}

/* ============================================================== */
/* BLOCO 6 — Por Cliente                                          */
/* ============================================================== */

export function BlocoPorCliente() {
  const navigate = useNavigate();
  const { data, isLoading } = useClientFinancialSummary();

  const rows = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.ltv_total - a.ltv_total),
    [data],
  );

  const inadimplenciaTotal = rows.reduce((s, r) => s + r.atrasado, 0);
  const inadimplencia30 = rows.reduce((s, r) => s + r.atrasado_mais_30d, 0);
  const clientesEmAtraso = rows.filter((r) => r.atrasado > 0).length;
  const ltvTotal = rows.reduce((s, r) => s + r.ltv_total, 0);
  const criticos = rows.filter((r) => r.atrasado_mais_30d > 0);

  return (
    <DashboardSection
      title="Por Cliente"
      question="Quem paga e quem deve? LTV, pendências, inadimplência."
    >
      <MiniKpi
        label="Inadimplência total"
        value={formatCurrency(inadimplenciaTotal)}
        tone={inadimplenciaTotal > 0 ? "negative" : "positive"}
        hint={`${clientesEmAtraso} cliente${clientesEmAtraso !== 1 ? "s" : ""}`}
      />
      <MiniKpi
        label="Inadimpl. > 30 dias"
        value={formatCurrency(inadimplencia30)}
        tone={inadimplencia30 > 0 ? "negative" : "positive"}
        hint={inadimplencia30 > 0 ? "Crítico" : "OK"}
      />
      <MiniKpi
        label="Clientes em atraso"
        value={String(clientesEmAtraso)}
        tone={clientesEmAtraso > 0 ? "warning" : "positive"}
      />
      <MiniKpi
        label="LTV total"
        value={formatCurrency(ltvTotal)}
        tone="positive"
        hint="Histórico recebido"
      />

      <Card className="col-span-12">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyChart message="Nenhum cliente com receita registrada." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">LTV</th>
                  <th className="px-3 py-2 text-right">Recebido (per.)</th>
                  <th className="px-3 py-2 text-right">A receber</th>
                  <th className="px-3 py-2 text-right">Atrasado</th>
                  <th className="px-3 py-2 text-right">Dias máx.</th>
                  <th className="px-3 py-2 text-right">Projetos</th>
                  <th className="px-3 py-2 text-right">Último pag.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.company_id}
                    onClick={() => navigate(`/crm/empresas/${c.company_id}`)}
                    className="border-t hover:bg-accent/40 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-medium">{c.company_name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {c.relationship_status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(c.ltv_total)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(c.recebido_periodo)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(c.a_receber_futuro)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        c.atrasado > 0 && "text-destructive font-semibold",
                      )}
                    >
                      {formatCurrency(c.atrasado)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        atrasoColor(c.dias_atraso_max),
                      )}
                    >
                      {c.dias_atraso_max > 0 ? `${c.dias_atraso_max}d` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {c.count_projetos_ativos}/{c.count_projetos}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                      {c.ultimo_pagamento
                        ? new Date(c.ultimo_pagamento).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {criticos.length > 0 && (
        <Card className="col-span-12 border border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {criticos.length} cliente
              {criticos.length > 1 ? "s" : ""} com inadimplência &gt; 30 dias
            </div>
            <ul className="space-y-1 text-xs">
              {criticos.map((c: ClientFinancialRow) => (
                <li
                  key={c.company_id}
                  className="flex items-center gap-2 cursor-pointer hover:underline"
                  onClick={() => navigate(`/crm/empresas/${c.company_id}`)}
                >
                  <span className="font-medium">{c.company_name}</span>
                  <span className="text-destructive">
                    {formatCurrency(c.atrasado_mais_30d)}
                  </span>
                  <span className="text-muted-foreground">
                    atrasado{c.dias_atraso_max ? ` há ${c.dias_atraso_max}d` : ""}
                  </span>
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </DashboardSection>
  );
}

/* ============================================================== */
/* BLOCO 7 — Comparativo Histórico                                */
/* ============================================================== */

export function BlocoComparativoHistorico() {
  const { data, isLoading } = useMonthlyEvolution(12);
  const rows = data ?? [];

  // KPIs de crescimento
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const momPct =
    last && prev && prev.receita > 0
      ? ((last.receita - prev.receita) / prev.receita) * 100
      : null;

  const last3 = rows.slice(-3);
  const prev3 = rows.slice(-6, -3);
  const last3Sum = last3.reduce((s, r) => s + r.receita, 0);
  const prev3Sum = prev3.reduce((s, r) => s + r.receita, 0);
  const trimPct = prev3Sum > 0 ? ((last3Sum - prev3Sum) / prev3Sum) * 100 : null;

  const melhorMes = [...rows].sort((a, b) => b.resultado - a.resultado)[0];

  return (
    <DashboardSection
      title="Comparativo Histórico"
      question="Como estou hoje vs meses anteriores? Últimos 12 meses."
    >
      {/* Gráfico principal */}
      <Card className="col-span-12">
        <CardContent className="p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Receita, despesa, resultado e margem (12 meses)
          </div>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : rows.length === 0 ? (
            <EmptyChart message="Sem histórico para exibir." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes_label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    `R$${(Number(v) / 1000).toFixed(0)}k`
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "Margem %") return `${value?.toFixed?.(1) ?? "—"}%`;
                    return formatCurrency(Number(value));
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="receita"
                  name="Receita"
                  fill="hsl(var(--chart-2, 142 76% 36%))"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="despesa"
                  name="Despesa"
                  fill="hsl(var(--destructive))"
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="resultado"
                  name="Resultado"
                  stroke="hsl(var(--chart-1, 199 89% 48%))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margem_pct"
                  name="Margem %"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Saldo consolidado */}
      <Card className="col-span-12">
        <CardContent className="p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Evolução do saldo consolidado
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={rows}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1, 199 89% 48%))"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1, 199 89% 48%))"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes_label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    `R$${(Number(v) / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="saldo_fim_mes"
                  stroke="hsl(var(--chart-1, 199 89% 48%))"
                  fill="url(#saldoGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* KPIs crescimento */}
      <MiniKpi
        label="Crescimento MoM (receita)"
        value={momPct == null ? "—" : `${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}%`}
        tone={momPct == null ? "neutral" : momPct >= 0 ? "positive" : "negative"}
        hint={
          last && prev
            ? `${last.mes_label} vs ${prev.mes_label}`
            : undefined
        }
        className="lg:col-span-4"
      />
      <MiniKpi
        label="Crescimento trimestral"
        value={trimPct == null ? "—" : `${trimPct >= 0 ? "+" : ""}${trimPct.toFixed(1)}%`}
        tone={trimPct == null ? "neutral" : trimPct >= 0 ? "positive" : "negative"}
        hint="Últimos 3 vs 3 anteriores"
        className="lg:col-span-4"
      />
      <MiniKpi
        label="Melhor mês"
        value={melhorMes ? formatCurrency(melhorMes.resultado) : "—"}
        tone="positive"
        hint={melhorMes?.mes_label}
        className="lg:col-span-4"
      />
    </DashboardSection>
  );
}

/* ============================================================== */
/* BLOCO 8 — Próximas Movimentações                               */
/* ============================================================== */

type Horizon = "vencidos" | 7 | 15 | 30;

export function BlocoProximasMovimentacoes() {
  const navigate = useNavigate();
  const [horizon, setHorizon] = useState<Horizon>(7);

  const daysAhead = horizon === "vencidos" ? 0 : horizon;
  const includeOverdue = horizon === "vencidos";
  const onlyOverdue = horizon === "vencidos";

  const { data, isLoading } = useUpcomingMovements(daysAhead, includeOverdue || true);

  const items = useMemo(() => {
    const arr = data ?? [];
    if (onlyOverdue) return arr.filter((m) => m.is_overdue);
    return arr.filter((m) => !m.is_overdue);
  }, [data, onlyOverdue]);

  const totalReceber = items
    .filter((m) => m.tipo === "receita")
    .reduce((s, m) => s + m.valor, 0);
  const totalPagar = items
    .filter((m) => m.tipo === "despesa")
    .reduce((s, m) => s + m.valor, 0);
  const liquido = totalReceber - totalPagar;

  const HORIZONS: { v: Horizon; label: string }[] = [
    { v: "vencidos", label: "Vencidos" },
    { v: 7, label: "7 dias" },
    { v: 15, label: "15 dias" },
    { v: 30, label: "30 dias" },
  ];

  return (
    <DashboardSection
      title="Próximas Movimentações"
      question="O que vence essa semana? Ações financeiras imediatas."
    >
      {/* Toggle */}
      <div className="col-span-12 flex items-center justify-between">
        <div className="inline-flex h-8 items-center rounded-md border bg-background p-0.5 text-[11px]">
          {HORIZONS.map((h) => (
            <button
              key={String(h.v)}
              onClick={() => setHorizon(h.v)}
              className={cn(
                "h-full rounded px-2 font-medium transition-colors",
                horizon === h.v
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground">
          <CalendarClock className="inline h-3 w-3 mr-1" />
          {items.length} movimentação{items.length !== 1 ? "ões" : ""}
        </div>
      </div>

      {/* KPIs */}
      <MiniKpi
        label="Total a receber"
        value={formatCurrency(totalReceber)}
        tone="positive"
        className="lg:col-span-4"
      />
      <MiniKpi
        label="Total a pagar"
        value={formatCurrency(totalPagar)}
        tone="negative"
        className="lg:col-span-4"
      />
      <MiniKpi
        label="Saldo líquido esperado"
        value={formatCurrency(liquido)}
        tone={liquido >= 0 ? "positive" : "negative"}
        className="lg:col-span-4"
      />

      {/* Lista */}
      <Card className="col-span-12">
        <CardContent className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {onlyOverdue
                ? "✅ Sem pendências em atraso"
                : `🎉 Nada a pagar ou receber nos próximos ${horizon} dias`}
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((m) => {
                const Icon = m.tipo === "receita" ? TrendingUp : TrendingDown;
                const isReceita = m.tipo === "receita";
                const urgent = !m.is_overdue && m.dias_ate_vencimento <= 2;
                return (
                  <li
                    key={m.id}
                    onClick={() => navigate(`/financeiro/movimentacoes/${m.id}`)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/40 transition-colors",
                      isReceita
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-destructive/5 border-destructive/20",
                      m.is_overdue && "border-l-4 border-l-destructive",
                      urgent && "border-l-4 border-l-amber-500",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isReceita ? "text-emerald-500" : "text-destructive",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            isReceita ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                          )}
                        >
                          {formatCurrency(m.valor)}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {m.descricao}
                        </span>
                        {m.is_overdue && (
                          <Badge variant="destructive" className="text-[10px]">
                            ⚠ Vencido
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1.5 mt-0.5">
                        <span>
                          {new Date(m.data_vencimento).toLocaleDateString("pt-BR")}
                        </span>
                        <span>·</span>
                        <span
                          className={cn(
                            m.is_overdue && "text-destructive font-medium",
                            urgent && "text-amber-500 font-medium",
                          )}
                        >
                          {m.is_overdue
                            ? `vencido há ${Math.abs(m.dias_ate_vencimento)} dia${Math.abs(m.dias_ate_vencimento) !== 1 ? "s" : ""}`
                            : m.dias_ate_vencimento === 0
                              ? "vence hoje"
                              : `em ${m.dias_ate_vencimento} dia${m.dias_ate_vencimento !== 1 ? "s" : ""}`}
                        </span>
                        {m.project_code && (
                          <>
                            <span>·</span>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {m.project_code}
                            </Badge>
                          </>
                        )}
                        {m.company_name && (
                          <>
                            <span>·</span>
                            <span>{m.company_name}</span>
                          </>
                        )}
                        {m.categoria_nome && (
                          <>
                            <span>·</span>
                            <span>{m.categoria_nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardSection>
  );
}
