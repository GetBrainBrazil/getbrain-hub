import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarClock, Target, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DEAL_STAGE_LABEL } from '@/constants/dealStages';
import {
  useCrmDashboardAlerts,
  useCrmDashboardDeals,
  useCrmDashboardSnapshot,
  useCrmFunnelMetrics,
  useCrmOwnerPerformance,
  useCrmRecentActivity,
  useCrmSourcePerformance,
  useCrmVelocityByStage,
} from '@/hooks/crm/useCrmDashboard';

const PERIOD_OPTIONS = [
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 180, label: '180d' },
] as const;

const FUNNEL_COLORS = ['bg-accent', 'bg-chart-5', 'bg-warning', 'bg-chart-4', 'bg-success', 'bg-muted'];
const CHART_COLORS = ['hsl(var(--accent))', 'hsl(var(--chart-5))', 'hsl(var(--warning))', 'hsl(var(--chart-4))', 'hsl(var(--success))', 'hsl(var(--muted-foreground))'];

function delta(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default function CrmDashboard() {
  const navigate = useNavigate();
  const [recentDays] = usePersistedState<number>('crm-dashboard-recent-days', 14);
  const period = useCrmHubStore((state) => state.dashboardPeriod);
  const setPeriod = useCrmHubStore((state) => state.setDashboardPeriod);

  const { data: funnel } = useCrmFunnelMetrics();
  const { data: snapshot } = useCrmDashboardSnapshot(period);
  const { data: alerts = [] } = useCrmDashboardAlerts();
  const { data: sourcePerformance = [] } = useCrmSourcePerformance(period);
  const { data: ownerPerformance = [] } = useCrmOwnerPerformance(period);
  const { data: velocity = [] } = useCrmVelocityByStage(period);
  const { data: recentActivity = [] } = useCrmRecentActivity(recentDays);
  const { data: deals = [] } = useCrmDashboardDeals(period);

  const current = snapshot?.current;
  const previous = snapshot?.previous;

  const funnelData = funnel
    ? [
        { key: 'leads_novo_current', label: 'Novos leads', value: funnel.leads_novo_current },
        { key: 'leads_triagem_agendada_current', label: 'Triagem agendada', value: funnel.leads_triagem_agendada_current },
        { key: 'leads_triagem_feita_current', label: 'Prontos', value: funnel.leads_triagem_feita_current },
        { key: 'deals_presencial_feita_current', label: 'Reunião feita', value: funnel.deals_presencial_feita_current },
        { key: 'deals_orcamento_enviado_current', label: 'Orçamento', value: funnel.deals_orcamento_enviado_current },
        { key: 'deals_em_negociacao_current', label: 'Negociação', value: funnel.deals_em_negociacao_current },
      ]
    : [];

  const forecastByStage = deals
    .filter((deal) => !['fechado_ganho', 'fechado_perdido'].includes(deal.stage))
    .reduce<Record<string, { stage: string; total: number; weighted: number }>>((acc, deal) => {
      const key = deal.stage;
      if (!acc[key]) acc[key] = { stage: DEAL_STAGE_LABEL[deal.stage], total: 0, weighted: 0 };
      const value = Number(deal.estimated_value ?? 0);
      acc[key].total += value;
      acc[key].weighted += value * (Number(deal.probability_pct ?? 0) / 100);
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Dashboard comercial</h2>
          <p className="text-sm text-muted-foreground">Funil, performance, gargalos e agenda do time comercial.</p>
        </div>
        <Tabs value={String(period)} onValueChange={(value) => setPeriod(Number(value))}>
          <TabsList>
            {PERIOD_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={String(option.value)}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <AlertBanner
        items={alerts.map((alert) => ({
          kind: alert.id === 'overdue' ? 'overdue' : alert.id === 'stalled' ? 'estimate_burst' : alert.id === 'ready' ? 'stale_review' : 'blocked_long',
          count: alert.count,
          label: alert.title,
          severity: alert.tone === 'danger' ? 'danger' : 'warning',
        }))}
        onOpen={(kind) => {
          if (kind === 'blocked_long') navigate('/crm/calendario');
          if (kind === 'overdue' || kind === 'estimate_burst') navigate('/crm/pipeline');
          if (kind === 'stale_review') navigate('/crm/leads');
        }}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <KpiCard label="Leads criados" value={current?.leads_created ?? '—'} delta={delta(current?.leads_created, previous?.leads_created)} onClick={() => navigate('/crm/leads')} />
        <KpiCard label="Conversão lead" value={current?.lead_conversion_rate != null ? `${current.lead_conversion_rate.toFixed(1)}%` : '—'} delta={delta(current?.lead_conversion_rate, previous?.lead_conversion_rate)} onClick={() => navigate('/crm/leads')} />
        <KpiCard label="Pipeline aberto" value={formatCurrency(current?.pipeline_total ?? 0)} delta={delta(current?.pipeline_total, previous?.pipeline_total)} onClick={() => navigate('/crm/pipeline')} />
        <KpiCard label="Forecast" value={formatCurrency(current?.weighted_pipeline ?? 0)} delta={delta(current?.weighted_pipeline, previous?.weighted_pipeline)} onClick={() => navigate('/crm/pipeline')} />
        <KpiCard label="Receita ganha" value={formatCurrency(current?.revenue_won ?? 0)} delta={delta(current?.revenue_won, previous?.revenue_won)} onClick={() => navigate('/crm/pipeline')} />
        <KpiCard label="Atividades feitas" value={current?.activities_completed ?? '—'} delta={delta(current?.activities_completed, previous?.activities_completed)} onClick={() => navigate('/crm/calendario')} />
      </div>

      <DashboardSection title="Ler o funil" question="Onde o comercial está avançando e onde está travando?">
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Volume por etapa</CardTitle>
            <CardDescription>Leitura rápida do estoque atual do funil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes para montar o funil.</p>
            ) : (
              funnelData.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.key.startsWith('deal') ? '/crm/pipeline' : '/crm/leads')}
                  className="w-full rounded-lg border border-border bg-background/40 p-3 text-left transition hover:border-accent/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">Clique para abrir o drill-down correspondente.</p>
                    </div>
                    <span className="text-lg font-semibold text-foreground">{item.value}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className={cn('h-2 rounded-full', FUNNEL_COLORS[index])} style={{ width: `${Math.max(8, (item.value / Math.max(...funnelData.map((entry) => entry.value), 1)) * 100)}%` }} />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Forecast por etapa</CardTitle>
            <CardDescription>Total bruto vs ponderado dentro do período.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {Object.values(forecastByStage).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhum deal aberto no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.values(forecastByStage)}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="total" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="weighted" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </DashboardSection>

      <DashboardSection title="Comparar origem e dono" question="Quais canais e responsáveis estão trazendo negócio de verdade?">
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-base">Origens com melhor retorno</CardTitle>
            <CardDescription>Conversão e receita por origem de lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourcePerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há leads suficientes para esse comparativo.</p>
            ) : (
              sourcePerformance.slice(0, 6).map((row) => (
                <button key={row.source} type="button" onClick={() => navigate('/crm/leads')} className="flex w-full items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-left transition hover:border-accent/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.source}</p>
                    <p className="text-xs text-muted-foreground">{row.leads_converted}/{row.leads_total} leads convertidos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(row.revenue_generated ?? 0))}</p>
                    <p className="text-xs text-muted-foreground">{Number(row.conversion_rate_pct ?? 0).toFixed(1)}%</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-base">Performance por responsável</CardTitle>
            <CardDescription>Quem está fechando, negociando e executando atividades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ownerPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem responsáveis com volume suficiente ainda.</p>
            ) : (
              ownerPerformance.slice(0, 6).map((row) => (
                <button key={row.owner_actor_id} type="button" onClick={() => navigate('/crm/pipeline')} className="flex w-full items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-left transition hover:border-accent/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{row.activities_completed} atividades concluídas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(row.revenue_generated ?? 0))}</p>
                    <p className="text-xs text-muted-foreground">Win rate {Number(row.win_rate_pct ?? 0).toFixed(1)}%</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </DashboardSection>

      <DashboardSection title="Acompanhar velocidade e atividade" question="Quanto tempo cada etapa consome e o que acabou de acontecer?">
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Tempo médio por etapa</CardTitle>
            <CardDescription>Leitura de gargalo por estágio do pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {velocity.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem histórico suficiente para calcular velocidade.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={velocity} dataKey="avg_days_in_stage" nameKey="stage" innerRadius={62} outerRadius={98} paddingAngle={3}>
                    {velocity.map((entry, index) => (
                      <Cell key={entry.stage} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)} dias`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Feed comercial recente</CardTitle>
            <CardDescription>Últimas movimentações clicáveis do CRM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente encontrada.</p>
            ) : (
              recentActivity.slice(0, 4).map((group) => (
                <div key={group.day} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.day}</p>
                  <div className="space-y-2">
                    {group.items.slice(0, 5).map((item) => (
                      <Link key={item.id} to={item.href ?? '/crm'} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 transition hover:border-accent/50">
                        <div className="flex items-center gap-3">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-sm text-foreground">{item.label}</span>
                        </div>
                        <Badge variant="outline">abrir</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </DashboardSection>

      <div className="grid gap-3 md:grid-cols-3">
        <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/crm/pipeline')}><BarChart3 className="h-4 w-4" /> Abrir pipeline</Button>
        <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/crm/leads')}><Target className="h-4 w-4" /> Abrir leads</Button>
        <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/crm/calendario')}><CalendarClock className="h-4 w-4" /> Abrir calendário</Button>
      </div>
    </div>
  );
}
