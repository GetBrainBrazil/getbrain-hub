/**
 * Burndown da sprint: ideal (linear) vs real (tasks restantes por dia).
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useSprintBurndown } from "@/hooks/dashboard/useSprintBurndown";
import { EmptyChart } from "./EmptyChart";
import { format, parseISO } from "date-fns";

interface Props {
  sprintId: string | null;
}

export function BurndownChart({ sprintId }: Props) {
  const { data = [], isLoading } = useSprintBurndown(sprintId);

  if (isLoading) {
    return <div className="h-[260px] animate-pulse rounded bg-muted/30" />;
  }
  if (!data.length) {
    return <EmptyChart message="Sem dados de burndown para a sprint selecionada." />;
  }

  const chartData = data.map((d) => ({
    day: format(parseISO(d.day), "dd/MM"),
    real: Number(d.remaining_tasks),
    ideal: Number(d.ideal_remaining),
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="ideal"
            name="Ideal"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="real"
            name="Real"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
