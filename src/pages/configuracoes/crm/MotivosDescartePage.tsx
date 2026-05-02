/**
 * Motivos de descarte (CRM) — catálogo editável usado quando um Deal é
 * marcado como "Perdido" no funil. Admin pode criar, editar, reordenar,
 * ativar/desativar e remover motivos. Itens marcados como `is_system` são
 * preservados (não exibem botão de excluir) para garantir backwards-compat.
 *
 * Tabela: public.deal_lost_reasons
 * Lê: qualquer usuário autenticado (selects do funil precisam).
 * Escreve: apenas admin (via RLS).
 */
import { useEffect, useState } from "react";
import { XCircle, Plus, Save, Trash2, GripVertical, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ColorPickerPopover } from "@/components/ui/color-picker-popover";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type LostReason = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
}

export default function MotivosDescartePage() {
  const [items, setItems] = useState<LostReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const confirm = useConfirm();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_lost_reasons" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error("Erro ao carregar: " + error.message);
    else setItems((data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function patch(id: string, patch: Partial<LostReason>) {
    setSavingId(id);
    const { error } = await supabase.from("deal_lost_reasons" as any).update(patch).eq("id", id);
    setSavingId(null);
    if (error) { toast.error("Erro: " + error.message); return; }
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, ...patch } : x));
  }

  async function remove(item: LostReason) {
    if (item.is_system) return;
    const ok = await confirm({
      title: "Remover motivo?",
      description: `O motivo "${item.label}" será removido. Deals já marcados com ele continuam intactos.`,
      confirmText: "Remover", variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase.from("deal_lost_reasons" as any).delete().eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    toast.success("Motivo removido.");
  }

  async function create() {
    const label = newLabel.trim();
    if (!label) return;
    setCreating(true);
    const slug = slugify(label) || `motivo_${Date.now()}`;
    const sort_order = (items[items.length - 1]?.sort_order ?? 0) + 10;
    const { data, error } = await supabase
      .from("deal_lost_reasons" as any)
      .insert({ slug, label, sort_order, color: "#94a3b8" })
      .select().single();
    setCreating(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    setItems((xs) => [...xs, data as any]);
    setNewLabel("");
    toast.success("Motivo criado.");
  }

  async function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const a = items[idx], b = items[next];
    const newItems = [...items];
    newItems[idx] = b; newItems[next] = a;
    setItems(newItems);
    await Promise.all([
      supabase.from("deal_lost_reasons" as any).update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("deal_lost_reasons" as any).update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold font-display">Motivos de descarte</h2>
          <p className="text-xs text-muted-foreground">
            Catálogo usado quando um Deal é marcado como Perdido. Aparece no select de "Motivo de perda" do funil.
          </p>
        </div>
      </header>

      <Card className="p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Novo motivo (ex: Sem decisor envolvido)"
          onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
          className="flex-1"
        />
        <Button onClick={() => void create()} disabled={!newLabel.trim() || creating} className="gap-1.5">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </Button>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center py-12">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando motivos…
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <Card key={item.id} className={`p-3 flex flex-col md:flex-row md:items-center gap-3 ${!item.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => void move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  aria-label="Subir"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <ColorPickerPopover
                  color={item.color}
                  onChange={(c) => void patch(item.id, { color: c })}
                />
              </div>
              <Input
                value={item.label}
                onChange={(e) => setItems((xs) => xs.map((x) => x.id === item.id ? { ...x, label: e.target.value } : x))}
                onBlur={(e) => { if (e.target.value !== item.label || true) void patch(item.id, { label: e.target.value.trim() }); }}
                className="md:max-w-[260px]"
              />
              <Textarea
                value={item.description ?? ""}
                onChange={(e) => setItems((xs) => xs.map((x) => x.id === item.id ? { ...x, description: e.target.value } : x))}
                onBlur={(e) => void patch(item.id, { description: e.target.value.trim() || null })}
                placeholder="Descrição opcional…"
                className="flex-1 min-h-[40px] resize-none"
                rows={1}
              />
              <div className="flex items-center gap-3 shrink-0">
                <code className="text-[10px] text-muted-foreground/60 font-mono hidden lg:inline">{item.slug}</code>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(v) => void patch(item.id, { is_active: v })}
                  />
                  <span className="text-[10px] text-muted-foreground">{item.is_active ? "Ativo" : "Inativo"}</span>
                </div>
                {item.is_system ? (
                  <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="h-2.5 w-2.5" /> Sistema</Badge>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => void remove(item)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {savingId === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">Nenhum motivo cadastrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
