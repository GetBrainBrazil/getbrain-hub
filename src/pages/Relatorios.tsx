import { useState, useEffect, useMemo } from "react";
import InadimplenciaTab from "@/components/InadimplenciaTab";
import FluxoCaixaTab from "@/components/FluxoCaixaTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  TrendingUp, TrendingDown, DollarSign, MinusCircle, BarChart3, Percent,
  ChevronDown, ChevronRight, Download, CalendarIcon, FileText, FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { buildCategoriasTree, type CategoriaRaw, type TipoCategoria } from "@/lib/categorias-hierarchy";
import { HelpTooltip } from "@/components/HelpTooltip";

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

interface DRELine {
  label: string;
  type: "group" | "subgroup" | "detail" | "subtotal-sub" | "subtotal" | "result";
  value: number;
  prevValue?: number;
  indent?: number;
  categoriaIds?: string[]; // for detail expansion: ids of categories that contribute
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

// ── DRE section configuration (mapped from category types) ──
interface DRESection {
  key: string;
  label: string;
  tipo: TipoCategoria;
  /** subtractive (impostos, despesas, retirada) vs additive (receitas) */
  sign: 1 | -1;
  subtotalLabel: string;
}

const DRE_SECTIONS: DRESection[] = [
  { key: "receita",     label: "RECEITA BRUTA",                tipo: "receitas", sign:  1, subtotalLabel: "= Total Receita Bruta" },
  { key: "deducoes",    label: "(-) DEDUÇÕES SOBRE RECEITA",   tipo: "impostos", sign: -1, subtotalLabel: "= Receita Líquida" },
  { key: "despesas_op", label: "(-) DESPESAS OPERACIONAIS",    tipo: "despesas", sign: -1, subtotalLabel: "= Total Despesas Operacionais" },
  { key: "retiradas",   label: "(-) RETIRADAS",                tipo: "retirada", sign: -1, subtotalLabel: "= Total Retiradas" },
];

export default function Relatorios() {
  const [period, setPeriod] = usePersistedState("relatorios-period", "este_mes");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [compare, setCompare] = usePersistedState("relatorios-compare", false);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [prevMovimentacoes, setPrevMovimentacoes] = useState<Movimentacao[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRaw[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [fornecedores, setFornecedores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DRE_SECTIONS.map(s => [s.key, true]))
  );
  const [expandedDetailKey, setExpandedDetailKey] = useState<string | null>(null);

  // Fetch reference data
  useEffect(() => {
    async function load() {
      const [catRes, cliRes, forRes] = await Promise.all([
        supabase.from("categorias").select("id, nome, tipo, categoria_pai_id, ativo"),
        supabase.from("clientes").select("id, nome"),
        supabase.from("fornecedores").select("id, nome"),
      ]);
      setCategorias((catRes.data as CategoriaRaw[]) || []);
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

  // ── Build DRE lines dynamically from categoria tree ──
  const { dreLines, sectionTotals } = useMemo(() => {
    const tree = buildCategoriasTree(categorias);
    const lines: DRELine[] = [];
    const sectionTotals: Record<string, { value: number; prev: number }> = {};

    // Pre-compute sums per categoria_id (current + previous period)
    function sumByCategoria(movs: Movimentacao[]) {
      const byCat = new Map<string, { value: number; items: Movimentacao[] }>();
      movs.forEach(m => {
        if (!m.categoria_id) return;
        const val = Math.abs(m.valor_realizado || 0);
        const e = byCat.get(m.categoria_id) || { value: 0, items: [] };
        e.value += val;
        e.items.push(m);
        byCat.set(m.categoria_id, e);
      });
      return byCat;
    }
    const curMap = sumByCategoria(movimentacoes);
    const prevMap = sumByCategoria(prevMovimentacoes);

    // Helper: should a leaf (sub w/o contas, or conta) be displayed?
    // - ativa: sempre
    // - inativa: só se tiver lançamentos no período (atual ou de comparação)
    function shouldShowLeaf(catId: string, ativo: boolean): boolean {
      if (ativo) return true;
      const hasCur = (curMap.get(catId)?.value || 0) > 0;
      const hasPrev = (prevMap.get(catId)?.value || 0) > 0;
      return hasCur || hasPrev;
    }

    let receitaTotal = 0, receitaTotalPrev = 0;
    let deducoesTotal = 0, deducoesTotalPrev = 0;
    let despesasOpTotal = 0, despesasOpTotalPrev = 0;
    let retiradasTotal = 0, retiradasTotalPrev = 0;

    DRE_SECTIONS.forEach(section => {
      const tipoNode = tree.find(t => t.config.key === section.tipo);
      const subs = tipoNode?.subcategorias || [];

      let sectionValue = 0;
      let sectionPrev = 0;
      const sectionLines: DRELine[] = [];

      subs.forEach(sub => {
        const subDirectCur = curMap.get(sub.id);
        const subDirectPrev = prevMap.get(sub.id);
        const contasVisiveis = sub.contas.filter(c => shouldShowLeaf(c.id, c.ativo));

        if (contasVisiveis.length > 0) {
          // Subcategoria com contas → render como subgroup + contas + subtotal-sub
          let subSum = 0;
          let subSumPrev = 0;
          const contaLines: DRELine[] = [];

          // Lançamentos diretamente na subcategoria (raro, mas possível) entram como linha "Outros [sub]"
          const subDirectVal = subDirectCur?.value || 0;
          const subDirectPrevVal = subDirectPrev?.value || 0;
          if (subDirectVal > 0 || subDirectPrevVal > 0) {
            subSum += subDirectVal;
            subSumPrev += subDirectPrevVal;
            contaLines.push({
              label: `Outros (${sub.nome})`,
              type: "detail",
              value: subDirectVal,
              prevValue: subDirectPrevVal,
              indent: 2,
              categoriaIds: [sub.id],
              items: subDirectCur?.items || [],
            });
          }

          contasVisiveis.forEach(conta => {
            const v = curMap.get(conta.id)?.value || 0;
            const pv = prevMap.get(conta.id)?.value || 0;
            const items = curMap.get(conta.id)?.items || [];
            subSum += v;
            subSumPrev += pv;
            contaLines.push({
              label: conta.nome,
              type: "detail",
              value: v,
              prevValue: pv,
              indent: 2,
              categoriaIds: [conta.id],
              items,
            });
          });

          // Só mostra a subcategoria se for ativa OU se tiver soma > 0
          if (sub.ativo || subSum > 0 || subSumPrev > 0) {
            sectionLines.push({
              label: sub.nome,
              type: "subgroup",
              value: 0,
              indent: 1,
            });
            sectionLines.push(...contaLines);
            sectionLines.push({
              label: `Subtotal ${sub.nome}`,
              type: "subtotal-sub",
              value: subSum,
              prevValue: subSumPrev,
              indent: 1,
            });
            sectionValue += subSum;
            sectionPrev += subSumPrev;
          }
        } else {
          // Subcategoria sem contas → linha de detalhe direta
          if (!shouldShowLeaf(sub.id, sub.ativo)) return;
          const v = subDirectCur?.value || 0;
          const pv = subDirectPrev?.value || 0;
          const items = subDirectCur?.items || [];
          sectionLines.push({
            label: sub.nome,
            type: "detail",
            value: v,
            prevValue: pv,
            indent: 1,
            categoriaIds: [sub.id],
            items,
          });
          sectionValue += v;
          sectionPrev += pv;
        }
      });

      // Sempre exibe o group header e o subtotal da seção (mesmo vazio)
      lines.push({ label: section.label, type: "group", value: 0 });
      if (sectionLines.length === 0) {
        lines.push({
          label: "Nenhuma categoria cadastrada",
          type: "detail",
          value: 0,
          prevValue: 0,
          indent: 1,
          items: [],
        });
      } else {
        lines.push(...sectionLines);
      }

      // Subtotal da seção (label varia: "= Receita Líquida" para deduções inclui receita - deduções)
      if (section.key === "receita") {
        receitaTotal = sectionValue;
        receitaTotalPrev = sectionPrev;
        lines.push({ label: section.subtotalLabel, type: "subtotal", value: receitaTotal, prevValue: receitaTotalPrev });
      } else if (section.key === "deducoes") {
        deducoesTotal = sectionValue;
        deducoesTotalPrev = sectionPrev;
        const receitaLiquida = receitaTotal - deducoesTotal;
        const receitaLiquidaPrev = receitaTotalPrev - deducoesTotalPrev;
        lines.push({ label: section.subtotalLabel, type: "subtotal", value: receitaLiquida, prevValue: receitaLiquidaPrev });
      } else if (section.key === "despesas_op") {
        despesasOpTotal = sectionValue;
        despesasOpTotalPrev = sectionPrev;
        lines.push({ label: section.subtotalLabel, type: "subtotal", value: despesasOpTotal, prevValue: despesasOpTotalPrev });
      } else if (section.key === "retiradas") {
        retiradasTotal = sectionValue;
        retiradasTotalPrev = sectionPrev;
        lines.push({ label: section.subtotalLabel, type: "subtotal", value: retiradasTotal, prevValue: retiradasTotalPrev });
      }

      sectionTotals[section.key] = { value: sectionValue, prev: sectionPrev };
    });

    // RESULTADO LÍQUIDO = (Receita - Deduções) - Despesas Op - Retiradas
    const receitaLiquida = receitaTotal - deducoesTotal;
    const receitaLiquidaPrev = receitaTotalPrev - deducoesTotalPrev;
    const resultado = receitaLiquida - despesasOpTotal - retiradasTotal;
    const resultadoPrev = receitaLiquidaPrev - despesasOpTotalPrev - retiradasTotalPrev;
    lines.push({ label: "RESULTADO LÍQUIDO", type: "result", value: resultado, prevValue: resultadoPrev });

    return { dreLines: lines, sectionTotals };
  }, [movimentacoes, prevMovimentacoes, categorias]);

  // ── Summary values ──
  const summary = useMemo(() => {
    const receitaLiquida = dreLines.find(l => l.label === "= Receita Líquida")?.value || 0;
    const totalDespOp = sectionTotals.despesas_op?.value || 0;
    const totalRetiradas = sectionTotals.retiradas?.value || 0;
    const totalDespesas = totalDespOp + totalRetiradas;
    const resultado = dreLines.find(l => l.type === "result")?.value || 0;
    const margem = receitaLiquida !== 0 ? (resultado / receitaLiquida) * 100 : 0;
    return { receitaLiquida, totalDespesas, resultado, margem };
  }, [dreLines, sectionTotals]);

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function getGroupKey(label: string): string | null {
    const s = DRE_SECTIONS.find(s => s.label === label);
    return s ? s.key : null;
  }

  function toggleDetail(key: string) {
    setExpandedDetailKey(prev => (prev === key ? null : key));
  }

  function exportDRECSV() {
    const header = compare ? ["Linha", "Valor Atual", "Valor Anterior"] : ["Linha", "Valor"];
    const rows = dreLines
      .filter(l => l.type !== "group" && l.type !== "subgroup")
      .map(l => compare ? [l.label, String(l.value), String(l.prevValue ?? 0)] : [l.label, String(l.value)]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dre_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      // Hide nested lines if group collapsed
      if ((line.type === "detail" || line.type === "subgroup" || line.type === "subtotal-sub") && currentGroup && !expandedGroups[currentGroup]) return;

      if (line.type === "group") {
        const isExpanded = expandedGroups[groupKey!];
        const groupTip: Record<string, string> = {
          receita: "Soma de todos os recebimentos no período, agrupados por categoria. Clique em cada linha para ver os lançamentos individuais.",
          deducoes: "Impostos e tributos que incidem sobre a receita, como ISS e DAS do Simples.",
          despesas_op: "Custos necessários para a operação da empresa: ferramentas, salários, infraestrutura, etc.",
          retiradas: "Retiradas dos sócios (pró-labore, distribuição de lucros) realizadas no período.",
        };
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
                {groupKey && groupTip[groupKey] && <HelpTooltip content={groupTip[groupKey]} />}
              </div>
            </TableCell>
            <TableCell />
            {compare && <><TableCell /><TableCell /></>}
          </TableRow>
        );
      } else if (line.type === "detail") {
        const detailKey = `${line.label}-${idx}`;
        const isOpen = expandedDetailKey === detailKey;
        const colSpan = compare ? 4 : 2;
        rows.push(
          <TableRow
            key={idx}
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleDetail(detailKey)}
          >
            <TableCell className="py-2.5">
              <div className="flex items-center gap-2 pl-6">
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}
                />
                <span className="text-sm">{line.label}</span>
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
        if (isOpen) {
          rows.push(
            <TableRow key={`${idx}-detail`} className="hover:bg-transparent border-b-0">
              <TableCell colSpan={colSpan} className="p-0 bg-muted/30">
                <div className="overflow-hidden animate-accordion-down">
                  <div className="px-12 py-3">
                    {(line.items && line.items.length > 0) ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/50">
                            <th className="text-left font-medium py-1.5 pr-4">Data</th>
                            <th className="text-left font-medium py-1.5 pr-4">Descrição</th>
                            <th className="text-left font-medium py-1.5 pr-4">Cliente / Fornecedor</th>
                            <th className="text-right font-medium py-1.5">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {line.items.map(item => (
                            <tr key={item.id} className="border-b border-border/30 last:border-0">
                              <td className="py-1.5 pr-4 text-muted-foreground">
                                {item.data_pagamento ? formatDate(item.data_pagamento) : "—"}
                              </td>
                              <td className="py-1.5 pr-4">{item.descricao}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground">
                                {item.cliente_id ? clientes[item.cliente_id] || "—" : item.fornecedor_id ? fornecedores[item.fornecedor_id] || "—" : "—"}
                              </td>
                              <td className="py-1.5 text-right font-mono">
                                {formatCurrency(Math.abs(item.valor_realizado || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-2">
                        Nenhum lançamento nesta categoria para o período selecionado
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        }
      } else if (line.type === "subgroup") {
        rows.push(
          <TableRow key={idx} className="hover:bg-transparent">
            <TableCell className="py-2 pl-10 text-sm font-semibold text-foreground/80">
              {line.label}
            </TableCell>
            <TableCell />
            {compare && <><TableCell /><TableCell /></>}
          </TableRow>
        );
      } else if (line.type === "subtotal-sub") {
        rows.push(
          <TableRow key={idx} className="hover:bg-transparent">
            <TableCell className="py-2 pl-10 text-xs text-muted-foreground italic">
              {line.label}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
              {formatCurrency(line.value)}
            </TableCell>
            {compare && (
              <>
                <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                  {formatCurrency(line.prevValue || 0)}
                </TableCell>
                <TableCell className="text-right text-xs py-2">
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
          <TabsTrigger value="fluxo"><TrendingUp className="h-4 w-4 mr-1.5" />Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="inadimplencia"><AlertTriangle className="h-4 w-4 mr-1.5" />Análise de Inadimplência</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="space-y-6 mt-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">DRE</h2>
            <HelpTooltip content="O Demonstrativo de Resultado do Exercício mostra a saúde financeira da empresa: quanto entrou, quanto saiu e qual o resultado final no período selecionado." />
          </div>
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
              <HelpTooltip content="Ativa uma coluna adicional mostrando os valores do período anterior e a variação percentual, permitindo identificar tendências." />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={exportDRECSV} disabled={dreLines.length === 0}>
                <Download className="h-4 w-4 mr-2" />Exportar CSV
              </Button>
              <HelpTooltip content="Baixe o DRE em PDF para compartilhar com sócios ou contador, ou em Excel para análises personalizadas." />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">Receita Líquida<HelpTooltip content="Receita Bruta menos as deduções (impostos sobre serviços). É o valor que efetivamente entrou na empresa." /></CardTitle>
                <DollarSign className="h-5 w-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(summary.receitaLiquida)}</div>
              </CardContent>
            </Card>
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">Total de Despesas<HelpTooltip content="Soma de todas as despesas operacionais e financeiras pagas no período." /></CardTitle>
                <MinusCircle className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalDespesas)}</div>
              </CardContent>
            </Card>
            <Card className="animate-fade-slide">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">Resultado Líquido<HelpTooltip content="Receita Líquida menos todas as despesas e retiradas. Positivo = lucro. Negativo = prejuízo." /></CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">Margem Operacional<HelpTooltip content="Percentual do resultado em relação à receita. Indica quanto de cada real faturado sobra como lucro." /></CardTitle>
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

        <TabsContent value="fluxo" className="space-y-6 mt-4">
          <FluxoCaixaTab />
        </TabsContent>

        <TabsContent value="inadimplencia" className="space-y-6 mt-4">
          <InadimplenciaTab />
        </TabsContent>
      </Tabs>

    </div>
  );
}
