/**
 * /projetos/:id/financeiro
 *
 * Visão financeira detalhada de um único projeto, no estilo dos
 * dashboards 09A/09B.
 *
 * Blocos:
 *   1. Saúde financeira (donut + timeline de parcelas)
 *   2. Parcelas & Recorrências
 *   3. Custos (despesas + integrações + estimativa de horas)
 *   4. Análise (margem real, estimada, comparativa, semáforo)
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DollarSign,
  Activity,
  Repeat,
  Receipt,
  PieChart,
  Plus,
  Wrench,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getEffectiveMrr } from "@/lib/maintenance";
import { useProjetoHeader } from "@/hooks/projetos/useProjetoHeader";
import { useProjectMetrics } from "@/hooks/useProjectMetrics";
import {
  useProjectFinanceDetail,
  type ProjectMovimentacao,
} from "@/hooks/projetos/useProjectFinanceDetail";
import {
  CATEGORIA_IMPLEMENTACAO_ID,
  CATEGORIA_MANUTENCAO_ID,
} from "@/lib/financeCategories";
import {
  ProjetoDetalheHeader,
  type MiniKpi,
} from "@/components/projetos/detalhe/ProjetoDetalheHeader";
import { DetalheBloco } from "@/components/projetos/detalhe/DetalheBloco";

/* ─────────────────────────────────────────────── helpers ─── */

type ParcelStatus = "recebido" | "previsto" | "atrasado";

