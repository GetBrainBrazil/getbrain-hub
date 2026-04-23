/**
 * Velocity das últimas N sprints (tasks done por sprint) com linha de média.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { useRecentSprintsMetrics } from "@/hooks/dashboard/useDashboardMetrics";
import { EmptyChart } from "./EmptyChart";

interface Props {
  currentSprintId: string | null;
}

export function VelocityHistoryChart({ currentSprintId }: Props) {
  const { data = [], isLoading } = useRecentSprintsMetrics(6);

  if (isLoading) {
    return <div className="h-[260px] animate-pulse rounded bg-muted/30" />;
  }
  if (!data.length) {
    return <EmptyChart message="Sem histórico de sprints." />;
  }

  const chartData = data.map((m) => ({
    sprint: m.sprint_code,
    done: Number(m.tasks_done),
    total: Number(m.tasks_total),
    sprint_id: m.sprint_id,
  }));
  const avg =
    chartData.reduce((s, d) => s + d.done, 0) / Math.max(chartData.length, 1);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="sprint"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(v: number, _n, p) => [`${v} / ${p.payload.total} tasks`, "Concluídas"]}
          />
          <ReferenceLine
            y={avg}
            stroke="hsl(var(--accent))"
            strokeDasharray="4 4"
            label={{ value: `média ${avg.toFixed(1)}`, fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "right" }}
          />
          <Bar dataKey="done" radius={[3, 3, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.sprint_id === currentSprintId ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
