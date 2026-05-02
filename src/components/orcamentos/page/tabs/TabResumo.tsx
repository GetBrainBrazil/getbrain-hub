/**
 * Tab "Resumo" — KPIs + visão geral + ações rápidas.
 *
 * Reutiliza o componente AbaResumo do drawer (que já tem KPIs + lista resumida
 * de itens) e enriquece com informações de proposta web e atalhos.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Link2, FileText, Activity } from "lucide-react";
import { AbaResumo } from "@/components/orcamentos/abas/AbaResumo";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import {
  effectiveStatus,
  formatBRL,
  calculateScopeTotal,
} from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposal: ProposalDetail;
  livePreview: any;
  onPreviewAsClient: () => void;
  onCopyLink: () => void;
  onOpenTracking: () => void;
  onPreviewPdf: () => void;
  onGoToTab: (tab: string) => void;
}

export function TabResumo({
  proposal,
  livePreview,
  onPreviewAsClient,
  onCopyLink,
  onOpenTracking,
  onPreviewPdf,
  onGoToTab,
}: Props) {
  const merged = { ...proposal, ...livePreview };
  const eff = effectiveStatus(proposal.status as any, livePreview.valid_until);
  const total = calculateScopeTotal(livePreview.scope_items || []);
  const monthly = livePreview.maintenance_monthly_value || 0;
  const hasLink = !!(proposal as any).access_token;

  return (
    <div className="space-y-4">
      {/* Banner de status terminal/expirada */}
      {(eff === "convertida" || eff === "recusada" || eff === "expirada") && (
        <Card
          className={
            eff === "convertida"
              ? "p-3 border-success/30 bg-success/5"
              : eff === "expirada"
                ? "p-3 border-amber-500/30 bg-amber-500/5"
                : "p-3 border-destructive/30 bg-destructive/5"
          }
        >
          <div className="flex items-center gap-2 text-sm">
            <OrcamentoStatusBadge status={eff} />
            <span className="text-foreground/80">
              {eff === "convertida" && "Esta proposta foi aceita e virou projeto."}
              {eff === "recusada" && "Esta proposta foi recusada pelo cliente."}
              {eff === "expirada" &&
                "A validade venceu — estenda a data em Configurações para reativar o link."}
            </span>
          </div>
        </Card>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start"
          onClick={onPreviewAsClient}
          disabled={!hasLink}
        >
          <Eye className="h-4 w-4 mr-2 text-accent" /> Ver como cliente
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start"
          onClick={onCopyLink}
          disabled={!hasLink}
        >
          <Link2 className="h-4 w-4 mr-2 text-accent" /> Copiar link
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start"
          onClick={onPreviewPdf}
        >
          <FileText className="h-4 w-4 mr-2 text-accent" /> Pré-visualizar PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start"
          onClick={onOpenTracking}
        >
          <Activity className="h-4 w-4 mr-2 text-accent" /> Tracking
        </Button>
      </div>

      {/* Cartão principal de KPIs (reaproveitado) */}
      <AbaResumo proposal={merged as any} />

      {/* Atalhos rápidos para próximas tabs */}
      <Card className="p-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Próximos passos
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => onGoToTab("escopo")}>
            Editar escopo · {formatBRL(total)}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onGoToTab("conteudo_ia")}>
            Conteúdo IA
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onGoToTab("pagina_publica")}>
            Página pública
          </Button>
          {monthly > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onGoToTab("escopo")}>
              Manutenção {formatBRL(monthly)}/mês
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
