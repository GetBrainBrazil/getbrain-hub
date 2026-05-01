import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  proposalId: string;
  /** order_index do item (vem do índice da lista no editor) */
  orderIndex: number;
  itemTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailFields {
  detailed_description: string;
  deliverables: string[];
  acceptance_criteria: string[];
  client_dependencies: string[];
}

const empty: DetailFields = {
  detailed_description: "",
  deliverables: [],
  acceptance_criteria: [],
  client_dependencies: [],
};

export function ItemDetailsDialog({
  proposalId,
  orderIndex,
  itemTitle,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [form, setForm] = useState<DetailFields>(empty);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("proposal_items" as any)
          .select(
            "id, detailed_description, deliverables, acceptance_criteria, client_dependencies",
          )
          .eq("proposal_id", proposalId)
          .eq("order_index", orderIndex)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (data) {
          setItemId((data as any).id);
          setForm({
            detailed_description: (data as any).detailed_description || "",
            deliverables: (data as any).deliverables || [],
            acceptance_criteria: (data as any).acceptance_criteria || [],
            client_dependencies: (data as any).client_dependencies || [],
          });
        } else {
          setItemId(null);
          setForm(empty);
        }
      } catch (e: any) {
        toast.error(e?.message || "Erro ao carregar detalhes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, proposalId, orderIndex]);

  async function handleSave() {
    if (!itemId) {
      toast.error(
        "Salve os itens da proposta primeiro (autosave) antes de detalhar.",
      );
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("proposal_items" as any)
        .update({
          detailed_description: form.detailed_description.trim() || null,
          deliverables: form.deliverables.filter((s) => s.trim()),
          acceptance_criteria: form.acceptance_criteria.filter((s) => s.trim()),
          client_dependencies: form.client_dependencies.filter((s) => s.trim()),
        })
        .eq("id", itemId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["proposal_items", proposalId] });
      toast.success("Detalhes salvos");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar detalhes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do módulo · {itemTitle}</DialogTitle>
          <DialogDescription>
            Conteúdo exibido na página pública da proposta. Use bullets curtos e
            objetivos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Descrição detalhada</Label>
              <Textarea
                value={form.detailed_description}
                onChange={(e) =>
                  setForm({ ...form, detailed_description: e.target.value })
                }
                placeholder="Como esse módulo será entregue, escopo técnico, premissas…"
                className="min-h-[100px]"
              />
            </div>

            <BulletList
              label="Entregáveis"
              placeholder="Ex: Painel admin com filtros"
              items={form.deliverables}
              onChange={(items) => setForm({ ...form, deliverables: items })}
            />

            <BulletList
              label="Critérios de aceite"
              placeholder="Ex: 95% dos leads aparecem em até 5min"
              items={form.acceptance_criteria}
              onChange={(items) =>
                setForm({ ...form, acceptance_criteria: items })
              }
            />

            <BulletList
              label="Dependências do cliente"
              placeholder="Ex: Acesso ao Google Workspace"
              items={form.client_dependencies}
              onChange={(items) =>
                setForm({ ...form, client_dependencies: items })
              }
            />

            {!itemId && (
              <p className="text-[11px] text-warning">
                Item ainda não foi persistido. O autosave roda em ~2s — feche e
                reabra este diálogo após salvar.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !itemId}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar detalhes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulletList({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Nenhum item ainda.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                placeholder={placeholder}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
