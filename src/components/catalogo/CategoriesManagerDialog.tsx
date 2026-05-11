import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, ArchiveRestore, Pencil, Plus, Check, X } from "lucide-react";
import {
  useCatalogCategories,
  useUpsertCategory,
  useToggleCategoryArchive,
  CatalogCategory,
} from "@/hooks/catalogo/useCatalog";
import { useConfirm } from "@/components/ConfirmDialog";

export function CategoriesManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: categories = [] } = useCatalogCategories({ includeArchived: true });
  const upsert = useUpsertCategory();
  const toggle = useToggleCategoryArchive();
  const { confirm, dialog } = useConfirm();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await upsert.mutateAsync({ name: newName });
    setNewName("");
  };

  const handleSaveRename = async (cat: CatalogCategory) => {
    if (!editingName.trim() || editingName === cat.name) {
      setEditingId(null);
      return;
    }
    await upsert.mutateAsync({ id: cat.id, name: editingName, color: cat.color });
    setEditingId(null);
  };

  const handleArchive = async (cat: CatalogCategory) => {
    if (cat.is_active) {
      const ok = await confirm({
        title: "Arquivar categoria?",
        description: "Categorias arquivadas não aparecem em novos cadastros, mas continuam visíveis em produtos antigos.",
        confirmLabel: "Arquivar",
        variant: "default",
      });
      if (!ok) return;
    }
    await toggle.mutateAsync({ id: cat.id, archive: cat.is_active });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar categorias</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Criar
            </Button>
          </div>

          <div className="mt-3 max-h-[60vh] overflow-y-auto divide-y divide-border rounded-md border border-border">
            {categories.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma categoria ainda.</div>
            )}
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center gap-2 p-2.5 ${!cat.is_active ? "opacity-60" : ""}`}
              >
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveRename(cat)}
                      autoFocus
                      className="h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleSaveRename(cat)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">
                      {cat.name}
                      {!cat.is_active && (
                        <span className="ml-2 text-xs text-muted-foreground">(arquivada)</span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditingName(cat.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(cat)}>
                      {cat.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
