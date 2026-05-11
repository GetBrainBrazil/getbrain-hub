import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, Plus, Search, Settings2, Archive, ArchiveRestore, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useCatalogProducts,
  useCatalogCategories,
  useArchiveProduct,
  useDuplicateProduct,
  CatalogSaleType,
  SALE_TYPE_LABEL,
  STATUS_LABEL,
} from "@/hooks/catalogo/useCatalog";
import { SaleTypeBadge } from "@/components/catalogo/SaleTypeBadge";
import { PriceDisplay } from "@/components/catalogo/PriceDisplay";
import { CategoriesManagerDialog } from "@/components/catalogo/CategoriesManagerDialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function CatalogoLista() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightId = params.get("highlight");

  const [search, setSearch] = useState("");
  const [saleType, setSaleType] = useState<CatalogSaleType | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [catDialog, setCatDialog] = useState(false);

  const { data: products = [], isLoading } = useCatalogProducts({ search, saleType, categoryId, showArchived });
  const { data: categories = [] } = useCatalogCategories();
  const archive = useArchiveProduct();
  const duplicate = useDuplicateProduct();
  const { confirm, dialog } = useConfirm();

  const handleArchive = async (id: string, isArchived: boolean) => {
    if (!isArchived) {
      const ok = await confirm({
        title: "Arquivar produto?",
        description: "Produtos arquivados não aparecem como opção em novas propostas, mas continuam preservados.",
        confirmLabel: "Arquivar",
        variant: "default",
      });
      if (!ok) return;
    }
    await archive.mutateAsync({ id, archive: !isArchived });
  };

  const handleDuplicate = async (id: string) => {
    const created = await duplicate.mutateAsync(id);
    navigate(`/catalogo/${created.id}`);
  };

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 px-1 pb-12 animate-fade-in sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold font-display tracking-tight sm:text-2xl">Catálogo</h1>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Fonte única dos produtos e serviços vendáveis. Cada produto cadastrado fica disponível para os vendedores montarem propostas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCatDialog(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Gerenciar categorias
          </Button>
          <Button onClick={() => navigate("/catalogo/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo Produto
          </Button>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/30 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código, tag ou categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={saleType} onValueChange={(v) => setSaleType(v as any)}>
          <SelectTrigger className="lg:w-52"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(SALE_TYPE_LABEL) as CatalogSaleType[]).map((t) => (
              <SelectItem key={t} value={t}>{SALE_TYPE_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="lg:w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="archived" className="text-xs cursor-pointer">Mostrar arquivados</Label>
        </div>
      </div>

      {/* Lista — desktop */}
      <div className="hidden md:block rounded-lg border border-border bg-card/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && products.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                Nenhum produto encontrado. Clique em "Novo Produto" para começar.
              </TableCell></TableRow>
            )}
            {products.map((p) => (
              <TableRow
                key={p.id}
                className={cn("cursor-pointer", highlightId === p.id && "bg-accent/10")}
                onClick={() => navigate(`/catalogo/${p.id}`)}
              >
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
                </TableCell>
                <TableCell><SaleTypeBadge type={p.sale_type} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.catalog_categories?.name ?? "—"}</TableCell>
                <TableCell><PriceDisplay product={p} /></TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{STATUS_LABEL[p.status]}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.updated_at)}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p.id)} title="Duplicar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchive(p.id, p.status === "archived")}
                    title={p.status === "archived" ? "Reativar" : "Arquivar"}
                  >
                    {p.status === "archived" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Lista — mobile cards */}
      <div className="md:hidden space-y-2">
        {products.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/catalogo/${p.id}`)}
            className={cn(
              "rounded-lg border border-border bg-card/30 p-3 cursor-pointer",
              highlightId === p.id && "ring-1 ring-accent",
            )}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
              </div>
              <SaleTypeBadge type={p.sale_type} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <PriceDisplay product={p} />
              <Badge variant="outline" className="text-xs">{STATUS_LABEL[p.status]}</Badge>
            </div>
            <div className="mt-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p.id)}>
                <Copy className="h-4 w-4 mr-1" /> Duplicar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleArchive(p.id, p.status === "archived")}>
                {p.status === "archived" ? (
                  <><ArchiveRestore className="h-4 w-4 mr-1" /> Reativar</>
                ) : (
                  <><Archive className="h-4 w-4 mr-1" /> Arquivar</>
                )}
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhum produto encontrado.</div>
        )}
      </div>

      <CategoriesManagerDialog open={catDialog} onOpenChange={setCatDialog} />
      {dialog}
    </div>
  );
}
