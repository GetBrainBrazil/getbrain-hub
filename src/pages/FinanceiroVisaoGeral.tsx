import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  Percent,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useURLState } from "@/hooks/useURLState";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Skeleton } from "@/components/ui/skeleton";
import { KPIBlock } from "@/components/dashboard/KPIBlock";
import { EvolucaoCompetenciaChart } from "@/components/dashboard/EvolucaoCompetenciaChart";
import { FluxoProjetadoChart } from "@/components/dashboard/FluxoProjetadoChart";
import { TopRanking, TopAtrasos } from "@/components/dashboard/TopRanking";
import { ProximosVencimentos } from "@/components/dashboard/ProximosVencimentos";
import { AlertasInteligentes } from "@/components/dashboard/AlertasInteligentes";
import { PeriodFilter, PeriodPreset, getDateRange } from "@/components/PeriodFilter";
import {
  useFinanceiroKPIs,
  useSerieMensal,
  useFluxoProjetado,
  useSaldosPorConta,
  useProximosVencimentos,
  useTopRankings,
  useContasBancariasOptions,
} from "@/hooks/useFinanceiroDashboard";

const toISODate = (d: Date | null) => (d ? format(d, "yyyy-MM-dd") : null);

export default function FinanceiroVisaoGeral() {
  const navigate = useNavigate();
  const [contaFiltro, setContaFiltro] = useURLState<string>("conta", "__all__");
  const [periodPreset, setPeriodPreset] = usePersistedState<PeriodPreset>(
    "dashboard_financeiro_period",
    "month"
  );
  const [customRange, setCustomRange] = usePersistedState<{ start: string | null; end: string | null }>(
    "dashboard_financeiro_period_custom",
    { start: null, end: null }
  );

  // Atualiza status atrasado uma vez ao entrar
  useEffect(() => {
    supabase.rpc("update_status_atrasado" as any).then(() => {});
  }, []);

  const contaId = contaFiltro === "__all__" ? null : contaFiltro;

  const { startDate, endDate } = useMemo(
    () => getDateRange(periodPreset, customRange),
    [periodPreset, customRange]
  );
  const inicioISO = toISODate(startDate);
  const fimISO = toISODate(endDate);

  const kpisQ = useFinanceiroKPIs(inicioISO, fimISO);
  const serieQ = useSerieMensal(12, contaId);
  const fluxoQ = useFluxoProjetado(90, contaId);
  const saldosQ = useSaldosPorConta();
  const vencQ = useProximosVencimentos(7);
  const topQ = useTopRankings(inicioISO, fimISO);
  const contasOptQ = useContasBancariasOptions();

  const k = kpisQ.data;
  const hasPeriod = inicioISO !== null && fimISO !== null;
  const periodLabel = hasPeriod ? "vs período anterior" : "Sem comparativo";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada por competência — exclui transferências entre contas.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter
            preset={periodPreset}
            customRange={customRange}
            onPresetChange={setPeriodPreset}
            onCustomRangeChange={setCustomRange}
          />
          <span className="text-xs text-muted-foreground ml-2">Conta:</span>
          <Select value={contaFiltro} onValueChange={setContaFiltro}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as contas</SelectItem>
              {(contasOptQ.data || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ============ Resultado do período ============ */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resultado do período
          </h2>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>

        {kpisQ.isLoading || !k ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[110px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIBlock
              title="Receita realizada"
              value={k.mes_receita}
              icon={TrendingUp}
              variant="success"
              comparePrev={hasPeriod ? k.mes_anterior_receita : undefined}
              subtitle="Por competência"
            />
            <KPIBlock
              title="Despesa realizada"
              value={k.mes_despesa}
              icon={TrendingDown}
              variant="danger"
              comparePrev={hasPeriod ? k.mes_anterior_despesa : undefined}
              subtitle="Por competência"
            />
            <KPIBlock
              title="Resultado"
              value={k.mes_resultado}
              icon={Activity}
              variant="dynamic"
              comparePrev={hasPeriod ? k.mes_anterior_resultado : undefined}
              subtitle={hasPeriod ? `Anterior: ${formatCurrency(k.mes_anterior_resultado)}` : "Receita − Despesa"}
            />
            <KPIBlock
              title="Margem"
              value={k.mes_margem_percent}
              icon={Percent}
              variant={k.mes_margem_percent >= 0 ? "success" : "danger"}
              isCurrency={false}
              subtitle={`${k.mes_margem_percent.toFixed(1)}%`}
            />
          </div>
        )}

        {/* Top 5 do período */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopRanking
            title="Top 5 Categorias de Despesa"
            items={topQ.data?.topCategorias || []}
            barColor="danger"
          />
          <TopRanking
            title="Top 5 Clientes — Receita Recebida"
            items={topQ.data?.topClientes || []}
            barColor="success"
          />
        </div>
      </div>

      {/* ============ Situação atual (não filtrada por período) ============ */}
      <div className="space-y-4 pt-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Situação atual
          </h2>
          <span className="text-xs text-muted-foreground">Fotografia agora · projeção futura</span>
        </div>

        {kpisQ.isLoading || !k ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[110px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIBlock
              title="Saldo total em contas"
              value={k.saldo_total}
              icon={Wallet}
              variant={k.saldo_total >= 0 ? "default" : "danger"}
            />
            <KPIBlock
              title="A receber"
              value={k.total_a_receber}
              icon={ArrowUpCircle}
              variant="success"
              badgeText={
                k.receber_vencido > 0
                  ? `${formatCurrency(k.receber_vencido)} vencido`
                  : undefined
              }
              badgeVariant="danger"
            />
            <KPIBlock
              title="A pagar"
              value={k.total_a_pagar}
              icon={ArrowDownCircle}
              variant="danger"
              badgeText={
                k.pagar_vencido > 0
                  ? `${formatCurrency(k.pagar_vencido)} vencido`
                  : undefined
              }
              badgeVariant="danger"
            />
            <KPIBlock
              title="Inadimplência"
              value={k.inadimplencia_percent}
              icon={AlertCircle}
              variant={
                k.inadimplencia_percent > 10
                  ? "danger"
                  : k.inadimplencia_percent > 0
                  ? "neutral"
                  : "success"
              }
              isCurrency={false}
              subtitle={`${k.inadimplencia_percent.toFixed(1)}% do faturado no mês`}
            />
          </div>
        )}

        {/* Alertas inteligentes */}
        {k && fluxoQ.data && <AlertasInteligentes kpis={k} fluxo={fluxoQ.data} />}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {serieQ.isLoading ? (
            <Skeleton className="h-[380px]" />
          ) : (
            <EvolucaoCompetenciaChart data={serieQ.data || []} />
          )}
          {fluxoQ.isLoading ? (
            <Skeleton className="h-[380px]" />
          ) : (
            <FluxoProjetadoChart data={fluxoQ.data || []} />
          )}
        </div>

        {/* Top atrasos + listas operacionais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopAtrasos items={topQ.data?.topAtrasos || []} />
          {vencQ.isLoading ? (
            <Skeleton className="h-[280px]" />
          ) : (
            <ProximosVencimentos items={vencQ.data || []} />
          )}
        </div>

        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Saldo por Conta Bancária</CardTitle>
            <button
              onClick={() => navigate("/financeiro/extratos")}
              className="text-xs text-accent hover:underline"
            >
              Ver extratos →
            </button>
          </CardHeader>
          <CardContent>
            {saldosQ.isLoading ? (
              <Skeleton className="h-[120px]" />
            ) : (saldosQ.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma conta bancária cadastrada
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(saldosQ.data || []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/financeiro/extratos?conta=${c.id}`)}
                    className="text-left p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {c.banco || "—"} • {c.tipo || "corrente"}
                    </p>
                    <span
                      className={`text-base font-bold tabular-nums ${
                        c.saldo < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {formatCurrency(c.saldo)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
