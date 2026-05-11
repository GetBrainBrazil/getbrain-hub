import { Badge } from "@/components/ui/badge";
import { CatalogSaleType, SALE_TYPE_LABEL } from "@/hooks/catalogo/useCatalog";
import { cn } from "@/lib/utils";

const COLORS: Record<CatalogSaleType, string> = {
  saas: "bg-accent/15 text-accent border-accent/30",
  recurring_service: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  one_shot: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  custom: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export function SaleTypeBadge({ type, className }: { type: CatalogSaleType; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", COLORS[type], className)}>
      {SALE_TYPE_LABEL[type]}
    </Badge>
  );
}
