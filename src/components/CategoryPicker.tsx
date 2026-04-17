import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  buildCategoriasTree,
  getTipoConfig,
  type CategoriaRaw,
  type TipoCategoria,
} from "@/lib/categorias-hierarchy";

export interface CategoryPickerProps {
  categorias: CategoriaRaw[];
  /** ID atualmente selecionado (subcategoria ou conta) */
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  /** Restringe os tipos exibidos. Se omitido, mostra todos. */
  restrictTipos?: TipoCategoria[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

interface FlatItem {
  type: "header" | "item";
  id: string; // for items: the categoria id; for headers: subcategoria id (only for visual key)
  label: string;
  paiNome?: string; // for nivel 3 contas
  searchHaystack: string; // lowercased
  tipo: TipoCategoria;
}

/** Componente de seleção de categoria com busca, agrupamento e formato "Sub > Conta". */
export default function CategoryPicker({
  categorias,
  value,
  onChange,
  restrictTipos,
  placeholder = "Buscar categoria...",
  disabled,
  className,
  allowClear = true,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // árvore filtrada por tipo
  const tree = useMemo(() => {
    const t = buildCategoriasTree(categorias.filter((c) => c.ativo));
    if (!restrictTipos || restrictTipos.length === 0) return t;
    return t.filter((n) => restrictTipos.includes(n.config.key));
  }, [categorias, restrictTipos]);

  // mapa para lookup rápido
  const byId = useMemo(() => {
    const m = new Map<string, CategoriaRaw>();
    categorias.forEach((c) => m.set(c.id, c));
    return m;
  }, [categorias]);

  // label curto exibido no campo fechado
  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const cat = byId.get(value);
    if (!cat) return "";
    if (!cat.categoria_pai_id) return cat.nome;
    const pai = byId.get(cat.categoria_pai_id);
    return pai ? `${pai.nome} > ${cat.nome}` : cat.nome;
  }, [value, byId]);

  // achatamento agrupado para renderização
  const flatItems = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    tree.forEach((tipoNode) => {
      tipoNode.subcategorias.forEach((sub) => {
        const contasAtivas = sub.contas.filter((c) => c.ativo);
        if (contasAtivas.length === 0) {
          // selecionável diretamente como item
          out.push({
            type: "item",
            id: sub.id,
            label: sub.nome,
            tipo: tipoNode.config.key,
            searchHaystack: sub.nome.toLowerCase(),
          });
        } else {
          // header não selecionável
          out.push({
            type: "header",
            id: `h-${sub.id}`,
            label: sub.nome,
            tipo: tipoNode.config.key,
            searchHaystack: sub.nome.toLowerCase(),
          });
          contasAtivas.forEach((conta) => {
            out.push({
              type: "item",
              id: conta.id,
              label: conta.nome,
              paiNome: sub.nome,
              tipo: tipoNode.config.key,
              searchHaystack: `${sub.nome} ${conta.nome}`.toLowerCase(),
            });
          });
        }
      });
    });
    return out;
  }, [tree]);

  // aplica busca: mantém headers somente se algum item filho aparece
  const visibleItems = useMemo<FlatItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flatItems;
    const matched = flatItems.filter(
      (it) => it.type === "item" && it.searchHaystack.includes(q),
    );
    // reagrupar incluindo headers de subcategorias presentes
    const result: FlatItem[] = [];
    const seenHeaders = new Set<string>();
    matched.forEach((it) => {
      if (it.paiNome) {
        const headerKey = it.paiNome;
        if (!seenHeaders.has(headerKey)) {
          seenHeaders.add(headerKey);
          result.push({
            type: "header",
            id: `h-${headerKey}`,
            label: headerKey,
            tipo: it.tipo,
            searchHaystack: headerKey.toLowerCase(),
          });
        }
      }
      result.push(it);
    });
    return result;
  }, [flatItems, query]);

  // foco no input ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  // Indicador do tipo (somente quando há um único tipo restrito)
  const tipoIndicator = useMemo(() => {
    if (!restrictTipos || restrictTipos.length === 0) return null;
    // se for despesas+impostos, mostramos "Despesas"
    if (restrictTipos.includes("despesas")) {
      const cfg = getTipoConfig("despesas");
      return { label: "Despesas", cfg };
    }
    if (restrictTipos.includes("receitas")) {
      const cfg = getTipoConfig("receitas");
      return { label: "Receitas", cfg };
    }
    const cfg = getTipoConfig(restrictTipos[0]);
    return { label: cfg.label.charAt(0) + cfg.label.slice(1).toLowerCase(), cfg };
  }, [restrictTipos]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate text-left", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[--radix-popover-trigger-width] p-0 shadow-md animate-in fade-in-0 slide-in-from-top-1 duration-150"
      >
        {/* Search fixo */}
        <div className="border-b px-3 py-2 flex items-center gap-2 bg-popover">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Buscar por nome..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Indicador de tipo */}
        {tipoIndicator && (
          <div className="px-3 py-1.5 border-b text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/30">
            <span className={cn("h-1.5 w-1.5 rounded-full", tipoIndicator.cfg.bgClass.replace("/10", ""))} />
            <span>Mostrando: <span className="font-medium text-foreground">{tipoIndicator.label}</span></span>
          </div>
        )}

        {/* Lista */}
        <div className="max-h-[320px] overflow-y-auto py-1">
          {allowClear && !query && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 flex items-center gap-2"
            >
              {!value && <Check className="h-3.5 w-3.5" />}
              <span className={cn(value && "ml-[1.125rem]")}>— Nenhuma —</span>
            </button>
          )}

          {visibleItems.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma categoria encontrada
            </div>
          )}

          {visibleItems.map((it) => {
            if (it.type === "header") {
              return (
                <div
                  key={it.id}
                  className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {it.label}
                </div>
              );
            }
            const isSelected = it.id === value;
            const isInGroup = !!it.paiNome;
            return (
              <button
                type="button"
                key={it.id}
                onClick={() => {
                  onChange(it.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left text-sm py-1.5 flex items-center gap-2 hover:bg-muted/60 transition-colors",
                  isInGroup ? "pl-6 pr-3" : "px-3",
                  isSelected && "bg-accent/10 text-foreground font-medium",
                )}
              >
                <span className="w-3.5 shrink-0">
                  {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
                </span>
                <span className="truncate">
                  {it.label}
                  {query && it.paiNome && (
                    <span className="text-muted-foreground text-xs ml-1.5">
                      ({it.paiNome})
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
