/**
 * Aba Descrição da tela cheia da task: descrição markdown, critérios de aceite,
 * labels e thread de comentários — todos com edição inline e otimismo.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Plus, X, GripVertical, Pencil, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { AcceptanceCriterion, Task, TaskComment } from "@/types/tasks";
import { actorColor, initials, labelColorClass, timeAgo } from "@/lib/tasks-helpers";
import { useAcceptanceCriteria, useDistinctLabels, useUpdateTaskFields } from "@/hooks/useTaskDetail";
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
  useCurrentActorId,
} from "@/hooks/useTaskComments";
import { MarkdownComposer, MarkdownSplitEditor, MarkdownView } from "./MarkdownComposer";
import { toast } from "sonner";

interface Props {
  task: Task;
}

export function TaskDescriptionPane({ task }: Props) {
  return (
    <div className="space-y-8">
      <DescriptionSection task={task} />
      <CriteriaSection task={task} />
      <LabelsSection task={task} />
      <CommentsSection task={task} />
    </div>
  );
}

// ---------- Descrição markdown ----------

function DescriptionSection({ task }: { task: Task }) {
  const update = useUpdateTaskFields(task.id, task.code);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.description ?? "");

  useEffect(() => {
    if (!editing) setDraft(task.description ?? "");
  }, [task.description, editing]);

  const save = async () => {
    await update.mutateAsync({ description: draft.trim() ? draft : null });
    setEditing(false);
  };

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</h3>
      {editing ? (
        <div className="space-y-2">
          <MarkdownSplitEditor value={draft} onChange={setDraft} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft(task.description ?? ""); setEditing(false); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={save}>Salvar</Button>
          </div>
        </div>
      ) : task.description?.trim() ? (
        <div className="group relative rounded-md border border-border bg-card/40 p-4">
          <MarkdownView source={task.description} />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-md border border-dashed border-border bg-muted/10 p-6 text-left text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
        >
          Nenhuma descrição. Adicione contexto, critérios técnicos, links de referência.
        </button>
      )}
    </section>
  );
}

// ---------- Critérios de Aceite ----------

function CriteriaSection({ task }: { task: Task }) {
  const ac = useAcceptanceCriteria(task);
  const list = task.acceptance_criteria;
  const checked = list.filter((c) => c.checked).length;
  const total = list.length;
  const pct = total > 0 ? (checked / total) * 100 : 0;

  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onDragEnd = async (e: DragEndEvent) => {
    const activeId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId || activeId === overId) return;
    const oldIdx = list.findIndex((c) => c.id === activeId);
    const newIdx = list.findIndex((c) => c.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(list, oldIdx, newIdx).map((c) => c.id);
    await ac.reorder(next);
  };

  const submitNew = async () => {
    const text = newText.trim();
    if (!text) {
      setAdding(false);
      return;
    }
    await ac.add(text);
    setNewText("");
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Critérios de Aceite
            {total > 0 && (
              <span className="ml-2 font-mono text-foreground">({checked}/{total})</span>
            )}
          </h3>
          {total > 0 && <Progress value={pct} className="h-1.5 w-32" />}
        </div>
        {total > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        )}
      </div>

      {total === 0 && !adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-md border border-dashed border-border bg-muted/10 p-6 text-left text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
        >
          Nenhum critério de aceite definido. Criar critérios ajuda a saber quando a task está pronta.
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {list.map((c) => (
                <CriterionRow key={c.id} criterion={c} onToggle={() => ac.toggle(c.id)} onEdit={(t) => ac.edit(c.id, t)} onRemove={() => ac.remove(c.id)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {adding && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await submitNew();
              } else if (e.key === "Escape") {
                setNewText("");
                setAdding(false);
              }
            }}
            placeholder="Novo critério..."
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={submitNew}>Adicionar</Button>
          <Button variant="ghost" size="sm" onClick={() => { setNewText(""); setAdding(false); }}>Fechar</Button>
        </div>
      )}
    </section>
  );
}

function CriterionRow({
  criterion,
  onToggle,
  onEdit,
  onRemove,
}: {
  criterion: AcceptanceCriterion;
  onToggle: () => void;
  onEdit: (t: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: criterion.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(criterion.text);

  useEffect(() => setText(criterion.text), [criterion.text]);

  const save = () => {
    const t = text.trim();
    if (!t || t === criterion.text) {
      setText(criterion.text);
      setEditing(false);
      return;
    }
    onEdit(t);
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Arrastar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onToggle} className="shrink-0 text-foreground" aria-label={criterion.checked ? "Desmarcar" : "Marcar"}>
        {criterion.checked ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {editing ? (
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setText(criterion.text); setEditing(false); }
          }}
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 cursor-text text-sm",
            criterion.checked ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {criterion.text}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Remover critério"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ---------- Labels ----------

function LabelsSection({ task }: { task: Task }) {
  const update = useUpdateTaskFields(task.id, task.code);
  const { data: distinct = [] } = useDistinctLabels();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const remove = (label: string) => {
    update.mutate({ labels: task.labels.filter((l) => l !== label) });
  };
  const add = (label: string) => {
    const v = label.trim();
    if (!v || task.labels.includes(v)) {
      setDraft("");
      setAdding(false);
      return;
    }
    update.mutate({ labels: [...task.labels, v] });
    setDraft("");
    setAdding(false);
  };

  if (task.labels.length === 0 && !adding) {
    return (
      <section>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Adicionar label
        </Button>
      </section>
    );
  }

  const suggestions = distinct.filter((l) => !task.labels.includes(l) && (!draft || l.toLowerCase().includes(draft.toLowerCase()))).slice(0, 6);

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Labels</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {task.labels.map((l) => (
          <Badge key={l} variant="outline" className={cn("group h-6 gap-1 text-[11px]", labelColorClass(l))}>
            {l}
            <button type="button" onClick={() => remove(l)} className="opacity-60 hover:opacity-100" aria-label={`Remover ${l}`}>
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        {adding ? (
          <div className="relative">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add(draft);
                if (e.key === "Escape") { setDraft(""); setAdding(false); }
              }}
              onBlur={() => setTimeout(() => { if (draft) add(draft); else setAdding(false); }, 150)}
              placeholder="nova-label"
              className="h-6 w-32 text-[11px]"
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 top-7 z-10 max-h-48 min-w-[140px] overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); add(s); }}
                    className="flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-muted"
                  >
                    <span className={cn("mr-2 h-2 w-2 rounded-full", labelColorClass(s).split(" ")[0].replace("/15", ""))} />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-accent/50 hover:text-foreground"
          >
            <Plus className="inline h-2.5 w-2.5" /> add
          </button>
        )}
      </div>
    </section>
  );
}

// ---------- Comentários ----------

function CommentsSection({ task }: { task: Task }) {
  const { data: comments = [], isLoading } = useTaskComments(task.id);
  const create = useCreateTaskComment(task.id);
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLDivElement>(null);

  const submit = async () => {
    if (!draft.trim()) return;
    try {
      await create.mutateAsync(draft);
      setDraft("");
      setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (e) {
      toast.error("Erro ao postar comentário", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Comentários{comments.length > 0 ? ` (${comments.length})` : ""}
      </h3>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : comments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
          Nenhum comentário ainda. Use comentários para registrar decisões, perguntar dúvidas ou documentar descobertas.
        </div>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} taskId={task.id} />
          ))}
        </ul>
      )}

      <div ref={composerRef} className="mt-4 space-y-2">
        <MarkdownComposer
          value={draft}
          onChange={setDraft}
          placeholder="Escreva um comentário em markdown..."
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={submit}
            disabled={!draft.trim() || create.isPending}
          >
            {create.isPending ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function CommentRow({ comment, taskId }: { comment: TaskComment; taskId: string }) {
  const { data: currentActorId } = useCurrentActorId();
  const isMine = currentActorId && comment.actor_id === currentActorId;
  const update = useUpdateTaskComment(taskId);
  const remove = useDeleteTaskComment(taskId);
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  useEffect(() => setDraft(comment.body), [comment.body]);

  const save = async () => {
    if (!draft.trim() || draft.trim() === comment.body) {
      setDraft(comment.body);
      setEditing(false);
      return;
    }
    await update.mutateAsync({ id: comment.id, body: draft });
    setEditing(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Excluir comentário?",
      description: "Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      variant: "destructive",
    });
    if (ok) remove.mutate(comment.id);
  };

  return (
    <li className="group flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn("text-[10px] font-semibold text-white", actorColor(comment.actor_id))}>
          {initials(comment.actor?.display_name ?? "?")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">{comment.actor?.display_name ?? "—"}</span>
          <span className="text-muted-foreground">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground">{timeAgo(comment.created_at)}</span>
            </TooltipTrigger>
            <TooltipContent>{new Date(comment.created_at).toLocaleString("pt-BR")}</TooltipContent>
          </Tooltip>
          {comment.edited_at && (
            <span className="text-[10px] italic text-muted-foreground">(editado)</span>
          )}
          {isMine && !editing && (
            <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" /> Editar
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="h-3 w-3" /> Excluir
              </Button>
            </span>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <MarkdownComposer value={draft} onChange={setDraft} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDraft(comment.body); setEditing(false); }}>Cancelar</Button>
              <Button size="sm" onClick={save}>Salvar</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card/40 p-3">
            <MarkdownView source={comment.body} />
          </div>
        )}
      </div>
    </li>
  );
}
