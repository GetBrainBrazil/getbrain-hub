import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Priority = "alta" | "media" | "baixa";
type TagType = "Bug" | "Feature" | "Refactor" | "Docs" | "Chore";

export interface NovaTarefaPayload {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  tags: TagType[];
  dueDate: string;
  project: string;
  columnId: string;
  assignees: { id: string; name: string; full: string; color: string }[];
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
}

const TAG_OPTIONS: TagType[] = ["Bug", "Feature", "Refactor", "Docs", "Chore"];
const PROJECTS = ["GetBrain Web", "App Mobile", "API Financeira"];
const COLUMNS = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "progress", title: "In Progress" },
  { id: "review", title: "Code Review" },
  { id: "done", title: "Done" },
];

const AVATAR_COLORS = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");
}

const tagStyles: Record<TagType, string> = {
  Bug: "bg-red-500/15 text-red-400 border-red-500/30",
  Feature: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Refactor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Docs: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Chore: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (task: NovaTarefaPayload) => void;
  nextId: string;
}

export function NovaTarefaDialog({ open, onOpenChange, onCreate, nextId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [project, setProject] = useState<string>(PROJECTS[0]);
  const [columnId, setColumnId] = useState<string>("todo");
  const [dueDate, setDueDate] = useState<string>("");
  const [tags, setTags] = useState<TagType[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingColabs(true);
    supabase
      .from("colaboradores")
      .select("id, nome, cargo")
      .eq("ativo", true)
      .order("nome")
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Erro ao carregar colaboradores", description: error.message, variant: "destructive" });
        } else {
          setColaboradores(data ?? []);
        }
        setLoadingColabs(false);
      });
  }, [open]);

  function reset() {
    setTitle(""); setDescription(""); setPriority("media");
    setProject(PROJECTS[0]); setColumnId("todo"); setDueDate("");
    setTags([]); setAssigneeIds([]);
  }

  function toggleTag(t: TagType) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function toggleAssignee(id: string) {
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const selectedColabs = useMemo(
    () => colaboradores.filter(c => assigneeIds.includes(c.id)),
    [colaboradores, assigneeIds]
  );

  function formatDateBR(iso: string) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}`;
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (assigneeIds.length === 0) {
      toast({ title: "Atribua ao menos um colaborador", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload: NovaTarefaPayload = {
      id: nextId,
      title: title.trim(),
      description: description.trim() || "Sem descrição.",
      priority,
      tags: tags.length ? tags : ["Feature"],
      dueDate: formatDateBR(dueDate),
      project,
      columnId,
      assignees: selectedColabs.map(c => ({
        id: c.id,
        name: initials(c.nome),
        full: c.nome,
        color: colorFor(c.id),
      })),
    };
    onCreate(payload);
    toast({ title: "Tarefa criada", description: `${payload.id} adicionada ao Kanban.` });
    setSubmitting(false);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nova Tarefa</DialogTitle>
          <DialogDescription>
            Preencha os dados da tarefa e atribua aos colaboradores responsáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Implementar relatório DRE consolidado"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto, critérios de aceite, links..."
              className="min-h-[100px] font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Coluna inicial</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de entrega</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(t => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md border transition-all",
                      active ? tagStyles[t] : "border-border text-muted-foreground hover:border-foreground/30"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Atribuir a colaboradores *</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {assigneeIds.length === 0 ? (
                    <span className="text-muted-foreground">Selecione colaboradores...</span>
                  ) : (
                    <span>{assigneeIds.length} colaborador(es) selecionado(s)</span>
                  )}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar colaborador..." />
                  <CommandList>
                    {loadingColabs ? (
                      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                        <CommandGroup>
                          {colaboradores.map(c => {
                            const selected = assigneeIds.includes(c.id);
                            return (
                              <CommandItem key={c.id} value={c.nome} onSelect={() => toggleAssignee(c.id)}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className={cn("text-[10px] font-semibold text-white", colorFor(c.id))}>
                                      {initials(c.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{c.nome}</p>
                                    {c.cargo && <p className="text-xs text-muted-foreground truncate">{c.cargo}</p>}
                                  </div>
                                </div>
                                <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedColabs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedColabs.map(c => (
                  <Badge key={c.id} variant="secondary" className="gap-1.5 pl-1 pr-1.5">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className={cn("text-[8px] font-semibold text-white", colorFor(c.id))}>
                        {initials(c.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{c.nome}</span>
                    <button onClick={() => toggleAssignee(c.id)} className="hover:bg-background/50 rounded">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
