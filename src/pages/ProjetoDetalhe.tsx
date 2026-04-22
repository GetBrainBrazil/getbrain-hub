import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  ProjectStatus,
  ProjectType,
  GETBRAIN_ORG_ID,
  getRoleLabel,
  getStatusLabel,
  getTypeLabel,
  getStatusBadgeClass,
  relativeTime,
} from "@/lib/projetos-helpers";
import { MaintenanceStatusBadge } from "@/components/projetos/ProjetoBadges";
import { ActorAvatar } from "@/components/projetos/ActorAvatar";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Building2,
  Briefcase,
  Clock,
  Pencil,
  MoreVertical,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Circle,
  XCircle,
  Sparkles,
  FileText,
  ListChecks,
  StickyNote,
  Activity as ActivityIcon,
  Wrench,
  Plug,
  Archive,
  Copy,
  Save,
  X,
} from "lucide-react";
import { AlocarAtorDialog } from "@/components/projetos/AlocarAtorDialog";
import { NovoContratoDialog } from "@/components/projetos/NovoContratoDialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------
// Tipagem leve
// -----------------------------------------------------------
type Project = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  project_type: ProjectType;
  company_id: string;
  contract_value: number | null;
  installments_count: number | null;
  start_date: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  description: string | null;
  acceptance_criteria: string | null;
  notes: string | null;
  token_budget_brl: number | null;
  created_at: string;
  updated_at: string;
};

// Pipeline visual: ordem dos estágios não-terminais
const PIPELINE_STAGES: ProjectStatus[] = [
  "proposta",
  "aceito",
  "em_desenvolvimento",
  "em_homologacao",
  "entregue",
  "em_manutencao",
];
const TERMINAL_STAGES: ProjectStatus[] = ["pausado", "cancelado", "arquivado"];

// -----------------------------------------------------------
// Pequenos componentes locais — mantidos no mesmo arquivo
// para concentrar o redesign sem espalhar.
// -----------------------------------------------------------

function StatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
        getStatusBadgeClass(status),
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getStatusLabel(status)}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

