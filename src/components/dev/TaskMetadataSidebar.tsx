/**
 * Sidebar (30%) da tela cheia de task. Edição inline em TODOS os campos:
 * status, prioridade, tipo, responsáveis, sprint, time tracking, bloqueio,
 * due date. Click-away salva. ESC cancela. Mutações otimistas.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Lock,
  Plus,
  X,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTaskFields } from "@/hooks/useTaskDetail";
import { useDeleteTask, useSprints } from "@/hooks/useTasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Task,
  TaskAssignee,
  TaskPriority,
  TaskStatus,
  TaskTypeKind,
} from "@/types/tasks";
import {
  PRIORITY_LABEL,
  TYPE_ICON,
  TYPE_LABEL,
  actorColor,
  daysSince,
  hoursConsumptionPct,
  hoursToneClass,
  initials,
  projectColorClass,
  timeAgo,
} from "@/lib/tasks-helpers";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SB = supabase as any;

interface Props {
  task: Task;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; dot: string }[] = [
  { value: "backlog", label: "Backlog", dot: "bg-slate-400" },
  { value: "todo", label: "To Do", dot: "bg-blue-400" },
  { value: "in_progress", label: "In Progress", dot: "bg-amber-400" },
  { value: "in_review", label: "Code Review", dot: "bg-purple-400" },
  { value: "done", label: "Done", dot: "bg-emerald-500" },
  { value: "cancelled", label: "Cancelada", dot: "bg-destructive" },
];

const PRIORITY_OPTIONS: TaskPriority[] = ["urgent", "high", "medium", "low"];
const TYPE_OPTIONS: TaskTypeKind[] = ["feature", "bug", "chore", "refactor", "docs", "research"];

export function TaskMetadataSidebar({ task }: Props) {
  const update = useUpdateTaskFields(task.id, task.code);
  const remove = useDeleteTask();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data: sprints = [] } = useSprints();

  // Author actor name
  const { data: createdByActor } = useQuery({
    queryKey: ["actor-by-auth", task.created_by],
    enabled: !!task.created_by,
    queryFn: async () => {
      const { data } = await SB.from("humans")
        .select("actor_id, actors:actor_id (display_name)")
        .eq("auth_user_id", task.created_by)
        .maybeSingle();
      return (data?.actors?.display_name as string | undefined) ?? null;
    },
  });

  const handleStatusChange = async (next: TaskStatus) => {
    if (next === "cancelled") {
      const ok = await confirm({
        title: "Cancelar esta task?",
        description: "Tasks canceladas saem do fluxo. Você pode reabrir depois.",
        confirmLabel: "Cancelar task",
        variant: "destructive",
      });
      if (!ok) return;
    }
    update.mutate({ status: next });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Excluir esta task?",
      description: "A task será arquivada (soft delete). Audit log preserva o histórico.",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate(task.id, {
      onSuccess: () => {
        toast.success("Task excluída");
        navigate("/dev/kanban");
      },
    });
  };

  return (
    <aside className="space-y-5">
      {/* Status */}
      <Field label="Status">
        <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <span className="inline-flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Prioridade */}
      <Field label="Prioridade">
        <Select value={task.priority} onValueChange={(v) => update.mutate({ priority: v as TaskPriority })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "urgent" && "🔥 "}
                {p === "high" && "⬆ "}
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Tipo */}
      <Field label="Tipo">
        <Select value={task.type} onValueChange={(v) => update.mutate({ type: v as TaskTypeKind })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_ICON[t]} {TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Responsáveis */}
      <AssigneesField task={task} />

      {/* Projeto */}
      <Field label="Projeto">
        {task.project ? (
          <Link to={`/projetos/${task.project.id}`}>
            <Badge
              variant="outline"
              className={cn(
                "h-7 cursor-pointer gap-1.5 font-mono text-[11px]",
                projectColorClass(task.project.id),
              )}
            >
              <span className="font-semibold">{task.project.code}</span>
              <span className="truncate max-w-[160px]">{task.project.name}</span>
              <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
            </Badge>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Sem projeto</span>
        )}
      </Field>

      {/* Sprint */}
      <Field label="Sprint">
        <Select
          value={task.sprint_id ?? "__none__"}
          onValueChange={(v) => update.mutate({ sprint_id: v === "__none__" ? null : v })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sem sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground">Sem sprint (backlog)</span>
            </SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="font-mono text-xs text-muted-foreground mr-1.5">{s.code}</span>
                {s.name}
                {s.status === "active" && <span className="ml-2 text-[10px] text-emerald-400">● ativa</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Time tracking */}
      <TimeTrackingField task={task} />

      {/* Bloqueio */}
      <BlockField task={task} />

      {/* Due date */}
      <DueDateField task={task} />

      {/* Metadata */}
      <div className="space-y-1 border-t border-border pt-4 text-[11px] text-muted-foreground">
        {createdByActor && <p>Criada por <span className="text-foreground">{createdByActor}</span> {timeAgo(task.created_at)}</p>}
        {!createdByActor && <p>Criada {timeAgo(task.created_at)}</p>}
        <p>Última edição {timeAgo(task.updated_at)}</p>
        {task.rework_count > 0 && (
          <p className="text-amber-400">🔁 Reaberta {task.rework_count} {task.rework_count === 1 ? "vez" : "vezes"}</p>
        )}
      </div>

      {/* Excluir */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" /> Excluir task
      </Button>
      {confirmDialog}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ---------- Assignees ----------

interface ActorRow { id: string; type: "human" | "ai_agent"; display_name: string; avatar_url: string | null }

function AssigneesField({ task }: { task: Task }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: actors = [] } = useQuery({
    queryKey: ["actors-list"],
    queryFn: async (): Promise<ActorRow[]> => {
      const { data } = await SB.from("actors")
        .select("id, type, display_name, avatar_url")
        .is("deleted_at", null)
        .order("display_name");
      return (data ?? []) as ActorRow[];
    },
    staleTime: 5 * 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["task", task.code] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task-activity", task.id] });
  };

  const add = async (actor_id: string) => {
    if (task.assignees?.some((a) => a.actor_id === actor_id)) return;
    const isFirst = !task.assignees || task.assignees.length === 0;
    const { error } = await SB.from("task_assignees").insert({
      task_id: task.id,
      actor_id,
      is_primary: isFirst,
    });
    if (error) return toast.error("Erro ao adicionar responsável", { description: error.message });
    invalidate();
  };

  const remove = async (assigneeId: string) => {
    const { error } = await SB.from("task_assignees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", assigneeId);
    if (error) return toast.error("Erro ao remover responsável", { description: error.message });
    invalidate();
  };

  const setPrimary = async (assigneeId: string) => {
    // limpa primary atual e seta novo numa transação leve (2 updates)
    if (!task.assignees) return;
    const updates = task.assignees.map((a) =>
      SB.from("task_assignees").update({ is_primary: a.id === assigneeId }).eq("id", a.id),
    );
    await Promise.all(updates);
    invalidate();
  };

  const current = task.assignees ?? [];
  const available = actors.filter((a) => !current.some((c) => c.actor_id === a.id));

  return (
    <Field label="Responsáveis">
      {current.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem responsáveis</p>
      ) : (
        <ul className="space-y-1.5">
          {current.map((a) => (
            <AssigneeRow
              key={a.id}
              assignee={a}
              onSetPrimary={() => setPrimary(a.id)}
              onRemove={() => remove(a.id)}
            />
          ))}
        </ul>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 w-full text-xs">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar pessoa..." />
            <CommandList>
              <CommandEmpty>Nenhuma pessoa encontrada</CommandEmpty>
              <CommandGroup>
                {available.map((a) => {
                  const isAi = a.type === "ai_agent";
                  return (
                    <CommandItem
                      key={a.id}
                      value={a.display_name}
                      disabled={isAi}
                      onSelect={() => {
                        if (isAi) return;
                        add(a.id);
                        setOpen(false);
                      }}
                      className={cn(isAi && "opacity-50")}
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarFallback className={cn("text-[9px] font-semibold text-white", actorColor(a.id))}>
                          {initials(a.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{a.display_name}</span>
                      {isAi && <span className="text-[9px] text-muted-foreground">em breve</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function AssigneeRow({
  assignee,
  onSetPrimary,
  onRemove,
}: {
  assignee: TaskAssignee;
  onSetPrimary: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={onSetPrimary}>
            <Avatar
              className={cn(
                "h-7 w-7 transition-all",
                assignee.is_primary && "ring-2 ring-accent ring-offset-2 ring-offset-card",
              )}
            >
              <AvatarFallback className={cn("text-[10px] font-semibold text-white", actorColor(assignee.actor_id))}>
                {initials(assignee.actor?.display_name ?? "?")}
              </AvatarFallback>
            </Avatar>
          </button>
        </TooltipTrigger>
        <TooltipContent>{assignee.is_primary ? "Primary (clique p/ trocar)" : "Definir como primary"}</TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-foreground">{assignee.actor?.display_name ?? "—"}</p>
        {assignee.is_primary && (
          <p className="text-[9px] uppercase tracking-wide text-accent">primary</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Remover"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ---------- Time tracking ----------

function TimeTrackingField({ task }: { task: Task }) {
  const update = useUpdateTaskFields(task.id, task.code);
  const [estimated, setEstimated] = useState(task.estimated_hours?.toString() ?? "");
  const [actual, setActual] = useState(task.actual_hours.toString());

  useEffect(() => {
    setEstimated(task.estimated_hours?.toString() ?? "");
    setActual(task.actual_hours.toString());
  }, [task.estimated_hours, task.actual_hours]);

  const saveEstimated = () => {
    const v = estimated.trim() === "" ? null : Number(estimated);
    if (v === task.estimated_hours) return;
    update.mutate({ estimated_hours: v });
  };
  const saveActual = () => {
    const v = Number(actual) || 0;
    if (v === task.actual_hours) return;
    update.mutate({ actual_hours: v });
  };

  const pct = hoursConsumptionPct(task.actual_hours, task.estimated_hours);
  const tone = hoursToneClass(task.actual_hours, task.estimated_hours);

  return (
    <Field label="Time Tracking">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Estimado (h)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={estimated}
            onChange={(e) => setEstimated(e.target.value)}
            onBlur={saveEstimated}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="mt-1 h-8 font-mono text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Real (h)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            onBlur={saveActual}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="mt-1 h-8 font-mono text-sm"
          />
        </div>
      </div>
      <p className={cn("text-[11px] font-mono", tone)}>
        {pct == null ? (
          <span className="text-muted-foreground">Sem estimativa</span>
        ) : (
          <>
            Consumo: {pct.toFixed(0)}%
            {pct > 100 && " ⚠"}
          </>
        )}
      </p>
    </Field>
  );
}

// ---------- Bloqueio ----------

function BlockField({ task }: { task: Task }) {
  const update = useUpdateTaskFields(task.id, task.code);
  const { confirm, dialog } = useConfirm();
  const [reason, setReason] = useState(task.blocked_reason ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => setReason(task.blocked_reason ?? ""), [task.blocked_reason]);

  const block = async () => {
    if (!reason.trim()) {
      toast.error("Razão é obrigatória para bloquear");
      return;
    }
    setSaving(true);
    await update.mutateAsync({
      is_blocked: true,
      blocked_reason: reason.trim(),
      blocked_since: task.blocked_since ?? new Date().toISOString(),
    } as Partial<Task>);
    setSaving(false);
  };

  const unblock = async () => {
    const ok = await confirm({
      title: "Desbloquear task?",
      description: "O motivo anterior será preservado no histórico de atividade.",
      confirmLabel: "Desbloquear",
    });
    if (!ok) return;
    setSaving(true);
    await update.mutateAsync({
      is_blocked: false,
      blocked_reason: null,
      blocked_since: null,
    } as Partial<Task>);
    setReason("");
    setSaving(false);
  };

  return (
    <Field label="Bloqueio">
      <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className={cn("h-4 w-4", task.is_blocked ? "text-red-400" : "text-muted-foreground")} />
            <span className="text-xs font-medium">
              {task.is_blocked ? "Bloqueada" : "Não bloqueada"}
            </span>
          </div>
          <Switch
            checked={task.is_blocked}
            onCheckedChange={(v) => (v ? null : unblock())}
            disabled={saving}
          />
        </div>
        {task.is_blocked && task.blocked_since && (
          <p className="text-[11px] text-red-400">
            Bloqueada há {daysSince(task.blocked_since)} dia(s)
          </p>
        )}
        {(task.is_blocked || reason.trim()) && (
          <>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => task.is_blocked && reason.trim() !== task.blocked_reason && block()}
              placeholder="Por que está bloqueada? (obrigatório)"
              className="min-h-[60px] text-xs"
            />
            {!task.is_blocked && reason.trim() && (
              <Button size="sm" onClick={block} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-3 w-3 animate-spin" />} Bloquear
              </Button>
            )}
          </>
        )}
      </div>
      {dialog}
    </Field>
  );
}

// ---------- Due date ----------

function DueDateField({ task }: { task: Task }) {
  const update = useUpdateTaskFields(task.id, task.code);
  const dueRaw = (task as Task & { due_date?: string | null }).due_date ?? "";
  const [val, setVal] = useState<string>(dueRaw ?? "");

  useEffect(() => setVal(dueRaw ?? ""), [dueRaw]);

  const save = () => {
    const next = val || null;
    if (next === (dueRaw || null)) return;
    update.mutate({ due_date: next } as Partial<Task>);
  };

  let warning: string | null = null;
  if (dueRaw && task.status !== "done" && task.status !== "cancelled") {
    const diff = Math.floor(
      (new Date(dueRaw).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
    );
    if (diff < 0) warning = `Atrasada há ${Math.abs(diff)} dia(s)`;
  }

  return (
    <Field label="Due Date">
      <Input
        type="date"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        className="h-9 font-mono text-sm"
      />
      {warning && <p className="text-[11px] text-red-400">⚠ {warning}</p>}
    </Field>
  );
}
