/**
 * Dashboard CRM — visão executiva diária (09F-1).
 * KPI primário: deals parados. Demais KPIs servem de contexto.
 * Filtros (período/owner/tipo) persistidos na URL.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/crm/dashboard/DashboardHeader';
import { KpiCards } from '@/components/crm/dashboard/KpiCards';
import { PrecisamAcaoAgora } from '@/components/crm/dashboard/PrecisamAcaoAgora';
import { FunilVisual } from '@/components/crm/dashboard/FunilVisual';
import { ProximasAtividades } from '@/components/crm/dashboard/ProximasAtividades';
import {
  useDashboardMetrics,
  useDashboardSparklines,
  usePipelineByStage,
  useDealsParados,
  useProximasAtividades,
  type DashboardFilters,
} from '@/hooks/crm/useCrmDashboardExec';

export default function CrmDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: DashboardFilters = useMemo(
    () => ({
      periodDays: Number(searchParams.get('periodo') ?? 30),
      ownerIds: searchParams.get('owner')?.split(',').filter(Boolean) ?? [],
      projectTypes: searchParams.get('tipo')?.split(',').filter(Boolean) ?? [],
    }),
    [searchParams],
  );

  const updateFilters = (next: Partial<DashboardFilters>) => {
    const merged = { ...filters, ...next };
    const sp = new URLSearchParams();
    if (merged.periodDays !== 30) sp.set('periodo', String(merged.periodDays));
    if (merged.ownerIds.length) sp.set('owner', merged.ownerIds.join(','));
    if (merged.projectTypes.length) sp.set('tipo', merged.projectTypes.join(','));
    setSearchParams(sp, { replace: true });
  };

  const metricsQ = useDashboardMetrics();
  const sparklinesQ = useDashboardSparklines();
  const stagesQ = usePipelineByStage();
  const paradosQ = useDealsParados(filters);
  const atividadesQ = useProximasAtividades(filters);

  const hasNoDeals =
    metricsQ.isSuccess &&
    (!metricsQ.data || Number(metricsQ.data.deals_abertos_total) === 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader filters={filters} onChange={updateFilters} />

      {hasNoDeals && !paradosQ.data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem deals abertos.
            </p>
            <Button asChild size="sm">
              <a href="/crm">Criar o primeiro deal</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <KpiCards
            metrics={metricsQ.data}
            sparklines={sparklinesQ.data}
            loading={metricsQ.isLoading}
          />

          <PrecisamAcaoAgora deals={paradosQ.data} loading={paradosQ.isLoading} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FunilVisual data={stagesQ.data} loading={stagesQ.isLoading} />
            </div>
            <div>
              <ProximasAtividades items={atividadesQ.data} loading={atividadesQ.isLoading} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
