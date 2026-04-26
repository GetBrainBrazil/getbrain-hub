import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUpdateRecurrence } from "@/hooks/recorrencias/useUpdateRecurrence";
import { AlertCircle } from "lucide-react";
import { formatMoneyForInput, parseMoney, applyMoneyMask } from "@/components/config-financeiras/shared";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recurrence: any;
}

const CASCADE_FIELDS: (keyof any)[] = [
  "amount", "categoria_id", "centro_custo_id", "conta_bancaria_id", "meio_pagamento_id",
  "cliente_id", "fornecedor_id", "projeto_id",
];

export function EditarRecorrenciaModal({ open, onOpenChange, recurrence }: Props) {
  const updateMut = useUpdateRecurrence();
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [impact, setImpact] = useState<{ afetadas: number; preservadas: number } | null>(null);

  useEffect(() => {
    if (!open || !recurrence) return;
    setDescription(recurrence.description || "");
    setAmountStr(formatMoneyForInput(Number(recurrence.amount || 0)));
    setConfirmStep(false);
    setImpact(null);
  }, [open, recurrence]);

  async function computeImpact() {
    const { data } = await supabase
      .from("movimentacoes")
      .select("status, data_vencimento")
      .eq("recurrence_id", recurrence.id)
      .is("deleted_at", null);
    const today = new Date().toISOString().slice(0, 10);
    let afetadas = 0, preservadas = 0;
    (data || []).forEach((m: any) => {
      if (m.status === "pendente" && m.data_vencimento >= today) afetadas++;
      else preservadas++;
    });
    return { afetadas, preservadas };
  }

  async function handleSubmit() {
    const newAmount = parseMoney(amountStr);
    const amountChanged = Number(recurrence.amount) !== newAmount;
    const descChanged = (recurrence.description || "") !== description.trim();

    if (!amountChanged && !descChanged) {
      onOpenChange(false);
      return;
    }

    if (amountChanged && !confirmStep) {
      const i = await computeImpact();
      setImpact(i);
      setConfirmStep(true);
      return;
    }

    const payload: Record<string, any> = { description: description.trim() };
    if (amountChanged) payload.amount = newAmount;

    try {
      await updateMut.mutateAsync({ id: recurrence.id, payload });
      onOpenChange(false);
    } catch (e) {
      // toast already shown
    }
  }

  if (!recurrence) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Recorrência {recurrence.code}</DialogTitle>
        </DialogHeader>

        {!confirmStep && (
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                value={amountStr}
                onChange={(e) => setAmountStr(applyMoneyMask(e.target.value))}
                inputMode="decimal"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Alterar o valor afetará apenas parcelas pendentes futuras.
              </p>
            </div>
          </div>
        )}

        {confirmStep && impact && (
          <div className="py-2 space-y-3">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-400">Esta mudança afetará parcelas futuras desta recorrência.</p>
                <ul className="mt-2 space-y-1 text-foreground">
                  <li>• <strong>{impact.afetadas}</strong> parcela(s) pendente(s) futura(s) serão atualizadas</li>
                  <li>• <strong>{impact.preservadas}</strong> parcela(s) já paga(s) ou vencida(s) permanecerão inalteradas</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMut.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={updateMut.isPending}>
            {confirmStep ? "Confirmar e atualizar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
