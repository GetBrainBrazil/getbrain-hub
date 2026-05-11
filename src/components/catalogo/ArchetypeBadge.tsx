import { Badge } from "@/components/ui/badge";
import { CatalogArchetype, ARCHETYPE_LABEL } from "@/hooks/catalogo/useCatalog";
import { cn } from "@/lib/utils";

const COLORS: Record<CatalogArchetype, string> = {
  one_shot: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  with_maintenance: "bg-accent/15 text-accent border-accent/30",
  saas: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  hybrid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  aggregator: "bg-transparent text-muted-foreground border-border",
};

export function ArchetypeBadge({
  archetype,
  className,
}: {
  archetype: CatalogArchetype;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium text-[10px]", COLORS[archetype], className)}>
      {ARCHETYPE_LABEL[archetype]}
    </Badge>
  );
}
