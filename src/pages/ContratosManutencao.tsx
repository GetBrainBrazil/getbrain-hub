import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Wrench, Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { MaintenanceStatusBadge } from "@/components/projetos/ProjetoBadges";
import { NovoContratoDialog } from "@/components/projetos/NovoContratoDialog";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { getDiscountInfo, getEffectiveMrr } from "@/lib/maintenance";

type ContractRow = {
  id: string;
  project_id: string;
  monthly_fee: number;
  monthly_fee_discount_percent: number | null;
  discount_duration_months: number | null;
  start_date: string;
  end_date: string | null;
  status: "active" | "paused" | "ended" | "cancelled";
  notes: string | null;
  project?: {
    id: string;
    code: string;
    name: string;
    company_id: string;
  };
  client_name?: string | null;
};

export default function ContratosManutencao() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFilter = searchParams.get("projectId") || "";
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = usePersistedState<string>("contratos:status", "all");
  const [search, setSearch] = usePersistedState<string>("contratos:search", "");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const { data: contracts, error } = await supabase
      .from("maintenance_contracts")
      .select("*")
      .is("deleted_at", null)
      .order("status", { ascending: true })
      .order("start_date", { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    const projectIds = Array.from(new Set((contracts || []).map((c) => c.project_id)));
    const [{ data: projects }, { data: legacyProjs }] = await Promise.all([
      supabase.from("projects").select("id, code, name, company_id").in("id", projectIds),
      supabase.from("projetos").select("id, cliente_id").in("id", projectIds),
    ]);

    const companyIds = Array.from(new Set((projects || []).map((p) => p.company_id).filter(Boolean)));
    const clientIds = Array.from(new Set((legacyProjs || []).map((p) => p.cliente_id).filter(Boolean)));

    const [{ data: companies }, { data: clientes }] = await Promise.all([
      companyIds.length
        ? supabase.from("companies").select("id, legal_name, trade_name").in("id", companyIds)
        : Promise.resolve({ data: [] as any[] }),
      clientIds.length
        ? supabase.from("clientes").select("id, nome, nome_empresa").in("id", clientIds as string[])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const projMap = new Map((projects || []).map((p) => [p.id, p]));
    const legacyMap = new Map((legacyProjs || []).map((p) => [p.id, p.cliente_id]));
    const companyMap = new Map((companies || []).map((c: any) => [c.id, c.trade_name || c.legal_name]));
    const clienteMap = new Map((clientes || []).map((c: any) => [c.id, c.nome_empresa || c.nome]));

    const enriched: ContractRow[] = (contracts || []).map((c: any) => {
      const proj = projMap.get(c.project_id);
      const clientId = legacyMap.get(c.project_id);
      const clientFromLegacy = clientId ? clienteMap.get(clientId) : null;
      const clientFromCompany = proj ? companyMap.get(proj.company_id) : null;
      return {
        ...c,
        project: proj as any,
        client_name: clientFromLegacy || clientFromCompany || null,
      };
    });

    setRows(enriched);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (projectFilter && r.project_id !== projectFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          (r.project?.code || "") + " " +
          (r.project?.name || "") + " " +
          (r.client_name || "");
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, projectFilter, statusFilter, search]);

  const mrrAtivo = useMemo(
    () => rows.filter((r) => r.status === "active").reduce((acc, r) => acc + getEffectiveMrr(r), 0),
    [rows],
  );
  const activeCount = useMemo(() => rows.filter((r) => r.status === "active").length, [rows]);

  const projectFiltered = projectFilter
    ? rows.find((r) => r.project_id === projectFilter)?.project
    : null;

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contratos de Manutenção</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensalidades recorrentes geram automaticamente Contas a Receber pendentes.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo Contrato
        </Button>
      </header>

      {/* MRR resumo */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            MRR ativo
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-success">
            {formatCurrency(mrrAtivo)}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {activeCount} contrato{activeCount === 1 ? "" : "s"} ativo{activeCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            ARR projetado
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-foreground">
            {formatCurrency(mrrAtivo * 12)}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">MRR ativo × 12</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Total contratos
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-foreground">
            {rows.length}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Inclui pausados e encerrados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por projeto ou cliente..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="ended">Encerrado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        {projectFilter && (
          <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Filtrando projeto:</span>
            <span className="font-mono font-semibold text-accent">
              {projectFiltered?.code || "—"}
            </span>
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchParams({})}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_44px] gap-4 border-b border-border bg-muted/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <div>Projeto</div>
          <div>Cliente</div>
          <div className="text-right">Mensalidade líquida</div>
          <div>Início</div>
          <div>Fim</div>
          <div>Status</div>
          <div></div>
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Wrench className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {rows.length === 0
                ? "Nenhum contrato cadastrado. Crie o primeiro para começar a gerar receita recorrente."
                : "Nenhum contrato bate com os filtros selecionados."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to={`/projetos/${r.project_id}`}
                className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_44px] items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs font-semibold text-accent">
                    {r.project?.code || "—"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.project?.name || "—"}
                  </div>
                </div>
                <div className="truncate text-foreground">{r.client_name || "—"}</div>
                <div className="text-right">
                  <div className="font-mono text-base font-bold tabular-nums text-foreground">
                    {formatCurrency(getEffectiveMrr(r))}
                  </div>
                  {(() => {
                    const info = getDiscountInfo(r);
                    if (!info.hasDiscount) return null;
                    return (
                      <div
                        className={
                          "text-[10px] " +
                          (info.expired ? "text-destructive" : "text-success")
                        }
                      >
                        −{r.monthly_fee_discount_percent}%
                        {info.indefinite
                          ? " indef."
                          : info.endsAt
                          ? ` ${info.expired ? "exp." : "até"} ${formatDate(
                              info.endsAt.toISOString().slice(0, 10),
                            )}`
                          : ""}
                      </div>
                    );
                  })()}
                </div>
                <div className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatDate(r.start_date)}
                </div>
                <div className="font-mono text-xs tabular-nums text-muted-foreground">
                  {r.end_date ? formatDate(r.end_date) : "—"}
                </div>
                <div>
                  <MaintenanceStatusBadge status={r.status} />
                </div>
                <div className="flex justify-end">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NovoContratoDialog
        open={openNew}
        onOpenChange={setOpenNew}
        defaultProjectId={projectFilter || undefined}
        onCreated={load}
      />
    </div>
  );
}
