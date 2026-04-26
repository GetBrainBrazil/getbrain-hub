import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  items: string[];
  onChange: (items: string[]) => void;
}

export function ConsiderationsEditor({ items, onChange }: Props) {
  const update = (i: number, v: string) => {
    onChange(items.map((x, idx) => (idx === i ? v : x)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        Considerações
      </Label>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Adicione cláusulas (ex: forma de pagamento, garantias).
        </p>
      )}
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={it}
            onChange={(e) => update(i, e.target.value)}
            className="h-8 text-sm"
            placeholder="Ex: Pagamento 50% + 50% após validação"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive shrink-0"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={add}
        className="w-full"
      >
        <Plus className="h-3 w-3" /> Adicionar consideração
      </Button>
    </div>
  );
}
