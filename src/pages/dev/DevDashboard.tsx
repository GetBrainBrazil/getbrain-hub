/**
 * Dashboard de Engenharia — 03C-1 entregue.
 * Cabeçalho + alertas + 6 KPIs + Blocos 1 (Entrega), 2 (Gargalos) e 3 (Estimativa).
 * Blocos 4-7 (Alocação, Qualidade, Por Projeto, Atividade) ficam no 03C-2.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboardScope } from "@/hooks/dashboard/useDashboardScope";
import { useDashboardMetrics, useRecentSprintsMetrics } from "@/hooks/dashboard/useDashboardMetrics";
import { useDashboardAlerts, useReworkedTasks, type AlertKind } from "@/hooks/dashboard/useDashboardAlerts";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DrilldownDrawer, type DrilldownTask } from "@/components/dashboard/DrilldownDrawer";
import { BurndownChart } from "@/components/dashboard/BurndownChart";
import { VelocityHistoryChart } from "@/components/dashboard/VelocityHistoryChart";
import { OnTimeDonut } from "@/components/dashboard/OnTimeDonut";
import { CycleTimeByTypeChart } from "@/components/dashboard/CycleTimeByTypeChart";
import { CompletionsPerDayChart } from "@/components/dashboard/CompletionsPerDayChart";
import { BlockedNowList } from "@/components/dashboard/BlockedNowList";
import { StaleReviewList } from "@/components/dashboard/StaleReviewList";
import { StatusDistributionPie } from "@/components/dashboard/StatusDistributionPie";
import { AccuracyGauge } from "@/components/dashboard/AccuracyGauge";
import { TopDeviationsTable } from "@/components/dashboard/TopDeviationsTable";
import { DeviationByTypeChart } from "@/components/dashboard/DeviationByTypeChart";
import { AccuracyEvolutionChart } from "@/components/dashboard/AccuracyEvolutionChart";
import { DevAccuracyTable } from "@/components/dashboard/DevAccuracyTable";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type DrilldownKind = AlertKind | "reworked";

const DRILLDOWN_TITLES: Record<DrilldownKind, { title: string; description: string }> = {
  overdue: { title: "Tasks atrasadas", description: "Vencimento já passou e ainda não foram concluídas." },
  blocked_long: { title: "Bloqueadas há +3 dias", description: "Bloqueios longos costumam virar dependência crítica." },
  estimate_burst: { title: "Estouro de estimativa > 50%", description: "Tasks abertas que já passaram muito da estimativa original." },
  stale_review: { title: "Code review parado +2 dias", description: "Reviewer travado é o gargalo silencioso mais comum." },
  reworked: { title: "Tasks reabertas na sprint", description: "Aceitação insuficiente ou escopo mal definido." },
  urgent_bug_open: { title: "Bugs urgent abertos +24h", description: "SLA estourado para o que deveria ser fix rápido." },
};

export default function DevDashboard() {
  const { current, previous } = useDashboardScope();
  const sprintId = current?.id ?? null;

  const { data: recentMetrics = [] } = useRecentSprintsMetrics(6);
  const { data: currentMetrics = [] } = useDashboardMetrics(sprintId ? [sprintId] : []);
  const { data: previousMetrics = [] } = useDashboardMetrics(previous ? [previous.id] : []);
  const { data: alerts } = useDashboardAlerts(sprintId);
  const { data: reworked = [] } = useReworkedTasks(sprintId);

  const cur = currentMetrics[0];
  const prev = previousMetrics[0];

  const [drilldown, setDrilldown] = useState<DrilldownKind | null>(null);

  const drilldownTasks: DrilldownTask[] = useMemo(() => {
    if (!drilldown || !alerts) return [];
    if (drilldown === "reworked") {
      return reworked.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        meta: `${t.rework_count} reabertura${t.rework_count > 1 ? "s" : ""}`,
      }));
    }
    const list = alerts[drilldown] ?? [];
    return list.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      priority: t.priority,
      meta:
        drilldown === "blocked_long" && t.blocked_since
          ? `bloqueada há ${formatDistanceToNowStrict(parseISO(t.blocked_since), { locale: ptBR })}`
          : drilldown === "stale_review"
            ? `parada há ${formatDistanceToNowStrict(parseISO(t.updated_at), { locale: ptBR })}`
            : drilldown === "overdue" && t.due_date
              ? `venceu ${t.due_date}`
              : drilldown === "estimate_burst"
                ? `estimou ${t.estimated_hours}h, já tem ${t.actual_hours}h`
                : undefined,
    }));
  }, [drilldown, alerts, reworked]);

  // Helpers para deltas
  const delta = (curVal?: number, prevVal?: number) => {
    if (curVal === undefined || prevVal === undefined || prevVal === 0) return null;
    return ((curVal - prevVal) / prevVal) * 100;
  };

  // Sparklines (cronológico ASC)
  const velocityHist = recentMetrics.map((m) => Number(m.tasks_done));
  const cycleHist = recentMetrics.map((m) => Number(m.avg_cycle_time_hours));
  const reworkHist = recentMetrics.map((m) =>
    Number(m.tasks_total) > 0 ? (Number(m.tasks_reworked) / Number(m.tasks_total)) * 100 : 0,
  );
  const blockedHist = recentMetrics.map((m) => Number(m.tasks_blocked_now));
  const onTimeHist = recentMetrics.map((m) => {
    const d = Number(m.tasks_done_on_time) + Number(m.tasks_done_late);
    return d > 0 ? (Number(m.tasks_done_on_time) / d) * 100 : 0;
  });
  const burndownHist = recentMetrics.map((m) =>
    Number(m.tasks_total) > 0 ? 100 - (Number(m.tasks_done) / Number(m.tasks_total)) * 100 : 0,
  );

  // Métricas calculadas para a sprint atual
  const onTimeRate =
    cur && Number(cur.tasks_done_on_time) + Number(cur.tasks_done_late) > 0
      ? (Number(cur.tasks_done_on_time) / (Number(cur.tasks_done_on_time) + Number(cur.tasks_done_late))) * 100
      : null;
  const prevOnTimeRate =
    prev && Number(prev.tasks_done_on_time) + Number(prev.tasks_done_late) > 0
      ? (Number(prev.tasks_done_on_time) / (Number(prev.tasks_done_on_time) + Number(prev.tasks_done_late))) * 100
      : undefined;

  const reworkRate =
    cur && Number(cur.tasks_total) > 0 ? (Number(cur.tasks_reworked) / Number(cur.tasks_total)) * 100 : null;
  const prevReworkRate =
    prev && Number(prev.tasks_total) > 0
      ? (Number(prev.tasks_reworked) / Number(prev.tasks_total)) * 100
      : undefined;

  const burndownPct =
    cur && Number(cur.tasks_total) > 0 ? 100 - (Number(cur.tasks_done) / Number(cur.tasks_total)) * 100 : null;

  const accuracyPct = cur ? Number(cur.estimation_accuracy_pct) : 0;
  const accuracyDelta =
    prev && Number(prev.estimation_accuracy_pct) > 0
      ? Number(cur?.estimation_accuracy_pct ?? 0) - Number(prev.estimation_accuracy_pct)
      : null;

  const sprintIds = sprintId ? [sprintId] : [];

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {alerts && (
        <AlertBanner
          items={[
            { kind: "overdue", count: alerts.overdue.length, label: "atrasadas", severity: "danger" },
            { kind: "blocked_long", count: alerts.blocked_long.length, label: "bloqueadas há +3d", severity: "danger" },
            { kind: "urgent_bug_open", count: alerts.urgent_bug_open.length, label: "bugs urgent +24h", severity: "danger" },
            { kind: "estimate_burst", count: alerts.estimate_burst.length, label: "estouro >50%", severity: "warning" },
            { kind: "stale_review", count: alerts.stale_review.length, label: "review parado +2d", severity: "warning" },
            { kind: "reworked", count: reworked.length, label: "reabertas", severity: "warning" },
          ]}
          onOpen={(k) => setDrilldown(k)}
        />
      )}

      {/* KPIs macro */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Velocity"
          value={cur ? `${cur.tasks_done}/${cur.tasks_total}` : "—"}
          hint="tasks done"
          delta={delta(Number(cur?.tasks_done), Number(prev?.tasks_done))}
          sparkData={velocityHist}
        />
        <KpiCard
          label="Burndown"
          value={burndownPct !== null ? burndownPct.toFixed(0) : "—"}
          unit="% restante"
          goodWhen="down"
          delta={delta(burndownPct ?? undefined, burndownHist.length > 1 ? burndownHist[burndownHist.length - 2] : undefined)}
          sparkData={burndownHist}
        />
        <KpiCard
          label="Tempo de ciclo"
          value={cur ? Number(cur.avg_cycle_time_hours).toFixed(1) : "—"}
          unit="h"
          delta={delta(Number(cur?.avg_cycle_time_hours), Number(prev?.avg_cycle_time_hours))}
          goodWhen="down"
          sparkData={cycleHist}
        />
        <KpiCard
          label="Taxa no prazo"
          value={onTimeRate !== null ? onTimeRate.toFixed(0) : "—"}
          unit="%"
          delta={delta(onTimeRate ?? undefined, prevOnTimeRate)}
          sparkData={onTimeHist}
        />
        <KpiCard
          label="Bloqueadas"
          value={cur ? Number(cur.tasks_blocked_now) : "—"}
          hint="agora"
          goodWhen="down"
          delta={delta(Number(cur?.tasks_blocked_now), Number(prev?.tasks_blocked_now))}
          sparkData={blockedHist}
        />
        <KpiCard
          label="Rework rate"
          value={reworkRate !== null ? reworkRate.toFixed(0) : "—"}
          unit="%"
          goodWhen="down"
          delta={delta(reworkRate ?? undefined, prevReworkRate)}
          sparkData={reworkHist}
        />
      </div>

      {/* BLOCO 1 — ENTREGA */}
      <DashboardSection title="Entrega" question="O time está cumprindo o que se comprometeu na sprint?">
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Burndown da sprint</CardTitle>
            <CardDescription className="text-xs">Linha tracejada = ideal. Linha sólida = real.</CardDescription>
          </CardHeader>
          <CardContent>
            <BurndownChart sprintId={sprintId} />
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Velocity histórica</CardTitle>
            <CardDescription className="text-xs">Tasks concluídas nas últimas 6 sprints.</CardDescription>
          </CardHeader>
          <CardContent>
            <VelocityHistoryChart currentSprintId={sprintId} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Taxa no prazo</CardTitle>
            <CardDescription className="text-xs">Tasks concluídas dentro do due_date.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnTimeDonut onTime={Number(cur?.tasks_done_on_time ?? 0)} late={Number(cur?.tasks_done_late ?? 0)} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ciclo médio por tipo</CardTitle>
            <CardDescription className="text-xs">Bug grande = fix vira épico.</CardDescription>
          </CardHeader>
          <CardContent>
            <CycleTimeByTypeChart sprintIds={sprintIds} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Entregas por dia (14d)</CardTitle>
            <CardDescription className="text-xs">Concentração no final = corrida.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionsPerDayChart days={14} />
          </CardContent>
        </Card>
      </DashboardSection>

      {/* BLOCO 2 — GARGALOS */}
      <DashboardSection title="Gargalos" question="Onde o trabalho está parado e por quê?">
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tasks bloqueadas agora</CardTitle>
            <CardDescription className="text-xs">Ordenadas pela mais antiga. Clique abre a task.</CardDescription>
          </CardHeader>
          <CardContent>
            <BlockedNowList sprintId={sprintId} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Code review parado</CardTitle>
            <CardDescription className="text-xs">Mais de 2 dias sem movimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <StaleReviewList sprintId={sprintId} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição de status</CardTitle>
            <CardDescription className="text-xs">Onde estão as tasks da sprint agora.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistributionPie metrics={cur} />
          </CardContent>
        </Card>
      </DashboardSection>

      {/* BLOCO 3 — ESTIMATIVA */}
      <DashboardSection title="Estimativa" question="O quanto erramos ao prometer prazos?">
        <Card className="col-span-12 md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Precisão média do time</CardTitle>
            <CardDescription className="text-xs">100% = estimou exatamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <AccuracyGauge pct={accuracyPct} delta={accuracyDelta} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 5 maiores desvios</CardTitle>
            <CardDescription className="text-xs">Conversa de 1:1 começa aqui.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopDeviationsTable sprintIds={sprintIds} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Desvio por tipo</CardTitle>
            <CardDescription className="text-xs">Positivo = subestimou. Negativo = superestimou.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeviationByTypeChart sprintIds={sprintIds} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução da precisão</CardTitle>
            <CardDescription className="text-xs">Últimas 6 sprints — está melhorando?</CardDescription>
          </CardHeader>
          <CardContent>
            <AccuracyEvolutionChart />
          </CardContent>
        </Card>

        <Card className="col-span-12">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Precisão por dev</CardTitle>
            <CardDescription className="text-xs">
              Sem ranking. Ferramenta para conversa individual e calibração.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DevAccuracyTable sprintIds={sprintIds} />
          </CardContent>
        </Card>
      </DashboardSection>

      <DrilldownDrawer
        open={drilldown !== null}
        onOpenChange={(o) => !o && setDrilldown(null)}
        title={drilldown ? DRILLDOWN_TITLES[drilldown].title : ""}
        description={drilldown ? DRILLDOWN_TITLES[drilldown].description : ""}
        tasks={drilldownTasks}
      />
    </div>
  );
}
