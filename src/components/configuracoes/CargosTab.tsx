import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCargos, useDeleteCargo, useAllCargoPermissoes, Cargo } from "@/hooks/useCargos";
import { useUsuarios } from "@/hooks/useUsuarios";
import { CargoDialog } from "./CargoDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function CargosTab() {
  const { data: cargos = [], isLoading } = useCargos();
  const { data: perms = [] } = useAllCargoPermissoes();
  const { data: usuarios = [] } = useUsuarios();
  const deleteMut = useDeleteCargo();
  const [editing, setEditing] = useState<Cargo | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Cargo | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    usuarios.forEach(u => { if (u.cargo_id) m.set(u.cargo_id, (m.get(u.cargo_id) ?? 0) + 1); });
    return m;
  }, [usuarios]);

  const permCounts = useMemo(() => {
    const m = new Map<string, number>();
    perms.forEach(p => m.set(p.cargo_id, (m.get(p.cargo_id) ?? 0) + 1));
    return m;
  }, [perms]);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(c: Cargo) { setEditing(c); setOpen(true); }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Cargo excluído");
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
      setConfirmDelete(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold">Cargos e Permissões</h3>
          <p className="text-sm text-muted-foreground">Defina níveis de acesso para os usuários do sistema</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto min-h-10 gap-1">
          <Plus className="h-4 w-4" /> Novo Cargo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cargos.map(c => {
              const usados = counts.get(c.id) ?? 0;
              const numPerms = permCounts.get(c.id) ?? 0;
              return (
                <div key={c.id} className="border rounded-lg p-4 hover:shadow-sm transition group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                      <h4 className="font-semibold truncate">{c.nome}</h4>
                    </div>
                    {c.is_system && <Badge variant="outline" className="text-xs flex-shrink-0"><Lock className="h-3 w-3 mr-1" />Sistema</Badge>}
                  </div>
                  {c.descricao && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.descricao}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Nível {c.nivel}</span>
                    <span>{numPerms} permissões</span>
                    <span>{usados} usuário{usados !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="flex-1 min-h-9">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> {c.is_system ? "Ver" : "Editar"}
                    </Button>
                    {!c.is_system && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(c)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <CargoDialog open={open} onOpenChange={setOpen} cargo={editing} />
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo "{confirmDelete?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
