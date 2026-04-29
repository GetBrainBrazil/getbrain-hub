import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  normalizeProposalStatus,
  type ProposalStatus,
} from "@/lib/orcamentos/calculateTotal";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  interesse_manifestado: "Com interesse",
  expirada: "Expirada",
  convertida: "Convertida",
  recusada: "Recusada",
};

const STATUS_CLASS: Record<ProposalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviada: "bg-primary/15 text-primary border-primary/30",
  visualizada: "bg-accent/15 text-accent border-accent/30",
  interesse_manifestado: "bg-accent/20 text-accent border-accent/40",
  expirada: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  convertida: "bg-success/15 text-success border-success/30",
  recusada: "bg-destructive/15 text-destructive border-destructive/30",
};

export function OrcamentoStatusBadge({ status }: { status: ProposalStatus | string }) {
  const s = normalizeProposalStatus(status);
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", STATUS_CLASS[s])}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
      {STATUS_LABEL[s]}
    </Badge>
  );
}
