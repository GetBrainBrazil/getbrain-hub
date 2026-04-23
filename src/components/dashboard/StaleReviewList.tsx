/**
 * Tasks paradas em code review há mais de 2 dias.
 */
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import { useDashboardAlerts } from "@/hooks/dashboard/useDashboardAlerts";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  sprintId: string | null;
}

export function StaleReviewList({ sprintId }: Props) {
  const { data, isLoading } = useDashboardAlerts(sprintId);
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded bg-muted/30" />;
  }
  const list = (data?.stale_review ?? []).slice(0, 5);
  if (!list.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        ✅ Nenhuma task parada em review.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {list.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => navigate(`/dev/tasks/${t.code}`)}
            className="group flex w-full items-center gap-2 px-1 py-2 text-left transition-colors hover:bg-muted/30"
          >
            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                <span className="text-[10px] text-amber-500">
                  parada há {formatDistanceToNowStrict(parseISO(t.updated_at), { locale: ptBR })}
                </span>
              </div>
              <p className="line-clamp-1 text-sm">{t.title}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </li>
      ))}
    </ul>
  );
}
