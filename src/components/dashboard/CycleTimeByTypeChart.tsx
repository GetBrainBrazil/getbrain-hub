/**
 * Tempo médio de ciclo por tipo de task. Cores semânticas por tipo.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useCycleTimeByType } from "@/hooks/dashboard/useCycleTimeByType";
import { EmptyChart } from "./EmptyChart";

const COLORS: Record<string, string> = {
  bug: "hsl(var(--destructive))",
  feature: "hsl(var(--primary))",
  refactor: "hsl(280 65% 60%)",
  chore: "hsl(var(--muted-foreground))",
  docs: "hsl(142 71% 45%)",
  research: "hsl(45 93% 55%)",
};

interface Props {
  sprintIds: string[];
}

export function CycleTimeByTypeChart({ sprintIds }: Props) {
  const { data = [], isLoading } = useCycleTimeByType(sprintIds);

  if (isLoading) {
    return <div className="h-[200px] animate-pulse rounded bg-muted/30" />;
  }
  const filtered = data.filter((d) => d.count > 0);
  if (!filtered.length) {
    return <EmptyChart message="Sem tasks concluídas com timestamps de ciclo." />;
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filtered} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="type"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            label={{ value: "h", angle: 0, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(v: number, _n, p) => [`${v.toFixed(1)}h (${p.payload.count} tasks)`, "Ciclo médio"]}
          />
          <Bar dataKey="avg_hours" radius={[3, 3, 0, 0]}>
            {filtered.map((d, i) => (
              <Cell key={i} fill={COLORS[d.type] ?? "hsl(var(--primary))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
