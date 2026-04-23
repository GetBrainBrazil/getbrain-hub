/**
 * AlertBanner — linha condicional de alertas acionáveis.
 * Cada alerta abre o DrilldownDrawer com a lista de tasks.
 */
import {
  AlertTriangle,
  Lock,
  Flame,
  Clock,
  RotateCw,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertKind } from "@/hooks/dashboard/useDashboardAlerts";

interface AlertItem {
  kind: AlertKind | "reworked";
  count: number;
  label: string;
  severity: "danger" | "warning";
}

interface Props {
  items: AlertItem[];
  onOpen: (kind: AlertItem["kind"]) => void;
}

const ICONS: Record<AlertItem["kind"], React.ComponentType<{ className?: string }>> = {
  overdue: AlertTriangle,
  blocked_long: Lock,
  estimate_burst: Flame,
  stale_review: Clock,
  reworked: RotateCw,
  urgent_bug_open: Bug,
};

export function AlertBanner({ items, onOpen }: Props) {
  const visible = items.filter((i) => i.count > 0);
  if (!visible.length) return null;

  const hasDanger = visible.some((i) => i.severity === "danger");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2",
        hasDanger
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider",
          hasDanger ? "text-destructive" : "text-amber-500",
        )}
      >
        Alertas
      </span>
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <button
              key={item.kind}
              onClick={() => onOpen(item.kind)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                item.severity === "danger"
                  ? "border-destructive/40 bg-background text-destructive hover:bg-destructive/10"
                  : "border-amber-500/40 bg-background text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{item.count}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
