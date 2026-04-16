import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { PeriodFilter, PeriodPreset, getDateRange } from "@/components/PeriodFilter";
import { KPICard } from "@/components/KPICard";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Wallet, TrendingUp, TrendingDown, Landmark, Upload, CheckCircle2, Clock, AlertTriangle, ShieldCheck, X, FileText, Building2, Pencil, AlertCircle } from "lucide-react";
import { ImportExtratoWizard } from "@/components/ImportExtratoWizard";
import { toast } from "sonner";

export default function ExtratosBancarios() {
  const queryClient = useQueryClient();
  const [contaId, setContaId] = usePersistedState<string>("extrato_conta_id", "all");
  const [preset, setPreset] = usePersistedState<PeriodPreset>("extrato_preset", "month");
  const [customRange, setCustomRange] = usePersistedState<{ start: string | null; end: string | null }>("extrato_custom_range", { start: null, end: null });
  const [sort, setSort] = useState<SortConfig>({ key: null, direction: null });
  const [subTab, setSubTab] = usePersistedState<string>("extrato_subtab", "todas");
  const [importOpen, setImportOpen] = useState(false);
  const [detailMov, setDetailMov] = useState<any>(null);

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
        .select("id, descricao, tipo, valor_realizado, valor_previsto, data_pagamento, data_vencimento, data_competencia, status, conciliado, observacoes, categorias(nome), clientes(nome), fornecedores(nome), centros_custo(nome), conta_bancaria_id")
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

  // Fetch linked extrato_transacoes for detail drawer
  const { data: extratoTransacoes = [] } = useQuery({
    queryKey: ["extrato_transacoes", contaId, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      let q = supabase.from("extrato_transacoes").select("*");
      if (contaId !== "all") q = q.eq("conta_bancaria_id", contaId);
      const { data } = await q;
      return data || [];
    },
  });

  // Build extrato link map
  const extratoByMovId = useMemo(() => {
    const map = new Map<string, any>();
    extratoTransacoes.forEach((et: any) => {
      if (et.movimentacao_id) map.set(et.movimentacao_id, et);
    });
    return map;
  }, [extratoTransacoes]);

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

  const handleDesfazerConciliacao = async (movId: string) => {
    await supabase.from("movimentacoes").update({ conciliado: false }).eq("id", movId);
    const linked = extratoTransacoes.find((et: any) => et.movimentacao_id === movId);
    if (linked) {
      await supabase.from("extrato_transacoes").update({ conciliado: false, status_match: "sem_match", movimentacao_id: null }).eq("id", (linked as any).id);
    }
    queryClient.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });
    queryClient.invalidateQueries({ queryKey: ["extrato_transacoes"] });
    toast.success("Conciliação desfeita.");
    setDetailMov(null);
  };

  return (
    <div className="space-y-6 animate-fade-slide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Extratos Bancários</h1>
          <p className="text-muted-foreground text-sm">Conciliação e controle de extratos por conta bancária</p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Importar Extrato
        </Button>
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
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailMov(r)}>
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

      {/* Detail Drawer */}
      <Sheet open={!!detailMov} onOpenChange={(open) => !open && setDetailMov(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Movimentação</SheetTitle>
          </SheetHeader>
          {detailMov && (
            <div className="space-y-4 mt-4">
              <DetailRow label="Descrição" value={detailMov.descricao} />
              <DetailRow label="Tipo" value={detailMov.tipo === "receita" ? "Receita" : "Despesa"} />
              <DetailRow label="Valor" value={formatCurrency(detailMov.entrada || detailMov.saida)} />
              <DetailRow label="Data Pagamento" value={detailMov.data_pagamento ? formatDate(detailMov.data_pagamento) : "—"} />
              <DetailRow label="Categoria" value={detailMov.categoria_nome} />
              <DetailRow label="Cliente" value={(detailMov as any).clientes?.nome ?? "—"} />
              <DetailRow label="Fornecedor" value={(detailMov as any).fornecedores?.nome ?? "—"} />

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  {detailMov.conciliado ? (
                    <><CheckCircle2 className="h-4 w-4 text-success" /> Conciliado</>
                  ) : (
                    <><Clock className="h-4 w-4 text-warning" /> Pendente de Conciliação</>
                  )}
                </p>

                {detailMov.conciliado && extratoByMovId.has(detailMov.id) && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1 mb-3">
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Transação no Extrato</p>
                    <p>{extratoByMovId.get(detailMov.id)?.descricao_banco}</p>
                    <p className="text-muted-foreground">Data: {formatDate(extratoByMovId.get(detailMov.id)?.data_transacao)}</p>
                  </div>
                )}

                {detailMov.conciliado && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDesfazerConciliacao(detailMov.id)}>
                    <X className="h-3 w-3 mr-1" /> Desfazer Conciliação
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
