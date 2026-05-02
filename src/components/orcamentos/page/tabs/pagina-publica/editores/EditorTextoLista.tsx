/**
 * Editor de lista de strings (parágrafos). Cada item é uma textarea com
 * controles de remover/reordenar. Autosave on blur (chama onChange com
 * o array completo). Suporta adicionar item.
 */
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  value: string[];
  onCommit: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  rows?: number;
}

export function EditorTextoLista({
  value,
  onCommit,
  placeholder = "Escreva aqui…",
  addLabel = "Adicionar parágrafo",
  rows = 3,
}: Props) {
  const [local, setLocal] = useState<string[]>(value);
  useEffect(() => setLocal(value), [value]);

  const setAt = (i: number, v: string) =>
    setLocal((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  const commit = (next: string[]) => {
    setLocal(next);
    onCommit(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= local.length) return;
    const next = [...local];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <div className="space-y-2">
      {local.map((item, i) => (
        <div key={i} className="group flex gap-2 items-start">
          <div className="flex-1">
            <Textarea
              value={item}
              onChange={(e) => setAt(i, e.target.value)}
              onBlur={() => {
                if (item !== value[i]) commit(local);
              }}
              placeholder={placeholder}
              rows={rows}
              className="text-sm resize-y"
            />
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              title="Mover para cima"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => move(i, 1)}
              disabled={i === local.length - 1}
              title="Mover para baixo"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => commit(local.filter((_, idx) => idx !== i))}
              title="Remover"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => commit([...local, ""])}
        className="h-8"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {addLabel}
      </Button>
    </div>
  );
}
