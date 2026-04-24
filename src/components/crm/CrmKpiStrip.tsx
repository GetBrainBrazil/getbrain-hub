import { formatCurrency } from '@/lib/formatters';
import type { CrmMetrics } from '@/types/crm';

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-card/60 px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p></div>;
}

export function CrmKpiStrip({ metrics }: { metrics: CrmMetrics | undefined }) {
  const openLeads = (metrics?.leads_novos ?? 0) + (metrics?.leads_triagem_agendada ?? 0) + (metrics?.leads_triagem_feita ?? 0);
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Kpi label="Pipeline total" value={formatCurrency(Number(metrics?.pipeline_total_brl ?? 0))} />
      <Kpi label="Forecast ponderado" value={formatCurrency(Number(metrics?.forecast_ponderado_brl ?? 0))} />
      <Kpi label="Deals ativos" value={String(metrics?.deals_ativos ?? 0)} />
      <Kpi label="Taxa de conversão" value={`${Number(metrics?.conversion_rate_pct ?? 0).toFixed(0)}%`} />
      <Kpi label="Ticket médio" value={formatCurrency(Number(metrics?.ticket_medio_brl ?? 0))} />
      <Kpi label="Leads abertos" value={String(openLeads)} />
    </div>
  );
}
