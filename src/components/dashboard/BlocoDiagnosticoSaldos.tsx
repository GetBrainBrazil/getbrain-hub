/**
 * BlocoDiagnosticoSaldos — bloco somente-leitura no Dashboard Financeiro.
 * Mostra rapidamente onde estão as inconsistências de saldo por conta:
 *  - saldo inicial zerado;
 *  - lançamentos pagos concentrados em uma única data (importação em lote);
 *  - saldo negativo;
 *  - taxa de conciliação;
 *  - peso de transferências internas.
 */
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useFinanceAudit, type AccountAuditRow } from "@/hooks/finance/useFinanceAudit";

function formatDateBR(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Issue = { kind: "danger" | "warning" | "info"; label: string };

function detectIssues(row: AccountAuditRow): Issue[] {
  const issues: Issue[] = [];
  if (row.saldo_inicial === 0) {
    issues.push({
      kind: "warning",
      label: "Saldo inicial não informado (R$ 0,00)",
    });
  }
  if (row.saldo_calculado < 0) {
    issues.push({
      kind: "danger",
      label: "Saldo calculado negativo",
    });
  }
  if (row.bulk_count >= 10) {
    issues.push({
      kind: "warning",
      label: `${row.bulk_count} pagamentos concentrados em ${formatDateBR(row.bulk_date)}`,
    });
  }
  const conciliacaoPct =
    row.movs_pagas > 0 ? (row.movs_conciliadas / row.movs_pagas) * 100 : 0;
  if (row.movs_pagas > 0 && conciliacaoPct < 50) {
    issues.push({
      kind: "info",
      label: `Apenas ${conciliacaoPct.toFixed(0)}% das movimentações pagas estão conciliadas`,
    });
  }
  return issues;
}

export function BlocoDiagnosticoSaldos() {
  const navigate = useNavigate();
  const { data, isLoading } = useFinanceAudit();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Diagnóstico de saldos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];
  const totalIssues = rows.reduce(
    (s, r) => s + detectIssues(r).filter((i) => i.kind !== "info").length,
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Diagnóstico de saldos
              {totalIssues === 0 ? (
                <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40">
                  <CheckCircle2 className="h-3 w-3" /> tudo certo
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-destructive border-destructive/40">
                  <AlertTriangle className="h-3 w-3" /> {totalIssues} ponto(s) de atenção
                </Badge>
              )}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1">
              Por que o saldo do dashboard pode estar diferente do extrato bancário.
              Apenas leitura — nada é alterado.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const issues = detectIssues(r);
          const conciliacaoPct =
            r.movs_pagas > 0 ? (r.movs_conciliadas / r.movs_pagas) * 100 : 0;
          return (
            <div
              key={r.conta_id}
              className={cn(
                "rounded-lg border bg-card p-3",
                r.saldo_calculado < 0
                  ? "border-destructive/40"
                  : issues.length > 0
                    ? "border-amber-500/30"
                    : "border-border",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.conta_nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.banco ?? "—"} · {r.movs_pagas} pagas · {conciliacaoPct.toFixed(0)}% conciliadas
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-base font-semibold tabular-nums",
                      r.saldo_calculado < 0 && "text-destructive",
                    )}
                  >
                    {formatCurrency(r.saldo_calculado)}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    inicial: {formatCurrency(r.saldo_inicial)}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Receitas pagas</p>
                  <p className="tabular-nums font-medium text-emerald-600">
                    +{formatCurrency(r.total_receitas_pagas)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Despesas pagas</p>
                  <p className="tabular-nums font-medium text-destructive">
                    −{formatCurrency(r.total_despesas_pagas)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transferências</p>
                  <p className="tabular-nums font-medium">
                    {formatCurrency(r.net_transferencias)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Último pagamento</p>
                  <p className="tabular-nums font-medium">
                    {formatDateBR(r.ultima_data_pagamento)}
                  </p>
                </div>
              </div>

              {issues.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {issues.map((i, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]",
                        i.kind === "danger" &&
                          "border-destructive/40 text-destructive bg-destructive/5",
                        i.kind === "warning" &&
                          "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                        i.kind === "info" &&
                          "border-border text-muted-foreground bg-muted/40",
                      )}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {i.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => navigate(`/financeiro/extratos?conta=${r.conta_id}`)}
                >
                  Ver extrato
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          );
        })}

        <div className="rounded-md bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <p>
            <strong>Como o saldo é calculado:</strong> saldo inicial da conta + receitas pagas − despesas pagas, considerando apenas movimentações com status “pago” e data de pagamento até hoje.
          </p>
          <p>
            <strong>Causas comuns de divergência:</strong> saldo inicial zerado, datas de pagamento incorretas (ex.: importação em lote em uma única data), lançamentos faltando, lançamentos duplicados, e transferências internas sem o lançamento equivalente na outra conta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
