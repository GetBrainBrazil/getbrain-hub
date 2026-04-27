import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => Promise<void> | void;
  placeholder?: string;
  emptyHint?: string;
  className?: string;
}

/**
 * Editor de lista de strings com edição inline, autosave on blur,
 * Enter adiciona linha, Backspace em vazio remove. Usado em campos de
 * escopo de projetos (deliverables, premises, identified_risks, technical_stack).
 */
export function StringListEditor({
  value,
  onChange,
  placeholder = "Novo item...",
  emptyHint = "Nenhum item. Clique em + Adicionar para começar.",
  className,
}: Props) {
  const [items, setItems] = useState<string[]>(value);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setItems(value);
  }, [value]);

  useEffect(() => {
    if (focusIndex !== null) {
      const el = inputsRef.current[focusIndex];
      el?.focus();
      el?.select();
      setFocusIndex(null);
    }
  }, [focusIndex, items.length]);

  function commit(next: string[]) {
    setItems(next);
    void onChange(next);
  }

  function updateAt(index: number, text: string) {
    const next = items.slice();
    next[index] = text;
    setItems(next);
  }

  function blurAt(index: number) {
    // remove vazios na perda de foco (exceto se for único)
    const trimmed = items[index]?.trim() ?? "";
    if (!trimmed && items.length > 1) {
      const next = items.filter((_, i) => i !== index);
      commit(next);
      return;
    }
    const next = items.slice();
    next[index] = trimmed;
    if (JSON.stringify(next) !== JSON.stringify(value)) commit(next);
  }

  function addItem() {
    const next = [...items, ""];
    setItems(next);
    setFocusIndex(next.length - 1);
  }

  function removeAt(index: number) {
    const next = items.filter((_, i) => i !== index);
    commit(next);
  }

  return (
    <div className={cn("space-y-1", className)}>
      {items.length === 0 ? (
        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-muted/10 p-4 text-left text-sm text-muted-foreground transition-colors hover:border-accent/60 hover:bg-muted/20 hover:text-foreground"
        >
          <Plus className="h-4 w-4 shrink-0 text-accent" />
          <span>{emptyHint}</span>
        </button>
      ) : (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li
              key={index}
              className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/30"
            >
              <span className="text-muted-foreground/60 select-none">•</span>
              <Input
                ref={(el) => (inputsRef.current[index] = el)}
                value={item}
                placeholder={placeholder}
                onChange={(e) => updateAt(index, e.target.value)}
                onBlur={() => blurAt(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).blur();
                    addItem();
                  } else if (e.key === "Backspace" && !item) {
                    e.preventDefault();
                    if (items.length > 1) {
                      removeAt(index);
                      setFocusIndex(Math.max(0, index - 1));
                    }
                  }
                }}
                className="h-8 flex-1 border-transparent bg-transparent px-2 text-sm focus-visible:border-border focus-visible:bg-background"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeAt(index)}
                className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={addItem}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar item
        </Button>
      )}
    </div>
  );
}
