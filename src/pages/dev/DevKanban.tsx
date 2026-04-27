/**
 * Página /dev/kanban — kanban denso plugado em dados reais.
 * 4 colunas (todo, in_progress, in_review, done). Filtros vivem no
 * useDevHubStore (compartilhados entre sub-abas do hub).
 *
 * Clique no card → navega para /dev/tasks/<code> (tela cheia).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useUpdateTaskStatus } from "@/hooks/useTasks";
import { useDevHubStore } from "@/hooks/useDevHubStore";
import { TaskCard } from "@/components/dev/TaskCard";
import { NovaTaskDialog } from "@/components/dev/NovaTaskDialog";
import type { Task, TaskPriority, TaskStatus, TaskTypeKind } from "@/types/tasks";
import { PRIORITY_LABEL, TYPE_ICON, TYPE_LABEL } from "@/lib/tasks-helpers";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "Code Review" },
  { id: "done", title: "Done" },
];

interface ProjectRow { id: string; code: string; name: string }
interface ActorRow { id: string; display_name: string }

function DraggableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={() => !isDragging && onClick()} dragging={isDragging} />
    </div>
  );
}

function Column({
  status,
  title,
  tasks,
  onOpenTask,
  onAddTask,
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onOpenTask: (t: Task) => void;
  onAddTask: (s: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-[85vw] max-w-[20rem] shrink-0 snap-start flex-col rounded-lg bg-muted/20 p-3 sm:w-80">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onAddTask(status)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex max-h-[calc(100vh-340px)] flex-1 flex-col gap-2 overflow-y-auto rounded-md pr-1 transition-colors min-h-[80px]",
          isOver && "bg-accent/10 ring-2 ring-accent/40",
        )}
      >
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} onClick={() => onOpenTask(t)} />
        ))}
        {tasks.length === 0 && (
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="rounded-md border border-dashed border-border/60 px-3 py-6 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            + Nova tarefa
          </button>
        )}
      </div>
    </div>
  );
}

const TYPES: TaskTypeKind[] = ["feature", "bug", "chore", "refactor", "docs", "research"];
const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

export default function DevKanban() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedSprintId = useDevHubStore((s) => s.selectedSprintId);
  const projectFilter = useDevHubStore((s) => s.projectFilter);
  const setProjectFilter = useDevHubStore((s) => s.setProjectFilter);
  const assigneeFilter = useDevHubStore((s) => s.assigneeFilter);
  const setAssigneeFilter = useDevHubStore((s) => s.setAssigneeFilter);
  const typeFilter = useDevHubStore((s) => s.typeFilter);
  const setTypeFilter = useDevHubStore((s) => s.setTypeFilter);
  const priorityFilter = useDevHubStore((s) => s.priorityFilter);
  const setPriorityFilter = useDevHubStore((s) => s.setPriorityFilter);
  const search = useDevHubStore((s) => s.search);
  const setSearch = useDevHubStore((s) => s.setSearch);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [actors, setActors] = useState<ActorRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ status: TaskStatus; project_id?: string }>({ status: "todo" });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateStatus = useUpdateTaskStatus();
  const { data: tasks = [], isLoading } = useTasks({
    sprint_id: selectedSprintId ?? undefined,
    status: ["todo", "in_progress", "in_review", "done"],
  });

  // Aplicar deep-link de projeto via ?projects=PRJ-001 (uma vez)
  useEffect(() => {
    const codes = params.get("projects");
    if (!codes || projects.length === 0) return;
    const ids = projects.filter((p) => codes.split(",").includes(p.code)).map((p) => p.id);
    if (ids.length) {
      setProjectFilter(ids);
      params.delete("projects");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // Carrega projetos e atores para os filtros
  useEffect(() => {
    supabase
      .from("projects")
      .select("id, code, name")
      .is("deleted_at", null)
      .order("code")
      .then(({ data }) => setProjects((data ?? []) as ProjectRow[]));
    supabase
      .from("actors")
      .select("id, display_name")
      .is("deleted_at", null)
      .order("display_name")
      .then(({ data }) => setActors((data ?? []) as ActorRow[]));
  }, []);

  // Listener para evento global "Nova Tarefa" do header do hub
  useEffect(() => {
    const handler = () => {
      setCreateDefaults({ status: "todo" });
      setCreateOpen(true);
    };
    window.addEventListener("dev:open-new-task", handler);
    return () => window.removeEventListener("dev:open-new-task", handler);
  }, []);

  // Filtros aplicados em memória
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter.length && !projectFilter.includes(t.project_id)) return false;
      if (typeFilter.length && !typeFilter.includes(t.type)) return false;
      if (priorityFilter.length && !priorityFilter.includes(t.priority)) return false;
      if (assigneeFilter.length) {
        const aids = (t.assignees ?? []).map((a) => a.actor_id);
        if (!aids.some((id) => assigneeFilter.includes(id))) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const inText =
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false);
        if (!inText) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, typeFilter, priorityFilter, assigneeFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    COLUMNS.forEach((c) => map.set(c.id, []));
    filtered.forEach((t) => {
      const list = map.get(t.status as TaskStatus);
      if (list) list.push(t);
    });
    return map;
  }, [filtered]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const target = COLUMNS.find((c) => c.id === overId);
    if (!target) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === target.id) return;
    updateStatus.mutate({ id, status: target.id });
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4 overflow-x-auto">
          {COLUMNS.map((c) => (
            <Skeleton key={c.id} className="h-96 w-80 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full pl-8 text-sm sm:h-9 sm:w-[240px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPopover
            label="Projetos"
            count={projectFilter.length}
            options={projects.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))}
            selected={projectFilter}
            onChange={setProjectFilter}
          />
          <FilterPopover
            label="Assignees"
            count={assigneeFilter.length}
            options={actors.map((a) => ({ value: a.id, label: a.display_name }))}
            selected={assigneeFilter}
            onChange={setAssigneeFilter}
          />
          <FilterPopover
            label="Tipo"
            count={typeFilter.length}
            options={TYPES.map((t) => ({ value: t, label: `${TYPE_ICON[t]} ${TYPE_LABEL[t]}` }))}
            selected={typeFilter}
            onChange={(v) => setTypeFilter(v as TaskTypeKind[])}
          />
          <FilterPopover
            label="Prioridade"
            count={priorityFilter.length}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
            selected={priorityFilter}
            onChange={(v) => setPriorityFilter(v as TaskPriority[])}
          />
        </div>

        {(projectFilter.length || assigneeFilter.length || typeFilter.length || priorityFilter.length || search) ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => useDevHubStore.getState().resetFilters()}
            className="h-9 text-xs sm:ml-auto"
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {/* Empty state global */}
      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhuma tarefa nesta sprint</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crie uma nova tarefa ou ajuste os filtros para visualizar.
          </p>
        </div>
      )}

      {/* Kanban */}
      {filtered.length > 0 && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:snap-none sm:gap-4">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                status={col.id}
                title={col.title}
                tasks={grouped.get(col.id) ?? []}
                onOpenTask={(t) => navigate(`/dev/tasks/${t.code}`)}
                onAddTask={(s) => {
                  setCreateDefaults({ status: s });
                  setCreateOpen(true);
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} dragging />}
          </DragOverlay>
        </DndContext>
      )}

      <NovaTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createDefaults.status}
        defaultProjectId={createDefaults.project_id}
        defaultSprintId={selectedSprintId}
        onCreated={(code) => navigate(`/dev/tasks/${code}`)}
      />
    </TooltipProvider>
  );
}

function FilterPopover({
  label,
  count,
  options,
  selected,
  onChange,
}: {
  label: string;
  count: number;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs">
          {label}
          {count > 0 && (
            <span className="ml-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="max-h-72 overflow-y-auto space-y-1">
          {options.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Sem opções</p>
          )}
          {options.map((o) => (
            <Label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              <span className="truncate">{o.label}</span>
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
