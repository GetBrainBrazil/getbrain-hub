/**
 * Distribuição atual de status na sprint (exclui cancelled).
 */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { DashboardMetrics } from "@/hooks/dashboard/useDashboardMetrics";
import { EmptyChart } from "./EmptyChart";

interface Props {
  metrics: DashboardMetrics | undefined;
}

const COLORS: Record<string, string> = {
  Backlog: "hsl(var(--muted-foreground))",
  "A fazer": "hsl(220 13% 50%)",
  "Em andamento": "hsl(var(--primary))",
  "Em review": "hsl(45 93% 55%)",
  Concluídas: "hsl(142 71% 45%)",
};

export function StatusDistributionPie({ metrics }: Props) {
  if (!metrics) {
    return <EmptyChart message="Sem dados da sprint." />;
  }
  const data = [
    { name: "Backlog", value: Number(metrics.tasks_backlog) },
    { name: "A fazer", value: Number(metrics.tasks_todo) },
    { name: "Em andamento", value: Number(metrics.tasks_in_progress) },
    { name: "Em review", value: Number(metrics.tasks_in_review) },
    { name: "Concluídas", value: Number(metrics.tasks_done) },
  ].filter((d) => d.value > 0);

  if (!data.length) {
    return <EmptyChart message="Sprint sem tasks ainda." />;
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
            {data.map((d, i) => (
              <Cell key={i} fill={COLORS[d.name] ?? "hsl(var(--primary))"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
