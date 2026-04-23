/**
 * Tabela das tasks com maior desvio entre estimado e real.
 */
import { useNavigate } from "react-router-dom";
import { useTopDeviations } from "@/hooks/dashboard/useTopDeviations";
import { cn } from "@/lib/utils";
import { EmptyChart } from "./EmptyChart";

interface Props {
  sprintIds: string[];
}

function devColor(pct: number) {
  const abs = Math.abs(pct);
  if (abs > 50) return "text-destructive";
  if (abs > 20) return "text-amber-500";
  return "text-emerald-500";
}

export function TopDeviationsTable({ sprintIds }: Props) {
  const { data = [], isLoading } = useTopDeviations(sprintIds, 5);
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }
  if (!data.length) {
    return <EmptyChart message="Sem tasks done com estimativa para comparar." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <th className="py-2 text-left font-medium">Task</th>
          <th className="py-2 text-left font-medium">Dev</th>
          <th className="py-2 text-right font-medium">Est</th>
          <th className="py-2 text-right font-medium">Real</th>
          <th className="py-2 text-right font-medium">Desvio</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr
            key={d.id}
            onClick={() => navigate(`/dev/tasks/${d.code}`)}
            className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
          >
            <td className="py-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">{d.code}</span>
                {d.project_code && (
                  <span className="font-mono text-[10px] text-muted-foreground/70">· {d.project_code}</span>
                )}
              </div>
              <p className="line-clamp-1 text-[13px]">{d.title}</p>
            </td>
            <td className="py-2 text-[12px] text-muted-foreground">{d.assignee_name ?? "—"}</td>
            <td className="py-2 text-right tabular-nums">{d.estimated_hours.toFixed(1)}h</td>
            <td className="py-2 text-right tabular-nums">{d.actual_hours.toFixed(1)}h</td>
            <td className={cn("py-2 text-right font-semibold tabular-nums", devColor(d.deviation_pct))}>
              {d.deviation_pct > 0 ? "+" : ""}
              {d.deviation_pct.toFixed(0)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
