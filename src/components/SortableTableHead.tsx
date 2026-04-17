import * as React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;
export type SortConfig = { key: string | null; direction: SortDirection };

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (config: SortConfig) => void;
  className?: string;
  extra?: React.ReactNode;
}

export function SortableTableHead({ label, sortKey, currentSort, onSort, className, extra }: SortableTableHeadProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  function cycle() {
    if (!isActive || direction === null) {
      onSort({ key: sortKey, direction: "asc" });
    } else if (direction === "asc") {
      onSort({ key: sortKey, direction: "desc" });
    } else {
      onSort({ key: null, direction: null });
    }
  }

  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <TableHead className={cn("cursor-pointer select-none", className)} onClick={cycle}>
      <div className="flex items-center gap-1">
        {label}
        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-foreground" : "text-muted-foreground/50")} />
        {extra && <span onClick={(e) => e.stopPropagation()} className="ml-1 inline-flex">{extra}</span>}
      </div>
    </TableHead>
  );
}

export function applySorting<T extends Record<string, any>>(items: T[], sort: SortConfig): T[] {
  if (!sort.key || !sort.direction) return items;
  const { key, direction } = sort;
  const mul = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    let va = a[key];
    let vb = b[key];

    // Nested object (e.g. fornecedores.nome, clientes.nome, categorias.nome)
    if (va && typeof va === "object" && "nome" in va) va = va.nome;
    if (vb && typeof vb === "object" && "nome" in vb) vb = vb.nome;

    // Nulls last
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    // Numbers
    if (typeof va === "number" || (typeof va === "string" && !isNaN(Number(va)) && key.includes("valor"))) {
      return (Number(va) - Number(vb)) * mul;
    }

    // Dates (yyyy-mm-dd strings)
    if (typeof va === "string" && /^\d{4}-\d{2}-\d{2}/.test(va)) {
      return (new Date(va).getTime() - new Date(vb).getTime()) * mul;
    }

    // Strings
    return String(va).localeCompare(String(vb), "pt-BR") * mul;
  });
}
