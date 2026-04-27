import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  PlayCircle,
  Wrench,
  DollarSign,
  Repeat,
  Search,
  LayoutGrid,
  Table as TableIcon,
  MoreVertical,
  AlertTriangle,
  SlidersHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KPICard } from "@/components/KPICard";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  ProjectStatus,
  ProjectType,
  getStatusBadgeClass,
  getStatusLabel,
} from "@/lib/projetos-helpers";
import { StatusBadge, TypeBadge } from "@/components/projetos/ProjetoBadges";
import { ActorAvatar, ActorAvatarStack } from "@/components/projetos/ActorAvatar";
import { useConfirm } from "@/components/ConfirmDialog";
import { NovoProjetoDialog } from "@/components/projetos/NovoProjetoDialog";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  project_type: ProjectType;
  contract_value: number | null;
  estimated_delivery_date: string | null;
  start_date: string | null;
  company_id: string;
  company_name: string;
  actors: { id: string; name: string; avatar_url?: string | null }[];
}

const DEFAULT_STATUSES: ProjectStatus[] = PROJECT_STATUS_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== "cancelado" && v !== "arquivado") as ProjectStatus[];
const DEFAULT_TYPES: ProjectType[] = PROJECT_TYPE_OPTIONS.map((o) => o.value) as ProjectType[];

