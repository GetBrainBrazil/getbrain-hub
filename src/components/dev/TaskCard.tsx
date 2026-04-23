/**
 * Card denso de tarefa — padrão Linear/Jira.
 * Barra lateral colorida = prioridade · ícone de tipo · chip de projeto ·
 * flags (🔒 bloqueada, 🔁 retrabalho) · horas com tonificação semântica ·
 * due date com cor · stack de avatares com primary destacado.
 */
import { Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/tasks";
import {
  PRIORITY_BAR_CLASS,
  TYPE_ICON,
  TYPE_LABEL,
  projectColorClass,
  actorColor,
  initials,
  hoursConsumptionPct,
  hoursToneClass,
  daysSince,
  dueDateInfo,
} from "@/lib/tasks-helpers";

interface Props {
  task: Task;
  onClick?: () => void;
  dragging?: boolean;
  compact?: boolean;
}

export function TaskCard({ task, onClick, dragging, compact }: Props) {
  const consumptionPct = hoursConsumptionPct(task.actual_hours, task.estimated_hours);
  const overrun = consumptionPct != null && consumptionPct > 100;
  const due = dueDateInfo(
    (task as Task & { due_date?: string | null }).due_date ?? null,
    task.status === "done",
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer overflow-hidden rounded-md border border-border bg-card text-left shadow-sm transition-all hover:border-accent/60 hover:shadow-lg",
        compact ? "min-h-[150px]" : "min-h-[180px]",
        dragging && "opacity-40",
      )}
    >
      <span className={cn("w-1 shrink-0", PRIORITY_BAR_CLASS[task.priority])} />
      <div className={cn("min-w-0 flex-1", compact ? "p-2.5 space-y-1.5" : "p-3 space-y-2")}>
        {/* Header: code + tipo */}
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
            <span className="font-semibold">{task.code}</span>
            <span>·</span>
            <span title={TYPE_LABEL[task.type]}>{TYPE_ICON[task.type]} {TYPE_LABEL[task.type]}</span>
          </div>
        </div>

        {/* Título */}
        <h4
          className={cn(
            "font-medium leading-snug text-foreground line-clamp-2",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {task.title}
        </h4>

        {/* Projeto */}
        {task.project && (
          <div>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[10px] px-1.5 py-0 h-5 border",
                projectColorClass(task.project.id),
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-semibold mr-1">{task.project.code}</span>
              <span className="truncate max-w-[120px]">{task.project.name}</span>
            </Badge>
          </div>
        )}

        {/* Flags row (só renderiza se tiver algo) */}
        {(task.is_blocked || task.rework_count > 0) && (
          <div className="flex items-center gap-2 text-[10px]">
            {task.is_blocked && task.blocked_since && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-medium text-red-400"
                  >
                    <Lock className="h-2.5 w-2.5" /> {daysSince(task.blocked_since)}d
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {task.blocked_reason ?? "Bloqueada"}
                </TooltipContent>
              </Tooltip>
            )}
            {task.rework_count > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-400">
                🔁 {task.rework_count}
              </span>
            )}
          </div>
        )}

        {/* Horas + due date + avatares */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className={cn("flex items-center gap-2 text-[11px] font-mono", hoursToneClass(task.actual_hours, task.estimated_hours))}>
            <span>
              ⏱ {task.actual_hours}h
              {task.estimated_hours != null ? ` / ${task.estimated_hours}h` : ""}
              {task.estimated_hours == null && (
                <span className="text-muted-foreground"> · sem estimativa</span>
              )}
            </span>
            {overrun && <span title="Estourou estimativa">⚠</span>}
          </div>
          {due && (
            <span className={cn("text-[11px] font-mono", due.className)}>
              📅 {due.label}
              {due.suffix && <span className="ml-1 text-[10px]">← {due.suffix}</span>}
            </span>
          )}
        </div>

        {task.assignees && task.assignees.length > 0 && (
          <div className="flex justify-end">
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <Tooltip key={a.id}>
                  <TooltipTrigger asChild>
                    <Avatar
                      className={cn(
                        "h-6 w-6 border-2 border-card",
                        a.is_primary && "ring-2 ring-accent",
                      )}
                    >
                      <AvatarFallback
                        className={cn(
                          "text-[9px] font-semibold text-white",
                          actorColor(a.actor_id),
                        )}
                      >
                        {initials(a.actor?.display_name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    {a.actor?.display_name}
                    {a.is_primary && " (primary)"}
                  </TooltipContent>
                </Tooltip>
              ))}
              {task.assignees.length > 3 && (
                <span className="ml-1 self-center text-[10px] text-muted-foreground">
                  +{task.assignees.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
