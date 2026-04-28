import { Link } from 'react-router-dom';
import { CalendarOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ACTIVITY_ICON } from '@/constants/dealStages';
import type { ProximaAtividade } from '@/hooks/crm/useCrmDashboardExec';
import type { ActivityType } from '@/types/crm';

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (isToday) return `hoje ${hh}h${mm}`;
  if (isTomorrow) return `amanhã ${hh}h${mm}`;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${hh}h${mm}`;
}

interface Props {
  items: ProximaAtividade[] | undefined;
  loading: boolean;
}

export function ProximasAtividades({ items, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Próximas atividades</CardTitle>
        <p className="text-xs text-muted-foreground">Próximos 7 dias, ordenadas por horário.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <CalendarOff className="h-8 w-8" />
            <p className="text-xs">Nenhuma atividade agendada</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-2 py-2 text-sm">
                <span className="mt-0.5 text-base">
                  {ACTIVITY_ICON[a.type as ActivityType] ?? '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{a.title}</p>
                  {a.deal && a.deal_id && (
                    <Link
                      to={`/crm/deals/${a.deal_id}`}
                      className="text-xs text-muted-foreground hover:text-accent"
                    >
                      <span className="font-mono">{a.deal.code}</span> {a.deal.title}
                    </Link>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs text-foreground">
                    {formatWhen(a.scheduled_at)}
                  </p>
                  {a.owner && (
                    <p className="text-[10px] text-muted-foreground">
                      {a.owner.display_name.split(' ')[0]}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
