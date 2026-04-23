/**
 * Aba "Tarefas" da página de detalhe do projeto — mini-kanban filtrado
 * por project_id. Cards compactos. Clique → tela cheia /dev/tasks/<code>.
 * Atalho "Ver na Área Dev" leva para /dev/kanban?projects=<CODE>.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjectMetrics } from "@/hooks/useProjectMetrics";
import { TaskCard } from "@/components/dev/TaskCard";
import { NovaTaskDialog } from "@/components/dev/NovaTaskDialog";
import type { Task, TaskStatus } from "@/types/tasks";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "Code Review" },
  { id: "done", title: "Done" },
];

interface Props {
  projectId: string;
  projectCode: string;
}

export function AbaTarefas({ projectId, projectCode }: Props) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks = [], isLoading } = useTasks({
    project_id: projectId,
    status: ["todo", "in_progress", "in_review", "done"],
  });
  const { data: metrics } = useProjectMetrics(projectId);

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    COLUMNS.forEach((c) => map.set(c.id, []));
    tasks.forEach((t) => {
      const list = map.get(t.status as TaskStatus);
      if (list) list.push(t);
    });
    return map;
  }, [tasks]);

  const tasksOpen = (metrics?.tasks_total ?? 0) - (metrics?.tasks_done ?? 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MiniKPI label="Tarefas abertas" value={tasksOpen} />
          <MiniKPI label="Concluídas" value={metrics?.tasks_done ?? 0} tone="success" />
          <MiniKPI
            label="Horas"
            value={`${metrics?.hours_actual ?? 0}h / ${metrics?.hours_estimated ?? 0}h`}
            hint={`${(metrics?.tasks_completion_percent ?? 0).toFixed(0)}% concluído`}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {tasks.length} tarefa(s) ativa(s) neste projeto
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/dev/kanban?projects=${projectCode}`}>
                <ExternalLink className="h-4 w-4" /> Ver na Área Dev
              </Link>
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
            <p className="text-sm font-medium text-foreground">Nenhuma tarefa ativa</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie a primeira tarefa para este projeto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const list = grouped.get(col.id) ?? [];
              return (
                <div key={col.id} className="rounded-lg bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h4 className="text-xs font-semibold text-foreground">{col.title}</h4>
                    <span className={cn(
                      "rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
                    )}>
                      {list.length}
                    </span>
                  </div>
                  <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
                    {list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        compact
                        onClick={() => navigate(`/dev/tasks/${t.code}`)}
                      />
                    ))}
                    {list.length === 0 && (
                      <p className="px-2 py-3 text-[10px] text-muted-foreground">Vazio</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <NovaTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultStatus="todo"
          defaultProjectId={projectId}
          onCreated={(code) => navigate(`/dev/tasks/${code}`)}
        />
      </div>
    </TooltipProvider>
  );
}

function MiniKPI({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className={cn(
        "mt-1.5 font-mono text-2xl font-bold leading-none",
        tone === "success" ? "text-success" : "text-foreground",
      )}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
