import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Landmark, ArrowUpRight, ArrowDownRight, Target, Download, CalendarIcon,
  FileText, FileSpreadsheet, ChevronDown, ChevronRight, Settings, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  format, addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  differenceInDays, isWithinInterval, isBefore, isAfter, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";

interface Movimentacao {
  id: string;
  tipo: string;
  descricao: string;
  valor_previsto: number;
  valor_realizado: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  categoria_id: string | null;
  conta_bancaria_id: string | null;
}

interface ContaBancaria {
  id: string;
  nome: string;
  saldo_inicial: number | null;
}

interface GroupedPeriod {
  label: string;
  start: Date;
  end: Date;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
  items: Movimentacao[];
}

export default function FluxoCaixaTab() {
  const [contaFilter, setContaFilter] = usePersistedState("fluxo-conta", "todas");
  const [periodFilter, setPeriodFilter] = usePersistedState("fluxo-period", "60dias");
  const [groupBy, setGroupBy] = usePersistedState("fluxo-group", "diario");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [paidMovs, setPaidMovs] = useState<Movimentacao[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [clienteMap, setClienteMap] = useState<Record<string, string>>({});
  const [fornecedorMap, setFornecedorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [saldoMinimo, setSaldoMinimo] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempSaldoMinimo, setTempSaldoMinimo] = useState("0");

  useEffect(() => {
    Promise.all([
      supabase.from("contas_bancarias").select("id, nome, saldo_inicial").eq("ativo", true),
      supabase.from("categorias").select("id, nome"),
      supabase.from("clientes").select("id, nome"),
      supabase.from("fornecedores").select("id, nome"),
    ]).then(([contasRes, catRes, cliRes, forRes]) => {
      setContas(contasRes.data || []);
      const cm: Record<string, string> = {};
      (catRes.data || []).forEach(c => { cm[c.id] = c.nome; });
      setCategorias(cm);
      const clm: Record<string, string> = {};
      (cliRes.data || []).forEach(c => { clm[c.id] = c.nome; });
      setClienteMap(clm);
      const fm: Record<string, string> = {};
      (forRes.data || []).forEach(f => { fm[f.id] = f.nome; });
      setFornecedorMap(fm);
    });
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "30dias": return { start: now, end: addDays(now, 30) };
      case "60dias": return { start: now, end: addDays(now, 60) };
      case "90dias": return { start: now, end: addDays(now, 90) };
      case "6meses": return { start: now, end: addMonths(now, 6) };
      case "personalizado": return { start: customStart || now, end: customEnd || addDays(now, 60) };
      default: return { start: now, end: addDays(now, 60) };
    }
  }, [periodFilter, customStart, customEnd]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const startStr = format(dateRange.start, "yyyy-MM-dd");
    const endStr = format(dateRange.end, "yyyy-MM-dd");

    let query = supabase
      .from("movimentacoes")
      .select("id, tipo, descricao, valor_previsto, valor_realizado, data_vencimento, data_pagamento, status, cliente_id, fornecedor_id, categoria_id, conta_bancaria_id")
      .in("status", ["pendente", "atrasado"])
      .lte("data_vencimento", endStr);

    if (contaFilter !== "todas") {
      query = query.eq("conta_bancaria_id", contaFilter);
    }

    const { data } = await query;
    setMovimentacoes(data || []);

    let paidQuery = supabase
      .from("movimentacoes")
      .select("id, tipo, descricao, valor_previsto, valor_realizado, data_vencimento, data_pagamento, status, cliente_id, fornecedor_id, categoria_id, conta_bancaria_id")
      .eq("status", "pago");
    if (contaFilter !== "todas") {
      paidQuery = paidQuery.eq("conta_bancaria_id", contaFilter);
    }
    const { data: paid } = await paidQuery;
    setPaidMovs(paid || []);

    setLoading(false);
  }, [dateRange, contaFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const saldoAtual = useMemo(() => {
    const selectedContas = contaFilter === "todas" ? contas : contas.filter(c => c.id === contaFilter);
    const saldoInicial = selectedContas.reduce((s, c) => s + (c.saldo_inicial || 0), 0);
    const adjustments = paidMovs.reduce((s, m) => {
      const val = Math.abs(m.valor_realizado || m.valor_previsto || 0);
      return m.tipo === "receita" ? s + val : s - val;
    }, 0);
    return saldoInicial + adjustments;
  }, [contas, paidMovs, contaFilter]);

  const kpis = useMemo(() => {
    const startStr = format(dateRange.start, "yyyy-MM-dd");
    const endStr = format(dateRange.end, "yyyy-MM-dd");
    const inPeriod = movimentacoes.filter(m =>
      m.data_vencimento >= startStr && m.data_vencimento <= endStr
    );
    const totalReceber = inPeriod.filter(m => m.tipo === "receita").reduce((s, m) => s + (m.valor_previsto || 0), 0);
    const totalPagar = inPeriod.filter(m => m.tipo === "despesa").reduce((s, m) => s + (m.valor_previsto || 0), 0);
    const saldoProjetado = saldoAtual + totalReceber - totalPagar;
    return { totalReceber, totalPagar, saldoProjetado };
  }, [movimentacoes, saldoAtual, dateRange]);

  const chartData = useMemo(() => {
    const points: { date: string; label: string; saldo: number; entradas: number; saidas: number }[] = [];
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    let runningBalance = saldoAtual;

    days.forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayMovs = movimentacoes.filter(m => m.data_vencimento === dayStr);
      const entradas = dayMovs.filter(m => m.tipo === "receita").reduce((s, m) => s + (m.valor_previsto || 0), 0);
      const saidas = dayMovs.filter(m => m.tipo === "despesa").reduce((s, m) => s + (m.valor_previsto || 0), 0);
      runningBalance += entradas - saidas;
      points.push({
        date: dayStr,
        label: format(day, "dd/MM", { locale: ptBR }),
        saldo: runningBalance,
        entradas,
        saidas: -saidas,
      });
    });

    if (points.length > 90) {
      const sampled: typeof points = [];
      for (let i = 0; i < points.length; i += 7) {
        const slice = points.slice(i, i + 7);
        const last = slice[slice.length - 1];
        sampled.push({
          ...last,
          entradas: slice.reduce((s, p) => s + p.entradas, 0),
          saidas: slice.reduce((s, p) => s + p.saidas, 0),
        });
      }
      return sampled;
    }
    return points;
  }, [movimentacoes, saldoAtual, dateRange]);

  const groupedData = useMemo(() => {
    const groups: GroupedPeriod[] = [];
    let intervals: { start: Date; end: Date; label: string }[] = [];

    if (groupBy === "diario") {
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      intervals = days.map(d => ({
        start: d, end: d,
        label: format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR }),
      }));
    } else if (groupBy === "semanal") {
      const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 });
      intervals = weeks.map(w => {
        const ws = startOfWeek(w, { weekStartsOn: 1 });
        const we = endOfWeek(w, { weekStartsOn: 1 });
        const s = isBefore(ws, dateRange.start) ? dateRange.start : ws;
        const e = isAfter(we, dateRange.end) ? dateRange.end : we;
        return {
          start: s, end: e,
          label: `Semana ${format(s, "dd/MM")} - ${format(e, "dd/MM")}`,
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      intervals = months.map(m => {
        const ms = startOfMonth(m);
        const me = endOfMonth(m);
        const s = isBefore(ms, dateRange.start) ? dateRange.start : ms;
        const e = isAfter(me, dateRange.end) ? dateRange.end : me;
        return {
          start: s, end: e,
          label: format(m, "MMMM/yyyy", { locale: ptBR }),
        };
      });
    }

    let saldoAcumulado = saldoAtual;

    intervals.forEach(interval => {
      const startStr = format(interval.start, "yyyy-MM-dd");
      const endStr = format(interval.end, "yyyy-MM-dd");
      const items = movimentacoes.filter(m =>
        m.data_vencimento >= startStr && m.data_vencimento <= endStr
      );
      const entradas = items.filter(m => m.tipo === "receita").reduce((s, m) => s + (m.valor_previsto || 0), 0);
      const saidas = items.filter(m => m.tipo === "despesa").reduce((s, m) => s + (m.valor_previsto || 0), 0);
      const saldo = entradas - saidas;
      saldoAcumulado += saldo;

      groups.push({
        label: interval.label,
        start: interval.start,
        end: interval.end,
        entradas,
        saidas,
        saldo,
        saldoAcumulado,
        items,
      });
    });

    if (groupBy === "diario") {
      return groups.filter(g => g.items.length > 0);
    }
    return groups;
  }, [movimentacoes, saldoAtual, dateRange, groupBy]);

  function toggleExpand(label: string) {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  }

  function getSaldoAccBg(val: number): string {
    if (val < saldoMinimo) return "bg-destructive/10";
    if (saldoMinimo > 0 && val < saldoMinimo * 1.2) return "bg-warning/10";
    return "";
  }

  function saveSaldoMinimo() {
    setSaldoMinimo(parseFloat(tempSaldoMinimo) || 0);
    setSettingsOpen(false);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const saldo = payload.find((p: any) => p.dataKey === "saldo")?.value || 0;
    const entradas = payload.find((p: any) => p.dataKey === "entradas")?.value || 0;
    const saidas = payload.find((p: any) => p.dataKey === "saidas")?.value || 0;
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm space-y-1">
        <p className="font-medium">{label}</p>
        <p className="text-accent">Saldo: {formatCurrency(saldo)}</p>
        <p className="text-success">Entradas: {formatCurrency(entradas)}</p>
        <p className="text-destructive">Saídas: {formatCurrency(Math.abs(saidas))}</p>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>;
  }

  const hasData = movimentacoes.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={contaFilter} onValueChange={setContaFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Contas</SelectItem>
            {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30dias">Próximos 30 dias</SelectItem>
            <SelectItem value="60dias">Próximos 60 dias</SelectItem>
            <SelectItem value="90dias">Próximos 90 dias</SelectItem>
            <SelectItem value="6meses">Próximos 6 meses</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {periodFilter === "personalizado" && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {customStart ? format(customStart, "dd/MM/yyyy") : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {customEnd ? format(customEnd, "dd/MM/yyyy") : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </>
        )}

        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diario">Diário</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><FileText className="h-4 w-4 mr-2" />Exportar PDF</DropdownMenuItem>
              <DropdownMenuItem><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual</CardTitle>
            <Landmark className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(saldoAtual)}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(kpis.totalReceber)}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle>
            <ArrowDownRight className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(kpis.totalPagar)}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Projetado Final</CardTitle>
            <Target className={cn("h-5 w-5", kpis.saldoProjetado >= 0 ? "text-success" : "text-destructive")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", kpis.saldoProjetado >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(kpis.saldoProjetado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação projetada</h3>
            <p className="text-muted-foreground">Nenhuma movimentação projetada para o período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Projeção de Fluxo de Caixa</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setTempSaldoMinimo(String(saldoMinimo)); setSettingsOpen(true); }}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="fluxoAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    {saldoMinimo !== 0 && (
                      <ReferenceLine y={saldoMinimo} stroke="hsl(var(--destructive))" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: `Mín: ${formatCurrency(saldoMinimo)}`, position: "right", fill: "hsl(var(--destructive))", fontSize: 11 }} />
                    )}
                    <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" opacity={0.4} barSize={12} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" opacity={0.4} barSize={12} radius={[0, 0, 2, 2]} />
                    <Area
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo Projetado"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fill="url(#fluxoAreaGradient)"
                      dot={{ r: 3, fill: "hsl(var(--background))", stroke: "hsl(var(--accent))", strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composição do Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Saldo Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell />
                    <TableCell className="font-bold text-sm">Saldo Inicial</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-mono font-bold text-sm text-accent">
                      {formatCurrency(saldoAtual)}
                    </TableCell>
                  </TableRow>

                  {groupedData.map(group => {
                    const isExpanded = expandedGroups[group.label];
                    return (
                      <> 
                        <TableRow
                          key={group.label}
                          className={cn("cursor-pointer hover:bg-muted/50 transition-colors", getSaldoAccBg(group.saldoAcumulado))}
                          onClick={() => toggleExpand(group.label)}
                        >
                          <TableCell className="w-8 px-2">
                            {group.items.length > 0 ? (
                              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium text-sm capitalize">{group.label}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-success">
                            {group.entradas > 0 ? `+${formatCurrency(group.entradas)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-destructive">
                            {group.saidas > 0 ? `-${formatCurrency(group.saidas)}` : "—"}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-sm font-medium", group.saldo >= 0 ? "text-success" : "text-destructive")}>
                            {group.saldo >= 0 ? "+" : ""}{formatCurrency(group.saldo)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-sm font-bold", group.saldoAcumulado >= 0 ? "" : "text-destructive")}>
                            {formatCurrency(group.saldoAcumulado)}
                          </TableCell>
                        </TableRow>

                        {isExpanded && group.items.map(item => (
                          <TableRow key={item.id} className="bg-muted/20">
                            <TableCell />
                            <TableCell className="pl-10">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  item.tipo === "receita" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                                )}>
                                  {item.tipo === "receita" ? "Entrada" : "Saída"}
                                </span>
                                <span className="text-sm">{item.descricao}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {item.cliente_id ? clienteMap[item.cliente_id] || "—" : item.fornecedor_id ? fornecedorMap[item.fornecedor_id] || "—" : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {item.categoria_id ? categorias[item.categoria_id] || "—" : "—"}
                            </TableCell>
                            <TableCell className={cn("text-right font-mono text-sm", item.tipo === "receita" ? "text-success" : "text-destructive")}>
                              {item.tipo === "receita" ? "+" : "-"}{formatCurrency(item.valor_previsto)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              <div className="flex items-center justify-end gap-2">
                                <span>{formatDate(item.data_vencimento)}</span>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-xs",
                                  item.status === "atrasado" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                                )}>
                                  {item.status === "atrasado" ? "Atrasado" : "Pendente"}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Saldo Mínimo de Segurança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina o valor mínimo de saldo para sinalizar zona de risco no gráfico de projeção.
            </p>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={tempSaldoMinimo}
                onChange={e => setTempSaldoMinimo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
              <Button onClick={saveSaldoMinimo}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
