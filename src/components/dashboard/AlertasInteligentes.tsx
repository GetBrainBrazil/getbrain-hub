import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { DashboardKPIs, FluxoProjetadoRow } from "@/hooks/useFinanceiroDashboard";

interface Props {
  kpis: DashboardKPIs;
  fluxo: FluxoProjetadoRow[];
}

export function AlertasInteligentes({ kpis, fluxo }: Props) {
  const alertas: { tipo: "danger" | "warning" | "info"; texto: string; valor?: string }[] = [];

  // Saldo negativo projetado
  const primeiroNegativo = fluxo.find((f) => f.saldo_acumulado < 0);
  if (primeiroNegativo) {
    const dias = Math.floor(
      (new Date(primeiroNegativo.dia).getTime() - Date.now()) / 86400000
    );
    alertas.push({
      tipo: "danger",
      texto: `Saldo projetado fica negativo em ${dias} dia(s)`,
      valor: formatCurrency(primeiroNegativo.saldo_acumulado),
    });
  }

  // Inadimplência alta
  if (kpis.inadimplencia_percent > 10) {
    alertas.push({
      tipo: "warning",
      texto: `Inadimplência alta: ${kpis.inadimplencia_percent.toFixed(1)}% do faturamento do mês`,
      valor: formatCurrency(kpis.receber_vencido),
    });
  }

  // Despesas vencidas
  if (kpis.qtd_pagar_vencido > 0) {
    alertas.push({
      tipo: "danger",
      texto: `${kpis.qtd_pagar_vencido} conta(s) a pagar em atraso`,
      valor: formatCurrency(kpis.pagar_vencido),
    });
  }

  // Receitas vencidas
  if (kpis.qtd_receber_vencido > 0) {
    alertas.push({
      tipo: "warning",
      texto: `${kpis.qtd_receber_vencido} conta(s) a receber em atraso`,
      valor: formatCurrency(kpis.receber_vencido),
    });
  }

  // Resultado pior que mês anterior
  if (
    kpis.mes_anterior_resultado > 0 &&
    kpis.mes_resultado < kpis.mes_anterior_resultado * 0.7
  ) {
    alertas.push({
      tipo: "warning",
      texto: "Resultado deste mês está significativamente abaixo do mês anterior",
    });
  }

  if (alertas.length === 0) {
    return (
      <Card className="border-l-4 border-l-success animate-fade-slide">
        <CardContent className="py-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-success" />
          <p className="text-sm">Nenhum alerta no momento. Operação saudável.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-warning animate-fade-slide">
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <p className="text-sm font-semibold">
            Alertas inteligentes ({alertas.length})
          </p>
        </div>
        <div className="space-y-1.5">
          {alertas.map((a, i) => {
            const bg =
              a.tipo === "danger"
                ? "bg-destructive/5"
                : a.tipo === "warning"
                ? "bg-warning/5"
                : "bg-muted/40";
            const Icon = a.tipo === "danger" ? TrendingDown : AlertTriangle;
            const iconColor =
              a.tipo === "danger" ? "text-destructive" : "text-warning";
            return (
              <div
                key={i}
                className={`flex items-center justify-between rounded-md px-3 py-2 ${bg}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                  <span className="text-sm truncate">{a.texto}</span>
                </div>
                {a.valor && (
                  <span className="text-sm font-bold tabular-nums shrink-0 ml-2">
                    {a.valor}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
