/**
 * Dashboard de Engenharia — em construção (03C-1 parcial).
 * Infra pronta: view dev_dashboard_metrics, 4 funções SQL, 9 hooks, 6 componentes base.
 * Falta: cabeçalho com escopo/compare, montagem dos Blocos 1-3.
 */
import { useDevHubStore } from "@/hooks/useDevHubStore";
import { useDashboardMetrics, useRecentSprintsMetrics } from "@/hooks/dashboard/useDashboardMetrics";
import { useDashboardAlerts, useReworkedTasks } from "@/hooks/dashboard/useDashboardAlerts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyChart } from "@/components/dashboard/EmptyChart";
import { Card, CardContent } from "@/components/ui/card";

export default function DevDashboard() {
  const sprintId = useDevHubStore((s) => s.selectedSprintId);
  const { data: recentMetrics = [] } = useRecentSprintsMetrics(6);
  const { data: currentMetrics = [] } = useDashboardMetrics(sprintId ? [sprintId] : []);
  const { data: alerts } = useDashboardAlerts(sprintId);
  const { data: reworked = [] } = useReworkedTasks(sprintId);

  const current = currentMetrics[0];
  const previous = recentMetrics.length >= 2 ? recentMetrics[recentMetrics.length - 2] : null;

  const delta = (cur?: number, prev?: number) => {
    if (cur === undefined || prev === undefined || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  };

  const velocityHist = recentMetrics.map((m) => Number(m.tasks_done));
  const reworkHist = recentMetrics.map((m) =>
    m.tasks_total > 0 ? (Number(m.tasks_reworked) / Number(m.tasks_total)) * 100 : 0,
  );
  const cycleHist = recentMetrics.map((m) => Number(m.avg_cycle_time_hours));

  const onTimeRate = current && (Number(current.tasks_done_on_time) + Number(current.tasks_done_late)) > 0
    ? (Number(current.tasks_done_on_time) / (Number(current.tasks_done_on_time) + Number(current.tasks_done_late))) * 100
    : null;

  const reworkRate = current && Number(current.tasks_total) > 0
    ? (Number(current.tasks_reworked) / Number(current.tasks_total)) * 100
    : null;

  const burndownPct = current && Number(current.tasks_total) > 0
    ? 100 - (Number(current.tasks_done) / Number(current.tasks_total)) * 100
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Dashboard de Engenharia</h1>
        <p className="text-sm text-muted-foreground">
          Cockpit completo da produção. Sprint selecionada no topo.
        </p>
      </header>

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
          onOpen={() => { /* drilldown drawer no 03C-1 finalização */ }}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Velocity"
          value={current ? `${current.tasks_done}/${current.tasks_total}` : "—"}
          hint="tasks done"
          delta={delta(Number(current?.tasks_done), Number(previous?.tasks_done))}
          sparkData={velocityHist}
        />
        <KpiCard
          label="Burndown"
          value={burndownPct !== null ? burndownPct.toFixed(0) : "—"}
          unit="% restante"
          delta={null}
          goodWhen="down"
        />
        <KpiCard
          label="Tempo de ciclo"
          value={current ? Number(current.avg_cycle_time_hours).toFixed(1) : "—"}
          unit="h"
          delta={delta(Number(current?.avg_cycle_time_hours), Number(previous?.avg_cycle_time_hours))}
          goodWhen="down"
          sparkData={cycleHist}
        />
        <KpiCard
          label="Taxa no prazo"
          value={onTimeRate !== null ? onTimeRate.toFixed(0) : "—"}
          unit="%"
          delta={null}
        />
        <KpiCard
          label="Bloqueadas"
          value={current ? Number(current.tasks_blocked_now) : "—"}
          hint="agora"
          goodWhen="down"
          delta={delta(Number(current?.tasks_blocked_now), Number(previous?.tasks_blocked_now))}
        />
        <KpiCard
          label="Rework rate"
          value={reworkRate !== null ? reworkRate.toFixed(0) : "—"}
          unit="%"
          goodWhen="down"
          delta={delta(reworkRate ?? 0, previous && Number(previous.tasks_total) > 0 ? (Number(previous.tasks_reworked) / Number(previous.tasks_total)) * 100 : 0)}
          sparkData={reworkHist}
        />
      </div>

      <DashboardSection
        title="Entrega"
        question="O time está cumprindo o que se comprometeu na sprint?"
      >
        <Card className="col-span-12">
          <CardContent className="p-6">
            <EmptyChart message="Bloco 1 (burndown, velocity histórica, taxa no prazo, ciclo por tipo, entregas/dia) — em construção no fechamento do 03C-1" />
          </CardContent>
        </Card>
      </DashboardSection>

      <DashboardSection
        title="Gargalos"
        question="Onde o trabalho está parado e por quê?"
      >
        <Card className="col-span-12">
          <CardContent className="p-6">
            <EmptyChart message="Bloco 2 (tasks bloqueadas, tempo por status, review parado, heatmap, distribuição) — em construção" />
          </CardContent>
        </Card>
      </DashboardSection>

      <DashboardSection
        title="Estimativa"
        question="O quanto erramos ao prometer prazos?"
      >
        <Card className="col-span-12">
          <CardContent className="p-6">
            <EmptyChart message="Bloco 3 (gauge precisão, top desvios, desvio por tipo, evolução, precisão por dev) — em construção" />
          </CardContent>
        </Card>
      </DashboardSection>
    </div>
  );
}
