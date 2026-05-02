/**
 * Editor visual da lista de "capabilities" (cards de capacidades exibidos
 * na seção "Sobre a GetBrain"). Cada card tem ícone (picker), título e
 * descrição. Reordena, remove, adiciona.
 */
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { ICON_NAMES, getIcon } from "@/lib/iconMap";

export type Capability = { icon: string; title: string; description: string };

interface Props {
  value: Capability[];
  onCommit: (next: Capability[]) => void;
}

export function EditorCapabilities({ value, onCommit }: Props) {
  const [local, setLocal] = useState<Capability[]>(value);
  useEffect(() => setLocal(value), [value]);

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
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {local.map((cap, i) => {
          const Icon = getIcon(cap.icon);
          return (
            <div
              key={i}
              className="group relative rounded-lg border border-border bg-card p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 h-9 w-9 rounded-md border border-input bg-background flex items-center justify-center hover:border-accent transition-colors"
                      title="Trocar ícone"
                    >
                      <Icon className="h-4 w-4 text-accent" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto">
                      {ICON_NAMES.map((name) => {
                        const I = getIcon(name);
                        const active = name === cap.icon;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              const next = local.map((c, idx) => idx === i ? { ...c, icon: name } : c);
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
                  className="h-9 text-sm font-medium"
                />
              </div>
              <Textarea
                value={cap.description}
                onChange={(e) => setAt(i, { description: e.target.value })}
                onBlur={() => {
                  if (cap.description !== value[i]?.description) commit(local);
                }}
                placeholder="Descrição"
                rows={2}
                className="text-xs resize-y"
              />
              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === local.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => commit(local.filter((_, idx) => idx !== i))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => commit([...local, { icon: "Sparkles", title: "Nova capacidade", description: "Descrição…" }])}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Adicionar card
      </Button>
    </div>
  );
}
