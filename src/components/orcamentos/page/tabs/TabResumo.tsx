/**
 * Tab "Resumo" — KPIs + ações rápidas + checklist de prontidão.
 *
 * Princípio: nunca deixar um botão "morto". Quando uma ação depende de envio
 * (link público), o botão fica funcional e abre o atalho de geração/envio
 * apropriado em vez de só ficar `disabled` mudo.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Link2,
  FileText,
  Activity,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Send,
} from "lucide-react";
import { AbaResumo } from "@/components/orcamentos/abas/AbaResumo";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import {
  effectiveStatus,
  formatBRL,
  calculateScopeTotal,
} from "@/lib/orcamentos/calculateTotal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  proposal: ProposalDetail;
  livePreview: any;
  onPreviewAsClient: () => void;
  onCopyLink: () => void;
  onOpenTracking: () => void;
  onPreviewPdf: () => void;
  onOpenSendDialog: () => void;
  onGoToTab: (tab: string) => void;
}

export function TabResumo({
  proposal,
  livePreview,
  onPreviewAsClient,
  onCopyLink,
  onOpenTracking,
  onPreviewPdf,
  onOpenSendDialog,
  onGoToTab,
}: Props) {
  const merged = { ...proposal, ...livePreview };
  const eff = effectiveStatus(proposal.status as any, livePreview.valid_until);
  const total = calculateScopeTotal(livePreview.scope_items || []);
  const monthly = livePreview.maintenance_monthly_value || 0;
  const hasLink = !!(proposal as any).access_token;
  const isDraft = proposal.status === "rascunho";

  // Checklist de prontidão para envio
  const checks = [
    { key: "client", label: "Cliente preenchido", ok: !!(livePreview.client_company_name?.trim()), tab: "cliente" },
    { key: "items", label: "Pelo menos 1 item de escopo", ok: (livePreview.scope_items?.length || 0) > 0, tab: "escopo" },
    { key: "valid", label: "Data de validade definida", ok: !!livePreview.valid_until, tab: "configuracoes" },
  ];
  const missing = checks.filter((c) => !c.ok);
  const ready = missing.length === 0;

  function handleProtectedAction(label: string) {
    toast.info(`${label} fica disponível depois de gerar e enviar a proposta.`, {
      action: ready
        ? { label: "Gerar e enviar", onClick: onOpenSendDialog }
        : { label: "Ver pendências", onClick: () => onGoToTab(missing[0]?.tab || "escopo") },
    });
  }

  return (
    <div className="space-y-4 animate-fade-in">
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

      {/* Checklist + CTA de envio quando rascunho */}
      {isDraft && (
        <Card className={cn(
          "p-4",
          ready
            ? "border-accent/30 bg-accent/5"
            : "border-amber-500/30 bg-amber-500/5"
        )}>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 mb-2">
                {ready ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <h3 className="text-sm font-semibold">
                  {ready
                    ? "Pronto para enviar"
                    : `Faltam ${missing.length} ${missing.length === 1 ? "item" : "itens"} antes de enviar`}
                </h3>
              </div>
              <ul className="space-y-1.5">
                {checks.map((c) => (
                  <li key={c.key} className="flex items-center gap-2 text-xs">
                    {c.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={c.ok ? "text-foreground/70" : "text-foreground"}>
                      {c.label}
                    </span>
                    {!c.ok && (
                      <button
                        type="button"
                        onClick={() => onGoToTab(c.tab)}
                        className="text-[11px] text-accent hover:underline ml-auto"
                      >
                        Ir para {c.tab}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {ready && (
              <Button
                onClick={onOpenSendDialog}
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Gerar e enviar
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <ActionButton
          icon={<Eye className="h-4 w-4" />}
          label="Ver como cliente"
          subtitle={hasLink ? "Pré-autenticado" : "Após enviar"}
          enabled={hasLink}
          onClick={hasLink ? onPreviewAsClient : () => handleProtectedAction("Ver como cliente")}
        />
        <ActionButton
          icon={<Link2 className="h-4 w-4" />}
          label="Copiar link"
          subtitle={hasLink ? "/p/" + (proposal as any).access_token?.slice(0, 8) + "…" : "Após enviar"}
          enabled={hasLink}
          onClick={hasLink ? onCopyLink : () => handleProtectedAction("Copiar link")}
        />
        <ActionButton
          icon={<FileText className="h-4 w-4" />}
          label="Pré-visualizar PDF"
          subtitle="Versão atual"
          enabled
          onClick={onPreviewPdf}
        />
        <ActionButton
          icon={<Activity className="h-4 w-4" />}
          label="Tracking"
          subtitle={hasLink ? "Quem viu / interagiu" : "Sem dados ainda"}
          enabled
          onClick={onOpenTracking}
        />
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

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  enabled: boolean;
  onClick: () => void;
}

function ActionButton({ icon, label, subtitle, enabled, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all",
        "hover:border-accent/50 hover:bg-accent/5 hover:-translate-y-px",
        enabled ? "border-border" : "border-border/60 bg-muted/20"
      )}
    >
      <div className={cn(
        "rounded-md p-1.5 shrink-0 transition-colors",
        enabled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate font-mono">{subtitle}</p>
      </div>
    </button>
  );
}
