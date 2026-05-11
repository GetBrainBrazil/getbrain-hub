import { Archive, ArchiveRestore, Copy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaleTypeBadge } from "./SaleTypeBadge";
import { PriceDisplay } from "./PriceDisplay";
import { CatalogProduct, STATUS_LABEL } from "@/hooks/catalogo/useCatalog";
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
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card/40 p-4 cursor-pointer transition-all",
        "hover:border-accent/40 hover:bg-card/70 hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.2)]",
        highlighted && "ring-1 ring-accent",
        isArchived && "opacity-60",
      )}
    >
      {/* Header: ícone + tipo */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <Package className="h-5 w-5" />
          )}
        </div>
        <SaleTypeBadge type={product.sale_type} />
      </div>

      {/* Conteúdo */}
      <div className="mt-3 flex-1 space-y-1.5">
        <div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-1">{product.name}</h3>
          <div className="text-[10px] text-muted-foreground font-mono">{product.code}</div>
        </div>
        {product.pitch && (
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{product.pitch}</p>
        )}
      </div>

      {/* Footer: preço + meta */}
      <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
        <div className="text-base font-semibold text-foreground">
          <PriceDisplay product={product} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground truncate">
            {product.catalog_categories?.name ?? "Sem categoria"}
          </span>
          {isArchived && (
            <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[product.status]}</Badge>
          )}
        </div>
      </div>

      {/* Ações hover */}
      <div
        className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button size="icon" variant="ghost" className="h-7 w-7 bg-card/80 backdrop-blur" onClick={onDuplicate} title="Duplicar">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 bg-card/80 backdrop-blur" onClick={onArchiveToggle} title={isArchived ? "Reativar" : "Arquivar"}>
          {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
