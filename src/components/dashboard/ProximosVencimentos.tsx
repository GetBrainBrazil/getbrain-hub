import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProximoVencimento } from "@/hooks/useFinanceiroDashboard";
import { cn } from "@/lib/utils";

export function ProximosVencimentos({ items }: { items: ProximoVencimento[] }) {
  const navigate = useNavigate();
  return (
    <Card className="animate-fade-slide">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Próximos Vencimentos — 7 dias</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum vencimento nos próximos 7 dias.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-auto">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/financeiro/movimentacoes/${m.id}`)}
                className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {m.tipo === "receita" ? (
                  <ArrowUpCircle className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{m.descricao}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.contraparte ? `${m.contraparte} • ` : ""}
                    {formatDate(m.data_vencimento)}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums shrink-0",
                    m.tipo === "receita" ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(m.valor_previsto)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
