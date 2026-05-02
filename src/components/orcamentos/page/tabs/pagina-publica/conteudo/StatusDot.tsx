/**
 * Indicador de status à direita de cada item da sidebar do CMS.
 * - filled: ✓ verde — preenchido
 * - empty:  • âmbar — vazio (chama atenção)
 * - optional: — cinza — opcional vazio
 * - dirty:  ● cyan pulsando — alterações não salvas
 * - count:  (N) — coleção
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type FillStatus = "filled" | "empty" | "optional" | "dirty";

interface Props {
  status: FillStatus;
  count?: number;
  className?: string;
}

export function StatusDot({ status, count, className }: Props) {
  if (typeof count === "number" && count > 0) {
    return (
      <span className={cn("text-[10px] font-mono text-muted-foreground tabular-nums", className)}>
        {count}
      </span>
    );
  }
  if (status === "dirty") {
    return (
      <span className={cn("h-1.5 w-1.5 rounded-full bg-accent animate-pulse", className)} title="Alterações não salvas" />
    );
  }
  if (status === "filled") {
    return (
      <Check className={cn("h-3 w-3 text-emerald-500", className)} />
    );
  }
  if (status === "empty") {
    return (
      <span className={cn("h-1.5 w-1.5 rounded-full bg-amber-500", className)} title="Vazio" />
    );
  }
  return (
    <span className={cn("text-muted-foreground/40 text-xs leading-none", className)}>—</span>
  );
}

/** Heurística simples para determinar o status de um campo dado um valor. */
export function computeFillStatus(value: any, required = false): FillStatus {
  const isEmpty =
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "number" && value === 0);
  if (isEmpty) return required ? "empty" : "optional";
  return "filled";
}
