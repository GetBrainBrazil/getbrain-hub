import { useMemo, useState } from "react";
import { useVendas, useVendasDashboard, useImportarVendasExistentes } from "@/hooks/useVendas";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { PeriodFilter, getDateRange, PeriodPreset } from "@/components/PeriodFilter";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Clock, Receipt, Plus, Download, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { NovaVendaDialog } from "@/components/vendas/NovaVendaDialog";
import { VendaDrawer } from "@/components/vendas/VendaDrawer";
import { TIPO_VENDA_LABEL, VENDA_STATUS_LABEL, getVendaStatusClasses, getTipoVendaClasses } from "@/lib/vendas-helpers";
import { cn } from "@/lib/utils";

export default function Vendas() {
  const [preset, setPreset] = usePersistedState<PeriodPreset>("vendas_period_preset", "all");
  const [customRange, setCustomRange] = usePersistedState<{ start: string | null; end: string | null }>(
    "vendas_period_custom",
    { start: null, end: null }
  );
  const [search, setSearch] = usePersistedState<string>("vendas_search", "");
  const [tipoFilter, setTipoFilter] = usePersistedState<string>("vendas_tipo_filter", "all");
  const [statusFilter, setStatusFilter] = usePersistedState<string>("vendas_status_filter", "all");

  const [novaOpen, setNovaOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const range = getDateRange(preset, customRange);
  const inicio = range.startDate ? format(range.startDate, "yyyy-MM-dd") : null;
  const fim = range.endDate ? format(range.endDate, "yyyy-MM-dd") : null;

  const { data: dashboard } = useVendasDashboard(inicio, fim);
  const { data: vendas, isLoading } = useVendas();
  const importMut = useImportarVendasExistentes();

  const filtered = useMemo(() => {
    if (!vendas) return [];
    return vendas.filter((v) => {
      if (inicio && v.data_venda < inicio) return false;
      if (fim && v.data_venda > fim) return false;
      if (tipoFilter !== "all" && v.tipo_venda !== tipoFilter) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${v.numero} ${v.descricao || ""} ${v.project?.code || ""} ${v.project?.name || ""} ${v.cliente?.nome || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [vendas, inicio, fim, tipoFilter, statusFilter, search]);

  const showImport = !isLoading && (vendas?.length ?? 0) === 0;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vendas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gerencie vendas vinculadas aos projetos e parcelas em Contas a Receber.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <PeriodFilter preset={preset} customRange={customRange} onPresetChange={setPreset} onCustomRangeChange={setCustomRange} />
          <Button onClick={() => setNovaOpen(true)} className="min-h-10 w-full sm:w-auto"><Plus className="h-4 w-4" />Nova Venda</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Total Vendido" value={dashboard?.total_vendido ?? 0} icon={DollarSign} />
        <KPICard title="Total Recebido" value={dashboard?.total_recebido ?? 0} icon={TrendingUp} variant="success" />
        <KPICard title="A Receber" value={dashboard?.total_a_receber ?? 0} icon={Clock} variant="default"
          badgeText={dashboard?.total_atrasado ? `${formatCurrency(dashboard.total_atrasado)} vencido` : undefined}
          badgeVariant="danger" />
        <KPICard title="Ticket Médio" value={dashboard?.ticket_medio ?? 0} icon={Receipt} />
      </div>

      <Card className="p-3 sm:p-4 flex flex-col md:flex-row gap-2 sm:gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-10" placeholder="Buscar por número, projeto, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full md:w-auto"
          >
            <option value="all">Todos os tipos</option>
            <option value="implementacao">Implementação</option>
            <option value="recorrente">Recorrente</option>
            <option value="avulso">Avulso</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full md:w-auto"
          >
            <option value="all">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="confirmada">Confirmada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </Card>

      {showImport && (
        <Card className="p-4 sm:p-6 text-center space-y-3 border-dashed">
          <h3 className="font-semibold">Nenhuma venda cadastrada ainda</h3>
          <p className="text-sm text-muted-foreground">
            Você pode importar as vendas existentes a partir dos seus projetos atuais. Cada projeto com receitas vira uma venda automaticamente.
          </p>
          <Button onClick={() => importMut.mutate()} disabled={importMut.isPending} className="min-h-10 w-full sm:w-auto">
            <Download className="h-4 w-4" /> Importar vendas existentes dos projetos
          </Button>
        </Card>
      )}

      {/* Lista mobile (cards) */}
      <div className="md:hidden space-y-2">
        {isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando...</Card>}
        {!isLoading && filtered.length === 0 && !showImport && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma venda encontrada com esses filtros.</Card>
        )}
        {filtered.map((v) => {
          const total = v.parcelas_total ?? 0;
          const pagas = v.parcelas_pagas ?? 0;
          const pct = total > 0 ? (pagas / total) * 100 : 0;
          return (
            <Card key={v.id} className="p-3 cursor-pointer active:bg-muted/40" onClick={() => setSelectedId(v.id)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{v.numero}</span>
                    <span>·</span>
                    <span>{formatDate(v.data_venda)}</span>
                  </div>
                  <div className="font-medium truncate mt-0.5">{v.cliente?.nome || "—"}</div>
                  {v.project && (
                    <div className="text-xs text-accent mt-0.5">{v.project.code}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tabular-nums">{formatCurrency(Number(v.valor_total))}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-[10px]", getTipoVendaClasses(v.tipo_venda))}>
                  {TIPO_VENDA_LABEL[v.tipo_venda]}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px]", getVendaStatusClasses(v.status))}>
                  {VENDA_STATUS_LABEL[v.status]}
                </Badge>
                <div className="flex items-center gap-2 ml-auto min-w-[100px]">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-[11px] text-muted-foreground tabular-nums">{pagas}/{total}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabela desktop */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor total</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && !showImport && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada com esses filtros.</TableCell></TableRow>
            )}
            {filtered.map((v) => {
              const total = v.parcelas_total ?? 0;
              const pagas = v.parcelas_pagas ?? 0;
              const pct = total > 0 ? (pagas / total) * 100 : 0;
              return (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedId(v.id)}>
                  <TableCell className="font-mono text-sm">{v.numero}</TableCell>
                  <TableCell>{formatDate(v.data_venda)}</TableCell>
                  <TableCell>{v.cliente?.nome || "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {v.project ? (
                      <Link to={`/projetos/${v.project_id}`} className="text-accent hover:underline text-sm">
                        {v.project.code}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(getTipoVendaClasses(v.tipo_venda))}>
                      {TIPO_VENDA_LABEL[v.tipo_venda]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(Number(v.valor_total))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums">{pagas}/{total}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(getVendaStatusClasses(v.status))}>
                      {VENDA_STATUS_LABEL[v.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <NovaVendaDialog open={novaOpen} onOpenChange={setNovaOpen} />
      <VendaDrawer vendaId={selectedId} open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)} />
    </div>
  );
}
