import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DEAL_STAGES, DEAL_STAGE_LABEL, DEAL_STAGE_BAR } from '@/constants/dealStages';
import type { CrmPipelineByStage } from '@/hooks/crm/useCrmDashboardExec';
import type { DealStage } from '@/types/crm';

const OPEN_STAGES: DealStage[] = DEAL_STAGES.filter(
  (s) => s !== 'fechado_ganho' && s !== 'fechado_perdido',
);

interface Props {
  data: CrmPipelineByStage[] | undefined;
  loading: boolean;
}

export function FunilVisual({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil por estágio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const byStage = new Map((data ?? []).map((d) => [d.stage, d]));
  const maxCount = Math.max(1, ...(data ?? []).map((d) => Number(d.deals_count)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Funil por estágio</CardTitle>
        <p className="text-xs text-muted-foreground">Apenas estágios abertos. Clique para filtrar.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {OPEN_STAGES.map((stage) => {
          const row = byStage.get(stage);
          const count = row ? Number(row.deals_count) : 0;
          const value = row ? Number(row.stage_value) : 0;
          const avgDays = row ? Number(row.avg_days_in_stage) : 0;
          const widthPct = (count / maxCount) * 100;
          return (
            <Link
              key={stage}
              to={`/crm/pipeline?stage=${stage}`}
              className="block rounded-md border border-border bg-card/40 p-2.5 transition-colors hover:border-accent/40 hover:bg-accent/5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-foreground">
                  {DEAL_STAGE_LABEL[stage]}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono font-bold text-foreground">{count}</span>
                  <span className="font-mono text-muted-foreground">{formatCurrency(value)}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    média {avgDays}d
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn('h-full transition-all', DEAL_STAGE_BAR[stage])}
                  style={{ width: `${Math.max(widthPct, count > 0 ? 4 : 0)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
