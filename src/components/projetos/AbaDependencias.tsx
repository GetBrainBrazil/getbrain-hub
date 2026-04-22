import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  MoreVertical,
  Link2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import {
  DEPENDENCY_STATUS_OPTIONS,
  DEPENDENCY_TYPE_OPTIONS,
  DependencyStatus,
  DependencyType,
  ProjectDependency,
  dependencyStatusClass,
  dependencyStatusLabel,
  dependencyTypeLabel,
  diffDays,
  isCriticalBlocking,
} from "@/lib/escopo-helpers";
import { useConfirm } from "@/components/ConfirmDialog";
import { GETBRAIN_ORG_ID } from "@/lib/projetos-helpers";
import { ActorAvatar } from "./ActorAvatar";

interface Actor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  projectId: string;
  onProjectStatusChange?: (status: string) => void;
}

export function AbaDependencias({ projectId, onProjectStatusChange }: Props) {
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const [items, setItems] = useState<ProjectDependency[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProjectDependency | null>(null);
  const firstBlockingRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    load();
  }, [projectId]);

  async function load() {
    setLoading(true);
    const [{ data: deps }, { data: ac }] = await Promise.all([
      supabase
        .from("project_dependencies")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("is_blocking", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("actors")
        .select("id, display_name, avatar_url")
        .is("deleted_at", null),
    ]);
    setItems((deps ?? []) as ProjectDependency[]);
    setActors(ac ?? []);
    setLoading(false);
  }

  const blocking = useMemo(() => items.filter(isCriticalBlocking), [items]);

  function openNew() {
    setEditing(null);
    setOpenModal(true);
  }

  function openEdit(d: ProjectDependency) {
    setEditing(d);
    setOpenModal(true);
  }

  async function softDelete(id: string) {
    const ok = await confirmDialog({
      title: "Remover dependência?",
      description: "Esta ação enviará a dependência para a lixeira (soft delete).",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("project_dependencies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dependência removida");
    load();
  }

  async function quickStatus(d: ProjectDependency, newStatus: DependencyStatus) {
    const updates: any = { status: newStatus };
    if (newStatus === "recebido" || newStatus === "resolvido") {
      updates.received_at = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("project_dependencies")
      .update(updates)
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  }

  async function pauseProject() {
    const { error } = await supabase
      .from("projects")
      .update({ status: "pausado" as any })
      .eq("id", projectId);
    if (error) return toast.error(error.message);
    toast.success("Projeto pausado");
    onProjectStatusChange?.("pausado");
  }

  function scrollToFirstBlocking() {
    firstBlockingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/30" />;
  }

  return (
    <div className="space-y-4">
      {blocking.length > 0 && (
        <button
          type="button"
          onClick={scrollToFirstBlocking}
          className="flex w-full items-start gap-3 rounded-lg border-l-[3px] border-destructive bg-destructive/10 p-4 text-left transition-colors hover:bg-destructive/15"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {blocking.length}{" "}
              {blocking.length === 1
                ? "dependência bloqueante não resolvida"
                : "dependências bloqueantes não resolvidas"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              O projeto pode estar sendo atrasado por essas dependências.
              Clique para ver na tabela.
            </p>
          </div>
        </button>
      )}

      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Dependências Externas
          </h2>
          <p className="text-xs text-muted-foreground">
            O que precisamos do cliente ou de terceiros para avançar
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nova Dependência
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
          <Link2 className="h-8 w-8 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Nenhuma dependência cadastrada
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cadastre o que você precisa do cliente ou de terceiros para
              entregar este projeto.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Nova Dependência
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[28%]">Título</TableHead>
                <TableHead className="w-[12%]">Tipo</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[14%]">Solicitado de</TableHead>
                <TableHead className="w-[10%]">Esperado</TableHead>
                <TableHead className="w-[8%]">Recebido</TableHead>
                <TableHead className="w-[8%]">Desvio</TableHead>
                <TableHead className="w-[6%] text-center">Bloq.</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d, i) => {
                const isFirstBlocking =
                  isCriticalBlocking(d) &&
                  items.findIndex(isCriticalBlocking) === i;
                const drift =
                  !d.received_at && d.expected_at
                    ? diffDays(d.expected_at, new Date())
                    : null;
                const responsible = actors.find(
                  (a) => a.id === d.responsible_actor_id,
                );
                return (
                  <TableRow
                    key={d.id}
                    ref={isFirstBlocking ? firstBlockingRef : null}
                    className={cn(
                      "group/row",
                      isCriticalBlocking(d) && "border-l-[3px] border-l-destructive",
                    )}
                  >
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {d.title}
                        </p>
                        {responsible && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <ActorAvatar
                              name={responsible.display_name}
                              avatarUrl={responsible.avatar_url}
                              size="sm"
                            />
                            <span>{responsible.display_name}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dependencyTypeLabel(d.dependency_type)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80",
                              dependencyStatusClass(d.status),
                            )}
                          >
                            {dependencyStatusLabel(d.status)}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel className="text-xs">
                            Mudar status
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {DEPENDENCY_STATUS_OPTIONS.map((o) => (
                            <DropdownMenuItem
                              key={o.value}
                              onClick={() => quickStatus(d, o.value)}
                              disabled={o.value === d.status}
                            >
                              {o.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80">
                      {d.requested_from || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.expected_at ? formatDate(d.expected_at) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.received_at ? formatDate(d.received_at) : "—"}
                    </TableCell>
                    <TableCell>
                      {drift === null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : drift > 0 ? (
                        <span className="text-xs font-medium text-destructive">
                          +{drift}d
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-success">
                          {drift}d
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {d.is_blocking ? (
                        <AlertTriangle className="mx-auto h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover/row:opacity-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => softDelete(d.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DependenciaModal
        open={openModal}
        onOpenChange={setOpenModal}
        projectId={projectId}
        actors={actors}
        editing={editing}
        onSaved={(wasBlocking) => {
          load();
          if (wasBlocking) {
            toast.warning(
              "Bloqueio registrado. Considere atualizar o status do projeto.",
              {
                duration: 8000,
                action: {
                  label: "Pausar projeto",
                  onClick: pauseProject,
                },
              },
            );
          }
        }}
      />
      {confirmDialogEl}
    </div>
  );
}

function DependenciaModal({
  open,
  onOpenChange,
  projectId,
  actors,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  projectId: string;
  actors: Actor[];
  editing: ProjectDependency | null;
  onSaved: (wasBlocking: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DependencyType>("acesso_api");
  const [description, setDescription] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [expectedAt, setExpectedAt] = useState<string>("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.dependency_type);
      setDescription(editing.description ?? "");
      setRequestedFrom(editing.requested_from ?? "");
      setResponsibleId(editing.responsible_actor_id ?? "");
      setExpectedAt(editing.expected_at ?? "");
      setIsBlocking(editing.is_blocking);
      setNotes(editing.notes ?? "");
    } else {
      setTitle("");
      setType("acesso_api");
      setDescription("");
      setRequestedFrom("");
      setResponsibleId("");
      setExpectedAt("");
      setIsBlocking(false);
      setNotes("");
    }
  }, [open, editing]);

  async function save() {
    if (!title.trim()) return toast.error("Título é obrigatório");
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      dependency_type: type,
      description: description.trim() || null,
      requested_from: requestedFrom.trim() || null,
      responsible_actor_id: responsibleId || null,
      expected_at: expectedAt || null,
      is_blocking: isBlocking,
      notes: notes.trim() || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase
        .from("project_dependencies")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("project_dependencies").insert({
        ...payload,
        organization_id: GETBRAIN_ORG_ID,
        project_id: projectId,
        status: isBlocking ? "bloqueante" : "pendente",
        requested_at: new Date().toISOString().slice(0, 10),
      }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Dependência atualizada" : "Dependência criada");
    onOpenChange(false);
    onSaved(isBlocking && !editing);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar dependência" : "Nova dependência"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Acesso à API Recrutei"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as DependencyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPENDENCY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data esperada</Label>
              <Input
                type="date"
                value={expectedAt}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Solicitado de</Label>
              <Input
                value={requestedFrom}
                onChange={(e) => setRequestedFrom(e.target.value)}
                placeholder="Ex: TI Equipe Certa"
              />
            </div>
            <div>
              <Label className="text-xs">Responsável GetBrain</Label>
              <Select
                value={responsibleId || "__none__"}
                onValueChange={(v) => setResponsibleId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {actors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <div>
              <Label htmlFor="blocking" className="text-sm font-medium">
                É bloqueante?
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Marca como impeditivo do andamento do projeto.
              </p>
            </div>
            <Switch
              id="blocking"
              checked={isBlocking}
              onCheckedChange={setIsBlocking}
            />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
