import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  CrmPainCategory,
  useCrmPainCategories,
  useCreatePainCategory,
  useDeletePainCategory,
  useReorderPainCategory,
  useUpdatePainCategory,
} from "@/hooks/crm/useCrmPainCategories";

import { PRESET_COLORS, colorPreviewFromToken as colorPreview } from "@/lib/crm/presetColors";

export function PainCategoriesManager({ canEdit }: { canEdit: boolean }) {
  const { data: categories = [], isLoading } = useCrmPainCategories();
  const create = useCreatePainCategory();
  const update = useUpdatePainCategory();
  const remove = useDeletePainCategory();
  const reorder = useReorderPainCategory();
  const { confirm, dialog } = useConfirm();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].value);

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= categories.length) return;
    const a = categories[idx];
    const b = categories[target];
    reorder.mutate([
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ]);
  };

  const handleDelete = async (s: CrmPainCategory) => {
    const ok = await confirm({
      title: `Remover categoria "${s.name}"?`,
      description: "Deals que já usam esta categoria mantêm o valor histórico, mas ela não estará mais disponível para seleção.",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (ok) remove.mutate(s.id);
  };

  const submit = () => {
    if (!newName.trim()) return;
    create.mutate({ name: newName.trim(), color: newColor }, { onSuccess: () => setNewName("") });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Categorias de dor</h3>
          <p className="text-xs text-muted-foreground">Opções disponíveis ao classificar a dor de um deal.</p>
        </div>
        <span className="text-xs text-muted-foreground">{categories.length} {categories.length === 1 ? "categoria" : "categorias"}</span>
      </div>

      {!canEdit && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          <Lock className="mr-1 inline h-3 w-3" /> Apenas administradores podem editar.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/30">
        {/* Add row */}
        {canEdit && (
          <div className="flex items-center gap-2 border-b border-border px-2 py-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-6 w-6 shrink-0 rounded-full border border-border transition hover:scale-110"
                  style={{ background: colorPreview(newColor) }}
                  aria-label="Escolher cor"
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColor(c.value)}
                      title={c.label}
                      className={`h-6 w-6 rounded-full border-2 transition ${newColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: c.preview }}
                      aria-label={`Cor ${c.label}`}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Input
              placeholder="Nova categoria (ex: Financeiro, Tecnológica...)"
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

        {/* List */}
        <div className="divide-y divide-border">
          {categories.map((s, idx) => (
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
                  disabled={!canEdit || idx === categories.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label="Descer"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              {canEdit ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ background: colorPreview(s.color) }}
                      aria-label="Editar cor"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => update.mutate({ id: s.id, patch: { color: c.value } })}
                          title={c.label}
                          className={`h-6 w-6 rounded-full border-2 transition ${s.color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                          style={{ background: c.preview }}
                          aria-label={`Cor ${c.label}`}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-border"
                  style={{ background: colorPreview(s.color) }}
                />
              )}

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
                <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px] font-normal">padrão</Badge>
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
          {categories.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}
