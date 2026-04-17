import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useURLState } from "@/hooks/useURLState";
import { PeriodFilter, PeriodPreset, getDateRange } from "@/components/PeriodFilter";
import { KPICard } from "@/components/KPICard";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Wallet, TrendingUp, TrendingDown, Landmark, Upload, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { ImportExtratoWizard } from "@/components/ImportExtratoWizard";
import { HelpTooltip } from "@/components/HelpTooltip";

export default function ExtratosBancarios() {
  const navigate = useNavigate();
  const [contaId, setContaId] = useURLState<string>("conta", "all");
  const [preset, setPreset] = useURLState<string>("periodo", "month");
  const [customRange, setCustomRange] = usePersistedState<{ start: string | null; end: string | null }>("extrato_custom_range", { start: null, end: null });
  const [sort, setSort] = useState<SortConfig>({ key: null, direction: null });
  const [subTab, setSubTab] = useURLState<string>("subtab", "todas");
  const [importOpen, setImportOpen] = useState(false);

  const { data: contas = [] } = useQuery({
    queryKey: ["contas_bancarias_extrato"],
    queryFn: async () => {
      const { data } = await supabase.from("contas_bancarias").select("id, nome, saldo_inicial, banco").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const contaSelecionada = contas.find((c) => c.id === contaId);
  const saldoInicial = contaSelecionada?.saldo_inicial ?? 0;
  const dateRange = useMemo(() => getDateRange(preset, customRange), [preset, customRange]);

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["extrato_movimentacoes", contaId, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      let q = supabase
        .from("movimentacoes")
        .select("id, descricao, tipo, valor_realizado, valor_previsto, data_pagamento, data_vencimento, data_competencia, status, conciliado, observacoes, categoria_id, cliente_id, fornecedor_id, centro_custo_id, categorias(nome), clientes(nome), fornecedores(nome), centros_custo(nome), conta_bancaria_id")
        .order("data_pagamento", { ascending: true, nullsFirst: false });

      if (contaId !== "all") q = q.eq("conta_bancaria_id", contaId);
      if (dateRange.startDate) q = q.gte("data_pagamento", dateRange.startDate.toISOString().split("T")[0]);
      if (dateRange.endDate) q = q.lte("data_pagamento", dateRange.endDate.toISOString().split("T")[0]);
      q = q.eq("status", "pago");

      const { data } = await q;
      return data || [];
    },
    enabled: contas.length > 0,
  });

  // Filter by sub-tab
  const filteredMovs = useMemo(() => {
    if (subTab === "pendentes") return movimentacoes.filter((m: any) => !m.conciliado);
    if (subTab === "conciliadas") return movimentacoes.filter((m: any) => m.conciliado);
    return movimentacoes;
  }, [movimentacoes, subTab]);

  const rows = useMemo(() => {
    const sorted = sort.key ? applySorting(filteredMovs as any[], sort) : filteredMovs;
    let saldo = contaId !== "all" ? saldoInicial : 0;
    return sorted.map((m: any) => {
      const valor = m.valor_realizado ?? m.valor_previsto ?? 0;
      const entrada = m.tipo === "receita" ? valor : 0;
      const saida = m.tipo === "despesa" ? valor : 0;
      saldo += entrada - saida;
      return { ...m, entrada, saida, saldo, categoria_nome: m.categorias?.nome ?? "—" };
    });
  }, [filteredMovs, sort, saldoInicial, contaId]);

  const totalEntradas = rows.reduce((s, r) => s + r.entrada, 0);
  const totalSaidas = rows.reduce((s, r) => s + r.saida, 0);
  const saldoFinal = rows.length > 0 ? rows[rows.length - 1].saldo : (contaId !== "all" ? saldoInicial : 0);

  // Conciliation stats
  const totalMovs = movimentacoes.length;
  const conciliadoCount = movimentacoes.filter((m: any) => m.conciliado).length;
  const conciliadoPct = totalMovs > 0 ? Math.round((conciliadoCount / totalMovs) * 100) : 0;
  const conciliacaoVariant = conciliadoPct === 100 ? "success" : conciliadoPct >= 70 ? "warning" : "danger";

  // Saldo conciliado
  const saldoConciliado = useMemo(() => {
    let s = contaId !== "all" ? saldoInicial : 0;
    movimentacoes.filter((m: any) => m.conciliado).forEach((m: any) => {
      const v = m.valor_realizado ?? m.valor_previsto ?? 0;
      s += m.tipo === "receita" ? v : -v;
    });
    return s;
  }, [movimentacoes, saldoInicial, contaId]);

  const saldoDiferenca = saldoFinal - saldoConciliado;

  // Divergences: movs not conciliadas that probably should be
  const divergencias = movimentacoes.filter((m: any) => !m.conciliado);

  return (
    <div className="space-y-6 animate-fade-slide">
      <div>
        <h1 className="text-2xl font-bold font-heading">Extratos Bancários</h1>
        <p className="text-muted-foreground text-sm">Conciliação e controle de extratos por conta bancária</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={contaId} onValueChange={setContaId}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome} {c.banco ? `(${c.banco})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PeriodFilter preset={preset} customRange={customRange} onPresetChange={setPreset} onCustomRangeChange={setCustomRange} />
        <div className="flex-1" />
        <Button onClick={() => setImportOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Importar Extrato
        </Button>
      </div>

      {/* Divergence alert */}
      {divergencias.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-warning">{divergencias.length} movimentação(ões) pendente(s) de conciliação neste período.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Saldo Inicial" value={contaId !== "all" ? saldoInicial : 0} icon={Landmark} />
        <KPICard title="Total Entradas" value={totalEntradas} icon={TrendingUp} variant="success" />
        <KPICard title="Total Saídas" value={totalSaidas} icon={TrendingDown} variant="danger" />
        <KPICard title="Saldo Final" value={saldoFinal} icon={Wallet} variant="dynamic" />
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className={`h-4 w-4 ${conciliacaoVariant === "success" ? "text-success" : conciliacaoVariant === "warning" ? "text-warning" : "text-destructive"}`} />
            Status da Conciliação
          </div>
          <p className={`text-2xl font-bold font-mono ${conciliacaoVariant === "success" ? "text-success" : conciliacaoVariant === "warning" ? "text-warning" : "text-destructive"}`}>
            {conciliadoPct}%
          </p>
          <p className="text-xs text-muted-foreground">{conciliadoCount} de {totalMovs} conciliadas</p>
        </div>
      </div>

      {/* Saldo line */}
      <div className="flex flex-wrap gap-4 text-sm px-1">
        <span className="text-muted-foreground">Saldo do sistema: <strong className="text-foreground">{formatCurrency(saldoFinal)}</strong></span>
        <span className="text-muted-foreground">Saldo conciliado: <strong className="text-foreground">{formatCurrency(saldoConciliado)}</strong></span>
        <span className={`font-medium ${Math.abs(saldoDiferenca) < 0.01 ? "text-success" : "text-destructive"}`}>
          {Math.abs(saldoDiferenca) < 0.01 ? "✓ Saldos batem perfeitamente" : `Diferença: ${formatCurrency(saldoDiferenca)}`}
        </span>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas as Movimentações</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes de Conciliação</TabsTrigger>
          <TabsTrigger value="conciliadas">Conciliadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label="Data" sortKey="data_pagamento" currentSort={sort} onSort={setSort} />
              <SortableTableHead label="Descrição" sortKey="descricao" currentSort={sort} onSort={setSort} />
              <SortableTableHead label="Categoria" sortKey="categoria_nome" currentSort={sort} onSort={setSort} />
              <SortableTableHead label="Entrada" sortKey="entrada" currentSort={sort} onSort={setSort} className="text-right" />
              <SortableTableHead label="Saída" sortKey="saida" currentSort={sort} onSort={setSort} className="text-right" />
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-center w-[80px]">Conciliado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação encontrada para o período selecionado
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/financeiro/extratos/movimentacao/${r.id}`)}>
                  <TableCell className="font-mono text-sm">{formatDate(r.data_pagamento)}</TableCell>
                  <TableCell>{r.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{r.categoria_nome}</TableCell>
                  <TableCell className="text-right font-mono text-success">{r.entrada > 0 ? formatCurrency(r.entrada) : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{r.saida > 0 ? formatCurrency(r.saida) : "—"}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${r.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(r.saldo)}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.conciliado ? (
                      <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Import Wizard */}
      <ImportExtratoWizard open={importOpen} onOpenChange={setImportOpen} contas={contas} />

    </div>
  );
}
