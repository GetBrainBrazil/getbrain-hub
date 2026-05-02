/**
 * Editor de lista de strings (parágrafos). Cada item é uma textarea com
 * controles de remover/reordenar acessíveis via kebab no canto. Autosave on blur.
 */
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, MoreVertical, Plus, Trash2 } from "lucide-react";
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
    <div className="space-y-2.5">
      {local.map((item, i) => (
        <div key={i} className="group relative rounded-lg border border-border bg-background hover:border-border/80 transition-colors">
          <Textarea
            value={item}
            onChange={(e) => setAt(i, e.target.value)}
            onBlur={() => {
              if (item !== value[i]) commit(local);
            }}
            placeholder={placeholder}
            rows={rows}
            className="text-sm resize-y border-0 bg-transparent focus-visible:ring-0 pr-10"
          />
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5 mr-2" /> Mover para cima
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => move(i, 1)} disabled={i === local.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5 mr-2" /> Mover para baixo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => commit(local.filter((_, idx) => idx !== i))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => commit([...local, ""])}
        className="h-9 w-full border-dashed text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {addLabel}
      </Button>
    </div>
  );
}
