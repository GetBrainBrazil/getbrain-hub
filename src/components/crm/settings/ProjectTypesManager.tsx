import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  CrmProjectType,
  useCrmProjectTypes,
  useCreateProjectType,
  useDeleteProjectType,
  useReorderProjectType,
  useUpdateProjectType,
} from "@/hooks/crm/useCrmProjectTypes";
import { ColorPickerPopover } from "@/components/ui/color-picker-popover";
import { randomVividHex } from "@/lib/crm/colorUtils";

export function ProjectTypesManager({ canEdit }: { canEdit: boolean }) {
  const { data: types = [], isLoading } = useCrmProjectTypes();
  const create = useCreateProjectType();
  const update = useUpdateProjectType();
  const remove = useDeleteProjectType();
  const reorder = useReorderProjectType();
  const { confirm, dialog } = useConfirm();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(() => randomVividHex());

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= types.length) return;
    const a = types[idx];
    const b = types[target];
    reorder.mutate([
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ]);
  };

  const handleDelete = async (s: CrmProjectType) => {
    const ok = await confirm({
      title: `Remover tipo "${s.name}"?`,
      description:
        "Deals que já usam este tipo mantêm o valor histórico, mas ele não estará mais disponível para seleção.",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (ok) remove.mutate(s.id);
  };

  const submit = () => {
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim(), color: newColor },
      {
        onSuccess: () => {
          setNewName("");
          setNewColor(randomVividHex());
        },
      },
    );
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Tipos de projeto</h3>
          <p className="text-xs text-muted-foreground">Opções disponíveis ao classificar o tipo de projeto de um deal.</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {types.length} {types.length === 1 ? "tipo" : "tipos"}
        </span>
      </div>

      {!canEdit && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          <Lock className="mr-1 inline h-3 w-3" /> Apenas administradores podem editar.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/30">
        {canEdit && (
          <div className="flex items-center gap-2 border-b border-border px-2 py-2">
            <ColorPickerPopover value={newColor} onCommit={setNewColor} size={24} />
            <Input
              placeholder="Novo tipo (ex: Dashboard, Treinamento...)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="h-8 flex-1 border-0 bg-transparent px-1 focus-visible:ring-0"
            />
            <Button size="sm" className="h-7" onClick={submit} disabled={!newName.trim() || create.isPending}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        )}

        <div className="divide-y divide-border">
          {types.map((s, idx) => (
            <div key={s.id} className="group flex items-center gap-2 px-2 py-1.5">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  className="flex h-3.5 w-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={!canEdit || idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label="Subir"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="flex h-3.5 w-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={!canEdit || idx === types.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label="Descer"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              <ColorPickerPopover
                value={s.color}
                disabled={!canEdit}
                size={18}
                onCommit={(hex) => update.mutate({ id: s.id, patch: { color: hex } })}
              />

              {canEdit ? (
                <Input
                  defaultValue={s.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== s.name) update.mutate({ id: s.id, patch: { name: v } });
                  }}
                  className="h-7 flex-1 border-0 bg-transparent px-1 text-sm focus-visible:ring-1"
                />
              ) : (
                <span className="flex-1 text-sm font-medium">{s.name}</span>
              )}

              {s.is_system && (
                <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px] font-normal">
                  padrão
                </Badge>
              )}

              <Switch
                checked={s.is_active}
                disabled={!canEdit}
                onCheckedChange={(v) => update.mutate({ id: s.id, patch: { is_active: v } })}
                className="scale-75"
              />

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive opacity-0 transition group-hover:opacity-100 disabled:opacity-0"
                disabled={!canEdit}
                onClick={() => handleDelete(s)}
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {types.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum tipo cadastrado.</p>
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}
