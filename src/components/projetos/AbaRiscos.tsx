import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { ShieldAlert, Plus, Pencil, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import {
  ProjectRisk,
  RISK_PROBABILITY_OPTIONS,
  RISK_SEVERITY_OPTIONS,
  RISK_STATUS_OPTIONS,
  RiskProbability,
  RiskSeverity,
  RiskStatus,
  riskMatrixCellClass,
  riskProbabilityClass,
  riskProbabilityLabel,
  riskSeverityClass,
  riskSeverityLabel,
  riskStatusClass,
  riskStatusLabel,
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
}

const PROB_ROWS: RiskProbability[] = ["alta", "media", "baixa"];
const SEV_COLS: RiskSeverity[] = ["baixa", "media", "alta", "critica"];

export function AbaRiscos({ projectId }: Props) {
  const [items, setItems] = useState<ProjectRisk[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProjectRisk | null>(null);
  const [filterCell, setFilterCell] = useState<{
    prob: RiskProbability;
    sev: RiskSeverity;
  } | null>(null);

  useEffect(() => {
    load();
  }, [projectId]);

  async function load() {
    setLoading(true);
    const [{ data: rs }, { data: ac }] = await Promise.all([
      supabase
        .from("project_risks")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("actors")
        .select("id, display_name, avatar_url")
        .is("deleted_at", null),
    ]);
    setItems((rs ?? []) as ProjectRisk[]);
    setActors(ac ?? []);
    setLoading(false);
  }

  const matrix = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of items) {
      const k = `${r.probability}_${r.severity}`;
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!filterCell) return items;
    return items.filter(
      (r) => r.probability === filterCell.prob && r.severity === filterCell.sev,
    );
  }, [items, filterCell]);

  function openNew() {
    setEditing(null);
    setOpenModal(true);
  }

  function openEdit(r: ProjectRisk) {
    setEditing(r);
    setOpenModal(true);
  }

  async function softDelete(id: string) {
    const ok = await confirmDialog({
      title: "Remover risco?",
      description: "Esta ação enviará o risco para a lixeira (soft delete).",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("project_risks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Risco removido");
    load();
  }

  async function setStatus(r: ProjectRisk, status: RiskStatus) {
    const updates: any = { status };
    if (status === "mitigado" && !r.resolved_at) {
      updates.resolved_at = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("project_risks")
      .update(updates)
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/30" />;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Riscos do Projeto
          </h2>
          <p className="text-xs text-muted-foreground">
            Identificação, severidade × probabilidade e plano de mitigação
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo Risco
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Nenhum risco identificado
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Catalogue riscos com severidade, probabilidade e plano de mitigação.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Novo Risco
          </Button>
        </div>
      ) : (
        <>
          {/* Matriz 3x4 */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Matriz de Riscos
              </h3>
              {filterCell && (
                <button
                  type="button"
                  onClick={() => setFilterCell(null)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Limpar filtro
                </button>
              )}
            </div>
            <div className="grid grid-cols-[80px_repeat(4,1fr)] gap-1.5">
              <div />
              {SEV_COLS.map((s) => (
                <div
                  key={s}
                  className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {riskSeverityLabel(s)}
                </div>
              ))}
              {PROB_ROWS.map((p) => (
                <>
                  <div
                    key={`label-${p}`}
                    className="flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {riskProbabilityLabel(p)}
                  </div>
                  {SEV_COLS.map((s) => {
                    const count = matrix[`${p}_${s}`] ?? 0;
                    const isActive =
                      filterCell?.prob === p && filterCell?.sev === s;
                    return (
                      <button
                        key={`${p}-${s}`}
                        type="button"
                        onClick={() =>
                          count > 0
                            ? setFilterCell(isActive ? null : { prob: p, sev: s })
                            : null
                        }
                        disabled={count === 0}
                        className={cn(
                          "flex aspect-[2/1] items-center justify-center rounded-md border text-sm font-bold transition-all",
                          riskMatrixCellClass(p, s),
                          count === 0 && "opacity-30",
                          isActive && "ring-2 ring-accent ring-offset-2 ring-offset-card",
                          count > 0 && "hover:scale-[1.03] cursor-pointer",
                        )}
                      >
                        {count}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Clique em uma célula para filtrar. Probabilidade no eixo vertical, severidade no horizontal.
            </p>
          </div>

          {/* Lista de cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visibleItems.map((r) => {
              const responsible = actors.find(
                (a) => a.id === r.responsible_actor_id,
              );
              return (
                <div
                  key={r.id}
                  className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={riskSeverityClass(r.severity)}>
                      {riskSeverityLabel(r.severity).toUpperCase()}
                    </Badge>
                    <Badge className={riskProbabilityClass(r.probability)}>
                      Prob. {riskProbabilityLabel(r.probability).toUpperCase()}
                    </Badge>
                    <Badge className={cn("ml-auto", riskStatusClass(r.status))}>
                      {riskStatusLabel(r.status)}
                    </Badge>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-foreground">
                    {r.title}
                  </h4>
                  {r.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                  {r.mitigation_plan && (
                    <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Plano de mitigação
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-foreground/90">
                        {r.mitigation_plan}
                      </p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {responsible ? (
                        <>
                          <ActorAvatar
                            name={responsible.display_name}
                            avatarUrl={responsible.avatar_url}
                            size="sm"
                          />
                          <span>{responsible.display_name}</span>
                        </>
                      ) : (
                        <span>Sem responsável</span>
                      )}
                    </div>
                    <span>Identificado em {formatDate(r.identified_at)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 border-t border-border/40 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                    {r.status !== "mitigado" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-success hover:text-success"
                        onClick={() => setStatus(r, "mitigado")}
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" /> Mitigar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => softDelete(r.id)}
                      className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <RiscoModal
        open={openModal}
        onOpenChange={setOpenModal}
        projectId={projectId}
        actors={actors}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

function RiscoModal({
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
  editing: ProjectRisk | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<RiskSeverity>("media");
  const [probability, setProbability] = useState<RiskProbability>("media");
  const [status, setStatus] = useState<RiskStatus>("identificado");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [identifiedAt, setIdentifiedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setSeverity(editing.severity);
      setProbability(editing.probability);
      setStatus(editing.status);
      setMitigationPlan(editing.mitigation_plan ?? "");
      setResponsibleId(editing.responsible_actor_id ?? "");
      setIdentifiedAt(editing.identified_at);
    } else {
      setTitle("");
      setDescription("");
      setSeverity("media");
      setProbability("media");
      setStatus("identificado");
      setMitigationPlan("");
      setResponsibleId("");
      setIdentifiedAt(new Date().toISOString().slice(0, 10));
    }
  }, [open, editing]);

  async function save() {
    if (!title.trim()) return toast.error("Título é obrigatório");
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      severity,
      probability,
      status,
      mitigation_plan: mitigationPlan.trim() || null,
      responsible_actor_id: responsibleId || null,
      identified_at: identifiedAt,
    };
    let error;
    if (editing) {
      ({ error } = await supabase
        .from("project_risks")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("project_risks").insert({
        ...payload,
        organization_id: GETBRAIN_ORG_ID,
        project_id: projectId,
      }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Risco atualizado" : "Risco criado");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar risco" : "Novo risco"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Severidade</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as RiskSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Probabilidade</Label>
              <Select value={probability} onValueChange={(v) => setProbability(v as RiskProbability)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_PROBABILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RiskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Plano de mitigação</Label>
            <Textarea
              rows={3}
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              placeholder="Como evitar ou reduzir o impacto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Responsável</Label>
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
            <div>
              <Label className="text-xs">Identificado em</Label>
              <Input
                type="date"
                value={identifiedAt}
                onChange={(e) => setIdentifiedAt(e.target.value)}
              />
            </div>
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
