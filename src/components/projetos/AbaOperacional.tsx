/**
 * Aba "Operacional" do Detalhe do Projeto.
 *
 * Dashboard agregador que consome a view SQL `project_metrics` via
 * `useProjectMetrics`. Cada painel é um módulo macro (Financeiro,
 * Tarefas, Suporte, Tokens). Painéis cujo módulo ainda não está
 * plugado mostram banner "em breve" e valores zerados — nunca dados
 * mockados (princípio 2.15 do ARCHITECTURE.md).
 */
import { Link } from "react-router-dom";
import {
  DollarSign,
  ListChecks,
  Headphones,
  Brain,
  ArrowRight,
  Activity,
  TrendingUp,
  Gauge,
  AlertTriangle,
  Info,
  Users,
  Plus,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useProjectMetrics } from "@/hooks/useProjectMetrics";
import type { ProjectMetrics } from "@/types/database";
import { ActorAvatar } from "@/components/projetos/ActorAvatar";
import { getRoleLabel } from "@/lib/projetos-helpers";

export type AbaOperacionalAlloc = {
  id: string;
  actor_id: string;
  role_in_project: string;
  allocation_percent: number | null;
  started_at?: string | null;
  actor?: { display_name?: string | null; avatar_url?: string | null } | null;
};

export type AbaOperacionalContract = {
  id: string;
  status: string;
  monthly_fee: number;
  monthly_fee_discount_percent: number | null;
  end_date: string | null;
};

// ─────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────
type Tone = "success" | "warning" | "danger" | "muted" | "accent";

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.max(0, Math.min(100, (num / den) * 100));
}

function toneText(tone: Tone) {
  return {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    muted: "text-muted-foreground",
    accent: "text-accent",
  }[tone];
}

function toneBg(tone: Tone) {
  return {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    muted: "bg-muted-foreground",
    accent: "bg-accent",
  }[tone];
}

function StatusDot({ tone }: { tone: Tone }) {
  return <span className={cn("h-1.5 w-1.5 rounded-full", toneBg(tone))} />;
}

function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "danger" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "muted" && "border-border bg-muted/40 text-muted-foreground",
        tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

function ProgressBar({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: Tone;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
      <div
        className={cn("h-full rounded-full transition-all", toneBg(tone))}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h3>
      </div>
      {badge}
    </div>
  );
}

function PanelFooter({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">
        <span className="inline-flex cursor-not-allowed items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {label}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">
      <Link
        to={href}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-accent transition-colors hover:text-accent/80"
      >
        {label}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-border/80",
        className,
      )}
    >
      {children}
    </section>
  );
}

function ComingSoonBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning" />
      <p className="text-[11px] leading-relaxed text-warning/90">{children}</p>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", tone === "muted" ? "text-foreground" : toneText(tone))}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Cálculos de saúde
// ─────────────────────────────────────────────────────────
function computeHealth(m: ProjectMetrics): { tone: Tone; label: string } {
  const today = new Date();
  const due = m.estimated_delivery_date ? new Date(m.estimated_delivery_date) : null;
  const daysToDue = due ? Math.floor((due.getTime() - today.getTime()) / 86400000) : null;
  const overdue = daysToDue !== null && daysToDue < 0;

  if (m.blocking_dependencies > 0 || overdue) {
    return { tone: "danger", label: "Crítico" };
  }
  if (m.high_risks_active > 0 || (daysToDue !== null && daysToDue < 30)) {
    return { tone: "warning", label: "Atenção" };
  }
  return { tone: "success", label: "Saudável" };
}

function computeMarginTone(m: ProjectMetrics): Tone {
  if (!m.revenue_contracted && !m.revenue_received) return "muted";
  if (m.margin_real < 0) return "danger";
  const ratio = m.revenue_contracted ? m.margin_real / m.revenue_contracted : 0;
  if (ratio >= 0.2) return "success";
  if (ratio > 0) return "warning";
  return "muted";
}

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────
interface AbaOperacionalProps {
  projectId: string;
  allocs?: AbaOperacionalAlloc[];
  contracts?: AbaOperacionalContract[];
  onAllocate?: () => void;
  onDeallocate?: (allocId: string) => void;
  onCreateContract?: () => void;
}

