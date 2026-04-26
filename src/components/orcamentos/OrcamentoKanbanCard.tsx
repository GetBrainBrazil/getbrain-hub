import { Card } from "@/components/ui/card";
import { OrcamentoStatusBadge } from "./OrcamentoStatusBadge";
import { Calendar, FileSignature } from "lucide-react";
import {
  calculateScopeTotal,
  effectiveStatus,
  formatBRL,
  formatDateBR,
} from "@/lib/orcamentos/calculateTotal";
import type { ProposalRow } from "@/hooks/orcamentos/useProposals";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  proposal: ProposalRow;
  onClick: () => void;
}

export function OrcamentoKanbanCard({ proposal, onClick }: Props) {
  const total = calculateScopeTotal(proposal.scope_items);
  const eff = effectiveStatus(proposal.status, proposal.valid_until);
  const monthly = proposal.maintenance_monthly_value || 0;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: proposal.id,
      data: { proposal },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // não abre drawer durante drag
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className="p-3 space-y-2 hover:border-primary/50 hover:shadow-sm transition-all select-none"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold text-muted-foreground">
          {proposal.code}
        </span>
        <OrcamentoStatusBadge status={eff} />
      </div>
      <div className="text-sm font-medium leading-tight line-clamp-2">
        {proposal.client_company_name}
      </div>
      <div className="text-success font-bold text-sm tabular-nums">
        {formatBRL(total)}
      </div>
      {monthly > 0 && (
        <div className="text-[11px] text-primary tabular-nums">
          + {formatBRL(monthly)}/mês
        </div>
      )}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border pt-1.5">
        {eff === "aceito" ? (
          <>
            <FileSignature className="h-3 w-3 text-success" />
            <span>Aceito</span>
          </>
        ) : eff === "expirado" ? (
          <>
            <Calendar className="h-3 w-3 text-amber-500" />
            <span className="text-amber-500">
              Venceu em {formatDateBR(proposal.valid_until)}
            </span>
          </>
        ) : (
          <>
            <Calendar className="h-3 w-3" />
            <span>Válido até {formatDateBR(proposal.valid_until)}</span>
          </>
        )}
      </div>
    </Card>
  );
}
