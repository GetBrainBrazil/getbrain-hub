import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  ProjectStatus,
  ProjectType,
  GETBRAIN_ORG_ID,
  getRoleLabel,
  relativeTime,
} from "@/lib/projetos-helpers";
import { StatusBadge, MaintenanceStatusBadge } from "./ProjetoBadges";
import { ActorAvatar } from "./ActorAvatar";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getEffectiveMrr, getDiscountInfo } from "@/lib/maintenance";
import { Plus } from "lucide-react";
import { AlocarAtorDialog } from "./AlocarAtorDialog";
import { NovoContratoDialog } from "./NovoContratoDialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AcceptanceCriteriaEditor } from "@/components/shared/AcceptanceCriteriaEditor";
import type { AcceptanceCriterion } from "@/types/shared";

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}

export function ProjetoDrawer({ projectId, open, onOpenChange, onChanged }: Props) {
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const [drawerTab, setDrawerTab] = usePersistedState<string>(
    `projeto-drawer:${projectId ?? "none"}:tab`,
    "overview",
  );
  const [project, setProject] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [allocs, setAllocs] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logActors, setLogActors] = useState<Record<string, string>>({});
  const [allocOpen, setAllocOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  // editable form state
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("sistema_personalizado");
  const [contractValue, setContractValue] = useState("");
  const [installments, setInstallments] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimated, setEstimated] = useState("");
  const [actual, setActual] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && projectId) load();
  }, [open, projectId]);

  async function load() {
    if (!projectId) return;
    const { data: p } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (!p) return;
    setProject(p);
    setName(p.name);
    setType(p.project_type as ProjectType);
    setContractValue(p.contract_value?.toString() ?? "");
    setInstallments(p.installments_count?.toString() ?? "");
    setStartDate(p.start_date ?? "");
    setEstimated(p.estimated_delivery_date ?? "");
    setActual(p.actual_delivery_date ?? "");
    setDescription(p.description ?? "");
    setCriteria(Array.isArray(p.acceptance_criteria) ? (p.acceptance_criteria as unknown as AcceptanceCriterion[]) : []);
    setNotes(p.notes ?? "");

    const { data: c } = await supabase
      .from("companies")
      .select("id, legal_name, trade_name")
      .eq("id", p.company_id)
      .maybeSingle();
    setCompany(c);

    const { data: pa } = await supabase
      .from("project_actors")
      .select("id, role_in_project, allocation_percent, started_at, actor_id")
      .eq("project_id", projectId)
      .is("ended_at", null);
    if (pa && pa.length > 0) {
      const ids = pa.map((x) => x.actor_id);
      const { data: actorRows } = await supabase
        .from("actors")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const map = new Map((actorRows || []).map((a) => [a.id, a]));
      setAllocs(pa.map((x) => ({ ...x, actor: map.get(x.actor_id) })));
    } else {
      setAllocs([]);
    }

    const { data: mc } = await supabase
      .from("maintenance_contracts")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false });
    setContracts(mc || []);

    const { data: al } = await supabase
      .from("audit_logs")
      .select("id, action, changes, created_at, actor_id, metadata")
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs(al || []);
    if (al && al.length > 0) {
      const aids = Array.from(new Set(al.map((l) => l.actor_id).filter(Boolean))) as string[];
      if (aids.length > 0) {
        const { data: ar } = await supabase.from("actors").select("id, display_name").in("id", aids);
        setLogActors(Object.fromEntries((ar || []).map((a) => [a.id, a.display_name])));
      }
    }
  }

  async function getActorId(): Promise<string | null> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data: h } = await supabase
      .from("humans")
      .select("actor_id")
      .eq("auth_user_id", u.user.id)
      .maybeSingle();
    return (h as any)?.actor_id ?? null;
  }

  async function logChange(action: "update" | "status_change", changes: Record<string, { before: any; after: any }>) {
    if (!projectId) return;
    const actorId = await getActorId();
    await supabase.from("audit_logs").insert({
      organization_id: GETBRAIN_ORG_ID,
      actor_id: actorId,
      entity_type: "project",
      entity_id: projectId,
      action,
      changes,
    } as any);
  }

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || !projectId || newStatus === project.status) return;
    const label = PROJECT_STATUS_OPTIONS.find((o) => o.value === newStatus)?.label;
    const ok = await confirmDialog({
      title: "Mudar status do projeto?",
      description: `Novo status: "${label}".`,
      confirmLabel: "Mudar",
      variant: "default",
    });
    if (!ok) return;
    const before = project.status;
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logChange("status_change", { status: { before, after: newStatus } });
    toast.success("Status atualizado");
    onChanged();
    load();
  }

  async function handleSaveOverview() {
    if (!project || !projectId) return;
    const updates: any = {};
    const changes: Record<string, { before: any; after: any }> = {};

    if (name !== project.name) {
      updates.name = name;
      changes.name = { before: project.name, after: name };
    }
    if (type !== project.project_type) {
      updates.project_type = type;
      changes.project_type = { before: project.project_type, after: type };
    }
    const cv = contractValue ? Number(contractValue) : null;
    if (cv !== (project.contract_value ?? null)) {
      updates.contract_value = cv;
      changes.contract_value = { before: project.contract_value, after: cv };
    }
    const inst = installments ? Number(installments) : null;
    if (inst !== (project.installments_count ?? null)) {
      updates.installments_count = inst;
      changes.installments_count = { before: project.installments_count, after: inst };
    }
    const sd = startDate || null;
    if (sd !== (project.start_date ?? null)) {
      updates.start_date = sd;
      changes.start_date = { before: project.start_date, after: sd };
    }
    const ed = estimated || null;
    if (ed !== (project.estimated_delivery_date ?? null)) {
      updates.estimated_delivery_date = ed;
      changes.estimated_delivery_date = { before: project.estimated_delivery_date, after: ed };
    }
    const ad = actual || null;
    if (ad !== (project.actual_delivery_date ?? null)) {
      updates.actual_delivery_date = ad;
      changes.actual_delivery_date = { before: project.actual_delivery_date, after: ad };
    }
    if (description !== (project.description ?? "")) {
      updates.description = description || null;
    }
    if (criteria !== (project.acceptance_criteria ?? "")) {
      updates.acceptance_criteria = criteria || null;
    }
    if (notes !== (project.notes ?? "")) {
      updates.notes = notes || null;
    }

    if (Object.keys(updates).length === 0) {
      toast("Nada para salvar");
      return;
    }

    const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (Object.keys(changes).length > 0) await logChange("update", changes);
    toast.success("Projeto atualizado");
    onChanged();
    load();
  }

  async function handleDeallocate(allocId: string) {
    const { error } = await supabase
      .from("project_actors")
      .update({ ended_at: new Date().toISOString().slice(0, 10) })
      .eq("id", allocId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ator desalocado");
    load();
  }

  const hasActiveContract = contracts.some((c) => c.status === "active");

  if (!project) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[40vw] sm:w-[40vw]">
          <div className="text-muted-foreground text-sm py-12 text-center">Carregando...</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[40vw] sm:w-[40vw] overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-accent text-xl font-mono">{project.code}</SheetTitle>
            <Select value={project.status} onValueChange={(v) => handleStatusChange(v as ProjectStatus)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <StatusBadge status={project.status as ProjectStatus} />
        </SheetHeader>

        <Tabs value={drawerTab} onValueChange={setDrawerTab} className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="actors">Atores</TabsTrigger>
            <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 pt-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Cliente</Label>
              <div className="px-3 py-2 rounded-md border bg-muted/30 text-sm">
                {company?.trade_name || company?.legal_name || "—"}
              </div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Contratado (R$)</Label>
                <Input type="number" step="0.01" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
              </div>
              <div>
                <Label>Nº de Parcelas</Label>
                <Input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Entrega Estimada</Label>
                <Input type="date" value={estimated} onChange={(e) => setEstimated(e.target.value)} />
              </div>
            </div>
            {["entregue", "em_manutencao", "arquivado"].includes(project.status) && (
              <div>
                <Label>Data Real de Entrega</Label>
                <Input type="date" value={actual} onChange={(e) => setActual(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Critérios de Aceite</Label>
              <RichTextEditor
                value={criteria}
                onChange={setCriteria}
                rows={3}
                autoFocus={false}
                placeholder="- [ ] Entrega A&#10;- [ ] Entrega B"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="pt-2">
              <Button onClick={handleSaveOverview} className="w-full">Salvar alterações</Button>
            </div>
          </TabsContent>

          <TabsContent value="actors" className="space-y-3 pt-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAllocOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Alocar Ator
              </Button>
            </div>
            {allocs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum ator alocado</p>
            ) : (
              <div className="space-y-2">
                {allocs.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <ActorAvatar name={a.actor?.display_name ?? "?"} avatarUrl={a.actor?.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.actor?.display_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleLabel(a.role_in_project)}
                        {a.allocation_percent ? ` • ${a.allocation_percent}%` : ""}
                        {a.started_at ? ` • desde ${formatDate(a.started_at)}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeallocate(a.id)}>
                      Desalocar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-3 pt-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setContractOpen(true)}
                disabled={hasActiveContract}
                title={hasActiveContract ? "Já existe contrato ativo. Encerre o atual antes de criar outro." : ""}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Novo Contrato
              </Button>
            </div>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum contrato</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const liquido = getEffectiveMrr(c);
                  const info = getDiscountInfo(c);
                  return (
                    <div key={c.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <MaintenanceStatusBadge status={c.status} />
                        <span className="text-sm font-bold">{formatCurrency(liquido)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                          Mensalidade: {formatCurrency(Number(c.monthly_fee))}
                          {info.hasDiscount && (
                            <>
                              {" "}(- {c.monthly_fee_discount_percent}%
                              {info.indefinite
                                ? " indef."
                                : info.endsAt
                                ? ` ${info.expired ? "exp." : "até"} ${formatDate(
                                    info.endsAt.toISOString().slice(0, 10),
                                  )}`
                                : ""}
                              )
                            </>
                          )}
                        </p>
                        <p>
                          Período: {formatDate(c.start_date)} —{" "}
                          {c.end_date ? formatDate(c.end_date) : "Atual"}
                        </p>
                        {c.token_budget_brl && <p>Bolsão tokens: {formatCurrency(Number(c.token_budget_brl))}</p>}
                        {c.hours_budget && <p>Horas/mês: {c.hours_budget}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <ActorAvatar name={logActors[l.actor_id] || "Sistema"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{logActors[l.actor_id] || "Sistema"}</span>{" "}
                        <span className="text-muted-foreground">
                          {l.action === "create" && "criou o projeto"}
                          {l.action === "update" && "atualizou o projeto"}
                          {l.action === "status_change" && "mudou o status"}
                          {l.action === "delete" && "arquivou"}
                          {l.action === "restore" && "restaurou"}
                          {l.action === "custom" && "registrou ação"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{relativeTime(l.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlocarAtorDialog
          open={allocOpen}
          onOpenChange={setAllocOpen}
          projectId={projectId!}
          excludeActorIds={allocs.map((a) => a.actor_id)}
          onAllocated={(allocation) => {
            setAllocs((prev) => [...prev, allocation]);
          }}
        />
        <NovoContratoDialog
          open={contractOpen}
          onOpenChange={setContractOpen}
          projectId={projectId!}
          onCreated={load}
        />
        {confirmDialogEl}
      </SheetContent>
    </Sheet>
  );
}
