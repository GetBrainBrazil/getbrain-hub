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

interface Props {
  proposal: ProposalRow;
  onClick: () => void;
  /** Quando true, renderiza estático (sem dnd) — usado pelo DragOverlay */
  overlay?: boolean;
}

export function OrcamentoKanbanCard({ proposal, onClick, overlay }: Props) {
  const total = calculateScopeTotal(proposal.scope_items);
  const eff = effectiveStatus(proposal.status, proposal.valid_until);
  const monthly = proposal.maintenance_monthly_value || 0;

  // Modo overlay: card estático (sem hooks de drag) renderizado pelo DragOverlay
  if (overlay) {
    return (
      <Card className="p-3 space-y-2 shadow-lg border-primary/40 bg-card cursor-grabbing select-none rotate-2">
        <CardBody
          proposal={proposal}
          total={total}
          eff={eff}
          monthly={monthly}
        />
      </Card>
    );
  }

  return <DraggableCard proposal={proposal} onClick={onClick} total={total} eff={eff} monthly={monthly} />;
}

function DraggableCard({
  proposal,
  onClick,
  total,
  eff,
  monthly,
}: {
  proposal: ProposalRow;
  onClick: () => void;
  total: number;
  eff: ReturnType<typeof effectiveStatus>;
  monthly: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: proposal.id,
    data: { proposal },
  });

  // IMPORTANTE: não aplicar transform no card original — o DragOverlay já
  // renderiza um clone que segue o cursor. Aqui apenas esmaecemos.
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.35 : 1,
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
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className="p-3 space-y-2 hover:border-primary/50 hover:shadow-sm transition-shadow select-none"
    >
      <CardBody
        proposal={proposal}
        total={total}
        eff={eff}
        monthly={monthly}
      />
    </Card>
  );
}

function CardBody({
  proposal,
  total,
  eff,
  monthly,
}: {
  proposal: ProposalRow;
  total: number;
  eff: ReturnType<typeof effectiveStatus>;
  monthly: number;
}) {
  return (
    <>
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
        {eff === "convertida" ? (
          <>
            <FileSignature className="h-3 w-3 text-success" />
            <span>Aceito</span>
          </>
        ) : eff === "expirada" ? (
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
    </>
  );
}
