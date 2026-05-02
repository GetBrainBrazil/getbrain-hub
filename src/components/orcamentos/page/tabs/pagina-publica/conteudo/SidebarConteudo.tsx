/**
 * Sidebar de navegação do CMS — redesenhada.
 * - Itens "Esta proposta" com bullet cyan; "Global" com diamante neutro.
 * - Status dot à direita (preenchido/vazio/opcional/dirty/contador).
 * - Mobile: vira Sheet via botão "Seções".
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Search, Menu } from "lucide-react";
import { getIcon } from "@/lib/iconMap";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatusDot, type FillStatus } from "./StatusDot";
import type { SecaoMeta } from "./types";

interface ItemMeta extends SecaoMeta {
  status?: FillStatus;
  count?: number;
}

interface Props {
  groups: { label: string; scope: "proposta" | "global"; items: ItemMeta[] }[];
  active: string;
  onChange: (id: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  dirty: Record<string, boolean>;
}

function GroupHeader({ label, scope, filled, total }: { label: string; scope: "proposta" | "global"; filled: number; total: number }) {
  return (
    <div className="flex items-center justify-between px-2 mb-2">
      <span className={cn(
        "text-[10px] uppercase tracking-[0.14em] font-semibold",
        scope === "proposta" ? "text-accent" : "text-muted-foreground",
      )}>
        {label}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
        {filled}/{total}
      </span>
    </div>
  );
}

function NavList({ groups, active, onChange, dirty, query, onQueryChange, onItemClick }: Props & { onItemClick?: () => void }) {
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

  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar campo…"
          className="h-9 pl-8 text-xs"
        />
      </div>

      <nav className="space-y-5">
        {filtered.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            Nada encontrado
          </div>
        )}
        {filtered.map((g) => {
          const filled = g.items.filter((it) => dirty[it.id] || it.status === "filled").length;
          return (
            <div key={g.label}>
              <GroupHeader label={g.label} scope={g.scope} filled={filled} total={g.items.length} />
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const Icon = getIcon(it.icon);
                  const isActive = active === it.id;
                  const isDirty = !!dirty[it.id];
                  const status: FillStatus = isDirty ? "dirty" : (it.status || "optional");
                  const isProposta = g.scope === "proposta";
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        onChange(it.id);
                        onItemClick?.();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-left transition-all group relative",
                        isActive
                          ? "bg-accent/10 text-accent font-medium ring-1 ring-accent/20"
                          : "text-foreground hover:bg-muted/60",
                      )}
                    >
                      {/* bullet de escopo */}
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                        isProposta
                          ? (isActive ? "bg-accent" : "bg-accent/50")
                          : (isActive ? "bg-muted-foreground" : "bg-muted-foreground/40"),
                        !isProposta && "rotate-45 rounded-[2px]",
                      )} />
                      <Icon className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
                      )} />
                      <span className="flex-1 truncate">{it.label}</span>
                      <StatusDot status={status} count={it.count} className="shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function SidebarConteudo(props: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    const activeItem = props.groups.flatMap((g) => g.items).find((i) => i.id === props.active);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 justify-between text-xs sticky top-0 z-10 bg-background"
          >
            <span className="flex items-center gap-2 truncate">
              <Menu className="h-3.5 w-3.5" />
              <span className="truncate">{activeItem?.label || "Selecionar seção"}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">tocar p/ trocar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[340px] p-4 overflow-y-auto">
          <SheetTitle className="text-sm mb-3">Seções da proposta</SheetTitle>
          <NavList {...props} onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-[280px] shrink-0 border-r border-border pr-3 pl-1">
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1.5 -mr-1.5">
        <NavList {...props} />
      </div>
    </aside>
  );
}
