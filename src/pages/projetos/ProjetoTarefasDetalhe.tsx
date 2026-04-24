/**
 * /projetos/:id/tarefas
 *
 * Visão detalhada de tarefas/sprints filtrada pelo projeto.
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ListChecks,
  Activity,
  PieChart,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProjetoHeader } from "@/hooks/projetos/useProjetoHeader";
import { useProjectMetrics } from "@/hooks/useProjectMetrics";
import {
  ProjetoDetalheHeader,
  type MiniKpi,
} from "@/components/projetos/detalhe/ProjetoDetalheHeader";
import {
  DetalheBloco,
  ComingSoonBlock,
} from "@/components/projetos/detalhe/DetalheBloco";

interface ProjectTask {
  id: string;
  code: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  estimated_hours: number | null;
  actual_hours: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  completed_at: string | null;
  due_date: string | null;
}

function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-tasks", projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, code, title, status, type, priority, estimated_hours, actual_hours, is_blocked, blocked_reason, completed_at, due_date",
        )
        .eq("project_id", projectId!)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectTask[];
    },
  });
}

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "A fazer",
  in_progress: "Em andamento",
  in_review: "Em revisão",
  done: "Concluída",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

const STATUS_TONES: Record<string, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-muted-foreground",
  in_progress: "bg-accent",
  in_review: "bg-warning",
  done: "bg-success",
  blocked: "bg-destructive",
  cancelled: "bg-muted",
};

export default function ProjetoTarefasDetalhe() {
  const { id: projectId = "" } = useParams<{ id: string }>();
  const { data: header } = useProjetoHeader(projectId);
  const { data: m } = useProjectMetrics(projectId);
  const { data: tasks = [], isLoading } = useProjectTasks(projectId);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      map[t.status] = (map[t.status] ?? 0) + 1;
    }
    return map;
  }, [tasks]);

  const blockedTasks = useMemo(
    () => tasks.filter((t) => t.is_blocked || t.status === "blocked"),
    [tasks],
  );
  const deviated = useMemo(
    () =>
      tasks
        .filter((t) => t.estimated_hours && t.actual_hours > t.estimated_hours)
        .sort(
          (a, b) =>
            (b.actual_hours - (b.estimated_hours ?? 0)) -
            (a.actual_hours - (a.estimated_hours ?? 0)),
        )
        .slice(0, 8),
    [tasks],
  );

  const conclusion = m?.tasks_completion_percent ?? 0;

  const kpis: MiniKpi[] = [
    {
      label: "Conclusão",
      value: `${conclusion.toFixed(0)}%`,
      hint: `${m?.tasks_done ?? 0}/${m?.tasks_total ?? 0}`,
      tone: "accent",
    },
    {
      label: "Em andamento",
      value: m?.tasks_in_progress ?? 0,
    },
    {
      label: "Bloqueadas",
      value: m?.tasks_blocked ?? 0,
      tone: (m?.tasks_blocked ?? 0) > 0 ? "danger" : "default",
    },
    {
      label: "Horas (real / est.)",
      value: `${(m?.hours_actual ?? 0).toFixed(0)}h`,
      hint: `Estim. ${(m?.hours_estimated ?? 0).toFixed(0)}h`,
    },
  ];

  if (isLoading && !header) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ProjetoDetalheHeader
        projectId={projectId}
        projectCode={header?.code}
        projectName={header?.name}
        companyName={header?.company_name}
        title="Visão de Tarefas"
        subtitle="Progresso, distribuição e desvio de horas"
        kpis={kpis}
      />

      {/* Bloco 1: Burndown / progresso */}
      <DetalheBloco icon={Activity} title="Progresso geral">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Conclusão de tarefas</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {(m?.tasks_done ?? 0)}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {m?.tasks_total ?? 0}
              </span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(0, Math.min(100, conclusion))}%` }}
            />
          </div>
          {tasks.length === 0 && (
            <ComingSoonBlock message="Crie tarefas vinculadas a este projeto na Área Dev para ver burndown, velocidade e bloqueios." />
          )}
        </div>
      </DetalheBloco>

      {/* Bloco 2: Distribuição por status */}
      <DetalheBloco icon={PieChart} title="Distribuição por status">
        {tasks.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <div
                key={status}
                className="rounded-md border border-border/60 bg-card/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      STATUS_TONES[status] ?? "bg-muted-foreground",
                    )}
                  />
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {STATUS_LABELS[status] ?? status}
                  </p>
                </div>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                  {count}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
            Nenhuma tarefa neste projeto.
          </p>
        )}
      </DetalheBloco>

      {/* Bloco 3: Tarefas bloqueadas + desvio */}
      <DetalheBloco icon={Clock} title="Bloqueios & desvio de horas">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Bloqueadas {blockedTasks.length ? `· ${blockedTasks.length}` : ""}
            </p>
            {blockedTasks.length ? (
              <ul className="space-y-1.5">
                {blockedTasks.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      <Link
                        to={`/dev/tasks/${t.code}`}
                        className="hover:text-accent"
                      >
                        {t.code} · {t.title}
                      </Link>
                    </p>
                    {t.blocked_reason && (
                      <p className="mt-0.5 text-[11px] text-destructive">
                        {t.blocked_reason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Nenhuma tarefa bloqueada.
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Top desvios de horas
            </p>
            {deviated.length ? (
              <ul className="space-y-1.5">
                {deviated.map((t) => {
                  const dev = t.actual_hours - (t.estimated_hours ?? 0);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          <Link to={`/dev/tasks/${t.code}`} className="hover:text-accent">
                            {t.code} · {t.title}
                          </Link>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Estim. {t.estimated_hours ?? 0}h · Real {t.actual_hours.toFixed(1)}h
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold tabular-nums text-warning">
                        +{dev.toFixed(1)}h
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                Sem desvios significativos.
              </p>
            )}
          </div>
        </div>
      </DetalheBloco>

      {/* Bloco 4: Atividade recente */}
      <DetalheBloco
        icon={ListChecks}
        title="Atividade recente"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={`/dev/kanban`}>
              Ver no Kanban <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {tasks.length ? (
          <ul className="divide-y divide-border/60">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                    STATUS_TONES[t.status] ?? "bg-muted-foreground",
                  )}
                />
                <Link
                  to={`/dev/tasks/${t.code}`}
                  className="min-w-0 flex-1 truncate text-sm text-foreground hover:text-accent"
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t.code}
                  </span>{" "}
                  {t.title}
                </Link>
                <span className="text-[11px] text-muted-foreground">
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
            Nenhuma atividade.
          </p>
        )}
      </DetalheBloco>
    </div>
  );
}
