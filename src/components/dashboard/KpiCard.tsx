/**
 * KpiCard — card compacto para a linha de KPIs macro do dashboard.
 * Valor + delta colorido + sparkline opcional.
 *
 * Direção: pra "rework", "cycle", "blocked", menor é melhor (passa goodWhen="down").
 * Pra velocity, taxa-no-prazo, etc., maior é melhor (default goodWhen="up").
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SparklineMini } from "./SparklineMini";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number | null; // % vs período anterior
  goodWhen?: "up" | "down";
  sparkData?: number[];
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  goodWhen = "up",
  sparkData,
  hint,
  loading,
  onClick,
}: KpiCardProps) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const isFlat = hasDelta && Math.abs(delta!) < 5;
  const isGood = hasDelta && !isFlat && (goodWhen === "up" ? delta! > 0 : delta! < 0);
  const isBad = hasDelta && !isFlat && !isGood;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:border-accent/40 hover:bg-accent/5",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {hasDelta && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
                isGood && "text-emerald-500",
                isBad && "text-destructive",
                isFlat && "text-muted-foreground",
              )}
            >
              {isFlat ? (
                <Minus className="h-3 w-3" />
              ) : delta! > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta! > 0 ? "+" : ""}
              {delta!.toFixed(0)}%
            </span>
          )}
          {!hasDelta && (
            <span className="text-[11px] text-muted-foreground/60">—</span>
          )}
        </div>

        <div className="mt-1.5 flex items-baseline gap-1">
          {loading ? (
            <div className="h-7 w-16 animate-pulse rounded bg-muted/40" />
          ) : (
            <>
              <span className="text-2xl font-bold tabular-nums">{value}</span>
              {unit && (
                <span className="text-xs text-muted-foreground">{unit}</span>
              )}
            </>
          )}
        </div>

        {hint && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        )}

        {sparkData && sparkData.length > 1 && (
          <div className="mt-2 h-8">
            <SparklineMini data={sparkData} positive={isGood ?? true} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
