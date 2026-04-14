import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "dynamic";
  change?: number;
  isCurrency?: boolean;
  badgeText?: string;
  badgeVariant?: "warning" | "danger";
}

export function KPICard({ title, value, icon: Icon, variant = "default", change, isCurrency = true, badgeText, badgeVariant = "danger" }: KPICardProps) {
  const dynamicVariant = variant === "dynamic" ? (value >= 0 ? "success" : "danger") : variant;

  const iconColors: Record<string, string> = {
    default: "text-accent",
    success: "text-success",
    danger: "text-destructive",
  };

  return (
    <Card className="animate-fade-slide">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-5 w-5", iconColors[dynamicVariant] || "text-accent")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-mono", dynamicVariant === "danger" && "text-destructive", dynamicVariant === "success" && "text-success")}>
          {isCurrency ? formatCurrency(value) : value}
        </div>
        {badgeText && (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs mt-1.5 px-2 py-0.5 rounded-full font-medium",
            badgeVariant === "danger" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
          )}>
            {badgeText}
          </span>
        )}
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", change >= 0 ? "text-success" : "text-destructive")}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{change >= 0 ? "+" : ""}{change.toFixed(1)}% vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}