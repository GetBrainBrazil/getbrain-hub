/**
 * Evolução da precisão média do time nas últimas N sprints.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { useRecentSprintsMetrics } from "@/hooks/dashboard/useDashboardMetrics";
import { EmptyChart } from "./EmptyChart";

export function AccuracyEvolutionChart() {
  const { data = [], isLoading } = useRecentSprintsMetrics(6);

  if (isLoading) {
    return <div className="h-[200px] animate-pulse rounded bg-muted/30" />;
  }
  if (data.length < 1) {
    return <EmptyChart message="Sem histórico." />;
  }

  const chartData = data.map((m) => ({
    sprint: m.sprint_code,
    accuracy: Number(m.estimation_accuracy_pct),
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="sprint"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v.toFixed(0)}%`, "Precisão"]}
          />
          <Area type="monotone" dataKey="accuracy" stroke="none" fill="url(#accuracyGrad)" />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
