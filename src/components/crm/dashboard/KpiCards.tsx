/**
 * 4 KPI cards do Dashboard CRM. "Deals parados" é o primário (destaque ciano).
 */
import { AlertOctagon, CalendarClock, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SparklineMini } from '@/components/dashboard/SparklineMini';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type {
  CrmDashboardMetrics,
  CrmDashboardSparkline,
} from '@/hooks/crm/useCrmDashboardExec';

interface Props {
  metrics: CrmDashboardMetrics | null | undefined;
  sparklines: CrmDashboardSparkline[] | undefined;
  loading: boolean;
}

function Delta({ value, goodWhen = 'up' }: { value: number; goodWhen?: 'up' | 'down' }) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) {
    return <span className="text-[11px] text-muted-foreground">estável</span>;
  }
  const isGood = goodWhen === 'up' ? value > 0 : value < 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
        isGood ? 'text-emerald-500' : 'text-destructive',
      )}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}
      {value.toFixed(0)}%
    </span>
  );
}

export function KpiCards({ metrics, sparklines, loading }: Props) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const sparkParados = (sparklines ?? []).map((s) => Number(s.deals_parados));
  const sparkPipeline = (sparklines ?? []).map((s) => Number(s.pipeline_value));

  // Delta = atual vs valor de 30 dias atrás (primeiro ponto da série)
  const deltaParados =
    sparkParados.length > 1 && sparkParados[0] > 0
      ? ((Number(metrics.deals_parados_7d) - sparkParados[0]) / sparkParados[0]) * 100
      : 0;
  const deltaPipeline =
    sparkPipeline.length > 1 && sparkPipeline[0] > 0
      ? ((Number(metrics.pipeline_value_total) - sparkPipeline[0]) / sparkPipeline[0]) * 100
      : 0;

  const conversao =
    Number(metrics.fechados_30d) > 0
      ? (Number(metrics.ganhos_30d) / Number(metrics.fechados_30d)) * 100
      : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* KPI primário: Deals Parados */}
      <Card className="border-l-4 border-l-accent bg-gradient-to-br from-accent/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
              <AlertOctagon className="h-3.5 w-3.5" /> Deals parados
            </span>
            <Delta value={deltaParados} goodWhen="down" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-foreground">
            {metrics.deals_parados_7d}
          </p>
          <p className="text-[11px] text-muted-foreground">sem atividade há 7+ dias</p>
          {sparkParados.length > 0 && (
            <div className="mt-2 h-8">
              <SparklineMini data={sparkParados} positive={false} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline value */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Pipeline value
            </span>
            <Delta value={deltaPipeline} goodWhen="up" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">
            {formatCurrency(Number(metrics.pipeline_value_total))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {metrics.deals_abertos_total} deals em aberto
          </p>
          {sparkPipeline.length > 0 && (
            <div className="mt-2 h-8">
              <SparklineMini data={sparkPipeline} positive />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Atividades 7d */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Atividades 7 dias
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-foreground">
            {metrics.atividades_proximos_7d}
          </p>
          <p className="text-[11px] text-muted-foreground">agendadas e não concluídas</p>
          <div className="mt-2 h-8" />
        </CardContent>
      </Card>

      {/* Conversão */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Conversão 30d
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-foreground">
            {conversao.toFixed(0)}
            <span className="ml-0.5 text-base text-muted-foreground">%</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {metrics.ganhos_30d} ganhos / {metrics.fechados_30d} fechados
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            anterior:{' '}
            <span className="font-mono text-foreground">{metrics.ganhos_30d_anterior}</span> ganhos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
