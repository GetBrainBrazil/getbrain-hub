/**
 * Aba "Propostas & Anexos" do detalhe do projeto (/projetos/:id).
 *
 * - Lista todas as propostas vinculadas ao deal de origem (não só a ativa).
 * - Mostra organograma e mockup BETA herdados do deal (somente leitura).
 * - Toda edição continua no CRM (botão "Abrir deal de origem") ou no editor
 *   completo da proposta.
 * - Mobile-first: cards reflowam, ações principais ficam visíveis sem scroll
 *   horizontal.
 */
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  FileText,
  Loader2,
  ExternalLink,
  Download,
  Globe,
  Pencil,
  Image as ImageIcon,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowUpRight,
  FolderArchive,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useProjectProposals,
  type ProjectProposalRow,
} from "@/hooks/projetos/useProjectProposals";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import {
  calculateScopeTotal,
  effectiveStatus,
  formatBRL,
  formatDateBR,
} from "@/lib/orcamentos/calculateTotal";
import { openProposalPdf } from "@/lib/orcamentos/storage";
import { buildPublicProposalUrl } from "@/lib/orcamentos/publicProposalUrl";

interface Props {
  projectId: string;
}

// ----------------------------------------------------------------
// Wrappers visuais — mesmo idioma dos outros cards do projeto
// ----------------------------------------------------------------

function CardShell({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      <header className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 self-start">{action}</div>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MetaPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px]",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "danger" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-foreground">{value}</span>
    </span>
  );
}

// ----------------------------------------------------------------
// Card individual de proposta
// ----------------------------------------------------------------

