/**
 * Desvio médio (%) por tipo de task. Positivo subestimou, negativo superestimou.
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
  ReferenceLine,
} from "recharts";
import { useDeviationByType } from "@/hooks/dashboard/useDeviationByType";
import { EmptyChart } from "./EmptyChart";

interface Props {
  sprintIds: string[];
}

export function DeviationByTypeChart({ sprintIds }: Props) {
  const { data = [], isLoading } = useDeviationByType(sprintIds);

  if (isLoading) {
    return <div className="h-[200px] animate-pulse rounded bg-muted/30" />;
  }
  const filtered = data.filter((d) => d.count > 0);
  if (!filtered.length) {
    return <EmptyChart message="Sem dados de desvio por tipo." />;
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filtered} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="type"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
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
            formatter={(v: number, _n, p) => [
              `${v > 0 ? "+" : ""}${v.toFixed(0)}% (${p.payload.count} tasks)`,
              v > 0 ? "Subestimou" : "Superestimou",
            ]}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Bar dataKey="avg_pct" radius={[3, 3, 0, 0]}>
            {filtered.map((d, i) => (
              <Cell
                key={i}
                fill={d.avg_pct > 30 ? "hsl(var(--destructive))" : d.avg_pct > 0 ? "hsl(45 93% 55%)" : "hsl(142 71% 45%)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
