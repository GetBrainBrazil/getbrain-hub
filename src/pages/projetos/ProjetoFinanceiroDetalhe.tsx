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
  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        Sem dados
      </div>
    );
  }
  const r = 60;
  const c = 2 * Math.PI * r;
  const pR = recebido / total;
  const pP = previsto / total;
  const pA = atrasado / total;

  const seg = (frac: number, offset: number, color: string) => (
    <circle
      cx="80"
      cy="80"
      r={r}
      fill="transparent"
      stroke={color}
      strokeWidth="20"
      strokeDasharray={`${frac * c} ${c}`}
      strokeDashoffset={-offset * c}
      transform="rotate(-90 80 80)"
    />
  );
  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        {seg(pR, 0, "hsl(var(--success))")}
        {seg(pP, pR, "hsl(var(--accent))")}
        {seg(pA, pR + pP, "hsl(var(--destructive))")}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-foreground font-mono text-lg font-bold"
        >
          {((recebido / total) * 100).toFixed(0)}%
        </text>
        <text
          x="80"
          y="92"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          recebido
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-success" />
          <span className="text-muted-foreground">Recebido</span>
          <span className="ml-auto font-mono font-semibold text-foreground">
            {formatCurrency(recebido)}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-accent" />
          <span className="text-muted-foreground">Previsto</span>
          <span className="ml-auto font-mono font-semibold text-foreground">
            {formatCurrency(previsto)}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-destructive" />
          <span className="text-muted-foreground">Atrasado</span>
          <span className="ml-auto font-mono font-semibold text-foreground">
            {formatCurrency(atrasado)}
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────── timeline ─── */
function Timeline({ items }: { items: ProjectMovimentacao[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        Sem parcelas para exibir
      </div>
    );
  }
  const dates = items.map((m) => new Date(m.data_vencimento).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const span = Math.max(1, max - min);
  return (
    <div className="space-y-2">
      <div className="relative h-12 rounded-md border border-border/60 bg-muted/20 px-2">
        <div className="absolute inset-x-2 top-1/2 h-px bg-border" />
        {items.map((m) => {
          const t = new Date(m.data_vencimento).getTime();
          const left = ((t - min) / span) * 100;
          const s = parcelStatus(m);
          return (
            <div
              key={m.id}
              title={`${m.descricao} · ${formatCurrency(m.valor_previsto)} · ${formatDate(m.data_vencimento)}`}
              className={cn(
                "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card",
                statusColor(s),
              )}
              style={{ left: `${left}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDate(new Date(min).toISOString())}</span>
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

  // Derivações dos blocos
  const allReceitas = useMemo(
    () => [...(detail?.receitas ?? []), ...(detail?.recurring_receitas ?? [])],
    [detail],
  );

  const totals = useMemo(() => {
    let recebido = 0;
    let previsto = 0;
    let atrasado = 0;
    for (const r of allReceitas) {
      const valor = r.valor_realizado || r.valor_previsto;
      const s = parcelStatus(r);
      if (s === "recebido") recebido += r.valor_realizado || valor;
      else if (s === "atrasado") atrasado += valor;
      else previsto += valor;
    }
    return { recebido, previsto, atrasado };
  }, [allReceitas]);

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
    { label: "Contratado", value: formatCurrency(contratado) },
    {
      label: "Recebido",
      value: formatCurrency(m?.revenue_received ?? 0),
      hint: contratado
        ? `${(((m?.revenue_received ?? 0) / contratado) * 100).toFixed(0)}% do contrato`
        : undefined,
      tone: "success",
    },
    {
      label: "Pendente",
      value: formatCurrency(m?.revenue_pending ?? 0),
      tone: totals.atrasado > 0 ? "warning" : "default",
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

  const novaParcelaHref = `/financeiro/movimentacoes/novo/receita?projectId=${projectId}`;
  const novaRecorrenciaHref = `/financeiro/contratos?projectId=${projectId}&new=1`;
  const novoCustoHref = `/financeiro/movimentacoes/novo/despesa?projectId=${projectId}`;

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

      {/* ─── Bloco 1: Saúde financeira ─── */}
      <DetalheBloco icon={Activity} title="Saúde financeira">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Donut
            recebido={totals.recebido}
            previsto={totals.previsto}
            atrasado={totals.atrasado}
          />
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Linha do tempo de parcelas
            </p>
            <Timeline items={allReceitas} />
          </div>
        </div>
      </DetalheBloco>

      {/* ─── Bloco 2: Parcelas & Recorrências ─── */}
      <DetalheBloco
        icon={Repeat}
        title="Parcelas & Recorrências"
        action={
          <div className="flex gap-2">
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
          {/* Recorrências ativas */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Recorrências ativas{" "}
              {detail?.contracts.length ? `· ${detail.contracts.length}` : ""}
            </p>
            {detail?.contracts.length ? (
              <ul className="space-y-1.5">
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
                          Manutenção mensal
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
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem recorrências cadastradas neste projeto.
              </p>
            )}
          </div>

          {/* Parcelas individuais */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Parcelas individuais{" "}
              {detail?.receitas.length ? `· ${detail.receitas.length}` : ""}
            </p>
            {detail?.receitas.length ? (
              <ul className="space-y-1.5">
                {detail.receitas.map((m) => (
                  <li key={m.id}>
                    <ParcelaRow m={m} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem parcelas avulsas registradas.
              </p>
            )}
          </div>
        </div>
      </DetalheBloco>

      {/* ─── Bloco 3: Custos ─── */}
      <DetalheBloco
        icon={Receipt}
        title="Custos do projeto"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={novoCustoHref}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Registrar custo
            </Link>
          </Button>
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
