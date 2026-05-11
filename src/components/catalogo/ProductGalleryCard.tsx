import { Archive, ArchiveRestore, Copy, Package, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArchetypeBadge } from "./ArchetypeBadge";
import { PriceBlockDisplay } from "./PriceBlockDisplay";
import { CatalogProduct } from "@/hooks/catalogo/useCatalog";
import { cn } from "@/lib/utils";

type Product = CatalogProduct & {
  catalog_categories: { id: string; name: string; color: string | null } | null;
};

interface Props {
  product: Product;
  highlighted?: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onArchiveToggle: () => void;
}

export function ProductGalleryCard({ product, highlighted, onOpen, onDuplicate, onArchiveToggle }: Props) {
  const isArchived = product.status === "archived";
  const tags = product.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraTags = Math.max(0, tags.length - visibleTags.length);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative flex flex-col rounded-lg border border-border bg-card/30 cursor-pointer transition-all overflow-hidden",
        "hover:border-accent/50 hover:bg-card/50 hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.15)]",
        highlighted && "ring-2 ring-accent animate-pulse-fade",
        isArchived && "opacity-60",
      )}
    >
      {/* Topo: hero quadrado + menu */}
      <div className="relative">
        <div className="aspect-square w-full bg-accent/5 flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-10 w-10 text-accent/40" />
          )}
        </div>
        {isArchived && (
          <Badge variant="outline" className="absolute top-2 right-2 bg-card/90 backdrop-blur text-[10px]">
            Arquivado
          </Badge>
        )}
        <div
          className={cn(
            "absolute top-2 right-2 transition-opacity",
            isArchived ? "opacity-0" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 bg-card/80 backdrop-blur">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchiveToggle}>
                {isArchived ? (
                  <><ArchiveRestore className="h-3.5 w-3.5 mr-2" /> Reativar</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-2" /> Arquivar</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col p-3 space-y-2">
        <div>
          <h3 className="font-display font-bold text-sm leading-tight line-clamp-1">{product.name}</h3>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {product.code} <span className="opacity-60">·</span> {product.catalog_categories?.name ?? "Sem categoria"}
          </div>
        </div>

        {product.pitch && (
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{product.pitch}</p>
        )}

        {/* Bloco de preço */}
        <div className="border-t border-border/50 pt-2">
          <PriceBlockDisplay product={product} />
        </div>

        {/* Rodapé: badge + tags */}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <ArchetypeBadge archetype={product.archetype} />
          {visibleTags.map((t) => (
            <span key={t} className="text-[10px] rounded-md bg-card/40 border border-border/40 px-1.5 py-0.5 text-muted-foreground">
              {t}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="text-[10px] text-muted-foreground">+{extraTags}</span>
          )}
        </div>
      </div>
    </div>
  );
}