function PipelineBar({
  current,
  onChange,
  history,
}: {
  current: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
  history: Record<string, string>;
}) {
  const isTerminal = TERMINAL_STAGES.includes(current);
  const currentIdx = PIPELINE_STAGES.indexOf(current);

  return (
    <div className="rounded-lg border border-border bg-card/50 px-5 py-4">
      <div className="flex items-center justify-between">
        {PIPELINE_STAGES.map((stage, i) => {
          const isPast = !isTerminal && i < currentIdx;
          const isCurrent = !isTerminal && i === currentIdx;
          const isFuture = isTerminal || i > currentIdx;
          const date = history[stage];

          return (
            <div key={stage} className="flex flex-1 items-center last:flex-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange(stage)}
                    className="group flex flex-col items-center gap-2"
                  >
                    <span
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                        isPast && "border-success bg-success text-success-foreground",
                        isCurrent &&
                          "border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px_hsl(var(--accent)/0.18)]",
                        isFuture &&
                          "border-border bg-card text-muted-foreground group-hover:border-accent/50",
                      )}
                    >
                      {isPast && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isCurrent && <Circle className="h-2 w-2 fill-current" />}
                      {isCurrent && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] leading-tight transition-colors",
                        isCurrent && "font-semibold text-foreground",
                        isPast && "text-foreground/70",
                        isFuture && "text-muted-foreground",
                      )}
                    >
                      {getStatusLabel(stage)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {date ? `Entrou em ${formatDate(date)}` : "Sem registro de entrada"}
                </TooltipContent>
              </Tooltip>
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded transition-colors",
                    i < currentIdx ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {isTerminal && (
        <div className="mt-3 flex items-center justify-center gap-2 border-t border-border pt-3">
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">
            Projeto {getStatusLabel(current).toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}

function MiniKPI({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  children?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    accent: "text-accent",
  };
  return (
    <div className="group relative rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className={cn("mt-1.5 font-mono text-2xl font-bold leading-none", toneClasses[tone])}>
        {value}
      </div>
      {(hint || children) && (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint ?? children}</div>
      )}
    </div>
  );
}

function PropRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-right text-sm text-foreground">{children}</span>
    </div>
  );
}

function CardBlock({
  title,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "group/card rounded-lg border border-border bg-card transition-colors hover:border-border/80",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon && <Icon className="h-4 w-4 text-accent" />}
          {title}
        </h3>
        <div className="opacity-0 transition-opacity group-hover/card:opacity-100">{action}</div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function diffDays(from: string | Date, to: string | Date) {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// -----------------------------------------------------------
// Página principal
// -----------------------------------------------------------
export default function ProjetoDetalhe() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState<{ id: string; legal_name: string; trade_name: string | null } | null>(null);
  const [allocs, setAllocs] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logActors, setLogActors] = useState<Record<string, string>>({});
  const [allocOpen, setAllocOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  // Edição inline do título do projeto
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  // Edição em bloco de cada CardBlock
  const [editing, setEditing] = useState<null | "info" | "financial" | "schedule" | "description" | "criteria" | "notes">(null);

  // drafts dos blocos
  const [draftType, setDraftType] = useState<ProjectType>("sistema_personalizado");
  const [draftContractValue, setDraftContractValue] = useState("");
  const [draftInstallments, setDraftInstallments] = useState("");
  const [draftTokenBudget, setDraftTokenBudget] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEstimated, setDraftEstimated] = useState("");
  const [draftActual, setDraftActual] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCriteria, setDraftCriteria] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  async function load() {
    if (!projectId) return;
    setLoading(true);
    const { data: p } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (!p) {
      setLoading(false);
      return;
    }
    setProject(p as Project);
    setNameDraft(p.name);
    setDraftType(p.project_type as ProjectType);
    setDraftContractValue(p.contract_value?.toString() ?? "");
    setDraftInstallments(p.installments_count?.toString() ?? "");
    setDraftTokenBudget(p.token_budget_brl?.toString() ?? "");
    setDraftStartDate(p.start_date ?? "");
    setDraftEstimated(p.estimated_delivery_date ?? "");
    setDraftActual(p.actual_delivery_date ?? "");
    setDraftDescription(p.description ?? "");
    setDraftCriteria(p.acceptance_criteria ?? "");
    setDraftNotes(p.notes ?? "");

    const { data: c } = await supabase
      .from("companies")
      .select("id, legal_name, trade_name")
      .eq("id", p.company_id)
      .maybeSingle();
    setCompany(c as any);

    const { data: pa } = await supabase
      .from("project_actors")
      .select("id, role_in_project, allocation_percent, started_at, actor_id")
      .eq("project_id", projectId)
      .is("ended_at", null);
    if (pa && pa.length > 0) {
      const ids = pa.map((x) => x.actor_id);
      const { data: actorRows } = await supabase
        .from("actors")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const map = new Map((actorRows || []).map((a) => [a.id, a]));
      setAllocs(pa.map((x) => ({ ...x, actor: map.get(x.actor_id) })));
    } else {
      setAllocs([]);
    }

    const { data: mc } = await supabase
      .from("maintenance_contracts")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false });
    setContracts(mc || []);

    const { data: al } = await supabase
      .from("audit_logs")
      .select("id, action, changes, created_at, actor_id, metadata")
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(al || []);
    if (al && al.length > 0) {
      const aids = Array.from(new Set(al.map((l) => l.actor_id).filter(Boolean))) as string[];
      if (aids.length > 0) {
        const { data: ar } = await supabase.from("actors").select("id, display_name").in("id", aids);
        setLogActors(Object.fromEntries((ar || []).map((a) => [a.id, a.display_name])));
      }
    }
    setLoading(false);
  }

  // Mapa: status -> data em que o projeto entrou nesse status (mais recente)
  const statusHistory = useMemo(() => {
    const map: Record<string, string> = {};
    // fallback: created_at conta como entrada do status inicial
    if (project) map[project.status] = map[project.status] ?? project.created_at;
    for (const log of [...logs].reverse()) {
      if (log.action === "status_change" && log.changes?.status?.after) {
        map[log.changes.status.after] = log.created_at;
      }
      if (log.action === "create") {
        map["proposta"] = map["proposta"] ?? log.created_at;
      }
    }
    return map;
  }, [logs, project]);

  async function getActorId(): Promise<string | null> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data: h } = await supabase
      .from("humans")
      .select("actor_id")
      .eq("auth_user_id", u.user.id)
      .maybeSingle();
    return (h as any)?.actor_id ?? null;
  }

  async function logChange(
    action: "update" | "status_change",
    changes: Record<string, { before: any; after: any }>,
  ) {
    if (!projectId) return;
    const actorId = await getActorId();
    await supabase.from("audit_logs").insert({
      organization_id: GETBRAIN_ORG_ID,
      actor_id: actorId,
      entity_type: "project",
      entity_id: projectId,
      action,
      changes,
    } as any);
  }

  async function patchProject(updates: Partial<Project>, changes: Record<string, { before: any; after: any }>) {
    if (!projectId || !project) return;
    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.from("projects").update(updates as any).eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (Object.keys(changes).length > 0) await logChange("update", changes);
    toast.success("Salvo", { duration: 1500 });
    load();
  }

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || !projectId || newStatus === project.status) return;
    const ok = await confirmDialog({
      title: "Mudar status do projeto?",
      description: `Novo status: "${getStatusLabel(newStatus)}".`,
      confirmLabel: "Mudar",
      variant: "default",
    });
    if (!ok) return;
    const before = project.status;
    const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logChange("status_change", { status: { before, after: newStatus } });
    toast.success(`Status atualizado para ${getStatusLabel(newStatus)}`);
    load();
  }

  async function saveName() {
    if (!project || !nameDraft.trim() || nameDraft === project.name) {
      setEditName(false);
      setNameDraft(project?.name ?? "");
      return;
    }
    await patchProject(
      { name: nameDraft.trim() },
      { name: { before: project.name, after: nameDraft.trim() } },
    );
    setEditName(false);
  }

  async function handleDeallocate(allocId: string) {
    const { error } = await supabase
      .from("project_actors")
      .update({ ended_at: new Date().toISOString().slice(0, 10) })
      .eq("id", allocId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ator desalocado");
    load();
  }

  async function archiveProject() {
    if (!project) return;
    const ok = await confirmDialog({
      title: "Arquivar este projeto?",
      description: "O projeto será movido para o status arquivado e sairá da listagem padrão.",
      confirmLabel: "Arquivar",
      variant: "destructive",
    });
    if (!ok) return;
    await patchProject(
      { status: "arquivado" as ProjectStatus } as any,
      { status: { before: project.status, after: "arquivado" } },
    );
  }

  // ------- Cálculos derivados ---------
  const hasActiveContract = contracts.some((c) => c.status === "active");
  const activeContract = contracts.find((c) => c.status === "active");
  const mrr = activeContract
    ? Number(activeContract.monthly_fee) *
      (1 - Number(activeContract.monthly_fee_discount_percent || 0) / 100)
    : 0;
  const installmentValue =
    project?.contract_value && project?.installments_count
      ? Number(project.contract_value) / Number(project.installments_count)
      : null;

  const daysInProgress = project?.start_date ? diffDays(project.start_date, new Date()) : null;
  const deadlineStatus: { tone: "success" | "warning" | "danger" | "default"; label: string; sub: string } = (() => {
    if (!project) return { tone: "default", label: "—", sub: "" };
    if (project.actual_delivery_date) {
      const d = diffDays(project.actual_delivery_date, project.estimated_delivery_date ?? project.actual_delivery_date);
      return {
        tone: d >= 0 ? "success" : "danger",
        label: "Entregue",
        sub: project.actual_delivery_date ? formatDate(project.actual_delivery_date) : "",
      };
    }
    if (!project.estimated_delivery_date) {
      return { tone: "default", label: "—", sub: "Sem prazo definido" };
    }
    const days = diffDays(new Date(), project.estimated_delivery_date);
    if (days < 0)
      return { tone: "danger", label: `${Math.abs(days)}d atraso`, sub: formatDate(project.estimated_delivery_date) };
    if (days <= 14)
      return { tone: "warning", label: `${days}d restantes`, sub: formatDate(project.estimated_delivery_date) };
    return { tone: "success", label: `${days}d restantes`, sub: formatDate(project.estimated_delivery_date) };
  })();

  const plannedDuration =
    project?.start_date && project?.estimated_delivery_date
      ? diffDays(project.start_date, project.estimated_delivery_date)
      : null;

  const companyLabel = company?.trade_name || company?.legal_name || "—";

  const daysInCurrentStatus = (() => {
    if (!project) return null;
    const entered = statusHistory[project.status] ?? project.created_at;
    return diffDays(entered, new Date());
  })();

  // ------- LOADING -----------
  if (loading || !project) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 px-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-3/5" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_340px] gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-1 pb-12 animate-fade-in">
        {/* ─────────── ZONE 1: HEADER ─────────── */}
        <div className="space-y-4">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate("/projetos")}
            className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Projetos</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-mono text-foreground/80">{project.code}</span>
          </button>

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xl font-semibold tracking-tight text-accent">
                  {project.code}
                </span>
                {editName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") {
                          setEditName(false);
                          setNameDraft(project.name);
                        }
                      }}
                      onBlur={saveName}
                      className="h-9 min-w-[320px] text-2xl font-bold"
                    />
                  </div>
                ) : (
                  <h1
                    onClick={() => setEditName(true)}
                    className="cursor-text rounded-md border border-transparent px-1 -mx-1 text-2xl font-bold leading-tight tracking-tight text-foreground transition-colors hover:border-border hover:bg-muted/30"
                    title="Clique para editar"
                  >
                    {project.name}
                  </h1>
                )}
                <StatusPill status={project.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {companyLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {getTypeLabel(project.project_type)}
                </span>
                {daysInCurrentStatus !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {getStatusLabel(project.status)} há {daysInCurrentStatus} dias
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={project.status}
                onValueChange={(v) => handleStatusChange(v as ProjectStatus)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem disabled>
                    <Copy className="mr-2 h-4 w-4" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <FileText className="mr-2 h-4 w-4" /> Exportar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={archiveProject} className="text-destructive">
                    <Archive className="mr-2 h-4 w-4" /> Arquivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Pipeline */}
          <PipelineBar
            current={project.status}
            onChange={handleStatusChange}
            history={statusHistory}
          />
        </div>

        {/* ─────────── ZONE 2: KPIs ─────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <MiniKPI
            label="Valor Contratado"
            value={project.contract_value ? formatCurrency(Number(project.contract_value)) : "—"}
            icon={DollarSign}
            hint={
              project.installments_count && installmentValue
                ? `${project.installments_count}x de ${formatCurrency(installmentValue)}`
                : undefined
            }
          />
          <MiniKPI
            label="MRR Ativo"
            value={mrr > 0 ? formatCurrency(mrr) : "—"}
            tone={mrr > 0 ? "success" : "default"}
            icon={TrendingUp}
            hint={
              activeContract && Number(activeContract.monthly_fee_discount_percent) > 0
                ? `-${activeContract.monthly_fee_discount_percent}% desc.`
                : activeContract
                ? "Sem desconto"
                : "Sem contrato ativo"
            }
          />
          <MiniKPI
            label="Dias em Andamento"
            value={daysInProgress !== null ? `${daysInProgress}` : "—"}
            icon={Clock}
            hint={
              project.start_date
                ? `desde ${formatDate(project.start_date)}`
                : "Sem data de início"
            }
          />
          <MiniKPI
            label="Prazo"
            value={deadlineStatus.label}
            tone={deadlineStatus.tone === "default" ? "default" : deadlineStatus.tone}
            icon={Calendar}
            hint={deadlineStatus.sub}
          />
          <MiniKPI
            label="Atores Alocados"
            value={`${allocs.length}`}
            icon={Users}
            hint={
              allocs.length === 0 ? (
                "Nenhum ativo"
              ) : (
                <div className="flex -space-x-1.5 pt-0.5">
                  {allocs.slice(0, 4).map((a) => (
                    <ActorAvatar
                      key={a.id}
                      name={a.actor?.display_name ?? "?"}
                      avatarUrl={a.actor?.avatar_url}
                      size="sm"
                    />
                  ))}
                  {allocs.length > 4 && (
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      +{allocs.length - 4}
                    </span>
                  )}
                </div>
              )
            }
          />
        </div>

        {/* ─────────── ZONE 3: 70/30 ─────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* COLUNA ESQUERDA */}
          <div className="min-w-0">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
                {[
                  ["overview", "Visão Geral"],
                  ["actors", "Atores"],
                  ["maintenance", "Manutenção"],
                  ["activity", "Atividade"],
                ].map(([v, label]) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ----- OVERVIEW ----- */}
              <TabsContent value="overview" className="space-y-4">
                {/* Informações */}
                <CardBlock
                  title="Informações do Projeto"
                  icon={FileText}
                  action={
                    editing === "info" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const changes: Record<string, { before: any; after: any }> = {};
                            const updates: any = {};
                            if (draftType !== project.project_type) {
                              updates.project_type = draftType;
                              changes.project_type = { before: project.project_type, after: draftType };
                            }
                            await patchProject(updates, changes);
                            setEditing(null);
                          }}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing("info")}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                    )
                  }
                >
                  <div className="divide-y divide-border/40">
                    <PropRow label="Nome">{project.name}</PropRow>
                    <PropRow label="Código">
                      <span className="font-mono text-accent">{project.code}</span>
                    </PropRow>
                    <PropRow label="Cliente">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {companyLabel}
                      </span>
                    </PropRow>
                    <PropRow label="Tipo">
                      {editing === "info" ? (
                        <Select value={draftType} onValueChange={(v) => setDraftType(v as ProjectType)}>
                          <SelectTrigger className="ml-auto h-8 w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        getTypeLabel(project.project_type)
                      )}
                    </PropRow>
                    <PropRow label="Status">
                      <StatusPill status={project.status} />
                    </PropRow>
                  </div>
                </CardBlock>

                {/* Financeiro */}
                <CardBlock
                  title="Financeiro"
                  icon={DollarSign}
                  action={
                    editing === "financial" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const updates: any = {};
                            const changes: Record<string, { before: any; after: any }> = {};
                            const cv = draftContractValue ? Number(draftContractValue) : null;
                            if (cv !== (project.contract_value ?? null)) {
                              updates.contract_value = cv;
                              changes.contract_value = { before: project.contract_value, after: cv };
                            }
                            const inst = draftInstallments ? Number(draftInstallments) : null;
                            if (inst !== (project.installments_count ?? null)) {
                              updates.installments_count = inst;
                              changes.installments_count = { before: project.installments_count, after: inst };
                            }
                            const tb = draftTokenBudget ? Number(draftTokenBudget) : null;
                            if (tb !== (project.token_budget_brl ?? null)) {
                              updates.token_budget_brl = tb;
                              changes.token_budget_brl = { before: project.token_budget_brl, after: tb };
                            }
                            await patchProject(updates, changes);
                            setEditing(null);
                          }}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing("financial")}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                    )
                  }
                >
                  <div className="divide-y divide-border/40">
                    <PropRow label="Valor Contratado">
                      {editing === "financial" ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={draftContractValue}
                          onChange={(e) => setDraftContractValue(e.target.value)}
                          className="ml-auto h-8 w-[180px] text-right font-mono"
                        />
                      ) : project.contract_value ? (
                        <span className="font-mono">{formatCurrency(Number(project.contract_value))}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Nº de Parcelas">
                      {editing === "financial" ? (
                        <Input
                          type="number"
                          value={draftInstallments}
                          onChange={(e) => setDraftInstallments(e.target.value)}
                          className="ml-auto h-8 w-[120px] text-right font-mono"
                        />
                      ) : project.installments_count ? (
                        `${project.installments_count}x`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Parcela Mensal">
                      {installmentValue ? (
                        <span className="font-mono">{formatCurrency(installmentValue)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Token Budget">
                      {editing === "financial" ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={draftTokenBudget}
                          onChange={(e) => setDraftTokenBudget(e.target.value)}
                          className="ml-auto h-8 w-[180px] text-right font-mono"
                        />
                      ) : project.token_budget_brl ? (
                        <span className="font-mono">{formatCurrency(Number(project.token_budget_brl))}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                  </div>
                </CardBlock>

                {/* Cronograma */}
                <CardBlock
                  title="Cronograma"
                  icon={Calendar}
                  action={
                    editing === "schedule" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const updates: any = {};
                            const changes: Record<string, { before: any; after: any }> = {};
                            const sd = draftStartDate || null;
                            if (sd !== (project.start_date ?? null)) {
                              updates.start_date = sd;
                              changes.start_date = { before: project.start_date, after: sd };
                            }
                            const ed = draftEstimated || null;
                            if (ed !== (project.estimated_delivery_date ?? null)) {
                              updates.estimated_delivery_date = ed;
                              changes.estimated_delivery_date = {
                                before: project.estimated_delivery_date,
                                after: ed,
                              };
                            }
                            const ad = draftActual || null;
                            if (ad !== (project.actual_delivery_date ?? null)) {
                              updates.actual_delivery_date = ad;
                              changes.actual_delivery_date = {
                                before: project.actual_delivery_date,
                                after: ad,
                              };
                            }
                            await patchProject(updates, changes);
                            setEditing(null);
                          }}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing("schedule")}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                    )
                  }
                >
                  <div className="divide-y divide-border/40">
                    <PropRow label="Início">
                      {editing === "schedule" ? (
                        <Input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
                          className="ml-auto h-8 w-[180px]"
                        />
                      ) : project.start_date ? (
                        formatDate(project.start_date)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Entrega Estimada">
                      {editing === "schedule" ? (
                        <Input
                          type="date"
                          value={draftEstimated}
                          onChange={(e) => setDraftEstimated(e.target.value)}
                          className="ml-auto h-8 w-[180px]"
                        />
                      ) : project.estimated_delivery_date ? (
                        formatDate(project.estimated_delivery_date)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Entrega Real">
                      {editing === "schedule" ? (
                        <Input
                          type="date"
                          value={draftActual}
                          onChange={(e) => setDraftActual(e.target.value)}
                          className="ml-auto h-8 w-[180px]"
                        />
                      ) : project.actual_delivery_date ? (
                        formatDate(project.actual_delivery_date)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Duração Prevista">
                      {plannedDuration !== null ? (
                        `${plannedDuration} dias`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                    <PropRow label="Duração Atual">
                      {daysInProgress !== null ? (
                        <span
                          className={cn(
                            deadlineStatus.tone === "danger" && "text-destructive",
                            deadlineStatus.tone === "warning" && "text-warning",
                            deadlineStatus.tone === "success" && "text-success",
                          )}
                        >
                          {daysInProgress} dias{" "}
                          {deadlineStatus.tone === "success" && (
                            <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </PropRow>
                  </div>
                </CardBlock>

                {/* Descrição */}
                <CardBlock
                  title="Descrição"
                  icon={FileText}
                  action={
                    editing === "description" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const next = draftDescription || null;
                            if (next !== (project.description ?? null)) {
                              await patchProject(
                                { description: next } as any,
                                { description: { before: project.description, after: next } },
                              );
                            }
                            setEditing(null);
                          }}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing("description")}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                    )
                  }
                >
                  {editing === "description" ? (
                    <Textarea
                      rows={4}
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      placeholder="Descreva o projeto..."
                    />
                  ) : project.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </CardBlock>

                {/* Critérios de Aceite */}
                <CardBlock
                  title="Critérios de Aceite"
                  icon={ListChecks}
                  action={
                    editing === "criteria" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const next = draftCriteria || null;
                            if (next !== (project.acceptance_criteria ?? null)) {
                              await patchProject(
                                { acceptance_criteria: next } as any,
                                {
                                  acceptance_criteria: {
                                    before: project.acceptance_criteria,
                                    after: next,
                                  },
                                },
                              );
                            }
                            setEditing(null);
                          }}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing("criteria")}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                    )
                  }
                >
                  {editing === "criteria" ? (
                    <Textarea
                      rows={5}
                      value={draftCriteria}
                      onChange={(e) => setDraftCriteria(e.target.value)}
                      placeholder="- [ ] Entrega A&#10;- [ ] Entrega B"
                      className="font-mono text-sm"
                    />
                  ) : project.acceptance_criteria ? (
                    <CriteriaList
                      text={project.acceptance_criteria}
                      onToggle={async (newText) => {
                        await patchProject(
                          { acceptance_criteria: newText } as any,
                          {
                            acceptance_criteria: {
                              before: project.acceptance_criteria,
                              after: newText,
                            },
                          },
                        );
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </CardBlock>

                {/* Observações */}
                <CardBlock
                  title="Observações"
                  icon={StickyNote}
                  action={
                    editing === "notes" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const next = draftNotes || null;
                            if (next !== (project.notes ?? null)) {
                              await patchProject(
                                { notes: next } as any,
                                { notes: { before: project.notes, after: next } },
                              );
                            }
                            setEditing(null);
                          }}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing("notes")}>
                        {project.notes ? (
                          <>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                          </>
                        )}
                      </Button>
                    )
                  }
                >
                  {editing === "notes" ? (
                    <Textarea
                      rows={3}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Notas internas..."
                    />
                  ) : project.notes ? (
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{project.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </CardBlock>
              </TabsContent>

              {/* ----- ACTORS ----- */}
              <TabsContent value="actors">
                <CardBlock
                  title="Atores Alocados"
                  icon={Users}
                  action={
                    <Button size="sm" variant="outline" onClick={() => setAllocOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Alocar Ator
                    </Button>
                  }
                  className="[&>header_>div]:opacity-100"
                >
                  {allocs.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Nenhum ator alocado"
                      description="Aloque membros do time para começar a registrar trabalho neste projeto."
                      action={
                        <Button size="sm" variant="outline" onClick={() => setAllocOpen(true)}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Alocar Ator
                        </Button>
                      }
                    />
                  ) : (
                    <div className="space-y-2">
                      {allocs.map((a) => (
                        <div
                          key={a.id}
                          className="group flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2.5 transition-colors hover:border-accent/40"
                        >
                          <ActorAvatar
                            name={a.actor?.display_name ?? "?"}
                            avatarUrl={a.actor?.avatar_url}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {a.actor?.display_name ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getRoleLabel(a.role_in_project)}
                              {a.allocation_percent ? ` · ${a.allocation_percent}% alocação` : ""}
                              {a.started_at ? ` · desde ${formatDate(a.started_at)}` : ""}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              0 tarefas · 0h registradas · custo: —
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeallocate(a.id)}
                            className="text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                          >
                            Desalocar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBlock>
              </TabsContent>

              {/* ----- MAINTENANCE ----- */}
              <TabsContent value="maintenance">
                <CardBlock
                  title="Contratos de Manutenção"
                  icon={Wrench}
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setContractOpen(true)}
                      disabled={hasActiveContract}
                      title={
                        hasActiveContract
                          ? "Já existe contrato ativo. Encerre o atual antes de criar outro."
                          : ""
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Novo Contrato
                    </Button>
                  }
                  className="[&>header_>div]:opacity-100"
                >
                  {contracts.length === 0 ? (
                    <EmptyState
                      icon={Wrench}
                      title="Nenhum contrato registrado"
                      description="Crie um contrato de manutenção quando o projeto entrar em produção."
                    />
                  ) : (
                    <div className="space-y-3">
                      {contracts.map((c) => {
                        const liquido =
                          Number(c.monthly_fee) *
                          (1 - Number(c.monthly_fee_discount_percent || 0) / 100);
                        return (
                          <div
                            key={c.id}
                            className="rounded-md border border-border/60 bg-card/40 px-4 py-3"
                          >
                            <div className="flex items-center justify-between">
                              <MaintenanceStatusBadge status={c.status} />
                              <div className="text-right">
                                <div className="font-mono text-lg font-bold text-foreground">
                                  {formatCurrency(liquido)}
                                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    /mês
                                  </span>
                                </div>
                                {Number(c.monthly_fee_discount_percent) > 0 && (
                                  <div className="text-[11px] text-success">
                                    -{c.monthly_fee_discount_percent}% desc. sobre{" "}
                                    {formatCurrency(Number(c.monthly_fee))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border/40 pt-3 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Período</span>
                                <span>
                                  {formatDate(c.start_date)} —{" "}
                                  {c.end_date ? formatDate(c.end_date) : "Atual"}
                                </span>
                              </div>
                              {c.token_budget_brl && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tokens/mês</span>
                                  <span className="font-mono">
                                    {formatCurrency(Number(c.token_budget_brl))}
                                  </span>
                                </div>
                              )}
                              {c.hours_budget && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Horas/mês</span>
                                  <span className="font-mono">{c.hours_budget}h</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBlock>
              </TabsContent>

              {/* ----- ACTIVITY ----- */}
              <TabsContent value="activity">
                <CardBlock title="Atividade" icon={ActivityIcon}>
                  {logs.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title="Ainda não há atividade registrada"
                      description="Toda mudança neste projeto aparecerá aqui em ordem cronológica."
                    />
                  ) : (
                    <ol className="relative space-y-5 border-l border-border pl-6">
                      {logs.map((l) => (
                        <li key={l.id} className="relative">
                          <span className="absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-card bg-accent">
                            <span className="h-1 w-1 rounded-full bg-accent-foreground" />
                          </span>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <ActorAvatar
                                name={logActors[l.actor_id] || "Sistema"}
                                size="sm"
                              />
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium text-foreground">
                                    {logActors[l.actor_id] || "Sistema"}
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {l.action === "create" && "criou o projeto"}
                                    {l.action === "update" && "atualizou o projeto"}
                                    {l.action === "status_change" && "mudou o status"}
                                    {l.action === "delete" && "arquivou"}
                                    {l.action === "restore" && "restaurou"}
                                    {l.action === "custom" && "registrou ação"}
                                  </span>
                                </p>
                                {l.action === "status_change" && l.changes?.status && (
                                  <p className="mt-0.5 text-xs">
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                      {getStatusLabel(l.changes.status.before)}
                                    </span>
                                    <span className="mx-1.5 text-muted-foreground">→</span>
                                    <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">
                                      {getStatusLabel(l.changes.status.after)}
                                    </span>
                                  </p>
                                )}
                                {l.action === "update" && l.changes && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {Object.keys(l.changes).slice(0, 3).join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {relativeTime(l.created_at)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardBlock>
              </TabsContent>
            </Tabs>
          </div>

          {/* COLUNA DIREITA — SIDEBAR */}
          <aside className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <SidebarSection title="Propriedades">
                <SidebarRow label="Status">
                  <StatusPill status={project.status} />
                </SidebarRow>
                <SidebarRow label="Tipo">{getTypeLabel(project.project_type)}</SidebarRow>
                <SidebarRow label="Cliente">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {companyLabel}
                  </span>
                </SidebarRow>
                <SidebarRow label="Criado">{relativeTime(project.created_at)}</SidebarRow>
                <SidebarRow label="Atualizado">{relativeTime(project.updated_at)}</SidebarRow>
              </SidebarSection>

              <SidebarSection title="Datas">
                <SidebarRow label="Início">
                  {project.start_date ? formatDate(project.start_date) : "—"}
                </SidebarRow>
                <SidebarRow label="Entrega prev.">
                  {project.estimated_delivery_date ? formatDate(project.estimated_delivery_date) : "—"}
                </SidebarRow>
                <SidebarRow label="Entrega real">
                  {project.actual_delivery_date ? formatDate(project.actual_delivery_date) : "—"}
                </SidebarRow>
                <SidebarRow label="Duração">
                  {daysInProgress !== null ? `${daysInProgress} dias` : "—"}
                </SidebarRow>
              </SidebarSection>

              <SidebarSection title="Valores">
                <SidebarRow label="Contratado">
                  <span className="font-mono">
                    {project.contract_value ? formatCurrency(Number(project.contract_value)) : "—"}
                  </span>
                </SidebarRow>
                <SidebarRow label="Parcelas">
                  {project.installments_count ? `${project.installments_count}x` : "—"}
                </SidebarRow>
                <SidebarRow label="MRR">
                  <span className="font-mono">{mrr > 0 ? formatCurrency(mrr) : "—"}</span>
                </SidebarRow>
              </SidebarSection>

              <SidebarSection title="Atores">
                {allocs.length === 0 ? (
                  <p className="py-1 text-xs text-muted-foreground">Nenhum alocado</p>
                ) : (
                  <div className="space-y-2 py-1">
                    {allocs.slice(0, 4).map((a) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <ActorAvatar
                          name={a.actor?.display_name ?? "?"}
                          avatarUrl={a.actor?.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {a.actor?.display_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {getRoleLabel(a.role_in_project)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SidebarSection>

              <SidebarSection title="Manutenção">
                {activeContract ? (
                  <div className="space-y-1.5 py-1">
                    <MaintenanceStatusBadge status={activeContract.status} />
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatCurrency(mrr)}
                      {Number(activeContract.monthly_fee_discount_percent) > 0 && (
                        <span className="ml-1 text-[11px] font-normal text-success">
                          (-{activeContract.monthly_fee_discount_percent}%)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Desde {formatDate(activeContract.start_date)}
                    </p>
                  </div>
                ) : (
                  <p className="py-1 text-xs text-muted-foreground">Sem contrato ativo</p>
                )}
              </SidebarSection>

              <SidebarSection title="Integrações">
                <p className="py-1 text-xs text-muted-foreground">—</p>
              </SidebarSection>

              <SidebarSection title="Atividade Recente" last>
                {logs.length === 0 ? (
                  <p className="py-1 text-xs text-muted-foreground">Sem atividade</p>
                ) : (
                  <div className="space-y-2 py-1">
                    {logs.slice(0, 3).map((l) => (
                      <div key={l.id} className="text-xs">
                        <span className="font-medium text-foreground">
                          {logActors[l.actor_id] || "Sistema"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {l.action === "create" && "criou"}
                          {l.action === "update" && "atualizou"}
                          {l.action === "status_change" && "mudou status"}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground/70">
                          · {relativeTime(l.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SidebarSection>
            </div>
          </aside>
        </div>

        {/* Diálogos */}
        <AlocarAtorDialog
          open={allocOpen}
          onOpenChange={setAllocOpen}
          projectId={projectId!}
          excludeActorIds={allocs.map((a) => a.actor_id)}
          onAllocated={load}
        />
        <NovoContratoDialog
          open={contractOpen}
          onOpenChange={setContractOpen}
          projectId={projectId!}
          onCreated={load}
        />
      </div>
    </TooltipProvider>
  );
}

// -----------------------------------------------------------
// Sidebar helpers
// -----------------------------------------------------------
function SidebarSection({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn("px-4 py-3", !last && "border-b border-border/60")}>
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

// -----------------------------------------------------------
// Critérios de aceite (markdown checkbox interativo)
// -----------------------------------------------------------
function CriteriaList({ text, onToggle }: { text: string; onToggle: (next: string) => void }) {
  const lines = text.split("\n");
  const items = lines.map((l, i) => {
    const m = l.match(/^\s*-\s+\[( |x|X)\]\s+(.*)$/);
    if (m) {
      return { idx: i, checked: m[1].toLowerCase() === "x", label: m[2], isTask: true as const, raw: l };
    }
    return { idx: i, isTask: false as const, raw: l };
  });

  const tasks = items.filter((it) => it.isTask);
  if (tasks.length === 0) {
    return <p className="whitespace-pre-wrap text-sm text-foreground/90">{text}</p>;
  }

  function toggle(idx: number) {
    const newLines = [...lines];
    const m = newLines[idx].match(/^(\s*-\s+\[)( |x|X)(\]\s+.*)$/);
    if (!m) return;
    const next = m[2].toLowerCase() === "x" ? " " : "x";
    newLines[idx] = `${m[1]}${next}${m[3]}`;
    onToggle(newLines.join("\n"));
  }

  const done = tasks.filter((t) => t.isTask && t.checked).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {done} de {tasks.length} concluídos
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) =>
          it.isTask ? (
            <li key={it.idx} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggle(it.idx)}
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  it.checked
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border hover:border-accent",
                )}
              >
                {it.checked && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <span
                className={cn(
                  "text-sm",
                  it.checked && "text-muted-foreground line-through",
                )}
              >
                {it.label}
              </span>
            </li>
          ) : it.raw.trim() ? (
            <li key={it.idx} className="text-sm text-foreground/80">
              {it.raw}
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
