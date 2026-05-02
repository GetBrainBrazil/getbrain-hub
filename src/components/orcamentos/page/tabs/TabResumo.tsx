/**
 * Tab "Resumo" — snapshot real do que vai estar na proposta.
 *
 * Inclui:
 *  - Vínculo com CRM no topo (mesmo picker da tab Cliente) — permite importar
 *    cliente completo (logo, nome, narrativa, escopo, parcelas, MRR, validade)
 *    sem trocar de aba.
 *  - Checklist de prontidão pra envio.
 *  - Botões de ação rápida (preview, copiar link, PDF, tracking).
 *  - Cartão "snapshot" da proposta com header (logo + nome + título), KPIs
 *    densos (implementação parcelada, MRR, total 1º ano, prazo), bullets de
 *    escopo e trechos de narrativa.
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
  MapPin,
  Calendar,
  Clock,
  Layers,
  Copy,
  ExternalLink,
  QrCode,
  Check,
  Lock,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { generateQrDataUrl } from "@/lib/orcamentos/generateQrDataUrl";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import {
  effectiveStatus,
  formatBRL,
  formatDateBR,
  calculateScopeTotal,
} from "@/lib/orcamentos/calculateTotal";
import { CrmDealLinkPicker } from "@/components/orcamentos/page/CrmDealLinkPicker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ScopeItem } from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposal: ProposalDetail;
  livePreview: any;
  onPreviewAsClient: () => void;
  onCopyLink: () => void;
  onOpenTracking: () => void;
  onPreviewPdf: () => void;
  onOpenSendDialog: () => void;
  onGoToTab: (tab: string) => void;
  // Novos — para o picker de CRM funcionar direto do Resumo
  setField: (field: any, value: any) => void;
  setItems: (items: ScopeItem[]) => void;
  dealClientLink?: { id: string; code: string; title: string; stage?: string } | null;
  onLinkChanged?: () => void;
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
  setField,
  setItems,
  dealClientLink,
  onLinkChanged,
}: Props) {
  const eff = effectiveStatus(proposal.status as any, livePreview.valid_until);
  const items: ScopeItem[] = Array.isArray(livePreview.scope_items)
    ? livePreview.scope_items
    : [];
  // Implementação = valor cheio (CRM-aligned). Fallback p/ soma legada de itens
  // quando a proposta foi criada antes da migração.
  const implValue =
    livePreview.implementation_value != null && Number(livePreview.implementation_value) >= 0
      ? Number(livePreview.implementation_value)
      : calculateScopeTotal(items);
  const monthly = livePreview.maintenance_monthly_value || 0;
  // MRR efetivo no 1º ano: aplica desconto inicial se houver
  const discValue = Number(livePreview.mrr_discount_value) || 0;
  const discMonths = Math.min(Number(livePreview.mrr_discount_months) || 0, 12);
  const annualMrr =
    monthly > 0
      ? Math.max(monthly - discValue, 0) * discMonths + monthly * (12 - discMonths)
      : 0;
  const annual = implValue + annualMrr;
  const installments = Number(livePreview.installments_count) || 0;
  const installmentValue = installments > 1 && implValue > 0 ? implValue / installments : 0;
  const implDays = livePreview.implementation_days || 0;
  const validDays = livePreview.validation_days || 0;
  const totalDays = implDays + validDays;

  const hasLink = !!(proposal as any).access_token;
  const isDraft = proposal.status === "rascunho";

  // Checklist de prontidão para envio
  const checks = [
    { key: "client", label: "Cliente preenchido", ok: !!(livePreview.client_company_name?.trim()), tab: "cliente" },
    { key: "items", label: "Pelo menos 1 item de escopo", ok: items.length > 0, tab: "escopo" },
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

  // Validade — texto humanizado
  let validityChip = "Sem validade definida";
  let validityClass = "text-muted-foreground";
  if (livePreview.valid_until) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validDate = new Date(`${livePreview.valid_until}T00:00:00`);
    const diff = Math.round((validDate.getTime() - today.getTime()) / 86400000);
    if (diff < 0) {
      validityChip = `Vencida há ${Math.abs(diff)} dia(s)`;
      validityClass = "text-amber-500";
    } else if (diff === 0) {
      validityChip = "Vence hoje";
      validityClass = "text-amber-500";
    } else {
      validityChip = `Vence em ${diff} dia(s) · ${formatDateBR(livePreview.valid_until)}`;
      validityClass = "text-foreground/70";
    }
  }

  const brand = livePreview.client_brand_color || "";
  const itemsToShow = items.slice(0, 6);
  const remainingItems = Math.max(0, items.length - itemsToShow.length);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Vínculo com CRM (acessível direto do Resumo) */}
      <CrmDealLinkPicker
        proposalId={proposal.id}
        currentDeal={dealClientLink || null}
        setField={setField}
        setItems={setItems}
        onLinkChanged={onLinkChanged}
      />

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

      {/* ───────────── Snapshot da proposta ───────────── */}
      <Card className="overflow-hidden">
        {/* Header com logo + cliente + título */}
        <div
          className="p-5 border-b border-border/60"
          style={
            brand
              ? { background: `linear-gradient(135deg, ${brand}10, transparent 60%)` }
              : undefined
          }
        >
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-16 w-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
              {livePreview.client_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={livePreview.client_logo_url}
                  alt={livePreview.client_company_name || "Logo"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center px-1">
                  Sem logo
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight truncate">
                  {livePreview.client_company_name || "Cliente sem nome"}
                </h2>
                {livePreview.client_city && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {livePreview.client_city}
                  </span>
                )}
              </div>
              <p className="text-xl md:text-2xl font-bold tracking-tight mt-1 leading-tight">
                {livePreview.title || (
                  <span className="text-muted-foreground/50 italic font-normal">
                    Sem título — preencha em Cliente
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn("inline-flex items-center gap-1 text-xs", validityClass)}>
                  <Calendar className="h-3 w-3" />
                  {validityChip}
                </span>
                {(proposal as any).code && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(proposal as any).code}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs densos */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 border-b border-border/60">
          <KpiCell
            label="Implementação"
            value={formatBRL(implValue)}
            sub={
              installments > 1 && installmentValue > 0
                ? `${installments}× ${formatBRL(installmentValue)}`
                : "à vista"
            }
            accent="success"
          />
          <KpiCell
            label="Manutenção / mês"
            value={monthly > 0 ? formatBRL(monthly) : "—"}
            sub={monthly > 0 ? "MRR recorrente" : "Sem MRR"}
            accent="primary"
          />
          <KpiCell
            label="Total no 1º ano"
            value={formatBRL(annual)}
            sub="Implementação + 12 meses"
          />
          <KpiCell
            label="Prazo"
            value={totalDays > 0 ? `${totalDays} dias` : "—"}
            sub={
              totalDays > 0 ? `${implDays}d execução + ${validDays}d validação` : "Defina em Configurações"
            }
            icon={<Clock className="h-3 w-3" />}
          />
        </div>

        {/* Bullets de escopo */}
        <div className="p-5 border-b border-border/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              Escopo {items.length > 0 && `(${items.length} ${items.length === 1 ? "item" : "itens"})`}
            </h3>
            <button
              type="button"
              onClick={() => onGoToTab("escopo")}
              className="text-[11px] text-accent hover:underline"
            >
              Editar →
            </button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhum item ainda. Vincule um deal acima para importar do CRM, ou adicione
              manualmente em <button type="button" onClick={() => onGoToTab("escopo")} className="text-accent hover:underline">Escopo</button>.
            </p>
          ) : (
            <ul className="space-y-2">
              {itemsToShow.map((it, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 text-sm border-b border-border/40 last:border-b-0 pb-2 last:pb-0"
                >
                  <span className="font-medium leading-snug flex-1 min-w-0">
                    <span className="text-muted-foreground/60 mr-1.5">•</span>
                    {it.title || <em className="text-muted-foreground/60">Sem título</em>}
                  </span>
                  <span className="tabular-nums text-success font-semibold whitespace-nowrap text-sm">
                    {formatBRL(Number(it.value) || 0)}
                  </span>
                </li>
              ))}
              {remainingItems > 0 && (
                <li className="text-[11px] text-muted-foreground pt-1">
                  + {remainingItems} {remainingItems === 1 ? "item" : "itens"} —{" "}
                  <button
                    type="button"
                    onClick={() => onGoToTab("escopo")}
                    className="text-accent hover:underline"
                  >
                    ver todos
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Trechos de narrativa */}
        {(livePreview.executive_summary || livePreview.pain_context) && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {livePreview.executive_summary && (
              <NarrativePreview
                title="Resumo executivo"
                content={livePreview.executive_summary}
                onEdit={() => onGoToTab("escopo")}
              />
            )}
            {livePreview.pain_context && (
              <NarrativePreview
                title="Contexto e dor"
                content={livePreview.pain_context}
                onEdit={() => onGoToTab("escopo")}
              />
            )}
          </div>
        )}
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

function KpiCell({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "success" | "primary";
  icon?: React.ReactNode;
}) {
  const colorClass =
    accent === "success"
      ? "text-success"
      : accent === "primary"
        ? "text-primary"
        : "text-foreground";
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={cn("text-xl font-bold tabular-nums mt-1", colorClass)}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>
      )}
    </div>
  );
}

function NarrativePreview({
  title,
  content,
  onEdit,
}: {
  title: string;
  content: string;
  onEdit: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-[10px] text-accent hover:underline"
        >
          Editar
        </button>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4 whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}
