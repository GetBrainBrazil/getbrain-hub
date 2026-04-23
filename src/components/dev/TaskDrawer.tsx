/**
 * Drawer LEVE de tarefa — preview e edição rápida (status/prioridade/horas/bloqueio).
 * Edição completa fica para a tela cheia (/dev/tasks/:code) no Prompt 03B.
 */
import { useEffect, useState } from "react";
import { X, ExternalLink, Lock } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import type { Task, TaskPriority, TaskStatus, TaskTypeKind } from "@/types/tasks";
import {
  PRIORITY_LABEL,
  TYPE_ICON,
  TYPE_LABEL,
  projectColorClass,
  actorColor,
  initials,
} from "@/lib/tasks-helpers";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "Code Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelada" },
];

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];
const TYPE_OPTIONS: TaskTypeKind[] = ["feature", "bug", "chore", "refactor", "docs", "research"];

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDrawer({ task, open, onOpenChange }: Props) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimated, setEstimated] = useState("");
  const [actual, setActual] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setEstimated(task.estimated_hours?.toString() ?? "");
    setActual(task.actual_hours.toString());
    setIsBlocked(task.is_blocked);
    setBlockedReason(task.blocked_reason ?? "");
    setDueDate((task as Task & { due_date?: string | null }).due_date ?? "");
  }, [task]);

  if (!task) return null;

  const save = (updates: Partial<Task>) => {
    update.mutate({ id: task.id, updates });
  };

  const saveAllOnBlur = () => {
    const updates: Partial<Task> & { due_date?: string | null } = {
      title: title.trim() || task.title,
      description: description.trim() || null,
      estimated_hours: estimated ? Number(estimated) : null,
      actual_hours: Number(actual) || 0,
    };
    if ((dueDate || null) !== ((task as Task & { due_date?: string | null }).due_date ?? null)) {
      (updates as { due_date?: string | null }).due_date = dueDate || null;
    }
    update.mutate({ id: task.id, updates });
  };

  const toggleBlocked = (v: boolean) => {
    setIsBlocked(v);
    if (v) {
      // só salva quando tiver razão
      return;
    }
    update.mutate({
      id: task.id,
      updates: {
        is_blocked: false,
        blocked_reason: null,
        blocked_since: null,
      } as Partial<Task>,
    });
    setBlockedReason("");
  };

  const saveBlocked = () => {
    if (!isBlocked) return;
    if (!blockedReason.trim()) return;
    update.mutate({
      id: task.id,
      updates: {
        is_blocked: true,
        blocked_reason: blockedReason.trim(),
        blocked_since: new Date().toISOString(),
      } as Partial<Task>,
    });
  };

  const projChip = task.project ? projectColorClass(task.project.id) : "";

  return (
    <TooltipProvider delayDuration={150}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[40vw] sm:min-w-[520px] p-0 flex flex-col gap-0"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="font-mono text-sm font-semibold text-accent">{task.code}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" size="sm" disabled className="h-8">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir em tela cheia
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Disponível em breve (Prompt 03B)</TooltipContent>
              </Tooltip>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Título
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveAllOnBlur}
                className="mt-1.5 text-base font-semibold"
              />
            </div>

            {task.project && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("font-mono text-[11px]", projChip)}>
                  {task.project.code} · {task.project.name}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={task.status}
                  onValueChange={(v) => save({ status: v as TaskStatus })}
                >
                  <SelectTrigger className="mt-1.5 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Prioridade
                </Label>
                <Select
                  value={task.priority}
                  onValueChange={(v) => save({ priority: v as TaskPriority })}
                >
                  <SelectTrigger className="mt-1.5 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p} className="text-sm">
                        {PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tipo
                </Label>
                <Select
                  value={task.type}
                  onValueChange={(v) => save({ type: v as TaskTypeKind })}
                >
                  <SelectTrigger className="mt-1.5 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {TYPE_ICON[t]} {TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {task.assignees && task.assignees.length > 0 && (
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Responsáveis (edição completa em tela cheia)
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.assignees.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1",
                        a.is_primary && "border-accent/60",
                      )}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className={cn(
                            "text-[10px] font-semibold text-white",
                            actorColor(a.actor_id),
                          )}
                        >
                          {initials(a.actor?.display_name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{a.actor?.display_name}</span>
                      {a.is_primary && (
                        <span className="text-[9px] uppercase tracking-wide text-accent">
                          primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Estimado (h)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={estimated}
                  onChange={(e) => setEstimated(e.target.value)}
                  onBlur={saveAllOnBlur}
                  className="mt-1.5 h-9"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Real (h)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  onBlur={saveAllOnBlur}
                  className="mt-1.5 h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Data de entrega
              </Label>
              <Input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={saveAllOnBlur}
                className="mt-1.5 h-9"
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className={cn("h-4 w-4", isBlocked ? "text-red-400" : "text-muted-foreground")} />
                  <Label className="text-xs font-medium">Bloqueada</Label>
                </div>
                <Switch checked={isBlocked} onCheckedChange={toggleBlocked} />
              </div>
              {isBlocked && (
                <Textarea
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  onBlur={saveBlocked}
                  placeholder="Por que está bloqueada? (obrigatório)"
                  className="min-h-[60px] text-sm"
                />
              )}
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Descrição
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveAllOnBlur}
                placeholder="Contexto, critérios de aceite, links..."
                className="mt-1.5 min-h-[140px] font-mono text-sm"
              />
            </div>

            {task.rework_count > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                🔁 Esta tarefa foi reaberta {task.rework_count}{" "}
                {task.rework_count === 1 ? "vez" : "vezes"}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Excluir esta tarefa?")) {
                  remove.mutate(task.id, {
                    onSuccess: () => onOpenChange(false),
                  });
                }
              }}
            >
              Excluir
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </footer>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
