/**
 * Donut "no prazo vs atrasadas" para a sprint atual + valor central.
 */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyChart } from "./EmptyChart";

interface Props {
  onTime: number;
  late: number;
}

export function OnTimeDonut({ onTime, late }: Props) {
  const total = onTime + late;
  if (total === 0) {
    return <EmptyChart message="Nenhuma task concluída ainda." />;
  }
  const pct = Math.round((onTime / total) * 100);
  const data = [
    { name: "No prazo", value: onTime, color: "hsl(var(--success, 142 71% 45%))" },
    { name: "Atrasadas", value: late, color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="relative h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
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
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">no prazo</span>
      </div>
    </div>
  );
}
