import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveContrato, UsuarioContrato } from "@/hooks/useContratos";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  contrato?: UsuarioContrato | null;
}

export function NovoContratoDialog({ open, onOpenChange, userId, contrato }: Props) {
  const isEdit = !!contrato;
  const save = useSaveContrato();
  const [tipo, setTipo] = useState("CLT");
  const [cargo, setCargo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [salario, setSalario] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (open) {
      setTipo(contrato?.tipo ?? "CLT");
      setCargo(contrato?.cargo ?? "");
      setDataInicio(contrato?.data_inicio ?? "");
      setDataFim(contrato?.data_fim ?? "");
      setSalario(contrato?.salario?.toString() ?? "");
      setObs(contrato?.observacoes ?? "");
    }
  }, [open, contrato]);

  async function handleSave() {
    if (!dataInicio) return toast.error("Data de início obrigatória");
    try {
      await save.mutateAsync({
        id: contrato?.id, user_id: userId, tipo, cargo: cargo || null,
        data_inicio: dataInicio, data_fim: dataFim || null,
        salario: salario ? Number(salario) : null, observacoes: obs || null,
      } as any);
      toast.success(isEdit ? "Contrato atualizado" : "Contrato criado");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cargo</Label><Input value={cargo} onChange={e => setCargo(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Data início *</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
            <div><Label>Data fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          </div>
          <div><Label>Salário (R$)</Label><Input type="number" step="0.01" value={salario} onChange={e => setSalario(e.target.value)} /></div>
          <div><Label>Observações</Label><Textarea value={obs} onChange={e => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
