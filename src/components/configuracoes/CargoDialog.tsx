import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Cargo, MODULOS, ACOES, useCargoPermissoes, useSaveCargo } from "@/hooks/useCargos";

const CORES = ["#DC2626", "#EA580C", "#D97706", "#65A30D", "#16A34A", "#0891B2", "#3B82F6", "#6366F1", "#8B5CF6", "#DB2777"];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; cargo?: Cargo | null; }

export function CargoDialog({ open, onOpenChange, cargo }: Props) {
  const isEdit = !!cargo;
  const isSystem = !!cargo?.is_system;
  const { data: existingPerms = [] } = useCargoPermissoes(cargo?.id);
  const saveMut = useSaveCargo();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivel, setNivel] = useState(1);
  const [cor, setCor] = useState(CORES[6]);
  const [perms, setPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setNome(cargo?.nome ?? "");
      setDescricao(cargo?.descricao ?? "");
      setNivel(cargo?.nivel ?? 1);
      setCor(cargo?.cor ?? CORES[6]);
      setPerms(new Set(existingPerms.map(p => `${p.modulo}:${p.acao}`)));
    }
  }, [open, cargo, existingPerms]);

  function toggle(modulo: string, acao: string) {
    if (isSystem) return;
    const key = `${modulo}:${acao}`;
    const next = new Set(perms);
    next.has(key) ? next.delete(key) : next.add(key);
    setPerms(next);
  }

  function toggleRow(modulo: string, on: boolean) {
    if (isSystem) return;
    const next = new Set(perms);
    ACOES.forEach(a => {
      const k = `${modulo}:${a.key}`;
      on ? next.add(k) : next.delete(k);
    });
    setPerms(next);
  }

  async function handleSubmit() {
    if (!nome.trim()) return toast.error("Nome obrigatório");
    try {
      await saveMut.mutateAsync({
        id: cargo?.id, nome, descricao, nivel, cor,
        permissoes: Array.from(perms).map(k => { const [modulo, acao] = k.split(":"); return { modulo, acao }; }),
      });
      toast.success(isEdit ? "Cargo atualizado" : "Cargo criado");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar Cargo${isSystem ? " (Sistema)" : ""}` : "Novo Cargo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} disabled={isSystem} />
            </div>
            <div>
              <Label>Nível (1-5)</Label>
              <Input type="number" min={1} max={5} value={nivel} onChange={e => setNivel(Number(e.target.value))} disabled={isSystem} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} disabled={isSystem} />
          </div>
          <div>
            <Label>Cor do badge</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CORES.map(c => (
                <button key={c} type="button" disabled={isSystem}
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div>
            <Label>Permissões</Label>
            <div className="overflow-x-auto mt-2 border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 sticky left-0 bg-muted/50">Módulo</th>
                    {ACOES.map(a => <th key={a.key} className="text-center p-2 min-w-16">{a.label}</th>)}
                    <th className="text-center p-2 min-w-16">Tudo</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULOS.map(m => {
                    const allOn = ACOES.every(a => perms.has(`${m.key}:${a.key}`));
                    return (
                      <tr key={m.key} className="border-t">
                        <td className="p-2 font-medium sticky left-0 bg-background">{m.label}</td>
                        {ACOES.map(a => (
                          <td key={a.key} className="text-center p-2">
                            <Checkbox checked={perms.has(`${m.key}:${a.key}`)} onCheckedChange={() => toggle(m.key, a.key)} disabled={isSystem} />
                          </td>
                        ))}
                        <td className="text-center p-2">
                          <Checkbox checked={allOn} onCheckedChange={(v) => toggleRow(m.key, !!v)} disabled={isSystem} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Marcar "Admin" concede todas as ações no módulo.</p>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          {!isSystem && (
            <Button onClick={handleSubmit} disabled={saveMut.isPending} className="w-full sm:w-auto">
              {saveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
