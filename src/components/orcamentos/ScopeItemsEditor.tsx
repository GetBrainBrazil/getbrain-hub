import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical, ArrowUp, ArrowDown, FileText } from "lucide-react";
import { formatBRL, type ScopeItem } from "@/lib/orcamentos/calculateTotal";

interface Props {
  items: ScopeItem[];
  onChange: (items: ScopeItem[]) => void;
  /** Quando definido, mostra botão "Detalhes" em cada item passando o índice. */
  onOpenDetails?: (index: number) => void;
}

export function ScopeItemsEditor({ items, onChange, onOpenDetails }: Props) {
  const update = (idx: number, patch: Partial<ScopeItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const add = () => {
    onChange([
      ...items,
      { title: "Novo item", description: "", value: 0 },
    ]);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum item ainda. Adicione o primeiro abaixo.
        </div>
      )}
      {items.map((it, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-border bg-card/40 p-3 space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-0.5 mt-1.5">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[10px] font-mono text-muted-foreground text-center">
                {idx + 1}
              </span>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Título
                </Label>
                <Input
                  value={it.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  placeholder="Ex: Sistema de Gestão (CRM)"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Investimento (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.value || ""}
                  onChange={(e) =>
                    update(idx, { value: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-right tabular-nums"
                />
                <div className="text-[10px] text-success mt-0.5 text-right">
                  {formatBRL(it.value || 0)}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={() => remove(idx)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Descrição (uma linha por bullet)
            </Label>
            <Textarea
              value={it.description || ""}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="Cadastro de leads&#10;Pipeline de vendas&#10;Relatórios"
              className="min-h-[80px] text-sm"
            />
          </div>
          {onOpenDetails && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => onOpenDetails(idx)}
              >
                <FileText className="h-3 w-3" />
                Detalhes do módulo (página pública)
              </Button>
            </div>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar item
      </Button>
    </div>
  );
}