function parcelStatus(m: ProjectMovimentacao): ParcelStatus {
  if (m.status === "pago" || m.data_pagamento) return "recebido";
  const venc = new Date(m.data_vencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (venc < hoje) return "atrasado";
  return "previsto";
}

function statusColor(s: ParcelStatus) {
  return {
    recebido: "bg-success",
    previsto: "bg-accent",
    atrasado: "bg-destructive",
  }[s];
}

function statusLabel(s: ParcelStatus) {
  return { recebido: "Recebido", previsto: "Previsto", atrasado: "Atrasado" }[s];
}

function statusTextColor(s: ParcelStatus) {
  return {
    recebido: "text-success",
    previsto: "text-accent",
    atrasado: "text-destructive",
  }[s];
}

/* ─────────────────────────────────────────────── donut ─── */
function Donut({
  recebido,
  previsto,
  atrasado,
}: {
  recebido: number;
  previsto: number;
  atrasado: number;
}) {
  const total = recebido + previsto + atrasado;
  const r = 56;
  const c = 2 * Math.PI * r;
  const pR = total ? recebido / total : 0;
  const pP = total ? previsto / total : 0;
  const pA = total ? atrasado / total : 0;
  const pctRecebido = total ? (recebido / total) * 100 : 0;

  const seg = (frac: number, offset: number, color: string) =>
    frac > 0 ? (
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="transparent"
        stroke={color}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${frac * c} ${c}`}
        strokeDashoffset={-offset * c}
        transform="rotate(-90 80 80)"
        className="transition-all"
      />
    ) : null;

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="transparent"
            stroke="hsl(var(--muted))"
            strokeWidth="16"
            opacity="0.4"
          />
          {total > 0 && (
            <>
              {seg(pR, 0, "hsl(var(--success))")}
              {seg(pP, pR, "hsl(var(--accent))")}
              {seg(pA, pR + pP, "hsl(var(--destructive))")}
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold leading-none text-foreground">
            {pctRecebido.toFixed(0)}
            <span className="text-lg text-muted-foreground">%</span>
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            recebido
          </span>
        </div>
      </div>
      {total > 0 && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Total:{" "}
          <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </p>
      )}
    </div>
  );
}

function DonutLegend({
  recebido,
  previsto,
  atrasado,
}: {
  recebido: number;
  previsto: number;
  atrasado: number;
}) {
  const total = recebido + previsto + atrasado;
  const items = [
    {
      label: "Recebido",
      value: recebido,
      color: "bg-success",
      text: "text-success",
      ring: "ring-success/30",
    },
    {
      label: "Previsto",
      value: previsto,
      color: "bg-accent",
      text: "text-accent",
      ring: "ring-accent/30",
    },
    {
      label: "Atrasado",
      value: atrasado,
      color: "bg-destructive",
      text: "text-destructive",
      ring: "ring-destructive/30",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((it) => {
        const pct = total ? (it.value / total) * 100 : 0;
        return (
          <div
            key={it.label}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2 ring-1 ring-transparent transition-colors",
              it.value > 0 && it.ring,
            )}
          >
            <span className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", it.color)} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {it.label}
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(it.value)}
              </p>
            </div>
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                it.value > 0 ? it.text : "text-muted-foreground/60",
              )}
            >
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────── timeline ─── */
function Timeline({ items }: { items: ProjectMovimentacao[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
        Sem parcelas para exibir
      </div>
    );
  }
  const dates = items.map((m) => new Date(m.data_vencimento).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const span = Math.max(1, max - min);

  const now = Date.now();
  const todayPct =
    now >= min && now <= max ? ((now - min) / span) * 100 : null;

  const counts = items.reduce(
    (acc, m) => {
      const s = parcelStatus(m);
      acc[s]++;
      return acc;
    },
    { recebido: 0, previsto: 0, atrasado: 0 } as Record<ParcelStatus, number>,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-muted-foreground">
            Recebido{" "}
            <span className="font-mono font-semibold text-foreground">
              {counts.recebido}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-muted-foreground">
            Previsto{" "}
            <span className="font-mono font-semibold text-foreground">
              {counts.previsto}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">
            Atrasado{" "}
            <span className="font-mono font-semibold text-foreground">
              {counts.atrasado}
            </span>
          </span>
        </div>
      </div>

      <div className="relative h-16 rounded-md border border-border/60 bg-gradient-to-b from-muted/10 to-muted/30">
        <div className="absolute inset-x-3 top-1/2 h-px bg-border" />

        {todayPct !== null && (
          <>
            <div
              className="absolute top-1 bottom-1 w-px bg-foreground/30"
              style={{ left: `calc(12px + ${todayPct}% - ${todayPct * 0.24}px)` }}
            />
            <span
              className="absolute top-0.5 -translate-x-1/2 rounded-sm bg-foreground/80 px-1 font-mono text-[9px] font-medium uppercase tracking-wider text-background"
              style={{ left: `calc(12px + ${todayPct}% - ${todayPct * 0.24}px)` }}
            >
              hoje
            </span>
          </>
        )}

        {items.map((m) => {
          const t = new Date(m.data_vencimento).getTime();
          const left = ((t - min) / span) * 100;
          const s = parcelStatus(m);
          return (
            <div
              key={m.id}
              title={`${m.descricao} · ${formatCurrency(m.valor_previsto)} · ${formatDate(m.data_vencimento)} · ${statusLabel(s)}`}
              className={cn(
                "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm transition-transform hover:scale-150",
                statusColor(s),
              )}
              style={{ left: `calc(12px + ${left}% - ${left * 0.24}px)` }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between px-1 font-mono text-[10px] text-muted-foreground">
        <span>{formatDate(new Date(min).toISOString())}</span>
        <span className="text-muted-foreground/60">
          {items.length} {items.length === 1 ? "parcela" : "parcelas"}
        </span>
        <span>{formatDate(new Date(max).toISOString())}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── parcela row ─── */
function ParcelaRow({ m }: { m: ProjectMovimentacao }) {
  const s = parcelStatus(m);
  const Icon = s === "recebido" ? CheckCircle2 : s === "atrasado" ? XCircle : Clock;
  return (
    <Link
      to={`/financeiro/movimentacoes/${m.id}`}
      className="group flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2 transition-colors hover:border-accent/40"
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", statusTextColor(s))} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {m.descricao}
          {m.parcela_atual && m.total_parcelas ? (
            <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
              {m.parcela_atual}/{m.total_parcelas}
            </span>
          ) : null}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Vence {formatDate(m.data_vencimento)}
          {m.data_pagamento && ` · pago em ${formatDate(m.data_pagamento)}`}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(m.valor_realizado || m.valor_previsto)}
        </p>
        <p className={cn("text-[10px] font-medium uppercase tracking-wider", statusTextColor(s))}>
          {statusLabel(s)}
        </p>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────── página ─── */

export default function ProjetoFinanceiroDetalhe() {
  const { id: projectId = "" } = useParams<{ id: string }>();
  const { data: header } = useProjetoHeader(projectId);
  const { data: m, isLoading: metricsLoading } = useProjectMetrics(projectId);
  const { data: detail, isLoading: detailLoading } = useProjectFinanceDetail(projectId);

  const isLoading = metricsLoading || detailLoading;

  // Classificação implementação x manutenção pela CATEGORIA do lançamento.
  // Lançamentos auto-gerados pelo contrato (sem categoria) entram em manutenção como fallback.
  const isMaintenance = (r: ProjectMovimentacao) =>
    r.categoria_id === CATEGORIA_MANUTENCAO_ID ||
    (r.categoria_id == null && r.source_entity_type === "maintenance_contract");

  const isImplementation = (r: ProjectMovimentacao) =>
    r.categoria_id === CATEGORIA_IMPLEMENTACAO_ID;

  const allReceitas = useMemo(
    () => [...(detail?.receitas ?? []), ...(detail?.recurring_receitas ?? [])],
    [detail],
  );

  const receitasImplementacao = useMemo(
    () => allReceitas.filter(isImplementation),
    [allReceitas],
  );
  const receitasManutencao = useMemo(
    () => allReceitas.filter(isMaintenance),
    [allReceitas],
  );
  const receitasOutras = useMemo(
    () => allReceitas.filter((r) => !isImplementation(r) && !isMaintenance(r)),
    [allReceitas],
  );

  const sumByStatus = (items: ProjectMovimentacao[]) => {
    let recebido = 0;
    let previsto = 0;
    let atrasado = 0;
    for (const r of items) {
      const valor = r.valor_realizado || r.valor_previsto;
      const s = parcelStatus(r);
      if (s === "recebido") recebido += r.valor_realizado || valor;
      else if (s === "atrasado") atrasado += valor;
      else previsto += valor;
    }
    return { recebido, previsto, atrasado };
  };

  const totalsImpl = useMemo(() => sumByStatus(receitasImplementacao), [receitasImplementacao]);
  const totalsMan = useMemo(() => sumByStatus(receitasManutencao), [receitasManutencao]);
  const totals = useMemo(() => sumByStatus(allReceitas), [allReceitas]);

  const despesaRealizada = useMemo(() => {
    return (detail?.despesas ?? []).reduce(
      (s, d) => s + (d.status === "pago" ? d.valor_realizado || d.valor_previsto : 0),
      0,
    );
  }, [detail]);

  const despesaPrevista = useMemo(() => {
    return (detail?.despesas ?? []).reduce(
      (s, d) => s + (d.status === "pago" ? 0 : d.valor_previsto),
      0,
    );
  }, [detail]);

  const integracoesCustoMensal = useMemo(() => {
    return (detail?.integrations ?? [])
      .filter((i) => i.status === "ativa" || i.status === "active")
      .reduce((s, i) => s + (i.estimated_cost_monthly_brl ?? 0), 0);
  }, [detail]);

  const margemSimples = (m?.revenue_received ?? 0) - despesaRealizada;
  const margemEstimada =
    (m?.revenue_contracted ?? 0) - (m?.cost_total_estimated ?? 0) - despesaPrevista;

  const contratado = m?.revenue_contracted ?? 0;
  const margemPctReal = contratado ? (margemSimples / contratado) * 100 : 0;

  // Implementação: pago vs contratado
  const implPago = totalsImpl.recebido;
  const implRestante = Math.max(0, contratado - implPago);
  const implPct = contratado ? Math.min(100, (implPago / contratado) * 100) : 0;
  // MRR ativo (a partir dos contratos)
  const mrrAtivo = (detail?.contracts ?? [])
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + getEffectiveMrr(c as any), 0);

  let semaforo: { tone: "success" | "warning" | "danger" | "muted"; label: string; explanation: string };
  if (contratado === 0) {
    semaforo = {
      tone: "muted",
      label: "Sem dados",
      explanation: "Defina o valor contratado para avaliar a saúde financeira.",
    };
  } else if (margemSimples < 0) {
    semaforo = {
      tone: "danger",
      label: "Prejuízo",
      explanation: "As despesas pagas já superam o que foi recebido. Reveja escopo, custos ou cobrança.",
    };
  } else if (margemPctReal >= 20) {
    semaforo = {
      tone: "success",
      label: "Saudável",
      explanation: "Margem real acima de 20% do contratado. Vale continuar com este cliente.",
    };
  } else {
    semaforo = {
      tone: "warning",
      label: "Atenção",
      explanation: "Margem positiva mas baixa. Monitore custos e velocidade de recebimento.",
    };
  }

  const kpis: MiniKpi[] = [
    { label: "Contratado (impl.)", value: formatCurrency(contratado) },
    {
      label: "Implementação paga",
      value: formatCurrency(implPago),
      hint: contratado ? `${implPct.toFixed(0)}% · falta ${formatCurrency(implRestante)}` : undefined,
      tone: implPct >= 100 ? "success" : implPct > 0 ? "warning" : "default",
    },
    {
      label: "Manutenção (MRR)",
      value: formatCurrency(mrrAtivo),
      hint: totalsMan.atrasado > 0 ? `${formatCurrency(totalsMan.atrasado)} atrasado` : "/mês ativo",
      tone: totalsMan.atrasado > 0 ? "warning" : "success",
    },
    {
      label: "Margem real",
      value: formatCurrency(margemSimples),
      hint: contratado ? `${margemPctReal.toFixed(0)}% do contrato` : undefined,
      tone:
        margemSimples < 0
          ? "danger"
          : margemPctReal >= 20
            ? "success"
            : margemPctReal > 0
              ? "warning"
              : "muted",
    },
  ];

  if (isLoading && !header) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const novaParcelaHref = `/financeiro/movimentacoes/novo/receber?projectId=${projectId}`;
  const novaRecorrenciaHref = `/financeiro/contratos?projectId=${projectId}&new=1`;
  const novoCustoHref = `/financeiro/movimentacoes/novo/pagar?projectId=${projectId}`;
  const verContasReceberHref = `/financeiro/movimentacoes?aba=receber&projectId=${projectId}`;
  const verContasPagarHref = `/financeiro/movimentacoes?aba=pagar&projectId=${projectId}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ProjetoDetalheHeader
        projectId={projectId}
        projectCode={header?.code}
        projectName={header?.name}
        companyName={header?.company_name}
        title="Visão Financeira"
        subtitle="Saúde, parcelas, custos e análise — escopo do projeto"
        kpis={kpis}
      />

      {/* ─── Bloco 1: Saúde financeira (separada) ─── */}
      <DetalheBloco icon={Activity} title="Saúde financeira">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* IMPLEMENTAÇÃO */}
          <div className="rounded-lg border border-border/60 bg-card/30 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-foreground">Implementação</h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                contrato {formatCurrency(contratado)}
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <Donut
                recebido={totalsImpl.recebido}
                previsto={totalsImpl.previsto}
                atrasado={totalsImpl.atrasado}
              />
              <div className="space-y-2">
                <div className="rounded-md bg-success/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pago
                  </p>
                  <p className="font-mono text-base font-bold tabular-nums text-success">
                    {formatCurrency(implPago)}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      · {implPct.toFixed(0)}%
                    </span>
                  </p>
                </div>
                <div className={cn(
                  "rounded-md px-3 py-2",
                  implRestante > 0 ? "bg-warning/5" : "bg-muted/20",
                )}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Restante do contrato
                  </p>
                  <p className={cn(
                    "font-mono text-base font-bold tabular-nums",
                    implRestante > 0 ? "text-warning" : "text-muted-foreground",
                  )}>
                    {formatCurrency(implRestante)}
                  </p>
                </div>
                {totalsImpl.atrasado > 0 && (
                  <div className="rounded-md bg-destructive/5 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Atrasado
                    </p>
                    <p className="font-mono text-sm font-bold tabular-nums text-destructive">
                      {formatCurrency(totalsImpl.atrasado)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MANUTENÇÃO */}
          <div className="rounded-lg border border-border/60 bg-card/30 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-foreground">Manutenção</h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                {mrrAtivo > 0 ? `${formatCurrency(mrrAtivo)}/mês ativo` : "Sem MRR ativo"}
              </span>
            </div>
            {receitasManutencao.length === 0 && mrrAtivo === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
                Sem manutenção contratada
              </div>
            ) : (
              <div className="grid grid-cols-[140px_1fr] gap-4">
                <Donut
                  recebido={totalsMan.recebido}
                  previsto={totalsMan.previsto}
                  atrasado={totalsMan.atrasado}
                />
                <div className="space-y-2">
                  <div className="rounded-md bg-success/5 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recebido
                    </p>
                    <p className="font-mono text-base font-bold tabular-nums text-success">
                      {formatCurrency(totalsMan.recebido)}
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-md px-3 py-2",
                    totalsMan.previsto > 0 ? "bg-accent/5" : "bg-muted/20",
                  )}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      A vencer
                    </p>
                    <p className={cn(
                      "font-mono text-base font-bold tabular-nums",
                      totalsMan.previsto > 0 ? "text-accent" : "text-muted-foreground",
                    )}>
                      {formatCurrency(totalsMan.previsto)}
                    </p>
                  </div>
                  {totalsMan.atrasado > 0 && (
                    <div className="rounded-md bg-destructive/5 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Atrasado
                      </p>
                      <p className="font-mono text-sm font-bold tabular-nums text-destructive">
                        {formatCurrency(totalsMan.atrasado)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline geral em baixo */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Linha do tempo de parcelas (todas)
          </p>
          <Timeline items={allReceitas} />
        </div>
      </DetalheBloco>

      {/* ─── Bloco 2: Parcelas & Recorrências ─── */}
      <DetalheBloco
        icon={Repeat}
        title="Parcelas & Recorrências"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to={verContasReceberHref}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver em Contas a Receber
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={novaRecorrenciaHref}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Nova recorrência
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={novaParcelaHref}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Nova parcela
              </Link>
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Implementação — parcelas avulsas */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Implementação{" "}
                {receitasImplementacao.length ? `· ${receitasImplementacao.length}` : ""}
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatCurrency(implPago)} / {formatCurrency(contratado)}
              </span>
            </div>
            {receitasImplementacao.length ? (
              <ul className="space-y-1.5">
                {receitasImplementacao.map((mov) => (
                  <li key={mov.id}>
                    <ParcelaRow m={mov} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem parcelas de implementação registradas.
              </p>
            )}
          </div>

          {/* Manutenção — contratos + parcelas recorrentes */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Manutenção{" "}
                {(detail?.contracts.length || receitasManutencao.length)
                  ? `· ${detail?.contracts.length ?? 0} contrato${(detail?.contracts.length ?? 0) === 1 ? "" : "s"}`
                  : ""}
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {mrrAtivo > 0 ? `${formatCurrency(mrrAtivo)}/mês` : "—"}
              </span>
            </div>

            {/* Contratos ativos */}
            {detail?.contracts.length ? (
              <ul className="mb-2 space-y-1.5">
                {detail.contracts.map((c) => {
                  const mrr = getEffectiveMrr(c as any);
                  const isActive = c.status === "active";
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2"
                    >
                      <Wrench
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-success" : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Contrato de manutenção
                          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                            {c.status}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Desde {formatDate(c.start_date)}
                          {c.end_date && ` · até ${formatDate(c.end_date)}`}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(mrr)}
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">/mês</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {/* Mensalidades geradas */}
            {receitasManutencao.length ? (
              <ul className="space-y-1.5">
                {receitasManutencao.map((mov) => (
                  <li key={mov.id}>
                    <ParcelaRow m={mov} />
                  </li>
                ))}
              </ul>
            ) : !detail?.contracts.length ? (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem manutenção cadastrada neste projeto.
              </p>
            ) : null}
          </div>
        </div>

        {receitasOutras.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Outros / sem categoria · {receitasOutras.length}
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">
                não classificado como Implementação nem Manutenção
              </span>
            </div>
            <ul className="space-y-1.5">
              {receitasOutras.map((mov) => (
                <li key={mov.id}>
                  <ParcelaRow m={mov} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Defina a categoria como <strong>Implementação</strong> ou <strong>Manutenção</strong> em Contas a Receber para que entrem na visão correta.
            </p>
          </div>
        )}
      </DetalheBloco>

      <DetalheBloco
        icon={Receipt}
        title="Custos do projeto"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to={verContasPagarHref}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver em Contas a Pagar
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={novoCustoHref}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Registrar custo
              </Link>
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Despesas */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Despesas vinculadas
            </p>
            {detail?.despesas.length ? (
              <ul className="space-y-1.5">
                {detail.despesas.map((d) => (
                  <li key={d.id}>
                    <ParcelaRow m={d} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem despesas registradas para este projeto.
              </p>
            )}
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-muted-foreground">Total realizado</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatCurrency(despesaRealizada)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Total previsto</span>
              <span className="font-mono font-semibold tabular-nums text-warning">
                {formatCurrency(despesaPrevista)}
              </span>
            </div>
          </div>

          {/* Integrações */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Integrações & infra
            </p>
            {detail?.integrations.length ? (
              <ul className="space-y-1.5">
                {detail.integrations.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {i.name}
                        {i.provider && (
                          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                            {i.provider}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{i.status}</p>
                    </div>
                    <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {i.estimated_cost_monthly_brl
                        ? `${formatCurrency(i.estimated_cost_monthly_brl)}/mês`
                        : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem integrações cadastradas.
              </p>
            )}
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-muted-foreground">Custo recorrente mensal</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatCurrency(integracoesCustoMensal)}
              </span>
            </div>
          </div>
        </div>
      </DetalheBloco>

      {/* ─── Bloco 4: Análise ─── */}
      <DetalheBloco icon={PieChart} title="Análise & projeção">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-card/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Margem real
            </p>
            <p
              className={cn(
                "mt-2 font-mono text-2xl font-bold tabular-nums",
                margemSimples < 0 ? "text-destructive" : "text-success",
              )}
            >
              {formatCurrency(margemSimples)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Recebido − Despesa paga
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-card/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Margem estimada
            </p>
            <p
              className={cn(
                "mt-2 font-mono text-2xl font-bold tabular-nums",
                margemEstimada < 0 ? "text-destructive" : "text-foreground",
              )}
            >
              {formatCurrency(margemEstimada)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Contratado − custo total estimado − despesas previstas
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-card/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Projeção inicial
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(header?.contract_value ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {header?.estimated_delivery_date
                ? `Entrega prevista: ${formatDate(header.estimated_delivery_date)}`
                : "Sem entrega prevista definida"}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex items-start gap-3 rounded-md border px-4 py-3",
            semaforo.tone === "success" && "border-success/30 bg-success/5",
            semaforo.tone === "warning" && "border-warning/30 bg-warning/5",
            semaforo.tone === "danger" && "border-destructive/30 bg-destructive/5",
            semaforo.tone === "muted" && "border-border bg-muted/30",
          )}
        >
          {semaforo.tone === "danger" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          ) : semaforo.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
          ) : (
            <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          )}
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                semaforo.tone === "success" && "text-success",
                semaforo.tone === "warning" && "text-warning",
                semaforo.tone === "danger" && "text-destructive",
                semaforo.tone === "muted" && "text-muted-foreground",
              )}
            >
              Vale continuar este cliente? — {semaforo.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{semaforo.explanation}</p>
          </div>
        </div>
      </DetalheBloco>
    </div>
  );
}
