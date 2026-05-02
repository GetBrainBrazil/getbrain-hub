/**
 * Header sticky da página `/financeiro/orcamentos/:id/editar`.
 *
 * - Voltar para listagem (botão).
 * - Código + status badge + template.
 * - Subtítulo dinâmico: template_label + cliente + link clicável pro deal vinculado.
 * - Indicador de save: "Salvo às HH:mm" / "Salvando…" / "• não salvo".
 *
 * NÃO inclui pipeline nem tabs — esses ficam logo abaixo no orquestrador,
 * mas dentro do mesmo container sticky para se moverem juntos.
 */
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import { getTemplate } from "@/lib/orcamentos/templates";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposal: ProposalDetail;
  effectiveStatus: ProposalStatus;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

export function ProposalPageHeader({
  proposal,
  effectiveStatus,
  isSaving,
  isDirty,
  lastSavedAt,
}: Props) {
  const navigate = useNavigate();
  const templateLabel = getTemplate((proposal as any).template_key).config.label;
  const clientName = proposal.client_company_name || "Cliente sem nome";
  const deal = (proposal as any).deal as
    | { id: string; code: string; title: string; stage: string }
    | null
    | undefined;

  const savedLabel = lastSavedAt
    ? `Salvo às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur px-3 sm:px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/financeiro/orcamentos")}
          className="h-8 gap-1.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="font-mono font-semibold text-sm">{proposal.code}</span>
          <OrcamentoStatusBadge status={effectiveStatus} />
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          {isSaving ? (
            <span className="text-amber-500 inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
            </span>
          ) : isDirty ? (
            <span className="text-amber-500">• não salvo</span>
          ) : (
            <span>{savedLabel}</span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground min-w-0">
        <span className="font-medium text-foreground/80 truncate">{templateLabel}</span>
        <span aria-hidden>·</span>
        <span className="truncate max-w-[280px]">{clientName}</span>
        {deal && (
          <>
            <span aria-hidden>·</span>
            <Link
              to={`/crm/deals/${deal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1 font-mono"
              title={deal.title}
            >
              {deal.code}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
