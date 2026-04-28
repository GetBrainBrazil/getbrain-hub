import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  CrmLeadSource,
  useCrmLeadSources,
  useCreateLeadSource,
  useDeleteLeadSource,
  useReorderLeadSource,
  useUpdateLeadSource,
} from "@/hooks/crm/useCrmLeadSources";

const PRESET_COLORS = ["#22D3EE", "#10B981", "#F59E0B", "#E1306C", "#A855F7", "#6366F1", "#94A3B8", "#0A66C2", "#25D366", "#4285F4"];

export function LeadSourcesManager({ canEdit }: { canEdit: boolean }) {
  const { data: sources = [], isLoading } = useCrmLeadSources();
  const create = useCreateLeadSource();
  const update = useUpdateLeadSource();
  const remove = useDeleteLeadSource();
  const reorder = useReorderLeadSource();
  const confirm = useConfirm();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sources.length) return;
    const a = sources[idx];
    const b = sources[target];
    reorder.mutate([
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ]);
  };

  const handleDelete = async (s: CrmLeadSource) => {
    const ok = await confirm({
      title: `Remover origem "${s.name}"?`,
      description: "Leads que já usam esta origem mantêm o valor histórico, mas ela não estará mais disponível para seleção.",
      confirmText: "Remover",
      variant: "destructive",
    });
    if (ok) remove.mutate(s.id);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-5">
      {!canEdit && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <Lock className="mr-1 inline h-3 w-3" /> Apenas administradores podem editar origens. Você pode visualizar a lista.
        </div>
      )}

      {canEdit && (
        <div className="rounded-lg border border-border bg-card/40 p-3 sm:p-4">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adicionar origem</Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="Ex: TikTok, Webinar, RD Station..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    create.mutate({ name: newName.trim(), color: newColor }, { onSuccess: () => setNewName("") });
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
            <Button
              onClick={() => create.mutate({ name: newName.trim(), color: newColor }, { onSuccess: () => setNewName("") })}
              disabled={!newName.trim() || create.isPending}
              className="sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sources.map((s, idx) => (
          <div
            key={s.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card/30 p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex items-center gap-2 sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canEdit || idx === 0}
                onClick={() => move(idx, -1)}
                aria-label="Subir"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canEdit || idx === sources.length - 1}
                onClick={() => move(idx, 1)}
                aria-label="Descer"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <span
                className="ml-1 inline-block h-4 w-4 rounded-full border border-border"
                style={{ background: s.color ?? "transparent" }}
              />
            </div>

            <div className="flex-1">
              {canEdit ? (
                <Input
                  defaultValue={s.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== s.name) update.mutate({ id: s.id, patch: { name: v } });
                  }}
                  className="h-9"
                />
              ) : (
                <span className="text-sm font-medium">{s.name}</span>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <code className="font-mono">{s.slug}</code>
                {s.is_system && <Badge variant="outline" className="h-5 text-[10px]">sistema</Badge>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={s.is_active}
                  disabled={!canEdit}
                  onCheckedChange={(v) => update.mutate({ id: s.id, patch: { is_active: v } })}
                />
                <span className="text-xs text-muted-foreground">{s.is_active ? "Ativa" : "Inativa"}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                disabled={!canEdit || s.is_system}
                onClick={() => handleDelete(s)}
                title={s.is_system ? "Origens do sistema só podem ser desativadas" : "Remover"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma origem cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}