export function AbaOperacional({
  projectId,
  allocs = [],
  contracts = [],
  onAllocate,
  onDeallocate,
  onCreateContract,
}: AbaOperacionalProps) {
  const { data: m, isLoading, error } = useProjectMetrics(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !m) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
        <p className="mt-2 text-sm font-medium text-destructive">
          Não foi possível carregar as métricas operacionais
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Tente novamente em instantes."}
        </p>
      </div>
    );
  }

  const health = computeHealth(m);
  const marginTone = computeMarginTone(m);
  const revenueProgress = pct(m.revenue_received, m.revenue_contracted);
  const tasksHasData = m.tasks_total > 0 || m.hours_estimated > 0;
  const ticketsHasData = m.tickets_open > 0 || m.tickets_resolved_30d > 0;
  const tokensHasData = m.tokens_consumed_month_brl > 0;
  const tokensProgress = pct(m.tokens_consumed_month_brl, m.tokens_budget_brl);

  // Progresso geral: tarefas se houver, senão marcos
  const progressValue = tasksHasData
    ? m.tasks_completion_percent
    : pct(m.milestones_done, m.milestones_total);
  const progressLabel = tasksHasData ? "tarefas concluídas" : "marcos concluídos";

  // ── Painel financeiro: status saúde ──
  let financeTone: Tone = "muted";
  let financeLabel = "Sem dados";
  if (m.revenue_contracted > 0) {
    if (m.margin_real < 0) {
      financeTone = "danger";
      financeLabel = "Prejuízo";
    } else if (m.revenue_contracted > 0 && m.margin_real / m.revenue_contracted >= 0.2) {
      financeTone = "success";
      financeLabel = "Saudável";
    } else if (m.margin_real >= 0) {
      financeTone = "warning";
      financeLabel = "Atenção";
    }
  }

  // ── Contrato ativo (para linha resumo no painel Financeiro) ──
  const activeContract = contracts.find((c) => c.status === "active");
  const activeContractNet = activeContract
    ? Number(activeContract.monthly_fee) *
      (1 - Number(activeContract.monthly_fee_discount_percent || 0) / 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ───── KPIs de saúde no topo ───── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          icon={Activity}
          label="Saúde"
          value={health.label}
          tone={health.tone}
          hint={
            m.blocking_dependencies > 0
              ? `${m.blocking_dependencies} bloqueante${m.blocking_dependencies > 1 ? "s" : ""}`
              : m.high_risks_active > 0
              ? `${m.high_risks_active} risco${m.high_risks_active > 1 ? "s" : ""} alto${m.high_risks_active > 1 ? "s" : ""}`
              : "Sem bloqueios"
          }
        />
        <KpiCard
          icon={TrendingUp}
          label="Margem"
          value={formatCurrency(m.margin_real)}
          tone={marginTone}
          hint={
            m.revenue_contracted
              ? `${((m.margin_real / m.revenue_contracted) * 100).toFixed(0)}% do contratado`
              : "—"
          }
        />
        <KpiCard
          icon={Gauge}
          label="Progresso"
          value={`${progressValue.toFixed(0)}%`}
          tone="accent"
          hint={progressLabel}
        />
      </div>

      {/* ───── 4 painéis ───── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ─── FINANCEIRO ─── */}
        <Panel>
          <PanelHeader
            icon={DollarSign}
            title="Financeiro"
            badge={<StatusBadge tone={financeTone}>{financeLabel}</StatusBadge>}
          />
          {m.revenue_contracted === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <DollarSign className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Defina o valor contratado na aba Visão Geral → Financeiro
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Contratado</span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                    {formatCurrency(m.revenue_contracted)}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Recebido</span>
                  <span className="font-mono tabular-nums text-success">
                    {formatCurrency(m.revenue_received)} · {revenueProgress.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={revenueProgress} tone="success" />
              </div>
              <div className="space-y-0 border-t border-border/60 pt-2">
                <Row label="Pendente" value={formatCurrency(m.revenue_pending)} tone="warning" />
                <Row label="Custo estimado" value={formatCurrency(m.cost_total_estimated)} />
                <div className="mt-1 flex items-baseline justify-between border-t border-border/60 pt-2">
                  <span className="text-xs font-medium text-muted-foreground">Margem real</span>
                  <span className={cn("font-mono text-base font-bold tabular-nums", toneText(marginTone))}>
                    {formatCurrency(m.margin_real)}
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Contrato de manutenção (resumo) */}
          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Wrench className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
              {activeContract ? (
                <span className="truncate text-muted-foreground">
                  Manutenção:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(activeContractNet)}
                  </span>
                  /mês ativo
                  {activeContract.end_date ? ` · até ${formatDate(activeContract.end_date)}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">Sem contrato de manutenção</span>
              )}
            </div>
            {activeContract ? (
              <Link
                to={`/financeiro/contratos?projectId=${projectId}`}
                className="flex-shrink-0 text-[11px] font-medium uppercase tracking-wider text-accent hover:text-accent/80"
              >
                Gerir →
              </Link>
            ) : onCreateContract ? (
              <button
                type="button"
                onClick={onCreateContract}
                className="flex-shrink-0 text-[11px] font-medium uppercase tracking-wider text-accent hover:text-accent/80"
              >
                Criar →
              </button>
            ) : null}
          </div>
          <div className="flex-1" />
          <PanelFooter href="/financeiro/movimentacoes" label="Ver no Financeiro" />
        </Panel>

        {/* ─── TAREFAS ─── */}
        <Panel>
          <PanelHeader
            icon={ListChecks}
            title="Tarefas"
            badge={
              tasksHasData ? (
                <StatusBadge tone="accent">Em andamento</StatusBadge>
              ) : (
                <StatusBadge tone="muted">Sem dados</StatusBadge>
              )
            }
          />
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Conclusão</span>
                <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  {m.tasks_done} <span className="text-base font-normal text-muted-foreground">/ {m.tasks_total}</span>
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={m.tasks_completion_percent} tone="accent" />
              </div>
            </div>
            <div className="space-y-0 border-t border-border/60 pt-2">
              <Row label="Backlog" value={m.tasks_backlog} />
              <Row label="Em andamento" value={m.tasks_in_progress} />
              <Row label="Bloqueadas" value={m.tasks_blocked} tone={m.tasks_blocked > 0 ? "danger" : "muted"} />
              <Row label="Concluídas" value={m.tasks_done} tone="success" />
              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Horas estim.</span>
                  <div className="font-mono tabular-nums text-foreground">
                    {m.hours_estimated > 0 ? `${m.hours_estimated}h` : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Horas reais</span>
                  <div className="font-mono tabular-nums text-foreground">
                    {m.hours_actual > 0 ? `${m.hours_actual}h` : "—"}
                  </div>
                </div>
              </div>
            </div>
            {!tasksHasData && (
              <ComingSoonBanner>
                Módulo Tarefas em conexão com projetos em breve.
              </ComingSoonBanner>
            )}
          </div>
          <div className="flex-1" />
          <PanelFooter href="/area-dev" label="Ver na Área Dev" />
        </Panel>

        {/* ─── SUPORTE ─── */}
        <Panel>
          <PanelHeader
            icon={Headphones}
            title="Suporte"
            badge={
              ticketsHasData ? (
                m.tickets_open > 0 ? (
                  <StatusBadge tone="warning">{m.tickets_open} aberto{m.tickets_open > 1 ? "s" : ""}</StatusBadge>
                ) : (
                  <StatusBadge tone="success">Sem tickets</StatusBadge>
                )
              ) : (
                <StatusBadge tone="muted">Sem dados</StatusBadge>
              )
            }
          />
          <div className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Tickets abertos</span>
              <span className={cn(
                "font-mono text-2xl font-bold tabular-nums",
                m.tickets_open > 0 ? "text-warning" : "text-foreground",
              )}>
                {m.tickets_open}
              </span>
            </div>
            <div className="space-y-0 border-t border-border/60 pt-2">
              <Row label="Resolvidos (30d)" value={m.tickets_resolved_30d} />
              <Row
                label="Tempo médio de resolução"
                value={m.avg_resolution_hours > 0 ? `${m.avg_resolution_hours.toFixed(1)}h` : "—"}
              />
            </div>
            {!ticketsHasData && (
              <ComingSoonBanner>Módulo Suporte em breve.</ComingSoonBanner>
            )}
          </div>
          <div className="flex-1" />
          <PanelFooter href="/suporte" label="Ver no Suporte" />
        </Panel>

        {/* ─── TOKENS DE IA ─── */}
        <Panel>
          <PanelHeader
            icon={Brain}
            title="Tokens de IA"
            badge={
              tokensHasData ? (
                <StatusBadge tone={tokensProgress >= 80 ? "warning" : "accent"}>
                  {tokensProgress.toFixed(0)}% usado
                </StatusBadge>
              ) : m.tokens_budget_brl > 0 ? (
                <StatusBadge tone="muted">Sem consumo</StatusBadge>
              ) : (
                <StatusBadge tone="muted">Sem bolsão</StatusBadge>
              )
            }
          />
          <div className="mt-4 space-y-3">
            {m.tokens_budget_brl > 0 ? (
              <>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Consumo do mês</span>
                    <span className="font-mono text-base tabular-nums text-foreground">
                      <span className="text-2xl font-bold">{formatCurrency(m.tokens_consumed_month_brl)}</span>
                      <span className="text-muted-foreground"> / {formatCurrency(m.tokens_budget_brl)}</span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      value={tokensProgress}
                      tone={tokensProgress >= 80 ? "warning" : "accent"}
                    />
                  </div>
                </div>
                <div className="space-y-0 border-t border-border/60 pt-2">
                  <Row label="Bolsão mensal" value={formatCurrency(m.tokens_budget_brl)} />
                  <Row label="Consumido" value={formatCurrency(m.tokens_consumed_month_brl)} />
                  <Row
                    label="Restante"
                    value={formatCurrency(Math.max(0, m.tokens_budget_brl - m.tokens_consumed_month_brl))}
                    tone="success"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <Brain className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum bolsão configurado em contrato ativo
                </p>
              </div>
            )}
            <ComingSoonBanner>Módulo Tokens em breve.</ComingSoonBanner>
          </div>
          <div className="flex-1" />
          <PanelFooter href="/tokens" label="Ver em Tokens" />
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KPI compacto do topo
// ─────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-3.5 w-3.5", toneText(tone))} />
      </div>
      <div className={cn("mt-1.5 font-mono text-2xl font-bold leading-none tabular-nums", toneText(tone))}>
        {value}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
