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
import {
  Plug,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import {
  INTEGRATION_STATUS_OPTIONS,
  IntegrationStatus,
  ProjectIntegration,
  integrationStatusClass,
  integrationStatusLabel,
} from "@/lib/escopo-helpers";
import { GETBRAIN_ORG_ID } from "@/lib/projetos-helpers";

interface Props {
  projectId: string;
}

export function AbaIntegracoes({ projectId }: Props) {
  const [items, setItems] = useState<ProjectIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProjectIntegration | null>(null);

  useEffect(() => {
    load();
  }, [projectId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("project_integrations")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as ProjectIntegration[]);
    setLoading(false);
  }

  const totalCost = useMemo(
    () =>
      items
        .filter((i) => i.status === "ativa")
        .reduce((s, i) => s + (Number(i.estimated_cost_monthly_brl) || 0), 0),
    [items],
  );

  function openNew() {
    setEditing(null);
    setOpenModal(true);
  }

  function openEdit(i: ProjectIntegration) {
    setEditing(i);
    setOpenModal(true);
  }

  async function softDelete(id: string) {
    if (!confirm("Remover esta integração?")) return;
    const { error } = await supabase
      .from("project_integrations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Integração removida");
    load();
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/30" />;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Integrações</h2>
          <p className="text-xs text-muted-foreground">
            APIs e sistemas externos que este projeto consome
            {totalCost > 0 && (
              <>
                {" · Custo total estimado: "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalCost)}/mês
                </span>
              </>
            )}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Nova Integração
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
          <Plug className="h-8 w-8 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Nenhuma integração cadastrada
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Catalogue APIs externas e sistemas que o projeto consome.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Nova Integração
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => {
            const initial = (it.provider || it.name || "?").charAt(0).toUpperCase();
            return (
              <div
                key={it.id}
                className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 font-mono text-sm font-bold text-accent">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-foreground">
                      {it.name}
                    </h4>
                    {it.provider && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {it.provider}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      integrationStatusClass(it.status),
                    )}
                  >
                    {integrationStatusLabel(it.status)}
                  </span>
                  <span className="font-mono text-xs text-foreground/80">
                    {it.estimated_cost_monthly_brl
                      ? `${formatCurrency(Number(it.estimated_cost_monthly_brl))}/mês`
                      : "Sem custo"}
                  </span>
                </div>
                {it.purpose && (
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                    {it.purpose}
                  </p>
                )}
                {it.credentials_location && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    Credenciais: {it.credentials_location}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
                  {it.documentation_url && (
                    <a
                      href={it.documentation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Documentação
                    </a>
                  )}
                  <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => softDelete(it.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <IntegracaoModal
        open={openModal}
        onOpenChange={setOpenModal}
        projectId={projectId}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

function IntegracaoModal({
  open,
  onOpenChange,
  projectId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  projectId: string;
  editing: ProjectIntegration | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [credsLoc, setCredsLoc] = useState("");
  const [status, setStatus] = useState<IntegrationStatus>("planejada");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setProvider(editing.provider ?? "");
      setPurpose(editing.purpose ?? "");
      setDocUrl(editing.documentation_url ?? "");
      setCredsLoc(editing.credentials_location ?? "");
      setStatus(editing.status);
      setCost(editing.estimated_cost_monthly_brl?.toString() ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setProvider("");
      setPurpose("");
      setDocUrl("");
      setCredsLoc("");
      setStatus("planejada");
      setCost("");
      setNotes("");
    }
  }, [open, editing]);

  async function save() {
    if (!name.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      provider: provider.trim() || null,
      purpose: purpose.trim() || null,
      documentation_url: docUrl.trim() || null,
      credentials_location: credsLoc.trim() || null,
      status,
      estimated_cost_monthly_brl: cost ? Number(cost) : null,
      notes: notes.trim() || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase
        .from("project_integrations")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("project_integrations").insert({
        ...payload,
        organization_id: GETBRAIN_ORG_ID,
        project_id: projectId,
      }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Integração atualizada" : "Integração criada");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar integração" : "Nova integração"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Recrutei API"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ex: Recrutei"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Propósito</Label>
            <Textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Para que serve no projeto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as IntegrationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Custo mensal estimado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">URL da documentação</Label>
            <Input
              type="url"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label className="text-xs">Onde estão as credenciais</Label>
            <Input
              value={credsLoc}
              onChange={(e) => setCredsLoc(e.target.value)}
              placeholder="Ex: 1Password / cofre da equipe (NÃO cole as chaves aqui)"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              ⚠ Apenas a localização. Não armazene credenciais aqui.
            </p>
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
