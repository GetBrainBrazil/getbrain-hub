import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, ArrowRight } from "lucide-react";
import { useProposalAuditLog } from "@/hooks/orcamentos/useProposalAuditLog";
import { OrcamentoStatusBadge } from "../OrcamentoStatusBadge";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposalId: string;
}

export function AbaHistorico({ proposalId }: Props) {
  const { data, isLoading } = useProposalAuditLog(proposalId);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
        Carregando histórico…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed space-y-2">
        <History className="h-8 w-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">
          Nenhuma movimentação registrada ainda. Mudanças de status aparecerão aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((entry) => {
        const dt = new Date(entry.created_at);
        const isStatusChange =
          entry.action === "status_change" ||
          entry.metadata?.kind === "proposal_status_change";
        const from = entry.changes?.status?.from as ProposalStatus | undefined;
        const to = entry.changes?.status?.to as ProposalStatus | undefined;
        const reason = entry.metadata?.reason as string | undefined;

        const initials = (entry.actor?.name || "?")
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase() ?? "")
          .join("");

        return (
          <Card key={entry.id} className="p-3 flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              {entry.actor?.avatar_url ? (
                <AvatarImage src={entry.actor.avatar_url} />
              ) : null}
              <AvatarFallback className="text-[10px]">{initials || "?"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">
                  {entry.actor?.name ?? "Usuário"}
                </span>
                {isStatusChange ? (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    mudou status
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {entry.action}
                  </Badge>
                )}
              </div>

              {isStatusChange && from && to ? (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <OrcamentoStatusBadge status={from} />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <OrcamentoStatusBadge status={to} />
                </div>
              ) : null}

              {reason ? (
                <p className="text-xs text-muted-foreground italic">
                  Motivo: {reason}
                </p>
              ) : null}

              <div className="text-[11px] text-muted-foreground tabular-nums">
                {dt.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