export default function Projetos() {
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [companies, setCompanies] = useState<{ id: string; label: string }[]>([]);
  const [kpis, setKpis] = useState({ ativos: 0, manut: 0, contratado: 0, mrr: 0, blockingDeps: 0 });
  const [loading, setLoading] = useState(true);

  // filters (persisted)
  const [statusFilter, setStatusFilter] = usePersistedState<ProjectStatus[]>(
    "projetos.status",
    DEFAULT_STATUSES,
  );
  const [typeFilter, setTypeFilter] = usePersistedState<ProjectType[]>("projetos.types", DEFAULT_TYPES);
  const [companyFilter, setCompanyFilter] = usePersistedState<string>("projetos.company", "all");
  const [search, setSearch] = usePersistedState<string>("projetos.search", "");
  const [view, setView] = usePersistedState<"table" | "cards">("projetos.view", "table");
  const [sortKey, setSortKey] = useState<keyof ProjectRow>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: comps } = await supabase
      .from("companies")
      .select("id, legal_name, trade_name, company_type")
      .is("deleted_at", null);
    const allClients = (comps || []).filter((c) => c.company_type === "client");
    setCompanies([
      { id: "all", label: "Todos os clientes" },
      ...allClients.map((c) => ({ id: c.id, label: c.trade_name || c.legal_name })),
    ]);
    const compMap = new Map((comps || []).map((c) => [c.id, c.trade_name || c.legal_name]));

    const { data: projs } = await supabase
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("code");

    const projIds = (projs || []).map((p) => p.id);
    let actorsByProject = new Map<string, ProjectRow["actors"]>();
    if (projIds.length > 0) {
      const { data: pa } = await supabase
        .from("project_actors")
        .select("project_id, actor_id")
        .in("project_id", projIds)
        .is("ended_at", null);
      const actorIds = Array.from(new Set((pa || []).map((x) => x.actor_id)));
      let actorMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>();
      if (actorIds.length > 0) {
        const { data: ar } = await supabase
          .from("actors")
          .select("id, display_name, avatar_url")
          .in("id", actorIds);
        actorMap = new Map((ar || []).map((a) => [a.id, a]));
      }
      (pa || []).forEach((row) => {
        const a = actorMap.get(row.actor_id);
        if (!a) return;
        const list = actorsByProject.get(row.project_id) || [];
        list.push({ id: a.id, name: a.display_name, avatar_url: a.avatar_url });
        actorsByProject.set(row.project_id, list);
      });
    }

    const projectRows: ProjectRow[] = (projs || []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status as ProjectStatus,
      project_type: p.project_type as ProjectType,
      contract_value: p.contract_value ? Number(p.contract_value) : null,
      estimated_delivery_date: p.estimated_delivery_date,
      start_date: p.start_date,
      company_id: p.company_id,
      company_name: compMap.get(p.company_id) || "—",
      actors: actorsByProject.get(p.id) || [],
    }));
    setRows(projectRows);

    // KPIs
    const ativos = projectRows.filter((r) =>
      ["aceito", "em_desenvolvimento", "em_homologacao"].includes(r.status),
    ).length;
    const manut = projectRows.filter((r) => r.status === "em_manutencao").length;
    const contratado = projectRows
      .filter((r) => !["cancelado", "arquivado"].includes(r.status))
      .reduce((s, r) => s + (r.contract_value || 0), 0);

    const { data: contracts } = await supabase
      .from("maintenance_contracts")
      .select("monthly_fee, monthly_fee_discount_percent, status")
      .eq("status", "active")
      .is("deleted_at", null);
    const mrr = (contracts || []).reduce(
      (s, c) =>
        s + Number(c.monthly_fee) * (1 - Number(c.monthly_fee_discount_percent || 0) / 100),
      0,
    );
    const { data: blockDeps } = await supabase
      .from("project_dependencies")
      .select("project_id, status, is_blocking")
      .is("deleted_at", null)
      .or("is_blocking.eq.true,status.eq.bloqueante");
    const activeProjIds = new Set(
      projectRows
        .filter((r) => !["cancelado", "arquivado", "entregue"].includes(r.status))
        .map((r) => r.id),
    );
    const blockingDeps = (blockDeps || []).filter(
      (d) =>
        activeProjIds.has(d.project_id) &&
        !["resolvido", "cancelado", "recebido"].includes(d.status),
    ).length;

    setKpis({ ativos, manut, contratado, mrr, blockingDeps });
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = rows.filter(
      (r) => statusFilter.includes(r.status) && typeFilter.includes(r.project_type),
    );
    if (companyFilter !== "all") list = list.filter((r) => r.company_id === companyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.company_name.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, statusFilter, typeFilter, companyFilter, search, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function toggleSort(k: keyof ProjectRow) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function openDrawer(id: string) {
    navigate(`/projetos/${id}`);
  }

  async function archiveProject(id: string) {
    const ok = await confirmDialog({
      title: "Arquivar este projeto?",
      description: "O projeto será movido para o status arquivado e sairá da listagem padrão.",
      confirmLabel: "Arquivar",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("projects")
      .update({ status: "arquivado" as any })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Projeto arquivado");
    load();
  }

  function progress(start: string | null, end: string | null): number | null {
    if (!start || !end) return null;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e <= s) return null;
    const now = Date.now();
    return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Projetos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie todos os projetos da GetBrain em um só lugar.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1 min-h-11 sm:min-h-9 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard title="Projetos Ativos" value={kpis.ativos} icon={PlayCircle} isCurrency={false} />
        <KPICard title="Em Manutenção" value={kpis.manut} icon={Wrench} variant="success" isCurrency={false} />
        <KPICard title="Valor Contratado Total" value={kpis.contratado} icon={DollarSign} />
        <KPICard
          title="MRR — Receita Recorrente"
          value={kpis.mrr}
          icon={Repeat}
          variant="success"
          change={0}
        />
        <KPICard
          title="Dependências Bloqueantes"
          value={kpis.blockingDeps}
          icon={AlertTriangle}
          variant={kpis.blockingDeps > 0 ? "danger" : "default"}
          isCurrency={false}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[160px] sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10 sm:h-9"
            />
          </div>

          {/* Mobile: tudo em Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden min-h-10 gap-1">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Status</p>
                  <div className="space-y-2">
                    {PROJECT_STATUS_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer min-h-10">
                        <Checkbox
                          checked={statusFilter.includes(o.value)}
                          onCheckedChange={(c) => {
                            setStatusFilter(
                              c ? [...statusFilter, o.value] : statusFilter.filter((s) => s !== o.value),
                            );
                            setPage(1);
                          }}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Tipo</p>
                  <div className="space-y-2">
                    {PROJECT_TYPE_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer min-h-10">
                        <Checkbox
                          checked={typeFilter.includes(o.value)}
                          onCheckedChange={(c) => {
                            setTypeFilter(
                              c ? [...typeFilter, o.value] : typeFilter.filter((s) => s !== o.value),
                            );
                            setPage(1);
                          }}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Cliente</p>
                  <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop: inline */}
          <div className="hidden md:flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Status ({statusFilter.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {PROJECT_STATUS_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={statusFilter.includes(o.value)}
                        onCheckedChange={(c) => {
                          setStatusFilter(
                            c ? [...statusFilter, o.value] : statusFilter.filter((s) => s !== o.value),
                          );
                          setPage(1);
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Tipo ({typeFilter.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {PROJECT_TYPE_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={typeFilter.includes(o.value)}
                        onCheckedChange={(c) => {
                          setTypeFilter(
                            c ? [...typeFilter, o.value] : typeFilter.filter((s) => s !== o.value),
                          );
                          setPage(1);
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs view: visível só ≥md (no mobile sempre cards) */}
          <Tabs value={view} onValueChange={(v) => setView(v as any)} className="hidden md:block ml-auto">
            <TabsList>
              <TabsTrigger value="table" className="gap-1">
                <TableIcon className="h-4 w-4" /> Tabela
              </TabsTrigger>
              <TabsTrigger value="cards" className="gap-1">
                <LayoutGrid className="h-4 w-4" /> Cards
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando projetos...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum projeto encontrado com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: sempre cards */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginated.map((r) => {
              const prog = progress(r.start_date, r.estimated_delivery_date);
              return (
                <Card
                  key={r.id}
                  className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
                  onClick={() => openDrawer(r.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-accent font-mono text-xs font-semibold">{r.code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{r.name}</h3>
                    <div className="flex items-center gap-2">
                      <ActorAvatar name={r.company_name} size="sm" />
                      <span className="text-xs text-muted-foreground truncate">{r.company_name}</span>
                    </div>
                    <TypeBadge type={r.project_type} />
                    {r.contract_value && (
                      <p className="text-sm font-bold">{formatCurrency(r.contract_value)}</p>
                    )}
                    {prog !== null && (
                      <div>
                        <Progress value={prog} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">{Math.round(prog)}% do prazo</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {r.actors.length > 0 ? <ActorAvatarStack actors={r.actors} /> : <span />}
                      <span className="text-[10px] text-muted-foreground">
                        {r.estimated_delivery_date ? formatDate(r.estimated_delivery_date) : "Sem prazo"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>{filtered.length} projeto(s)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop ≥md: respeita view (table/cards) */}
          <div className="hidden md:block">
            {view === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {[
                            ["code", "Código"],
                            ["name", "Nome"],
                            ["company_name", "Cliente"],
                            ["project_type", "Tipo"],
                            ["status", "Status"],
                            ["contract_value", "Valor Contratado"],
                            ["estimated_delivery_date", "Entrega Estimada"],
                          ].map(([k, label]) => (
                            <TableHead
                              key={k}
                              className="cursor-pointer select-none"
                              onClick={() => toggleSort(k as keyof ProjectRow)}
                            >
                              {label} {sortKey === k && (sortDir === "asc" ? "↑" : "↓")}
                            </TableHead>
                          ))}
                          <TableHead>Atores</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((r) => {
                          const atrasado =
                            r.estimated_delivery_date &&
                            new Date(r.estimated_delivery_date) < new Date() &&
                            !["entregue", "em_manutencao", "cancelado", "arquivado"].includes(r.status);
                          return (
                            <TableRow
                              key={r.id}
                              onClick={() => openDrawer(r.id)}
                              className="cursor-pointer hover:bg-muted/40 transition-colors"
                            >
                              <TableCell>
                                <span className="text-accent font-mono font-medium">{r.code}</span>
                              </TableCell>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ActorAvatar name={r.company_name} size="sm" />
                                  <span className="text-sm">{r.company_name}</span>
                                </div>
                              </TableCell>
                              <TableCell><TypeBadge type={r.project_type} /></TableCell>
                              <TableCell><StatusBadge status={r.status} /></TableCell>
                              <TableCell className="text-right">
                                {r.contract_value ? formatCurrency(r.contract_value) : "—"}
                              </TableCell>
                              <TableCell className={cn(atrasado && "text-destructive font-medium")}>
                                {r.estimated_delivery_date ? formatDate(r.estimated_delivery_date) : "—"}
                              </TableCell>
                              <TableCell>
                                {r.actors.length > 0 ? (
                                  <ActorAvatarStack actors={r.actors} />
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between p-4 text-sm text-muted-foreground border-t">
                    <span>
                      {filtered.length} projeto(s) • Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                        Anterior
                      </Button>
                      <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                        Próxima
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {paginated.map((r) => {
                  const prog = progress(r.start_date, r.estimated_delivery_date);
                  return (
                    <Card
                      key={r.id}
                      className="hover:shadow-md transition-shadow cursor-pointer animate-fade-slide"
                      onClick={() => openDrawer(r.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-accent font-mono text-sm font-semibold">{r.code}</span>
                          <StatusBadge status={r.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <h3 className="font-semibold leading-tight line-clamp-2">{r.name}</h3>
                        <div className="flex items-center gap-2">
                          <ActorAvatar name={r.company_name} size="sm" />
                          <span className="text-sm text-muted-foreground truncate">{r.company_name}</span>
                        </div>
                        <TypeBadge type={r.project_type} />
                        {r.contract_value && (
                          <p className="text-sm font-bold">{formatCurrency(r.contract_value)}</p>
                        )}
                        {prog !== null && (
                          <div>
                            <Progress value={prog} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-1">{Math.round(prog)}% do prazo</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          {r.actors.length > 0 ? <ActorAvatarStack actors={r.actors} /> : <span />}
                          <span className="text-xs text-muted-foreground">
                            {r.estimated_delivery_date ? formatDate(r.estimated_delivery_date) : "Sem prazo"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <NovoProjetoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientes={companies.filter((c) => c.id !== "all")}
        onCreated={(id) => {
          load();
          openDrawer(id);
        }}
      />
      {confirmDialogEl}
    </div>
  );
}
