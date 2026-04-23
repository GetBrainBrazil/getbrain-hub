/**
 * Gauge semicircular de precisão de estimativa (0-100%).
 */
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface Props {
  pct: number;
  delta?: number | null;
}

export function AccuracyGauge({ pct, delta }: Props) {
  const safe = Math.max(0, Math.min(100, pct));
  const color =
    safe >= 80
      ? "hsl(142 71% 45%)"
      : safe >= 60
        ? "hsl(45 93% 55%)"
        : "hsl(var(--destructive))";

  const data = [{ value: safe, fill: color }];

  return (
    <div className="relative h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "hsl(var(--muted) / 0.4)" }} dataKey="value" cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-6">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {safe.toFixed(0)}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">precisão</span>
        {delta !== null && delta !== undefined && Number.isFinite(delta) && (
          <span
            className={`mt-0.5 text-[10px] font-semibold tabular-nums ${
              delta > 0 ? "text-emerald-500" : delta < 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(0)}% vs anterior
          </span>
        )}
      </div>
    </div>
  );
}
