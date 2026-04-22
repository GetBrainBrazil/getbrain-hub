import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RankingItem, AtrasoItem } from "@/hooks/useFinanceiroDashboard";
import { useNavigate } from "react-router-dom";

interface TopRankingProps {
  title: string;
  items: RankingItem[];
  emptyText?: string;
  barColor?: "success" | "danger" | "accent";
}

export function TopRanking({
  title,
  items,
  emptyText = "Sem dados no período.",
  barColor = "accent",
}: TopRankingProps) {
  const total = items.reduce((s, i) => s + i.valor, 0);
  const colorMap = {
    success: "bg-success",
    danger: "bg-destructive",
    accent: "bg-accent",
  };

  return (
    <Card className="animate-fade-slide">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
        ) : (
          <div className="space-y-3">
            {items.map((it, idx) => {
              const pct = total > 0 ? (it.valor / total) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{it.label}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(it.valor)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", colorMap[barColor])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{pct.toFixed(1)}% do total</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TopAtrasos({ items }: { items: AtrasoItem[] }) {
  const navigate = useNavigate();
  return (
    <Card className="animate-fade-slide">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Top 5 Atrasos</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum lançamento vencido. 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => navigate(`/financeiro/movimentacoes/${it.id}`)}
                className="w-full text-left p-2.5 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{it.contraparte}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.descricao}</p>
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                    {it.dias_atraso} {it.dias_atraso === 1 ? "dia" : "dias"} em atraso
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums shrink-0",
                    it.tipo === "receita" ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(it.valor)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
