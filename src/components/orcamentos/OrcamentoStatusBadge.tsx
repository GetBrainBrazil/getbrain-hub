import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aceito: "Aceito",
  recusado: "Recusado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<ProposalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviado: "bg-primary/15 text-primary border-primary/30",
  aceito: "bg-success/15 text-success border-success/30",
  recusado: "bg-destructive/15 text-destructive border-destructive/30",
  expirado: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  cancelado: "bg-muted text-muted-foreground border-border",
};

export function OrcamentoStatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", STATUS_CLASS[status])}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
