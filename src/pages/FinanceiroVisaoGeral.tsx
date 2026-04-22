import { useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { KPIBlock } from "@/components/dashboard/KPIBlock";
import { EvolucaoCompetenciaChart } from "@/components/dashboard/EvolucaoCompetenciaChart";
import { FluxoProjetadoChart } from "@/components/dashboard/FluxoProjetadoChart";
import { TopRanking, TopAtrasos } from "@/components/dashboard/TopRanking";
import { ProximosVencimentos } from "@/components/dashboard/ProximosVencimentos";
import { AlertasInteligentes } from "@/components/dashboard/AlertasInteligentes";
import {
  useFinanceiroKPIs,
  useSerieMensal,
  useFluxoProjetado,
  useSaldosPorConta,
  useProximosVencimentos,
  useTopRankings,
  useContasBancariasOptions,
} from "@/hooks/useFinanceiroDashboard";

export default function FinanceiroVisaoGeral() {
  const navigate = useNavigate();
  const [contaFiltro, setContaFiltro] = useURLState<string>("conta", "__all__");

  // Atualiza status atrasado uma vez ao entrar
  useEffect(() => {
    supabase.rpc("update_status_atrasado" as any).then(() => {});
  }, []);

  const contaId = contaFiltro === "__all__" ? null : contaFiltro;

  const kpisQ = useFinanceiroKPIs();
  const serieQ = useSerieMensal(12, contaId);
  const fluxoQ = useFluxoProjetado(90, contaId);
  const saldosQ = useSaldosPorConta();
  const vencQ = useProximosVencimentos(7);
  const topQ = useTopRankings();
  const contasOptQ = useContasBancariasOptions();

  const k = kpisQ.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada por competência — exclui transferências entre contas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Conta bancária:</span>
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

      {/* KPIs — Linha 1: Resultado do mês corrente vs anterior */}
      {kpisQ.isLoading || !k ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[110px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIBlock
              title="Receita do mês"
              value={k.mes_receita}
              icon={TrendingUp}
              variant="success"
              comparePrev={k.mes_anterior_receita}
              subtitle="Realizada por competência"
            />
            <KPIBlock
              title="Despesa do mês"
              value={k.mes_despesa}
              icon={TrendingDown}
              variant="danger"
              comparePrev={k.mes_anterior_despesa}
              subtitle="Realizada por competência"
            />
            <KPIBlock
              title="Resultado do mês"
              value={k.mes_resultado}
              icon={Activity}
              variant="dynamic"
              comparePrev={k.mes_anterior_resultado}
              subtitle={`Anterior: ${formatCurrency(k.mes_anterior_resultado)}`}
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

          {/* KPIs — Linha 2: Situação atual */}
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
        </>
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

      {/* Análises Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopRanking
          title="Top 5 Categorias de Despesa (mês)"
          items={topQ.data?.topCategorias || []}
          barColor="danger"
        />
        <TopRanking
          title="Top 5 Clientes — Receita Recebida (mês)"
          items={topQ.data?.topClientes || []}
          barColor="success"
        />
        <TopAtrasos items={topQ.data?.topAtrasos || []} />
      </div>

      {/* Listas operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {vencQ.isLoading ? (
          <Skeleton className="h-[280px]" />
        ) : (
          <ProximosVencimentos items={vencQ.data || []} />
        )}
      </div>
    </div>
  );
}
