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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ descricao: "", categoria_id: "", cliente_id: "", fornecedor_id: "", centro_custo_id: "", observacoes: "" });
  const [saving, setSaving] = useState(false);

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

  // Lookup data for inline editing
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias_lookup"],
    queryFn: async () => { const { data } = await supabase.from("categorias").select("id, nome").eq("ativo", true).order("nome"); return data || []; },
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_lookup"],
    queryFn: async () => { const { data } = await supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"); return data || []; },
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_lookup"],
    queryFn: async () => { const { data } = await supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"); return data || []; },
  });
  const { data: centrosCusto = [] } = useQuery({
    queryKey: ["centros_custo_lookup"],
    queryFn: async () => { const { data } = await supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome"); return data || []; },
  });

  // Fetch linked extrato_transacoes for detail drawer
  const { data: extratoTransacoes = [] } = useQuery({
    queryKey: ["extrato_transacoes", contaId, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      let q = supabase.from("extrato_transacoes").select("*, extrato_importacoes(nome_arquivo, created_at, conta_bancaria_id)");
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

  const [confirmDesfazer, setConfirmDesfazer] = useState(false);

  const startEdit = () => {
    if (!detailMov) return;
    setEditForm({
      descricao: detailMov.descricao || "",
      categoria_id: detailMov.categoria_id || "",
      cliente_id: detailMov.cliente_id || "",
      fornecedor_id: detailMov.fornecedor_id || "",
      centro_custo_id: detailMov.centro_custo_id || "",
      observacoes: detailMov.observacoes || "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!detailMov) return;
    setSaving(true);
    const { error } = await supabase.from("movimentacoes").update({
      descricao: editForm.descricao,
      categoria_id: editForm.categoria_id || null,
      cliente_id: editForm.cliente_id || null,
      fornecedor_id: editForm.fornecedor_id || null,
      centro_custo_id: editForm.centro_custo_id || null,
      observacoes: editForm.observacoes || null,
    }).eq("id", detailMov.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar alterações."); return; }
    toast.success("Lançamento atualizado com sucesso");
    setEditMode(false);
    queryClient.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });
  };

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
    setConfirmDesfazer(false);
  };

  const detailExtrato = detailMov ? extratoByMovId.get(detailMov.id) : null;
  const detailContaNome = detailExtrato
    ? contas.find((c) => c.id === detailExtrato.conta_bancaria_id)?.nome ?? "—"
    : "—";
  const isManualConciliation = detailMov?.conciliado && !detailExtrato;

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
      <Sheet open={!!detailMov} onOpenChange={(open) => { if (!open) { setDetailMov(null); setEditMode(false); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Movimentação</SheetTitle>
          </SheetHeader>
          {detailMov && (
            <div className="mt-4 space-y-6">
              {/* Section 1 — Lançamento no Sistema */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-bold">Lançamento no Sistema</h3>
                    <p className="text-xs text-muted-foreground">Controle interno — pode ser editado</p>
                  </div>
                </div>

                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                      <Input value={editForm.descricao} onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))} />
                    </div>
                    <DetailRow label="Tipo">
                      <Badge className={detailMov.tipo === "receita" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                        {detailMov.tipo === "receita" ? "Entrada" : "Saída"}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Valor" value={formatCurrency(detailMov.entrada || detailMov.saida)} />
                    <DetailRow label="Data de Vencimento" value={detailMov.data_vencimento ? formatDate(detailMov.data_vencimento) : "—"} />
                    <DetailRow label="Data de Pagamento" value={detailMov.data_pagamento ? formatDate(detailMov.data_pagamento) : "—"} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                      <Select value={editForm.categoria_id} onValueChange={(v) => setEditForm((f) => ({ ...f, categoria_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {categorias.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {detailMov.tipo === "receita" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                        <Select value={editForm.cliente_id} onValueChange={(v) => setEditForm((f) => ({ ...f, cliente_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {detailMov.tipo === "despesa" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fornecedor</p>
                        <Select value={editForm.fornecedor_id} onValueChange={(v) => setEditForm((f) => ({ ...f, fornecedor_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {fornecedores.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Centro de Custo</p>
                      <Select value={editForm.centro_custo_id} onValueChange={(v) => setEditForm((f) => ({ ...f, centro_custo_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {centrosCusto.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <Textarea value={editForm.observacoes} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <DetailRow label="Descrição" value={detailMov.descricao} />
                    <DetailRow label="Tipo">
                      <Badge className={detailMov.tipo === "receita" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                        {detailMov.tipo === "receita" ? "Entrada" : "Saída"}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Valor" value={formatCurrency(detailMov.entrada || detailMov.saida)} />
                    <DetailRow label="Data de Vencimento" value={detailMov.data_vencimento ? formatDate(detailMov.data_vencimento) : "—"} />
                    <DetailRow label="Data de Pagamento" value={detailMov.data_pagamento ? formatDate(detailMov.data_pagamento) : "—"} />
                    <DetailRow label="Categoria" value={detailMov.categoria_nome} />
                    <DetailRow label="Cliente" value={(detailMov as any).clientes?.nome ?? "—"} />
                    <DetailRow label="Fornecedor" value={(detailMov as any).fornecedores?.nome ?? "—"} />
                    {(detailMov as any).centros_custo?.nome && (
                      <DetailRow label="Centro de Custo" value={(detailMov as any).centros_custo.nome} />
                    )}
                    {(detailMov as any).observacoes && (
                      <DetailRow label="Observações" value={(detailMov as any).observacoes} />
                    )}
                  </div>
                )}

                {editMode ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5" /> Editar Lançamento
                  </Button>
                )}
              </div>

              <Separator />

              {/* Section 2 — Transação no Extrato */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-bold">Transação no Extrato</h3>
                    <p className="text-xs text-muted-foreground">Dado oficial do banco — não editável</p>
                  </div>
                </div>

                {detailExtrato ? (
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                    <DetailRow label="Data de Processamento" value={formatDate(detailExtrato.data_transacao)} />
                    <DetailRow label="Descrição Original" value={detailExtrato.descricao_banco} />
                    <DetailRow label="Valor" value={formatCurrency(Math.abs(detailExtrato.valor))} />
                    <DetailRow label="Identificador (FITID)" value={detailExtrato.id?.slice(0, 12) ?? "—"} />
                    <DetailRow label="Conta Bancária" value={detailContaNome} />
                    {detailExtrato.extrato_importacoes && (
                      <DetailRow label="Arquivo de Origem">
                        <span className="text-sm text-accent">
                          {(detailExtrato.extrato_importacoes as any).nome_arquivo}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (importado em {formatDate((detailExtrato.extrato_importacoes as any).created_at)})
                        </span>
                      </DetailRow>
                    )}
                  </div>
                ) : isManualConciliation ? (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                      <p className="text-sm text-warning font-medium">Conciliação manual — sem vínculo com extrato importado</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                      <p className="text-sm text-warning">Esta movimentação ainda não foi conciliada com um extrato bancário. Importe o extrato correspondente para confirmar a transação.</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => { setDetailMov(null); setImportOpen(true); }}>
                      <Upload className="h-3.5 w-3.5" /> Importar Extrato
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Footer buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setDetailMov(null)}>Fechar</Button>
                {detailMov.conciliado && (
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDesfazer(true)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Desfazer Conciliação
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm undo dialog */}
      <AlertDialog open={confirmDesfazer} onOpenChange={setConfirmDesfazer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer conciliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desfazer a conciliação desta movimentação? O lançamento continuará registrado no sistema, mas voltará ao status de "Pendente de Conciliação".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => detailMov && handleDesfazerConciliacao(detailMov.id)}>
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {children ? <div className="text-sm font-medium flex items-center flex-wrap">{children}</div> : <p className="text-sm font-medium">{value}</p>}
    </div>
  );
}
