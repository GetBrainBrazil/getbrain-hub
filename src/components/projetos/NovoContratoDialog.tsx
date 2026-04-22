import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  onCreated: () => void;
}

export function NovoContratoDialog({ open, onOpenChange, projectId, defaultProjectId, onCreated }: Props) {
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? defaultProjectId ?? "");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tokenBudget, setTokenBudget] = useState("");
  const [hoursBudget, setHoursBudget] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const showPicker = !projectId;

  useEffect(() => {
    if (!open) return;
    setSelectedProjectId(projectId ?? defaultProjectId ?? "");
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
  }, [open, projectId, defaultProjectId, showPicker]);

  async function handleSave() {
    const finalProjectId = projectId ?? selectedProjectId;
    if (!finalProjectId) {
      toast.error("Selecione um projeto");
      return;
    }
    if (!monthlyFee || Number(monthlyFee) <= 0) {
      toast.error("Informe a mensalidade");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("maintenance_contracts").insert({
      organization_id: GETBRAIN_ORG_ID,
      project_id: finalProjectId,
      monthly_fee: Number(monthlyFee),
      monthly_fee_discount_percent: Number(discount) || 0,
      token_budget_brl: tokenBudget ? Number(tokenBudget) : null,
      hours_budget: hoursBudget ? Number(hoursBudget) : null,
      start_date: startDate,
      end_date: endDate || null,
      notes: notes || null,
      status: "active",
    } as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contrato criado");
    onOpenChange(false);
    setMonthlyFee("");
    setDiscount("0");
    setTokenBudget("");
    setHoursBudget("");
    setEndDate("");
    setNotes("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Contrato de Manutenção</DialogTitle>
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
              <Input type="number" step="0.01" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} />
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bolsão tokens (R$)</Label>
              <Input type="number" step="0.01" value={tokenBudget} onChange={(e) => setTokenBudget(e.target.value)} />
            </div>
            <div>
              <Label>Horas / mês</Label>
              <Input type="number" value={hoursBudget} onChange={(e) => setHoursBudget(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
