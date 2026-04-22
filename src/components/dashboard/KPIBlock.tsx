import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KPIBlockProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "neutral" | "dynamic";
  comparePrev?: number;
  badgeText?: string;
  badgeVariant?: "warning" | "danger";
  subtitle?: string;
  isCurrency?: boolean;
}

export function KPIBlock({
  title,
  value,
  icon: Icon,
  variant = "default",
  comparePrev,
  badgeText,
  badgeVariant = "danger",
  subtitle,
  isCurrency = true,
}: KPIBlockProps) {
  const dyn = variant === "dynamic" ? (value >= 0 ? "success" : "danger") : variant;
  const iconClass =
    dyn === "success"
      ? "text-success"
      : dyn === "danger"
      ? "text-destructive"
      : dyn === "neutral"
      ? "text-muted-foreground"
      : "text-accent";

  const valueClass =
    dyn === "danger" ? "text-destructive" : dyn === "success" ? "text-success" : "";

  // Δ% vs mês anterior
  let delta: number | null = null;
  if (comparePrev !== undefined) {
    if (comparePrev === 0 && value === 0) delta = 0;
    else if (comparePrev === 0) delta = null;
    else delta = ((value - comparePrev) / Math.abs(comparePrev)) * 100;
  }

  return (
    <Card className="animate-fade-slide">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        <div className={cn("text-2xl font-bold leading-tight", valueClass)}>
          {isCurrency ? formatCurrency(value) : value}
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {badgeText && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] mt-2 px-2 py-0.5 rounded-full font-medium",
              badgeVariant === "danger"
                ? "bg-destructive/15 text-destructive"
                : "bg-warning/15 text-warning"
            )}
          >
            {badgeText}
          </span>
        )}
        {delta !== null && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] mt-1.5 font-medium",
              delta > 0
                ? dyn === "danger"
                  ? "text-destructive"
                  : "text-success"
                : delta < 0
                ? dyn === "danger"
                  ? "text-success"
                  : "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}% vs mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
