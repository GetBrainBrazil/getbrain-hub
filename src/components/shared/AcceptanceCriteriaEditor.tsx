import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AcceptanceCriterion } from "@/types/shared";

interface Props {
  value: AcceptanceCriterion[];
  onChange: (next: AcceptanceCriterion[]) => Promise<void> | void;
  currentActorId?: string | null;
  emptyHint?: string;
  className?: string;
}

function nextId(existing: AcceptanceCriterion[]): string {
  const used = new Set(existing.map((c) => c.id));
  let i = existing.length + 1;
  while (used.has(`ac_${i}`)) i++;
  return `ac_${i}`;
}

/**
 * Editor de checklist de critérios de aceite (formato JSONB).
 * Reaproveita o padrão visual de tasks. Marca/desmarca, edita texto inline,
 * adiciona/remove itens. Persistência via prop onChange (debounce externo, se desejado).
 */
export function AcceptanceCriteriaEditor({
  value,
  onChange,
  currentActorId = null,
  emptyHint = "Nenhum critério de aceite definido. Defina quando o entregável estará pronto.",
  className,
}: Props) {
  const [items, setItems] = useState<AcceptanceCriterion[]>(value);
  const [focusId, setFocusId] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setItems(value);
  }, [value]);

  useEffect(() => {
    if (focusId) {
      const el = inputsRef.current[focusId];
      el?.focus();
      el?.select();
      setFocusId(null);
    }
  }, [focusId]);

  function commit(next: AcceptanceCriterion[]) {
    setItems(next);
    void onChange(next);
  }

  function toggle(id: string) {
    const next = items.map((c) => {
      if (c.id !== id) return c;
      const checked = !c.checked;
      return {
        ...c,
        checked,
        checked_at: checked ? new Date().toISOString() : null,
        checked_by: checked ? currentActorId ?? null : null,
      };
    });
    commit(next);
  }

  function updateText(id: string, text: string) {
    const next = items.map((c) => (c.id === id ? { ...c, text } : c));
    setItems(next);
  }

  function blurItem(id: string) {
    const target = items.find((c) => c.id === id);
    if (!target) return;
    const trimmed = target.text.trim();
    if (!trimmed) {
      const next = items.filter((c) => c.id !== id);
      commit(next);
      return;
    }
    const next = items.map((c) => (c.id === id ? { ...c, text: trimmed } : c));
    if (JSON.stringify(next) !== JSON.stringify(value)) commit(next);
  }

  function addItem() {
    const id = nextId(items);
    const next: AcceptanceCriterion[] = [
      ...items,
      { id, text: "", checked: false, checked_at: null, checked_by: null },
    ];
    setItems(next);
    setFocusId(id);
  }

  function removeAt(id: string) {
    commit(items.filter((c) => c.id !== id));
  }

  const checked = items.filter((c) => c.checked).length;
  const total = items.length;
  const pct = total > 0 ? (checked / total) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      {total > 0 && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {checked}/{total}
          </span>
          <Progress value={pct} className="h-1.5 flex-1 max-w-32" />
        </div>
      )}

      {total === 0 ? (
        <button
          type="button"
          onClick={addItem}
          className="w-full rounded-md border border-dashed border-border bg-muted/10 p-4 text-left text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
        >
          {emptyHint}
        </button>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li
              key={c.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/30"
            >
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className="shrink-0"
                aria-label={c.checked ? "Desmarcar" : "Marcar"}
              >
                {c.checked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <Input
                ref={(el) => (inputsRef.current[c.id] = el)}
                value={c.text}
                placeholder="Critério de aceite..."
                onChange={(e) => updateText(c.id, e.target.value)}
                onBlur={() => blurItem(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).blur();
                    addItem();
                  } else if (e.key === "Backspace" && !c.text) {
                    e.preventDefault();
                    removeAt(c.id);
                  }
                }}
                className={cn(
                  "h-8 flex-1 border-transparent bg-transparent px-2 text-sm focus-visible:border-border focus-visible:bg-background",
                  c.checked && "text-muted-foreground line-through",
                )}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeAt(c.id)}
                className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={addItem}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar critério
        </Button>
      )}
    </div>
  );
}
