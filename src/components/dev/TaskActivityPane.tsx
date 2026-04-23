/**
 * Aba Atividade da tela cheia da task: timeline lendo audit_logs.
 * Renderiza eventos em linguagem natural pt-BR.
 */
import {
  Lock,
  Unlock,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  UserPlus,
  Pencil,
  PlusCircle,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskActivity } from "@/hooks/useTaskActivity";
import { actorColor, initials, timeAgo } from "@/lib/tasks-helpers";
import type { TaskActivityEntry } from "@/types/tasks";
import { cn } from "@/lib/utils";

interface Props {
  taskId: string;
}

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "Code Review",
  done: "Done",
  cancelled: "Cancelada",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente",
};

interface RenderedEvent {
  icon: React.ReactNode;
  iconBg: string;
  text: React.ReactNode;
}

function renderEvent(entry: TaskActivityEntry): RenderedEvent {
  const changes = (entry.changes ?? {}) as Record<string, { old?: unknown; new?: unknown }>;

  if (entry.action === "create") {
    return {
      icon: <PlusCircle className="h-3 w-3" />,
      iconBg: "bg-emerald-500/20 text-emerald-300",
      text: <>criou esta task</>,
    };
  }
  if (entry.action === "delete") {
    return {
      icon: <Trash2 className="h-3 w-3" />,
      iconBg: "bg-destructive/20 text-destructive",
      text: <>excluiu esta task</>,
    };
  }

  // status
  if (changes.status) {
    const oldS = STATUS_LABEL[String(changes.status.old)] ?? String(changes.status.old);
    const newS = STATUS_LABEL[String(changes.status.new)] ?? String(changes.status.new);
    return {
      icon: <ArrowRight className="h-3 w-3" />,
      iconBg: "bg-blue-500/20 text-blue-300",
      text: <>moveu de <b>{oldS}</b> para <b>{newS}</b></>,
    };
  }

  // is_blocked
  if (changes.is_blocked) {
    if (changes.is_blocked.new === true) {
      const reason = (entry.metadata?.blocked_reason as string | undefined) ?? (changes.blocked_reason?.new as string | undefined);
      return {
        icon: <Lock className="h-3 w-3" />,
        iconBg: "bg-red-500/20 text-red-300",
        text: <>marcou como bloqueada{reason ? <>: <span className="italic">"{reason}"</span></> : null}</>,
      };
    }
    return {
      icon: <Unlock className="h-3 w-3" />,
      iconBg: "bg-emerald-500/20 text-emerald-300",
      text: <>desbloqueou a task</>,
    };
  }

  if (changes.priority) {
    const oldP = PRIORITY_LABEL[String(changes.priority.old)] ?? String(changes.priority.old);
    const newP = PRIORITY_LABEL[String(changes.priority.new)] ?? String(changes.priority.new);
    return {
      icon: <Tag className="h-3 w-3" />,
      iconBg: "bg-amber-500/20 text-amber-300",
      text: <>alterou prioridade de <b>{oldP}</b> para <b>{newP}</b></>,
    };
  }

  if (changes.estimated_hours) {
    return {
      icon: <Clock className="h-3 w-3" />,
      iconBg: "bg-cyan-500/20 text-cyan-300",
      text: <>alterou estimativa de <b>{String(changes.estimated_hours.old ?? "—")}h</b> para <b>{String(changes.estimated_hours.new ?? "—")}h</b></>,
    };
  }

  if (changes.actual_hours) {
    return {
      icon: <Clock className="h-3 w-3" />,
      iconBg: "bg-cyan-500/20 text-cyan-300",
      text: <>atualizou horas reais para <b>{String(changes.actual_hours.new ?? 0)}h</b></>,
    };
  }

  if (changes.title) {
    return {
      icon: <Pencil className="h-3 w-3" />,
      iconBg: "bg-muted text-foreground",
      text: <>renomeou a task</>,
    };
  }

  if (changes.description) {
    return {
      icon: <Pencil className="h-3 w-3" />,
      iconBg: "bg-muted text-foreground",
      text: <>editou a descrição</>,
    };
  }

  if (changes.labels) {
    return {
      icon: <Tag className="h-3 w-3" />,
      iconBg: "bg-purple-500/20 text-purple-300",
      text: <>atualizou labels</>,
    };
  }

  if (changes.acceptance_criteria) {
    return {
      icon: <CheckCircle2 className="h-3 w-3" />,
      iconBg: "bg-emerald-500/20 text-emerald-300",
      text: <>atualizou critérios de aceite</>,
    };
  }

  if (changes.assignee_added || changes.assignees) {
    return {
      icon: <UserPlus className="h-3 w-3" />,
      iconBg: "bg-blue-500/20 text-blue-300",
      text: <>atualizou responsáveis</>,
    };
  }

  if (entry.action === "comment") {
    return {
      icon: <MessageSquare className="h-3 w-3" />,
      iconBg: "bg-blue-500/20 text-blue-300",
      text: <>comentou</>,
    };
  }

  // fallback genérico — lista chaves alteradas
  const fields = Object.keys(changes);
  return {
    icon: <Circle className="h-3 w-3" />,
    iconBg: "bg-muted text-muted-foreground",
    text: fields.length ? <>atualizou <b>{fields.join(", ")}</b></> : <>realizou ação <b>{entry.action}</b></>,
  };
}

export function TaskActivityPane({ taskId }: Props) {
  const { data: events = [], isLoading } = useTaskActivity(taskId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando timeline...</p>;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
        Nenhum evento registrado ainda. Mudanças na task aparecem aqui automaticamente.
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border/60 pl-6">
      {events.map((e) => {
        const rendered = renderEvent(e);
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", rendered.iconBg)}>
              {rendered.icon}
            </span>
            <div className="flex items-start gap-3">
              <Avatar className="mt-0.5 h-6 w-6">
                <AvatarFallback className={cn("text-[9px] font-semibold text-white", actorColor(e.actor_id ?? "x"))}>
                  {initials(e.actor?.display_name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">{e.actor?.display_name ?? "Sistema"}</span>{" "}
                <span className="text-muted-foreground">{rendered.text}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 text-xs text-muted-foreground/70">· {timeAgo(e.created_at)}</span>
                  </TooltipTrigger>
                  <TooltipContent>{new Date(e.created_at).toLocaleString("pt-BR")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
