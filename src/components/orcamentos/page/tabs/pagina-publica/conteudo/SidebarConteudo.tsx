/**
 * Sidebar de navegação da sub-aba Conteúdo. Lista 8 painéis agrupados em 3
 * categorias, com busca e indicador de "dirty". Em mobile vira um Select
 * sticky no topo.
 */
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { getIcon } from "@/lib/iconMap";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SecaoMeta } from "./types";

interface Props {
  groups: { label: string; items: SecaoMeta[] }[];
  active: string;
  onChange: (id: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  dirty: Record<string, boolean>;
}

export function SidebarConteudo({ groups, active, onChange, query, onQueryChange, dirty }: Props) {
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.label.toLowerCase().includes(q) ||
            it.description.toLowerCase().includes(q) ||
            it.keywords.some((k) => k.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  if (isMobile) {
    return (
      <div className="sticky top-0 z-10 bg-background py-2 -mx-1 px-1 border-b">
        <Select value={active} onValueChange={onChange}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectGroup key={g.label}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    <span className="flex items-center gap-2">
                      {it.label}
                      {dirty[it.id] && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border pr-3">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar campo…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <nav className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            Nada encontrado
          </div>
        )}
        {filtered.map((g) => (
          <div key={g.label}>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1.5">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = getIcon(it.icon);
                const isActive = active === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onChange(it.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors group",
                      isActive
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="flex-1 truncate">{it.label}</span>
                    {dirty[it.id] && (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" title="Alterações não salvas" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
