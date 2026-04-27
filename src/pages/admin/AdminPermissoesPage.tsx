import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { useCargos, useAllCargoPermissoes, useDeleteCargo, MODULOS, Cargo } from "@/hooks/useCargos";
import { CargoDialog } from "@/components/configuracoes/CargoDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminPermissoesPage() {
  const { data: cargos = [] } = useCargos();
  const { data: perms = [] } = useAllCargoPermissoes();
  const deleteMut = useDeleteCargo();

  const [editing, setEditing] = useState<Cargo | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Cargo | null>(null);

  const matrix = useMemo(() => {
    const m = new Map<string, Set<string>>();
    perms.forEach(p => {
      if (!m.has(p.cargo_id)) m.set(p.cargo_id, new Set());
      m.get(p.cargo_id)!.add(p.modulo);
    });
    return m;
  }, [perms]);

  const ordered = [...cargos].sort((a, b) => b.nivel - a.nivel);

  function handleNew() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(c: Cargo) {
    setEditing(c);
    setOpen(true);
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Cargo excluído");
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-lg">Cargos & Permissões</h2>
          <p className="text-sm text-muted-foreground">Crie cargos personalizados e defina o que cada um pode acessar.</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cargo
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b">
          <div className="font-semibold">Matriz de Permissões</div>
          <p className="text-sm text-muted-foreground">Controle de acesso por página.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Página</th>
                {ordered.map(c => (
                  <th key={c.id} className="px-4 py-3 font-medium text-muted-foreground text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                      <span className="truncate">{c.nome}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULOS.map(mod => (
                <tr key={mod.key} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{mod.label}</td>
                  {ordered.map(c => {
                    const has = matrix.get(c.id)?.has(mod.key);
                    return (
                      <td key={c.id} className="px-4 py-3 text-center">
                        {has ? <Check className="h-4 w-4 mx-auto text-success" /> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards por cargo com CRUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ordered.map(c => {
          const set = matrix.get(c.id) ?? new Set<string>();
          return (
            <Card key={c.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="font-semibold flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.cor }} />
                  <span className="truncate">{c.nome}</span>
                  {c.is_system && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{set.size}/{MODULOS.length}</Badge>
              </div>
              {c.descricao && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{c.descricao}</p>}
              <ul className="space-y-1 text-sm flex-1">
                {MODULOS.map(m => {
                  const has = set.has(m.key);
                  return (
                    <li key={m.key} className={cn("flex items-center gap-2", has ? "text-foreground" : "text-muted-foreground/40")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", has ? "bg-primary" : "bg-muted-foreground/30")} />
                      {m.label}
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {c.is_system ? "Ver" : "Editar"}
                </Button>
                {!c.is_system && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <CargoDialog open={open} onOpenChange={setOpen} cargo={editing} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo "{confirmDelete?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Cargos com usuários vinculados não podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
