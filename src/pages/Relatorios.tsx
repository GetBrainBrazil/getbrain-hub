import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  TrendingUp, TrendingDown, DollarSign, MinusCircle, BarChart3, Percent,
  ChevronDown, ChevronRight, Eye, Download, CalendarIcon, FileText, FileSpreadsheet,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedState } from "@/hooks/use-persisted-state";

// ── Types ──
interface Movimentacao {
  id: string;
  tipo: string;
  descricao: string;
  valor_realizado: number | null;
  data_pagamento: string | null;
  categoria_id: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
}

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
}

interface DRELine {
  label: string;
  type: "group" | "detail" | "subtotal" | "result";
  value: number;
  prevValue?: number;
  indent?: number;
  categoriaId?: string;
  items?: Movimentacao[];
}

// ── Period helpers ──
function getPeriodDates(period: string, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "este_mes": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "mes_anterior": { const p = subMonths(now, 1); return { start: startOfMonth(p), end: endOfMonth(p) }; }
    case "este_trimestre": return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "trimestre_anterior": { const p = subQuarters(now, 1); return { start: startOfQuarter(p), end: endOfQuarter(p) }; }
    case "este_ano": return { start: startOfYear(now), end: endOfYear(now) };
    case "ano_anterior": { const p = subYears(now, 1); return { start: startOfYear(p), end: endOfYear(p) }; }
    case "personalizado": return { start: customStart || startOfMonth(now), end: customEnd || endOfMonth(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function getPreviousPeriodDates(start: Date, end: Date): { start: Date; end: Date } {
  const diff = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: prevStart, end: prevEnd };
}

// ── DRE structure definition ──
const DRE_STRUCTURE = {
  receita: {
    label: "RECEITA BRUTA",
    categories: ["Consultoria", "Licenças/Revenda", "Mensalidades", "Projetos", "Outros"],
    subtotalLabel: "= Total Receita Bruta",
  },
  deducoes: {
    label: "(-) DEDUÇÕES SOBRE RECEITA",
    categories: ["Impostos sobre serviços"],
    subtotalLabel: "= Receita Líquida",
  },
  despesas_op: {
    label: "(-) DESPESAS OPERACIONAIS",
    categories: ["APIs/Ferramentas", "Contabilidade", "Infraestrutura", "Marketing", "Pessoal"],
    subtotalLabel: "= Total Despesas Operacionais",
  },
  despesas_fin: {
    label: "(-) DESPESAS FINANCEIRAS",
    categories: ["Taxas e tarifas bancárias"],
    subtotalLabel: "= Total Despesas Financeiras",
  },
};

export default function Relatorios() {
  const [period, setPeriod] = usePersistedState("relatorios-period", "este_mes");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [compare, setCompare] = usePersistedState("relatorios-compare", false);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [prevMovimentacoes, setPrevMovimentacoes] = useState<Movimentacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [fornecedores, setFornecedores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    receita: true, deducoes: true, despesas_op: true, despesas_fin: true,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItems, setDrawerItems] = useState<Movimentacao[]>([]);
  const [drawerLabel, setDrawerLabel] = useState("");

  // Fetch reference data
  useEffect(() => {
    async function load() {
      const [catRes, cliRes, forRes] = await Promise.all([
        supabase.from("categorias").select("id, nome, tipo"),
        supabase.from("clientes").select("id, nome"),
        supabase.from("fornecedores").select("id, nome"),
      ]);
      setCategorias(catRes.data || []);
      const cMap: Record<string, string> = {};
      (cliRes.data || []).forEach(c => { cMap[c.id] = c.nome; });
      setClientes(cMap);
      const fMap: Record<string, string> = {};
      (forRes.data || []).forEach(f => { fMap[f.id] = f.nome; });
      setFornecedores(fMap);
    }
    load();
  }, []);

  // Fetch movimentacoes for period
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { start, end } = getPeriodDates(period, customStart, customEnd);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      const { data } = await supabase
        .from("movimentacoes")
        .select("id, tipo, descricao, valor_realizado, data_pagamento, categoria_id, cliente_id, fornecedor_id")
        .eq("status", "pago")
        .gte("data_pagamento", startStr)
        .lte("data_pagamento", endStr);
      setMovimentacoes(data || []);

      if (compare) {
        const prev = getPreviousPeriodDates(start, end);
        const { data: prevData } = await supabase
          .from("movimentacoes")
          .select("id, tipo, descricao, valor_realizado, data_pagamento, categoria_id, cliente_id, fornecedor_id")
          .eq("status", "pago")
          .gte("data_pagamento", format(prev.start, "yyyy-MM-dd"))
          .lte("data_pagamento", format(prev.end, "yyyy-MM-dd"));
        setPrevMovimentacoes(prevData || []);
      } else {
        setPrevMovimentacoes([]);
      }
      setLoading(false);
    }
    load();
  }, [period, customStart, customEnd, compare]);

  // ── Build DRE lines ──
  const dreLines = useMemo(() => {
    const catMap = new Map(categorias.map(c => [c.id, c]));
    const lines: DRELine[] = [];

    function sumByCategories(
      names: string[],
      tipo: "receita" | "despesa",
      movs: Movimentacao[]
    ): { byName: Record<string, { value: number; items: Movimentacao[] }> } {
      const byName: Record<string, { value: number; items: Movimentacao[] }> = {};
      names.forEach(n => { byName[n] = { value: 0, items: [] }; });

      movs.forEach(m => {
        if (!m.categoria_id) return;
        const cat = catMap.get(m.categoria_id);
        if (!cat) return;
        const catTipo = cat.tipo?.toLowerCase();
        if (tipo === "receita" && catTipo !== "receita") return;
        if (tipo === "despesa" && catTipo !== "despesa") return;

        const val = Math.abs(m.valor_realizado || 0);
        // Try exact match first
        const matched = names.find(n => cat.nome.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(cat.nome.toLowerCase()));
        if (matched) {
          byName[matched].value += val;
          byName[matched].items.push(m);
        } else {
          // Put in "Outros" if exists, otherwise last bucket
          const fallback = names.includes("Outros") ? "Outros" : names[names.length - 1];
          byName[fallback].value += val;
          byName[fallback].items.push(m);
        }
      });
      return { byName };
    }

    // RECEITA BRUTA
    const recNames = DRE_STRUCTURE.receita.categories;
    const rec = sumByCategories(recNames, "receita", movimentacoes);
    const recPrev = compare ? sumByCategories(recNames, "receita", prevMovimentacoes) : null;
    let totalReceita = 0;
    let totalReceitaPrev = 0;

    lines.push({ label: DRE_STRUCTURE.receita.label, type: "group", value: 0 });
    recNames.forEach(name => {
      const v = rec.byName[name].value;
      totalReceita += v;
      const pv = recPrev?.byName[name]?.value || 0;
      totalReceitaPrev += pv;
      lines.push({ label: name === "Outros" ? "Outros (Receita)" : name, type: "detail", value: v, prevValue: pv, indent: 1, items: rec.byName[name].items });
    });
    lines.push({ label: DRE_STRUCTURE.receita.subtotalLabel, type: "subtotal", value: totalReceita, prevValue: totalReceitaPrev });

    // DEDUÇÕES
    const dedNames = DRE_STRUCTURE.deducoes.categories;
    const ded = sumByCategories(dedNames, "despesa", movimentacoes);
    const dedPrev = compare ? sumByCategories(dedNames, "despesa", prevMovimentacoes) : null;
    let totalDeducoes = 0;
    let totalDeducoesPrev = 0;

    lines.push({ label: DRE_STRUCTURE.deducoes.label, type: "group", value: 0 });
    dedNames.forEach(name => {
      const v = ded.byName[name].value;
      totalDeducoes += v;
      const pv = dedPrev?.byName[name]?.value || 0;
      totalDeducoesPrev += pv;
      lines.push({ label: name, type: "detail", value: v, prevValue: pv, indent: 1, items: ded.byName[name].items });
    });
    const receitaLiquida = totalReceita - totalDeducoes;
    const receitaLiquidaPrev = totalReceitaPrev - totalDeducoesPrev;
    lines.push({ label: DRE_STRUCTURE.deducoes.subtotalLabel, type: "subtotal", value: receitaLiquida, prevValue: receitaLiquidaPrev });

    // DESPESAS OPERACIONAIS
    const dopNames = DRE_STRUCTURE.despesas_op.categories;
    const dop = sumByCategories(dopNames, "despesa", movimentacoes);
    const dopPrev = compare ? sumByCategories(dopNames, "despesa", prevMovimentacoes) : null;
    let totalDespOp = 0;
    let totalDespOpPrev = 0;

    lines.push({ label: DRE_STRUCTURE.despesas_op.label, type: "group", value: 0 });
    dopNames.forEach(name => {
      const v = dop.byName[name].value;
      totalDespOp += v;
      const pv = dopPrev?.byName[name]?.value || 0;
      totalDespOpPrev += pv;
      lines.push({ label: name, type: "detail", value: v, prevValue: pv, indent: 1, items: dop.byName[name].items });
    });
    lines.push({ label: DRE_STRUCTURE.despesas_op.subtotalLabel, type: "subtotal", value: totalDespOp, prevValue: totalDespOpPrev });

    // DESPESAS FINANCEIRAS
    const dfNames = DRE_STRUCTURE.despesas_fin.categories;
    const df = sumByCategories(dfNames, "despesa", movimentacoes);
    const dfPrev = compare ? sumByCategories(dfNames, "despesa", prevMovimentacoes) : null;
    let totalDespFin = 0;
    let totalDespFinPrev = 0;

    lines.push({ label: DRE_STRUCTURE.despesas_fin.label, type: "group", value: 0 });
    dfNames.forEach(name => {
      const v = df.byName[name].value;
      totalDespFin += v;
      const pv = dfPrev?.byName[name]?.value || 0;
      totalDespFinPrev += pv;
      lines.push({ label: name, type: "detail", value: v, prevValue: pv, indent: 1, items: df.byName[name].items });
    });
    lines.push({ label: DRE_STRUCTURE.despesas_fin.subtotalLabel, type: "subtotal", value: totalDespFin, prevValue: totalDespFinPrev });

    // RESULTADO LÍQUIDO
    const resultado = receitaLiquida - totalDespOp - totalDespFin;
    const resultadoPrev = receitaLiquidaPrev - totalDespOpPrev - totalDespFinPrev;
    lines.push({ label: "RESULTADO LÍQUIDO", type: "result", value: resultado, prevValue: resultadoPrev });

    return lines;
  }, [movimentacoes, prevMovimentacoes, categorias, compare]);

  // ── Summary values ──
  const summary = useMemo(() => {
    const receitaLiquida = dreLines.find(l => l.label === "= Receita Líquida")?.value || 0;
    const totalDespOp = dreLines.find(l => l.label === "= Total Despesas Operacionais")?.value || 0;
    const totalDespFin = dreLines.find(l => l.label === "= Total Despesas Financeiras")?.value || 0;
    const totalDespesas = totalDespOp + totalDespFin;
    const resultado = dreLines.find(l => l.type === "result")?.value || 0;
    const margem = receitaLiquida !== 0 ? (resultado / receitaLiquida) * 100 : 0;
    return { receitaLiquida, totalDespesas, resultado, margem };
  }, [dreLines]);

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function getGroupKey(label: string): string | null {
    if (label === DRE_STRUCTURE.receita.label) return "receita";
    if (label === DRE_STRUCTURE.deducoes.label) return "deducoes";
    if (label === DRE_STRUCTURE.despesas_op.label) return "despesas_op";
    if (label === DRE_STRUCTURE.despesas_fin.label) return "despesas_fin";
    return null;
  }

  function openDetail(line: DRELine) {
    if (line.items && line.items.length > 0) {
      setDrawerLabel(line.label);
      setDrawerItems(line.items);
      setDrawerOpen(true);
    }
  }

  function variation(current: number, prev: number): number | null {
    if (prev === 0) return current === 0 ? 0 : null;
    return ((current - prev) / Math.abs(prev)) * 100;
  }

  // ── Render helpers ──
  function renderDRERows() {
    let currentGroup: string | null = null;
    const rows: JSX.Element[] = [];

    dreLines.forEach((line, idx) => {
      const groupKey = getGroupKey(line.label);
      if (groupKey) currentGroup = groupKey;

      // Hide detail lines if group collapsed
      if (line.type === "detail" && currentGroup && !expandedGroups[currentGroup]) return;

      if (line.type === "group") {
        const isExpanded = expandedGroups[groupKey!];
        rows.push(
          <TableRow
            key={idx}
            className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => toggleGroup(groupKey!)}
          >
            <TableCell className="font-bold text-sm py-3">
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {line.label}
              </div>
            </TableCell>
            <TableCell />
            {compare && <><TableCell /><TableCell /></>}
          </TableRow>
        );
      } else if (line.type === "detail") {
        rows.push(
          <TableRow
            key={idx}
            className="group cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => openDetail(line)}
          >
            <TableCell className="py-2.5">
              <div className="flex items-center justify-between pl-8">
                <span className="text-sm">{line.label}</span>
                <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </TableCell>
            <TableCell className="text-right font-mono text-sm py-2.5">{formatCurrency(line.value)}</TableCell>
            {compare && (
              <>
                <TableCell className="text-right font-mono text-sm text-muted-foreground py-2.5">
                  {formatCurrency(line.prevValue || 0)}
                </TableCell>
                <TableCell className="text-right text-sm py-2.5">
                  {renderVariation(line.value, line.prevValue || 0)}
                </TableCell>
              </>
            )}
          </TableRow>
        );
      } else if (line.type === "subtotal") {
        const isReceitaLiquida = line.label === "= Receita Líquida";
        rows.push(
          <TableRow key={idx} className={cn(isReceitaLiquida && "bg-accent/5")}>
            <TableCell className={cn("font-bold text-sm py-3 border-t", isReceitaLiquida && "text-accent")}>{line.label}</TableCell>
            <TableCell className={cn("text-right font-mono font-bold text-sm py-3 border-t", isReceitaLiquida && "text-accent")}>{formatCurrency(line.value)}</TableCell>
            {compare && (
              <>
                <TableCell className="text-right font-mono text-sm text-muted-foreground py-3 border-t">{formatCurrency(line.prevValue || 0)}</TableCell>
                <TableCell className="text-right text-sm py-3 border-t">{renderVariation(line.value, line.prevValue || 0)}</TableCell>
              </>
            )}
          </TableRow>
        );
      } else if (line.type === "result") {
        const positive = line.value >= 0;
        const margem = summary.receitaLiquida !== 0 ? (line.value / summary.receitaLiquida) * 100 : 0;
        rows.push(
          <TableRow key={idx} className={cn("border-t-2", positive ? "bg-success/10" : "bg-destructive/10")}>
            <TableCell className={cn("font-bold text-base py-4", positive ? "text-success" : "text-destructive")}>
              <div className="flex items-center gap-3">
                {line.label}
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", positive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                  Margem: {margem.toFixed(1)}%
                </span>
              </div>
            </TableCell>
            <TableCell className={cn("text-right font-mono font-bold text-base py-4", positive ? "text-success" : "text-destructive")}>
              {formatCurrency(line.value)}
            </TableCell>
            {compare && (
              <>
                <TableCell className="text-right font-mono text-sm text-muted-foreground py-4">{formatCurrency(line.prevValue || 0)}</TableCell>
                <TableCell className="text-right text-sm py-4">{renderVariation(line.value, line.prevValue || 0)}</TableCell>
              </>
            )}
          </TableRow>
        );
      }
    });
    return rows;
  }

  function renderVariation(current: number, prev: number) {
    const v = variation(current, prev);
    if (v === null) return <span className="text-muted-foreground">—</span>;
    const positive = v >= 0;
    return (
      <span className={cn("flex items-center justify-end gap-1 font-medium", positive ? "text-success" : "text-destructive")}>
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : ""}{v.toFixed(1)}%
      </span>
    );
  }

  const periodLabel: Record<string, string> = {
    este_mes: "Este Mês",
    mes_anterior: "Mês Anterior",
    este_trimestre: "Este Trimestre",
    trimestre_anterior: "Trimestre Anterior",
    este_ano: "Este Ano",
    ano_anterior: "Ano Anterior",
    personalizado: "Personalizado",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre"><BarChart3 className="h-4 w-4 mr-1.5" />DRE</TabsTrigger>
          <TabsTrigger value="fluxo" disabled>Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="inadimplencia"><AlertTriangle className="h-4 w-4 mr-1.5" />Análise de Inadimplência</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="space-y-6 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabel).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
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

            <div className="flex items-center gap-2">
              <Switch checked={compare} onCheckedChange={setCompare} id="compare-toggle" />
              <Label htmlFor="compare-toggle" className="text-sm cursor-pointer">Comparar com período anterior</Label>
            </div>

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

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Líquida</CardTitle>
                <DollarSign className="h-5 w-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(summary.receitaLiquida)}</div>
              </CardContent>
            </Card>
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
                <MinusCircle className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalDespesas)}</div>
              </CardContent>
            </Card>
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Líquido</CardTitle>
                {summary.resultado >= 0 ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", summary.resultado >= 0 ? "text-success" : "text-destructive")}>
                  {formatCurrency(summary.resultado)}
                </div>
              </CardContent>
            </Card>
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Margem Operacional</CardTitle>
                <Percent className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", summary.margem >= 0 ? "text-success" : "text-destructive")}>
                  {summary.margem.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DRE Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Descrição</TableHead>
                      <TableHead className="text-right">Valor Atual</TableHead>
                      {compare && (
                        <>
                          <TableHead className="text-right">Período Anterior</TableHead>
                          <TableHead className="text-right">Variação</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderDRERows()}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fluxo">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Fluxo de Caixa em desenvolvimento</h3>
              <p className="text-muted-foreground">Em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inadimplencia">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-2">Análise de Inadimplência em desenvolvimento</h3>
              <p className="text-muted-foreground">Em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Lançamentos: {drawerLabel}
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drawerItems.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum lançamento encontrado.</p>
            ) : (
              drawerItems.map(item => (
                <div key={item.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{item.descricao}</span>
                    <span className="font-mono font-bold text-sm">{formatCurrency(Math.abs(item.valor_realizado || 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {item.cliente_id ? clientes[item.cliente_id] || "—" : item.fornecedor_id ? fornecedores[item.fornecedor_id] || "—" : "—"}
                    </span>
                    <span>{item.data_pagamento ? formatDate(item.data_pagamento) : "—"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
