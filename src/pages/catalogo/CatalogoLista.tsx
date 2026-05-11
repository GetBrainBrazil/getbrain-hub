/**
 * Catálogo — fonte única dos produtos vendáveis da GetBrain.
 *
 * Cada produto pertence a 1 de 5 arquétipos (one_shot, with_maintenance,
 * saas, hybrid, aggregator). O arquétipo define quais campos de preço
 * aparecem no formulário e o que o card exibe.
 *
 * Em fase próxima, os mesmos cards serão reaproveitados num drawer "Cesta"
 * dentro da ficha do Deal (CrmDealDetail).
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Package, Plus, Search, Settings2, Archive, ArchiveRestore, Copy, LayoutGrid, List,
  AlertTriangle, X, Check,
} from "lucide-react";
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
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  useCatalogProducts,
  useCatalogCategories,
  useArchiveProduct,
  useDuplicateProduct,
  CatalogArchetype,
  ARCHETYPE_LABEL,
  STATUS_LABEL,
} from "@/hooks/catalogo/useCatalog";
import { ArchetypeBadge } from "@/components/catalogo/ArchetypeBadge";
import { PriceBlockDisplay } from "@/components/catalogo/PriceBlockDisplay";
import { CategoriesManagerDialog } from "@/components/catalogo/CategoriesManagerDialog";
import { ProductGalleryCard } from "@/components/catalogo/ProductGalleryCard";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "table";

const MIGRATION_BANNER_KEY = "catalogo:migration-banner-dismissed:v1";

export default function CatalogoLista() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [params] = useSearchParams();
  const highlightId = params.get("highlight");

  const [search, setSearch] = useState("");
  const [archetypes, setArchetypes] = useState<CatalogArchetype[]>([]);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [catDialog, setCatDialog] = useState(false);
  const [view, setView] = usePersistedState<ViewMode>("catalogo:view", "grid");
  const [bannerDismissed, setBannerDismissed] = usePersistedState<boolean>(MIGRATION_BANNER_KEY, false);

  const { data: products = [], isLoading } = useCatalogProducts({
    search,
    archetypes: archetypes.length ? archetypes : undefined,
    categoryId,
    showArchived,
  });
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

  const archetypeOptions: CatalogArchetype[] = isAdmin
    ? ["one_shot", "with_maintenance", "saas", "hybrid", "aggregator"]
    : ["one_shot", "with_maintenance", "saas", "hybrid"];

  const toggleArchetype = (a: CatalogArchetype) => {
    setArchetypes((curr) => (curr.includes(a) ? curr.filter((x) => x !== a) : [...curr, a]));
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

      {/* Faixa de migração */}
      {!bannerDismissed && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-amber-100/90">
            Os produtos cadastrados foram migrados pra nova estrutura por arquétipos. Revise os tipos e
            preencha os campos de Setup quando aplicável.
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-100 hover:text-amber-50"
            onClick={() => setBannerDismissed(true)}
          >
            Entendi
            <X className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

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

        {/* Multi-select arquétipo */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="lg:w-52 justify-between">
              <span className="truncate">
                {archetypes.length === 0
                  ? "Todos os arquétipos"
                  : `${archetypes.length} selecionado${archetypes.length > 1 ? "s" : ""}`}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            {archetypeOptions.map((a) => {
              const checked = archetypes.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => toggleArchetype(a)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent/10"
                >
                  <span>{ARCHETYPE_LABEL[a]}</span>
                  {checked && <Check className="h-3.5 w-3.5 text-accent" />}
                </button>
              );
            })}
            {archetypes.length > 0 && (
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => setArchetypes([])}
                  className="w-full text-left rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/10"
                >
                  Limpar seleção
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

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
        <div className="hidden md:flex rounded-md border border-border bg-background/40 p-0.5">
          <Button
            size="sm"
            variant={view === "grid" ? "secondary" : "ghost"}
            className="h-7 px-2"
            onClick={() => setView("grid")}
            title="Galeria"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            className="h-7 px-2"
            onClick={() => setView("table")}
            title="Tabela"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Lista — galeria (desktop, default) */}
      {view === "grid" && (
        <div className="hidden md:block">
          {isLoading && (
            <div className="text-center py-12 text-sm text-muted-foreground">Carregando…</div>
          )}
          {!isLoading && products.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground rounded-lg border border-dashed border-border">
              Nenhum produto encontrado. Clique em "Novo Produto" para começar.
            </div>
          )}
          {products.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((p) => (
                <ProductGalleryCard
                  key={p.id}
                  product={p}
                  highlighted={highlightId === p.id}
                  onOpen={() => navigate(`/catalogo/${p.id}`)}
                  onDuplicate={() => handleDuplicate(p.id)}
                  onArchiveToggle={() => handleArchive(p.id, p.status === "archived")}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista — tabela (desktop, opcional) */}
      <div className={cn(view === "table" ? "hidden md:block" : "hidden", "rounded-lg border border-border bg-card/30 overflow-hidden")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Arquétipo</TableHead>
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
                <TableCell><ArchetypeBadge archetype={p.archetype} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.catalog_categories?.name ?? "—"}</TableCell>
                <TableCell><PriceBlockDisplay product={p} className="min-w-[12rem]" /></TableCell>
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
              <ArchetypeBadge archetype={p.archetype} />
            </div>
            <div className="mt-2 border-t border-border/40 pt-2">
              <PriceBlockDisplay product={p} />
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
