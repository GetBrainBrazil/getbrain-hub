/**
 * Dialog leve de criação rápida de tarefa.
 * Edição completa pós-criação fica para a tela cheia (Prompt 03B).
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTasks";
import type { TaskPriority, TaskStatus, TaskTypeKind } from "@/types/tasks";
import { toast } from "@/hooks/use-toast";
import { PRIORITY_LABEL, TYPE_ICON, TYPE_LABEL } from "@/lib/tasks-helpers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string;
  defaultSprintId?: string | null;
}

interface ProjectRow {
  id: string;
  code: string;
  name: string;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const TYPES: TaskTypeKind[] = ["feature", "bug", "chore", "refactor", "docs", "research"];

export function NovaTaskDialog({
  open,
  onOpenChange,
  defaultStatus = "todo",
  defaultProjectId,
  defaultSprintId = null,
}: Props) {
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [type, setType] = useState<TaskTypeKind>("feature");
  const [estimated, setEstimated] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus(defaultStatus);
    if (defaultProjectId) setProjectId(defaultProjectId);
    supabase
      .from("projects")
      .select("id, code, name")
      .is("deleted_at", null)
      .order("code")
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Erro ao carregar projetos", description: error.message, variant: "destructive" });
          return;
        }
        const list = (data ?? []) as ProjectRow[];
        setProjects(list);
        if (!projectId && list.length && !defaultProjectId) setProjectId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus(defaultStatus);
    setPriority("medium");
    setType("feature");
    setEstimated("");
    setDueDate("");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (!projectId) {
      toast({ title: "Selecione um projeto", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        sprint_id: defaultSprintId,
        status,
        priority,
        type,
        estimated_hours: estimated ? Number(estimated) : null,
        ...(dueDate ? { due_date: dueDate } : {}),
      } as Parameters<typeof create.mutateAsync>[0]);
      toast({ title: "Tarefa criada" });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Erro ao criar tarefa",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Nova Tarefa</DialogTitle>
          <DialogDescription>
            Criação rápida. Edição completa estará disponível na tela cheia em breve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Corrigir parser de CSV de fornecedores"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Projeto *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">{p.code}</span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">Code Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskTypeKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_ICON[t]} {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimado (h)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={estimated}
                onChange={(e) => setEstimated(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Entrega</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto, critérios de aceite, links..."
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
