import { Link } from 'react-router-dom';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DEAL_STAGE_LABEL, ACTIVITY_ICON } from '@/constants/dealStages';
import type { DealParado } from '@/hooks/crm/useCrmDashboardExec';
import type { ActivityType } from '@/types/crm';

interface Props {
  deals: DealParado[] | undefined;
  loading: boolean;
}

function staleBadgeClass(days: number) {
  if (days > 14) return 'bg-destructive/15 text-destructive border-destructive/30';
  return 'bg-warning/15 text-warning border-warning/30';
}

export function PrecisamAcaoAgora({ deals, loading }: Props) {
  return (
    <Card className="border-accent/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent" />
          Precisam ação agora
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Top 10 deals abertos sem atividade nos últimos 7+ dias
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !deals || deals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <PartyPopper className="h-10 w-10 text-accent" />
            <p className="text-sm font-semibold text-foreground">Tudo em movimento.</p>
            <p className="text-xs text-muted-foreground">Nenhum deal parado neste momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {deals.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-12 items-center gap-2 py-2.5 text-sm sm:gap-3"
              >
                <div className="col-span-12 sm:col-span-4">
                  <Link
                    to={`/crm/deals/${d.id}`}
                    className="font-medium text-foreground hover:text-accent"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{d.code}</span>{' '}
                    {d.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.company?.trade_name ?? d.company?.legal_name ?? '—'}
                  </p>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <Badge variant="outline" className="text-[10px]">
                    {DEAL_STAGE_LABEL[d.stage]}
                  </Badge>
                </div>
                <div className="col-span-6 font-mono text-xs sm:col-span-2">
                  {d.estimated_value ? formatCurrency(Number(d.estimated_value)) : '—'}
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                      staleBadgeClass(d.days_stale),
                    )}
                  >
                    parado há {d.days_stale}d
                  </span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {d.last_activity_type
                      ? `${ACTIVITY_ICON[d.last_activity_type as ActivityType] ?? '•'} última`
                      : 'sem atividade'}
                  </p>
                </div>
                <div className="col-span-6 flex items-center justify-end gap-2 sm:col-span-2">
                  {d.owner && (
                    <span
                      className="hidden text-xs text-muted-foreground sm:inline"
                      title={d.owner.display_name}
                    >
                      {d.owner.display_name.split(' ')[0]}
                    </span>
                  )}
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                    <Link to={`/crm/deals/${d.id}`}>
                      Abrir <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
