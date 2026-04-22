import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Flag,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  MoreVertical,
  Trash2,
  DollarSign,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/formatters";
import {
  MILESTONE_STATUS_OPTIONS,
  MilestoneStatus,
  ProjectMilestone,
  diffDays,
  milestoneStatusClass,
  milestoneStatusLabel,
} from "@/lib/escopo-helpers";
import { useConfirm } from "@/components/ConfirmDialog";
import { GETBRAIN_ORG_ID } from "@/lib/projetos-helpers";

interface Props {
  projectId: string;
}

export function AbaMarcos({ projectId }: Props) {
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const [items, setItems] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [projectId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("sequence_order");
    setItems((data ?? []) as ProjectMilestone[]);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setOpenModal(true);
  }

  function openEdit(m: ProjectMilestone) {
    setEditing(m);
    setOpenModal(true);
  }

  async function softDelete(id: string) {
    const ok = await confirmDialog({
      title: "Remover marco?",
      description: "Esta ação enviará o marco para a lixeira (soft delete).",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("project_milestones")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marco removido");
    load();
  }

  async function quickStatus(m: ProjectMilestone, newStatus: MilestoneStatus) {
    const updates: any = { status: newStatus };
    if (newStatus === "concluido" && !m.actual_date) {
      updates.actual_date = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("project_milestones")
      .update(updates)
      .eq("id", m.id);
    if (error) return toast.error(error.message);

    // Camada 3.2 — disparar billing via edge function se aplicável
    if (newStatus === "concluido" && m.triggers_billing && (m.billing_amount ?? 0) > 0) {
      try {
        const { error: fnErr } = await supabase.functions.invoke(
          "milestone-billing-trigger",
          { body: { milestone_id: m.id } },
        );
        if (fnErr) {
          toast.error("Marco concluído, mas falhou ao gerar cobrança: " + fnErr.message);
        } else {
          toast.success("Marco concluído. Lançamento financeiro criado.");
        }
      } catch (e: any) {
        toast.error("Marco concluído, mas falhou ao gerar cobrança");
      }
    } else {
      toast.success("Status atualizado");
    }
    load();
  }

  // ─── KPIs ───
  const concluded = items.filter((m) => m.status === "concluido");
  const drifts = concluded
    .filter((m) => m.actual_date)
    .map((m) => diffDays(m.target_date, m.actual_date!));
  const avgDrift =
    drifts.length > 0
      ? Math.round(drifts.reduce((s, d) => s + d, 0) / drifts.length)
      : null;
  const nextMilestone = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return items
      .filter((m) => m.status !== "concluido" && m.status !== "cancelado")
      .find((m) => m.target_date >= today);
  }, [items]);

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/30" />;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Marcos do Projeto
          </h2>
          <p className="text-xs text-muted-foreground">
            Entregas intermediárias com data-alvo × data-real
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo Marco
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
          <Flag className="h-8 w-8 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Nenhum marco cadastrado
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quebre o projeto em marcos para acompanhar entregas e desvio de prazo.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Novo Marco
          </Button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat
              label="Marcos Concluídos"
              value={`${concluded.length} de ${items.length}`}
              icon={CheckCircle2}
              tone="success"
            />
            <MiniStat
              label="Desvio Médio"
              value={avgDrift === null ? "—" : avgDrift > 0 ? `+${avgDrift}d` : `${avgDrift}d`}
              icon={TrendingUp}
              tone={avgDrift === null ? "default" : avgDrift > 0 ? "danger" : "success"}
            />
            <MiniStat
              label="Próximo Marco"
              value={
                nextMilestone
                  ? nextMilestone.title.length > 22
                    ? nextMilestone.title.slice(0, 22) + "…"
                    : nextMilestone.title
                  : "—"
              }
              hint={
                nextMilestone
                  ? `em ${diffDays(new Date(), nextMilestone.target_date)} dias · ${formatDate(nextMilestone.target_date)}`
                  : ""
              }
              icon={Calendar}
            />
          </div>

          {/* Timeline horizontal */}
          <div className="overflow-x-auto rounded-lg border border-border bg-card px-5 py-6">
            <div className="flex min-w-max items-start gap-2">
              {items.map((m, i) => {
                const isLast = i === items.length - 1;
                const isOverdue =
                  m.status !== "concluido" &&
                  m.status !== "cancelado" &&
                  new Date(m.target_date) < new Date();
                const overdueBy = isOverdue
                  ? diffDays(m.target_date, new Date())
                  : 0;
                return (
                  <div key={m.id} className="flex items-start">
                    <button
                      type="button"
                      onClick={() => setFocusedId(m.id)}
                      className="flex w-[110px] flex-col items-center gap-1.5"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                              m.status === "concluido" &&
                                "border-success bg-success text-success-foreground",
                              m.status === "em_andamento" &&
                                "border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px_hsl(var(--accent)/0.18)]",
                              m.status === "atrasado" &&
                                "border-destructive bg-destructive/20 text-destructive",
                              isOverdue &&
                                m.status !== "atrasado" &&
                                "border-destructive bg-destructive/20 text-destructive",
                              m.status === "cancelado" &&
                                "border-muted bg-muted text-muted-foreground",
                              m.status === "planejado" &&
                                !isOverdue &&
                                "border-border bg-card text-muted-foreground",
                            )}
                          >
                            {m.status === "concluido" && (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            {m.status === "em_andamento" && (
                              <>
                                <Circle className="h-2 w-2 fill-current" />
                                <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
                              </>
                            )}
                            {(m.status === "atrasado" || isOverdue) && (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            {m.status === "cancelado" && <XCircle className="h-4 w-4" />}
                            {m.status === "planejado" && !isOverdue && (
                              <span className="text-[10px] font-bold">
                                {m.sequence_order}
                              </span>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {m.title} · {milestoneStatusLabel(m.status)}
                          {isOverdue && ` · +${overdueBy}d atraso`}
                        </TooltipContent>
                      </Tooltip>
                      <span
                        className={cn(
                          "max-w-[100px] truncate text-[11px] font-medium leading-tight",
                          m.status === "concluido" && "text-foreground",
                          m.status === "em_andamento" && "text-accent",
                          (m.status === "atrasado" || isOverdue) && "text-destructive",
                          m.status === "planejado" && !isOverdue && "text-muted-foreground",
                        )}
                      >
                        {m.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(m.target_date)}
                      </span>
                      {isOverdue && (
                        <span className="rounded-sm bg-destructive/15 px-1 py-px text-[9px] font-semibold text-destructive">
                          +{overdueBy}d
                        </span>
                      )}
                    </button>
                    {!isLast && (
                      <div
                        className={cn(
                          "mt-4 h-0.5 w-6 rounded-full",
                          m.status === "concluido" ? "bg-success" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-[34%]">Título</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[12%]">Alvo</TableHead>
                  <TableHead className="w-[12%]">Real</TableHead>
                  <TableHead className="w-[10%]">Desvio</TableHead>
                  <TableHead className="w-[10%]">Cobrança</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => {
                  const drift =
                    m.actual_date && m.target_date
                      ? diffDays(m.target_date, m.actual_date)
                      : null;
                  return (
                    <TableRow
                      key={m.id}
                      className={cn(
                        "group/row",
                        focusedId === m.id && "bg-accent/5",
                      )}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {m.sequence_order}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {m.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80",
                                milestoneStatusClass(m.status),
                              )}
                            >
                              {milestoneStatusLabel(m.status)}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {MILESTONE_STATUS_OPTIONS.map((o) => (
                              <DropdownMenuItem
                                key={o.value}
                                onClick={() => quickStatus(m, o.value)}
                                disabled={o.value === m.status}
                              >
                                {o.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(m.target_date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.actual_date ? formatDate(m.actual_date) : "—"}
                      </TableCell>
                      <TableCell>
                        {drift === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : drift > 0 ? (
                          <span className="text-xs font-medium text-destructive">
                            +{drift}d
                          </span>
                        ) : drift < 0 ? (
                          <span className="text-xs font-medium text-success">
                            {drift}d
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-foreground">
                            0d
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.triggers_billing && m.billing_amount ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-success">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(Number(m.billing_amount))}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover/row:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => softDelete(m.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <MarcoModal
        open={openModal}
        onOpenChange={setOpenModal}
        projectId={projectId}
        editing={editing}
        nextOrder={Math.max(0, ...items.map((m) => m.sequence_order)) + 1}
        onSaved={load}
      />
      {confirmDialogEl}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "danger";
  hint?: string;
}) {
  const toneClass: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
  };
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={cn("mt-1.5 font-mono text-xl font-bold leading-none", toneClass[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MarcoModal({
  open,
  onOpenChange,
  projectId,
  editing,
  nextOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  projectId: string;
  editing: ProjectMilestone | null;
  nextOrder: number;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(1);
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("planejado");
  const [triggersBilling, setTriggersBilling] = useState(false);
  const [billingAmount, setBillingAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setOrder(editing.sequence_order);
      setTargetDate(editing.target_date);
      setStatus(editing.status);
      setTriggersBilling(editing.triggers_billing);
      setBillingAmount(editing.billing_amount?.toString() ?? "");
    } else {
      setTitle("");
      setDescription("");
      setOrder(nextOrder);
      setTargetDate("");
      setStatus("planejado");
      setTriggersBilling(false);
      setBillingAmount("");
    }
  }, [open, editing, nextOrder]);

  async function save() {
    if (!title.trim()) return toast.error("Título é obrigatório");
    if (!targetDate) return toast.error("Data alvo é obrigatória");
    if (triggersBilling && (!billingAmount || Number(billingAmount) <= 0)) {
      return toast.error("Informe o valor de cobrança");
    }
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      sequence_order: order,
      target_date: targetDate,
      status,
      triggers_billing: triggersBilling,
      billing_amount: triggersBilling ? Number(billingAmount) : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase
        .from("project_milestones")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("project_milestones").insert({
        ...payload,
        organization_id: GETBRAIN_ORG_ID,
        project_id: projectId,
      }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Marco atualizado" : "Marco criado");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar marco" : "Novo marco"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Ex: Entrega Módulo A"
            />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ordem *</Label>
              <Input
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label className="text-xs">Data alvo *</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MILESTONE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="billing" className="text-sm font-medium">
                  Dispara cobrança ao concluir?
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Cria automaticamente lançamento no Financeiro.
                </p>
              </div>
              <Switch
                id="billing"
                checked={triggersBilling}
                onCheckedChange={setTriggersBilling}
              />
            </div>
            {triggersBilling && (
              <div>
                <Label className="text-xs">Valor a cobrar (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={billingAmount}
                  onChange={(e) => setBillingAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
