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
  const { confirm, dialog } = useConfirm();

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
          <h3 className="text-sm font-semibold">Origens de leads</h3>
          <p className="text-xs text-muted-foreground">Opções disponíveis ao cadastrar um lead.</p>
        </div>
        <span className="text-xs text-muted-foreground">{sources.length} {sources.length === 1 ? "origem" : "origens"}</span>
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
                  style={{ background: newColor }}
                  aria-label="Escolher cor"
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`h-6 w-6 rounded-full border-2 transition ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Input
              placeholder="Nova origem (ex: TikTok, Webinar...)"
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
          {sources.map((s, idx) => (
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
                  disabled={!canEdit || idx === sources.length - 1}
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
                      style={{ background: s.color ?? "transparent" }}
                      aria-label="Editar cor"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => update.mutate({ id: s.id, patch: { color: c } })}
                          className={`h-6 w-6 rounded-full border-2 transition ${s.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                          style={{ background: c }}
                          aria-label={`Cor ${c}`}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-border"
                  style={{ background: s.color ?? "transparent" }}
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
                <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px] font-normal">sistema</Badge>
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
          {sources.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma origem cadastrada.</p>
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}
