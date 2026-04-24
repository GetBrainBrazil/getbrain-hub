import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GETBRAIN_ORG_ID } from "@/lib/projetos-helpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Quando informado, esconde o seletor de projeto e usa esse id direto. */
  projectId?: string;
  /** Pré-seleção opcional quando o seletor de projeto está visível. */
  defaultProjectId?: string;
  /** Quando informado, o dialog opera em modo edição do contrato existente. */
  contractId?: string;
  onCreated: () => void;
}

const EMPTY = {
  monthlyFee: "",
  discount: "0",
  discountDurationMode: "indefinite" as "indefinite" | "months",
  discountDurationMonths: "6",
  tokenBudget: "",
  hoursBudget: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
};

export function NovoContratoDialog({ open, onOpenChange, projectId, defaultProjectId, contractId, onCreated }: Props) {
  const isEdit = !!contractId;
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? defaultProjectId ?? "");
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const showPicker = !projectId && !isEdit;

  useEffect(() => {
    if (!open) return;
    setSelectedProjectId(projectId ?? defaultProjectId ?? "");

    if (isEdit && contractId) {
      setLoading(true);
      (async () => {
        const { data, error } = await supabase
          .from("maintenance_contracts")
          .select("*")
          .eq("id", contractId)
          .maybeSingle();
        setLoading(false);
        if (error || !data) {
          toast.error(error?.message || "Contrato não encontrado");
          return;
        }
        setForm({
          monthlyFee: data.monthly_fee != null ? String(data.monthly_fee) : "",
          discount: data.monthly_fee_discount_percent != null ? String(data.monthly_fee_discount_percent) : "0",
          discountDurationMode: (data as any).discount_duration_months ? "months" : "indefinite",
          discountDurationMonths: (data as any).discount_duration_months
            ? String((data as any).discount_duration_months)
            : "6",
          tokenBudget: data.token_budget_brl != null ? String(data.token_budget_brl) : "",
          hoursBudget: data.hours_budget != null ? String(data.hours_budget) : "",
          startDate: data.start_date ?? new Date().toISOString().slice(0, 10),
          endDate: data.end_date ?? "",
          notes: data.notes ?? "",
        });
      })();
    } else {
      setForm({ ...EMPTY });
    }

    if (showPicker) {
      (async () => {
        const { data } = await supabase
          .from("projects")
          .select("id, code, name")
          .is("deleted_at", null)
          .order("code", { ascending: false });
        setProjects(data || []);
      })();
    }
  }, [open, projectId, defaultProjectId, contractId, isEdit, showPicker]);

  const discountPct = Number(form.discount) || 0;
  const showDurationPicker = discountPct > 0;

  async function handleSave() {
    const finalProjectId = projectId ?? selectedProjectId;
    if (!isEdit && !finalProjectId) {
      toast.error("Selecione um projeto");
      return;
    }
    if (!form.monthlyFee || Number(form.monthlyFee) <= 0) {
      toast.error("Informe a mensalidade");
      return;
    }

    const durationMonths =
      discountPct > 0 && form.discountDurationMode === "months"
        ? Math.max(1, Number(form.discountDurationMonths) || 0)
        : null;

    const payload: any = {
      monthly_fee: Number(form.monthlyFee),
      monthly_fee_discount_percent: discountPct,
      discount_duration_months: durationMonths,
      token_budget_brl: form.tokenBudget ? Number(form.tokenBudget) : null,
      hours_budget: form.hoursBudget ? Number(form.hoursBudget) : null,
      start_date: form.startDate,
      end_date: form.endDate || null,
      notes: form.notes || null,
    };

    setSaving(true);
    const { error } = isEdit
      ? await supabase.from("maintenance_contracts").update(payload).eq("id", contractId!)
      : await supabase.from("maintenance_contracts").insert({
          ...payload,
          organization_id: GETBRAIN_ORG_ID,
          project_id: finalProjectId,
          status: "active",
        } as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Contrato atualizado" : "Contrato criado");
    onOpenChange(false);
    setForm({ ...EMPTY });
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Contrato de Manutenção" : "Novo Contrato de Manutenção"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {showPicker && (
            <div>
              <Label>Projeto *</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione um projeto..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mensalidade (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monthlyFee}
                onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          {showDurationPicker && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <Label className="mb-2 block text-xs text-muted-foreground">Desconto válido por</Label>
              <RadioGroup
                value={form.discountDurationMode}
                onValueChange={(v) => setForm((f) => ({ ...f, discountDurationMode: v as "indefinite" | "months" }))}
                className="gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="indefinite" id="dur-indef" />
                  <Label htmlFor="dur-indef" className="cursor-pointer text-sm font-normal">
                    Tempo indefinido
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="months" id="dur-months" />
                  <Label htmlFor="dur-months" className="cursor-pointer text-sm font-normal">
                    Por
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.discountDurationMonths}
                    onChange={(e) => setForm((f) => ({ ...f, discountDurationMonths: e.target.value }))}
                    onFocus={() => setForm((f) => ({ ...f, discountDurationMode: "months" }))}
                    className="h-8 w-20"
                  />
                  <span className="text-sm text-muted-foreground">meses</span>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bolsão tokens (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.tokenBudget}
                onChange={(e) => setForm((f) => ({ ...f, tokenBudget: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Horas / mês</Label>
              <Input
                type="number"
                value={form.hoursBudget}
                onChange={(e) => setForm((f) => ({ ...f, hoursBudget: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
