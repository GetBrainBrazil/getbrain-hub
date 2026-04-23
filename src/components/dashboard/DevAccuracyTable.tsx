/**
 * Tabela "precisão por dev" — ferramenta de 1:1, sem ranking explícito.
 */
import { useDevAccuracy } from "@/hooks/dashboard/useDevAccuracy";
import { cn } from "@/lib/utils";
import { EmptyChart } from "./EmptyChart";

interface Props {
  sprintIds: string[];
}

function pctColor(pct: number) {
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 60) return "text-amber-500";
  return "text-destructive";
}

export function DevAccuracyTable({ sprintIds }: Props) {
  const { data = [], isLoading } = useDevAccuracy(sprintIds);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }
  if (!data.length) {
    return <EmptyChart message="Sem tasks done com estimativa neste recorte." />;
  }

  const totalTasks = data.reduce((s, d) => s + Number(d.tasks_counted), 0);
  const teamAvg =
    data.reduce((s, d) => s + Number(d.avg_accuracy_pct) * Number(d.tasks_counted), 0) /
    Math.max(totalTasks, 1);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        Precisão média do time:{" "}
        <span className={cn("font-semibold", pctColor(teamAvg))}>{teamAvg.toFixed(0)}%</span>
        {" · "}
        Tasks analisadas: <span className="font-semibold tabular-nums">{totalTasks}</span>
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 text-left font-medium">Dev</th>
            <th className="py-2 text-right font-medium">Tasks</th>
            <th className="py-2 text-right font-medium">Precisão</th>
            <th className="py-2 text-right font-medium">Desvio méd</th>
            <th className="py-2 text-right font-medium">↓ Sub</th>
            <th className="py-2 text-right font-medium">↑ Super</th>
            <th className="py-2 text-right font-medium">✓ Acerta</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.actor_id} className="border-b border-border/40 last:border-0">
              <td className="py-2 font-medium">{d.actor_name}</td>
              <td className="py-2 text-right tabular-nums">{d.tasks_counted}</td>
              <td className={cn("py-2 text-right font-semibold tabular-nums", pctColor(Number(d.avg_accuracy_pct)))}>
                {Number(d.avg_accuracy_pct).toFixed(0)}%
              </td>
              <td className="py-2 text-right tabular-nums">{Number(d.avg_deviation_hours).toFixed(1)}h</td>
              <td className="py-2 text-right tabular-nums text-destructive">{d.tasks_underestimated}</td>
              <td className="py-2 text-right tabular-nums text-amber-500">{d.tasks_overestimated}</td>
              <td className="py-2 text-right tabular-nums text-emerald-500">{d.tasks_accurate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