function ProposalCard({
  proposal,
  isActive,
}: {
  proposal: ProjectProposalRow;
  isActive: boolean;
}) {
  const navigate = useNavigate();
  const [openingPdf, setOpeningPdf] = useState(false);

  const total = calculateScopeTotal(proposal.scope_items ?? []);
  const eff = effectiveStatus(proposal.status, proposal.valid_until);
  const monthly = proposal.maintenance_monthly_value ?? 0;
  const publicUrl = buildPublicProposalUrl(proposal.access_token);

  async function handleOpenPdf() {
    if (!proposal.pdf_url) return;
    setOpeningPdf(true);
    try {
      await openProposalPdf(proposal.pdf_url);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir PDF");
    } finally {
      setOpeningPdf(false);
    }
  }

  return (
    <article
      className={cn(
        "relative rounded-lg border bg-card/40 transition-colors",
        isActive
          ? "border-accent/60 ring-1 ring-accent/20"
          : "border-border/70 hover:border-border",
      )}
    >
      {isActive && (
        <span className="absolute -top-2 left-4 rounded-full border border-accent/40 bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          Versão ativa
        </span>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/50 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {proposal.code}
          </span>
          <OrcamentoStatusBadge status={eff} />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="font-mono text-base font-bold tabular-nums text-success">
              {formatBRL(total)}
            </span>
          </div>
          {monthly > 0 && (
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Mensal
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">
                {formatBRL(monthly)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cliente + meta */}
      <div className="space-y-3 p-4">
        {proposal.client_company_name && (
          <p className="text-sm font-medium text-foreground">
            {proposal.client_company_name}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {proposal.sent_at && (
            <MetaPill
              icon={Calendar}
              label="Enviada"
              value={formatDateBR(proposal.sent_at)}
            />
          )}
          {proposal.accepted_at && (
            <MetaPill
              icon={CheckCircle2}
              label="Aceita"
              value={formatDateBR(proposal.accepted_at)}
              tone="success"
            />
          )}
          {proposal.rejected_at && (
            <MetaPill
              icon={XCircle}
              label="Recusada"
              value={formatDateBR(proposal.rejected_at)}
              tone="danger"
            />
          )}
          <MetaPill
            icon={Calendar}
            label="Validade"
            value={formatDateBR(proposal.valid_until)}
          />
          {(proposal.view_count ?? 0) > 0 && (
            <MetaPill
              icon={Eye}
              label="Views"
              value={String(proposal.view_count)}
            />
          )}
          {monthly > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary sm:hidden">
              <span className="text-muted-foreground">MRR</span>
              <span className="font-mono tabular-nums">{formatBRL(monthly)}</span>
            </span>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <Button
            size="sm"
            variant="outline"
            disabled={!proposal.pdf_url || openingPdf}
            onClick={handleOpenPdf}
            title={proposal.pdf_url ? "Abrir PDF" : "Sem PDF gerado — gere no editor completo"}
          >
            {openingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </Button>

          {publicUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Globe className="h-3.5 w-3.5" /> Página pública
              </a>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => navigate(`/financeiro/orcamentos/${proposal.id}/editar`)}
          >
            <Pencil className="h-3.5 w-3.5" /> Editor completo
            <ArrowUpRight className="h-3 w-3 opacity-60" />
          </Button>
        </div>
      </div>
    </article>
  );
}

// ----------------------------------------------------------------
// Bloco principal
// ----------------------------------------------------------------

export function AbaPropostas({ projectId }: Props) {
  const { data, isLoading, isError, error } = useProjectProposals(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando propostas…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Erro ao carregar propostas: {(error as any)?.message || "tente novamente"}
      </div>
    );
  }

  const payload = data!;
  const { proposals, sourceDealId, sourceDealCode } = payload;

  // Versão ativa = primeira não-recusada (lista já vem ordenada desc por data)
  const activeIdx = proposals.findIndex((p) => p.status !== "recusada");
  const hasProposals = proposals.length > 0;

  return (
    <div className="space-y-4">
      {/* === BLOCO 1 — Propostas comerciais === */}
      <CardShell
        title="Propostas comerciais"
        description={
          hasProposals
            ? `${proposals.length} versão(ões) gerada(s) pra este projeto`
            : "Todas as versões geradas pra este projeto aparecem aqui"
        }
        icon={Layers}
        action={
          sourceDealId && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/crm/deals/${sourceDealCode ?? sourceDealId}`}>
                <ExternalLink className="h-3.5 w-3.5" /> Abrir deal de origem
              </Link>
            </Button>
          )
        }
      >
        {!sourceDealId ? (
          <EmptyState
            icon={Sparkles}
            title="Projeto criado manualmente"
            description="Propostas só aparecem aqui quando o projeto vem de um deal do CRM. Use o editor de orçamentos pra gerar uma proposta avulsa."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open("/financeiro/orcamentos", "_blank")}
              >
                <FileText className="h-3.5 w-3.5" /> Abrir orçamentos
              </Button>
            }
          />
        ) : !hasProposals ? (
          <EmptyState
            icon={FileText}
            title="Sem proposta vinculada"
            description={`O deal ${sourceDealCode ?? "de origem"} ainda não tem proposta gerada. Volte ao deal pra criar a primeira versão.`}
            action={
              <Button size="sm" asChild>
                <Link to={`/crm/deals/${sourceDealCode ?? sourceDealId}`}>
                  <Sparkles className="h-3.5 w-3.5" /> Ir pro deal e gerar
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {proposals.map((p, i) => (
              <ProposalCard key={p.id} proposal={p} isActive={i === activeIdx} />
            ))}
          </div>
        )}
      </CardShell>

      {/* === BLOCO 2 — Organograma === */}
      <CardShell
        title="Organograma do cliente"
        description="Herdado do deal — edição continua no CRM"
        icon={FolderArchive}
        action={
          sourceDealId && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/crm/deals/${sourceDealCode ?? sourceDealId}`}>
                <Pencil className="h-3.5 w-3.5" /> Editar no deal
              </Link>
            </Button>
          )
        }
      >
        {payload.organogramaUrl ? (
          <a
            href={payload.organogramaUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-md border border-border bg-muted/20 transition-colors hover:border-accent/40"
          >
            {/\.pdf($|\?)/i.test(payload.organogramaUrl) ? (
              <div className="flex items-center gap-2 p-6 text-sm text-accent">
                <ImageIcon className="h-4 w-4" /> Abrir organograma (PDF)
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </div>
            ) : (
              <img
                src={payload.organogramaUrl}
                alt="Organograma do cliente"
                className="max-h-80 w-full object-contain"
              />
            )}
          </a>
        ) : (
          <EmptyState
            icon={FolderArchive}
            title="Sem organograma anexado"
            description="Quando o time comercial subir o organograma no deal, ele aparece aqui automaticamente."
            compact
          />
        )}
      </CardShell>

      {/* === BLOCO 3 — Mockup BETA === */}
      <CardShell
        title="Mockup BETA"
        description="Link do preview e galeria de prints apresentados ao cliente"
        icon={ImageIcon}
        action={
          sourceDealId && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/crm/deals/${sourceDealCode ?? sourceDealId}`}>
                <Pencil className="h-3.5 w-3.5" /> Editar no deal
              </Link>
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {payload.mockupUrl ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={payload.mockupUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-accent hover:underline"
              >
                {payload.mockupUrl}
              </a>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum link de preview cadastrado.</p>
          )}

          {payload.mockupScreenshots.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prints ({payload.mockupScreenshots.length})
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {payload.mockupScreenshots.map((url, i) => (
                  <Tooltip key={url + i}>
                    <TooltipTrigger asChild>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-md border border-border bg-muted/20 transition-colors hover:border-accent/40"
                      >
                        <img
                          src={url}
                          alt={`Print ${i + 1}`}
                          className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Abrir print {i + 1}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : (
            !payload.mockupUrl && (
              <EmptyState
                icon={ImageIcon}
                title="Sem mockup anexado"
                description="Prints e link do preview vivem aqui assim que forem subidos no deal."
                compact
              />
            )
          )}
        </div>
      </CardShell>
    </div>
  );
}

// ----------------------------------------------------------------
// Empty state reaproveitável
// ----------------------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/10 px-6 text-center",
        compact ? "py-6" : "py-10",
      )}
    >
      <Icon className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
