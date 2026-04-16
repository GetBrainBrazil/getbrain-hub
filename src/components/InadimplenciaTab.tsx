import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle, FileText as FileTextIcon, Clock, Percent, Download,
  CalendarIcon, FileText, FileSpreadsheet, ChevronDown, ChevronRight,
  CheckCircle2, ArrowUpDown, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format, subDays, startOfYear, differenceInDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface InadMovimentacao {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  cliente_id: string | null;
  status: string | null;
}

interface Cliente {
  id: string;
  nome: string;
}

type SortKey = "nome" | "qtd" | "valor" | "antigo" | "pct";
type SortDir = "asc" | "desc";

const AGING_RANGES = [
  { label: "1 a 15 dias", min: 1, max: 15, color: "hsl(45, 93%, 47%)" },
  { label: "16 a 30 dias", min: 16, max: 30, color: "hsl(30, 90%, 50%)" },
  { label: "31 a 60 dias", min: 31, max: 60, color: "hsl(0, 70%, 60%)" },
  { label: "61 a 90 dias", min: 61, max: 90, color: "hsl(0, 80%, 45%)" },
  { label: "Acima de 90 dias", min: 91, max: 99999, color: "hsl(0, 60%, 30%)" },
];

export default function InadimplenciaTab() {
  const navigate = useNavigate();
  const [period, setPeriod] = usePersistedState("inad-period", "90dias");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [clienteFilter, setClienteFilter] = usePersistedState("inad-cliente", "todos");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atrasados, setAtrasados] = useState<InadMovimentacao[]>([]);
  const [totalFaturado, setTotalFaturado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("valor");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [meiosPagamento, setMeiosPagamento] = useState<any[]>([]);
  const [openBaixa, setOpenBaixa] = useState(false);
  const [selectedMov, setSelectedMov] = useState<InadMovimentacao | null>(null);
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "", data_pagamento: "", conta_bancaria_id: "", meio_pagamento_id: "",
  });

  // Load clientes
  useEffect(() => {
    supabase.from("clientes").select("id, nome").then(({ data }) => setClientes(data || []));
  }, []);

  // Compute date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "30dias": return { start: subDays(now, 30), end: now };
      case "60dias": return { start: subDays(now, 60), end: now };
      case "90dias": return { start: subDays(now, 90), end: now };
      case "este_ano": return { start: startOfYear(now), end: now };
      case "personalizado": return { start: customStart || subDays(now, 90), end: customEnd || now };
      default: return { start: subDays(now, 90), end: now };
    }
  }, [period, customStart, customEnd]);

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const startStr = format(dateRange.start, "yyyy-MM-dd");
      const endStr = format(dateRange.end, "yyyy-MM-dd");

      // Atrasados: receita, vencimento passed, not pago
      const { data: atr } = await supabase
        .from("movimentacoes")
        .select("id, descricao, valor_previsto, data_vencimento, cliente_id, status")
        .eq("tipo", "receita")
        .in("status", ["atrasado", "pendente"])
        .lte("data_vencimento", format(new Date(), "yyyy-MM-dd"))
        .gte("data_vencimento", startStr)
        .lte("data_vencimento", endStr);
      setAtrasados(atr || []);

      // Total faturado no período (all receita)
      const { data: faturados } = await supabase
        .from("movimentacoes")
        .select("valor_previsto")
        .eq("tipo", "receita")
        .gte("data_vencimento", startStr)
        .lte("data_vencimento", endStr);
      setTotalFaturado((faturados || []).reduce((s, m) => s + (m.valor_previsto || 0), 0));
      setLoading(false);
    }
    load();
  }, [dateRange]);

  const clienteMap = useMemo(() => {
    const m: Record<string, string> = {};
    clientes.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [clientes]);

  // Apply client filter
  const filteredAtrasados = useMemo(() => {
    if (clienteFilter === "todos") return atrasados;
    return atrasados.filter(a => a.cliente_id === clienteFilter);
  }, [atrasados, clienteFilter]);

  const now = new Date();

  // KPIs
  const kpis = useMemo(() => {
    const totalAtraso = filteredAtrasados.reduce((s, m) => s + (m.valor_previsto || 0), 0);
    const qtd = filteredAtrasados.length;
    const diasArr = filteredAtrasados.map(m => differenceInDays(now, new Date(m.data_vencimento)));
    const tempoMedio = qtd > 0 ? diasArr.reduce((a, b) => a + b, 0) / qtd : 0;
    const taxa = totalFaturado > 0 ? (totalAtraso / totalFaturado) * 100 : 0;
    return { totalAtraso, qtd, tempoMedio, taxa };
  }, [filteredAtrasados, totalFaturado]);

  // Group by client
  const clientGroups = useMemo(() => {
    const groups: Record<string, { nome: string; items: InadMovimentacao[]; total: number; oldest: string }> = {};
    filteredAtrasados.forEach(m => {
      const cid = m.cliente_id || "sem_cliente";
      if (!groups[cid]) {
        groups[cid] = { nome: clienteMap[cid] || "Sem cliente", items: [], total: 0, oldest: m.data_vencimento };
      }
      groups[cid].items.push(m);
      groups[cid].total += m.valor_previsto || 0;
      if (m.data_vencimento < groups[cid].oldest) groups[cid].oldest = m.data_vencimento;
    });
    return groups;
  }, [filteredAtrasados, clienteMap]);

  const sortedClientKeys = useMemo(() => {
    const totalGeral = kpis.totalAtraso;
    return Object.keys(clientGroups).sort((a, b) => {
      const ga = clientGroups[a];
      const gb = clientGroups[b];
      let va: number, vb: number;
      switch (sortKey) {
        case "nome": va = ga.nome.localeCompare(gb.nome); return sortDir === "asc" ? va : -va;
        case "qtd": va = ga.items.length; vb = gb.items.length; break;
        case "valor": va = ga.total; vb = gb.total; break;
        case "antigo": va = differenceInDays(now, new Date(ga.oldest)); vb = differenceInDays(now, new Date(gb.oldest)); break;
        case "pct": va = totalGeral > 0 ? ga.total / totalGeral : 0; vb = totalGeral > 0 ? gb.total / totalGeral : 0; break;
        default: va = ga.total; vb = gb.total;
      }
      if ((sortKey as string) === "nome") return 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [clientGroups, sortKey, sortDir, kpis.totalAtraso]);

  // Aging data
  const agingData = useMemo(() => {
    return AGING_RANGES.map(range => {
      const items = filteredAtrasados.filter(m => {
        const dias = differenceInDays(now, new Date(m.data_vencimento));
        return dias >= range.min && dias <= range.max;
      });
      const valor = items.reduce((s, m) => s + (m.valor_previsto || 0), 0);
      return { ...range, qtd: items.length, valor, pct: kpis.totalAtraso > 0 ? (valor / kpis.totalAtraso) * 100 : 0 };
    });
  }, [filteredAtrasados, kpis.totalAtraso]);

  // Evolution data (last 6 months)
  const evolutionData = useMemo(() => {
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({ label: format(d, "MMM/yy", { locale: ptBR }), start: startOfMonth(d), end: endOfMonth(d) });
    }
    // We need all receita for these months - use atrasados data as proxy
    // Actually need fresh query, but since we have period-filtered data, show from all atrasados
    // For evolution we recalculate from all loaded data treating vencimento date
    return months.map(m => {
      const endStr = format(m.end, "yyyy-MM-dd");
      // Items overdue as of end of that month
      const overdue = atrasados.filter(a => a.data_vencimento <= endStr);
      const valor = overdue.reduce((s, a) => s + (a.valor_previsto || 0), 0);
      const taxa = totalFaturado > 0 ? (valor / totalFaturado) * 100 : 0;
      return { month: m.label, valor, taxa };
    });
  }, [atrasados, totalFaturado]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleExpand(clientId: string) {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  }

  const taxaColor = kpis.taxa > 10 ? "text-destructive" : kpis.taxa > 5 ? "text-warning" : "text-success";

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>;
  }

  // Empty state
  if (filteredAtrasados.length === 0) {
    return (
      <div className="space-y-6">
        {renderFilters()}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma inadimplência encontrada</h3>
            <p className="text-muted-foreground">Todas as contas estão em dia!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderFilters() {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="60dias">Últimos 60 dias</SelectItem>
            <SelectItem value="90dias">Últimos 90 dias</SelectItem>
            <SelectItem value="este_ano">Este Ano</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {period === "personalizado" && (
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

        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Clientes</SelectItem>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
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
    );
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {renderFilters()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Atraso</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(kpis.totalAtraso)}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quantidade de Títulos</CardTitle>
            <FileTextIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.qtd}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio de Atraso</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{Math.round(kpis.tempoMedio)} dias</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-slide">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Inadimplência</CardTitle>
            <Percent className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", taxaColor)}>{kpis.taxa.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Client Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inadimplência por Cliente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <SortHeader label="Cliente" field="nome" />
                <SortHeader label="Títulos em Atraso" field="qtd" />
                <SortHeader label="Valor Total em Atraso" field="valor" />
                <SortHeader label="Título Mais Antigo" field="antigo" />
                <SortHeader label="% do Total" field="pct" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClientKeys.map(cid => {
                const g = clientGroups[cid];
                const isExpanded = expandedClients[cid];
                const diasOldest = differenceInDays(now, new Date(g.oldest));
                const pct = kpis.totalAtraso > 0 ? (g.total / kpis.totalAtraso) * 100 : 0;
                return (
                  <> 
                    <TableRow
                      key={cid}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpand(cid)}
                    >
                      <TableCell className="w-8 px-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{g.nome}</TableCell>
                      <TableCell>{g.items.length}</TableCell>
                      <TableCell className="font-mono font-bold text-destructive">{formatCurrency(g.total)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatDate(g.oldest)}</span>
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{diasOldest} dias</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div className="bg-destructive h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-sm">{pct.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && g.items.map(item => {
                      const dias = differenceInDays(now, new Date(item.data_vencimento));
                      return (
                        <TableRow key={item.id} className="bg-muted/20">
                          <TableCell />
                          <TableCell className="pl-10 text-sm">{item.descricao}</TableCell>
                          <TableCell />
                          <TableCell className="font-mono text-sm">{formatCurrency(item.valor_previsto)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{formatDate(item.data_vencimento)}</span>
                              <span className="text-xs text-destructive">{dias} dias</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={(e) => { e.stopPropagation(); navigate("/financeiro/contas-receber"); }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />Registrar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Aging Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envelhecimento da Dívida (Aging)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="valor" name="Valor" radius={[0, 4, 4, 0]}>
                    {agingData.map((entry, i) => (
                      <rect key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">Títulos</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} />
                        <span className="text-sm">{r.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{r.qtd}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.valor)}</TableCell>
                    <TableCell className="text-right">{r.pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução da Inadimplência (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "valor" ? formatCurrency(value) : `${value.toFixed(1)}%`
                  }
                  labelFormatter={(label) => label}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="valor" name="Total em Atraso" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="taxa" name="Taxa de Inadimplência (%)" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
