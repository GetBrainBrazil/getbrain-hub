/**
 * Tasks concluídas por dia nos últimos 14 dias.
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useCompletionsPerDay } from "@/hooks/dashboard/useCompletionsPerDay";
import { EmptyChart } from "./EmptyChart";
import { format, parseISO } from "date-fns";

export function CompletionsPerDayChart({ days = 14 }: { days?: number }) {
  const { data = [], isLoading } = useCompletionsPerDay(days);

  if (isLoading) {
    return <div className="h-[200px] animate-pulse rounded bg-muted/30" />;
  }
  if (!data.length) {
    return <EmptyChart message="Sem entregas no período." />;
  }

  const chartData = data.map((d) => ({
    day: format(parseISO(d.day), "dd/MM"),
    count: d.count,
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="completionsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            interval="preserveStartEnd"
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
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#completionsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
