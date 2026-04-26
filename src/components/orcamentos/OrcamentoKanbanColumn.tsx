import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { formatBRL, calculateScopeTotal } from "@/lib/orcamentos/calculateTotal";
import type { ProposalRow } from "@/hooks/orcamentos/useProposals";
import { OrcamentoKanbanCard } from "./OrcamentoKanbanCard";

interface Props {
  id: string;
  label: string;
  rows: ProposalRow[];
  onCardClick: (row: ProposalRow) => void;
  /** True para "expirado" — visualmente sinaliza que não aceita drop */
  derived?: boolean;
  accentClass?: string;
}

export function OrcamentoKanbanColumn({
  id,
  label,
  rows,
  onCardClick,
  derived,
  accentClass,
}: Props) {
  const { isOver, setNodeRef } = useDroppable({ id, data: { columnId: id } });

  const totalSum = rows.reduce(
    (acc, r) => acc + calculateScopeTotal(r.scope_items),
    0
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-muted/20 min-w-[280px] w-[280px] h-full transition-colors",
        isOver && !derived && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
        isOver && derived && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      <header
        className={cn(
          "px-3 pt-3 pb-2 border-b border-border space-y-0.5 shrink-0",
          accentClass
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider">
            {label}
          </h3>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            ({rows.length})
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-muted-foreground">
          {formatBRL(totalSum)}
        </div>
        {derived && (
          <div className="text-[9px] uppercase tracking-wider text-amber-500/80">
            Derivado · sem drop
          </div>
        )}
      </header>
      <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/60 text-center py-6 italic">
            Vazio
          </div>
        ) : (
          rows.map((r) => (
            <OrcamentoKanbanCard
              key={r.id}
              proposal={r}
              onClick={() => onCardClick(r)}
            />
          ))
        )}
      </div>
    </div>
  );
}
