import { cn } from "@/lib/utils";
import type { TipoCategoria } from "@/lib/categorias-hierarchy";

const TIPO_META: Record<TipoCategoria, { label: string; dot: string }> = {
  receitas:       { label: "Receita",        dot: "bg-emerald-500" }, // #10B981
  despesas:       { label: "Despesa",        dot: "bg-red-500" },     // #EF4444
  impostos:       { label: "Impostos",       dot: "bg-amber-500" },   // #F59E0B
  retirada:       { label: "Retirada",       dot: "bg-violet-500" },  // #8B5CF6
  transferencias: { label: "Transferências", dot: "bg-sky-500" },     // #0EA5E9
};

interface TipoBadgeProps {
  tipo: TipoCategoria | string;
  className?: string;
}

/**
 * Sober, neutral badge for category types.
 * Background: light gray, text: dark gray, with a small colored dot
 * to differentiate the type without visual noise.
 */
export function TipoBadge({ tipo, className }: TipoBadgeProps) {
  const meta = TIPO_META[tipo as TipoCategoria] ?? TIPO_META.despesas;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
        "bg-slate-100 text-slate-600 border border-slate-200",
        "dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
