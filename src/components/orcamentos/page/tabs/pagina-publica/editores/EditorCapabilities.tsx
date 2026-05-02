/**
 * Editor visual da lista de "capabilities" (cards de capacidades exibidos
 * na seção "Sobre a GetBrain"). Cada card tem ícone (picker), título,
 * descrição e um menu kebab com ações reordenar/remover.
 */
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { ICON_NAMES, getIcon } from "@/lib/iconMap";

export type Capability = { icon: string; title: string; description: string };

interface Props {
  value: Capability[];
  onCommit: (next: Capability[]) => void;
}

export function EditorCapabilities({ value, onCommit }: Props) {
  const [local, setLocal] = useState<Capability[]>(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (JSON.stringify(local) === JSON.stringify(value)) return;
    const id = setTimeout(() => onCommit(local), 650);
    return () => clearTimeout(id);
  }, [local, value, onCommit]);

  const setAt = (i: number, patch: Partial<Capability>) =>
    setLocal((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const commit = (next: Capability[]) => {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {local.map((cap, i) => {
        const Icon = getIcon(cap.icon);
        return (
          <div
            key={i}
            className="group relative rounded-xl border border-border bg-background p-4 space-y-3 hover:border-border/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 h-10 w-10 rounded-lg border border-input bg-accent/5 flex items-center justify-center hover:bg-accent/10 hover:border-accent transition-colors"
                    title="Trocar ícone"
                  >
                    <Icon className="h-5 w-5 text-accent" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 pb-1.5">
                    Escolha um ícone
                  </div>
                  <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto">
                    {ICON_NAMES.map((name) => {
                      const I = getIcon(name);
                      const active = name === cap.icon;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            const next = local.map((c, idx) =>
                              idx === i ? { ...c, icon: name } : c,
                            );
                            commit(next);
                          }}
                          className={`h-8 w-8 rounded flex items-center justify-center hover:bg-accent/10 ${
                            active ? "bg-accent/20 text-accent" : "text-foreground"
                          }`}
                          title={name}
                        >
                          <I className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                value={cap.title}
                onChange={(e) => setAt(i, { title: e.target.value })}
                onBlur={() => {
                  if (cap.title !== value[i]?.title) commit(local);
                }}
                placeholder="Título"
                className="h-9 text-sm font-semibold"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
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
            <Textarea
              value={cap.description}
              onChange={(e) => setAt(i, { description: e.target.value })}
              onBlur={() => {
                if (cap.description !== value[i]?.description) commit(local);
              }}
              placeholder="Descrição curta do que esse card representa…"
              rows={3}
              className="text-xs resize-y"
            />
          </div>
        );
      })}

      {/* Tile pontilhado para adicionar */}
      <button
        type="button"
        onClick={() =>
          commit([
            ...local,
            { icon: "Sparkles", title: "Nova capacidade", description: "Descrição…" },
          ])
        }
        className="rounded-xl border-2 border-dashed border-border hover:border-accent/60 hover:bg-accent/5 text-muted-foreground hover:text-accent transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[160px] text-xs font-medium"
      >
        <Plus className="h-5 w-5" />
        Adicionar card
      </button>
    </div>
  );
}
