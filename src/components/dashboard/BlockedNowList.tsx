/**
 * Lista de tasks bloqueadas no momento (sprint atual). Clica → tela cheia.
 */
import { useNavigate } from "react-router-dom";
import { Lock, ChevronRight, ShieldCheck } from "lucide-react";
import { useDashboardAlerts } from "@/hooks/dashboard/useDashboardAlerts";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  sprintId: string | null;
}

export function BlockedNowList({ sprintId }: Props) {
  const { data, isLoading } = useDashboardAlerts(sprintId);
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }
  const list = (data?.blocked_now ?? [])
    .slice()
    .sort((a, b) => (a.blocked_since ?? "").localeCompare(b.blocked_since ?? ""));

  if (!list.length) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-foreground">Tudo fluindo</p>
        <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          Nenhuma task bloqueada nesta sprint. Quando alguém marcar uma task como bloqueada,
          ela aparece aqui ordenada pela mais antiga.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {list.map((t) => {
        const since = t.blocked_since
          ? formatDistanceToNowStrict(parseISO(t.blocked_since), { locale: ptBR, addSuffix: false })
          : "—";
        const long = t.blocked_since
          ? Date.parse(t.blocked_since) < Date.now() - 3 * 86_400_000
          : false;
        return (
          <li key={t.id}>
            <button
              onClick={() => navigate(`/dev/tasks/${t.code}`)}
              className="group flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-muted/30"
            >
              <Lock className={cn("h-3.5 w-3.5 flex-shrink-0", long ? "text-destructive" : "text-amber-500")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                  <span className={cn("text-[10px] font-medium", long ? "text-destructive" : "text-amber-500")}>
                    há {since}
                  </span>
                </div>
                <p className="line-clamp-1 text-sm">{t.title}</p>
                {t.blocked_reason && (
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">{t.blocked_reason}</p>
                )}
              </div>
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
