import { useEffect, useState, useMemo } from "react";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Plus, ArrowUpFromLine, Search, Check, ChevronsUpDown } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { PeriodFilter, getDateRange, PeriodPreset } from "@/components/PeriodFilter";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { ComprovanteUploadField, uploadComprovanteToMovimentacao, type ComprovanteAIResult } from "@/components/ComprovanteUploadField";
import { Sparkles } from "lucide-react";

export default function ContasPagar() {
  const { user } = useAuth();
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const [movs, setMovs] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [search, setSearch] = usePersistedState("contas_pagar_search", "");
  const [statusFilter, setStatusFilter] = usePersistedState("contas_pagar_status", "todos");
  const [periodPreset, setPeriodPreset] = usePersistedState<PeriodPreset>("contas_pagar_period", "month");
  const [periodCustom, setPeriodCustom] = usePersistedState<{ start: string | null; end: string | null }>("contas_pagar_period_custom", { start: null, end: null });
  const [sortConfig, setSortConfig] = usePersistedState<SortConfig>("contas_pagar_sort", { key: null, direction: null });
  const [openNew, setOpenNew] = useState(false);
  const [openPag, setOpenPag] = useState(false);
  const [selectedMov, setSelectedMov] = useState<any>(null);

  // Fornecedor combobox state
  const [fornecedorOpen, setFornecedorOpen] = useState(false);
  const [fornecedorSearch, setFornecedorSearch] = useState("");

  const [form, setForm] = useState({
    descricao: "", fornecedor_id: "", conta_bancaria_id: "",
    valor_previsto: "", data_competencia: "", data_vencimento: "",
    recorrente: false, frequencia_recorrencia: "mensal", observacoes: "",
  });
  const [pagForm, setPagForm] = useState({
    valor_realizado: "", data_pagamento: "", conta_bancaria_id: "", meio_pagamento_id: "",
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [aiFields, setAiFields] = useState<Set<"data_pagamento" | "valor_realizado" | "conta_bancaria_id">>(new Set());

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await supabase.rpc("update_status_atrasado" as any);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase.from("movimentacoes").select("*, fornecedores(nome), projetos(nome)").eq("tipo", "despesa").order("data_vencimento", { ascending: false }),
      supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
      supabase.from("categorias").select("*").eq("ativo", true),
      supabase.from("contas_bancarias").select("*").eq("ativo", true),
      supabase.from("projetos").select("*"),
      supabase.from("meios_pagamento").select("*").eq("ativo", true),
    ]);
    setMovs(r1.data || []);
    setFornecedores(r2.data || []);
    setCategorias(r3.data || []);
    setContas(r4.data || []);
    setProjetos(r5.data || []);
    setMeios(r6.data || []);
  }

  const filteredFornecedores = useMemo(() => {
    if (!fornecedorSearch) return fornecedores;
    return fornecedores.filter(f => f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase()));
  }, [fornecedores, fornecedorSearch]);

  const showCreateFornecedor = fornecedorSearch.trim().length > 0 &&
    !fornecedores.some(f => f.nome.toLowerCase() === fornecedorSearch.trim().toLowerCase());

  async function handleCreateFornecedor() {
    const nome = fornecedorSearch.trim();
    if (!nome) return;
    const { data, error } = await supabase.from("fornecedores").insert({ nome }).select().single();
    if (error) { toast.error("Erro ao criar fornecedor"); return; }
    toast.success(`Fornecedor "${nome}" criado!`);
    setFornecedores(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm(prev => ({ ...prev, fornecedor_id: data.id }));
    setFornecedorSearch("");
    setFornecedorOpen(false);
  }

  const selectedFornecedorNome = fornecedores.find(f => f.id === form.fornecedor_id)?.nome;

  const periodRange = useMemo(() => getDateRange(periodPreset, periodCustom), [periodPreset, periodCustom]);

  const periodFiltered = useMemo(() => {
    if (!periodRange.startDate && !periodRange.endDate) return movs;
    return movs.filter(m => {
      const d = new Date(m.data_vencimento + "T12:00:00");
      if (periodRange.startDate && d < periodRange.startDate) return false;
      if (periodRange.endDate && d > periodRange.endDate) return false;
      return true;
    });
  }, [movs, periodRange]);

  const filtered = applySorting(periodFiltered.filter(m => {
    if (statusFilter !== "todos" && m.status !== statusFilter) return false;
    if (search && !m.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), sortConfig);

  const totalPendente = periodFiltered.filter(m => m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0);
  const pagoMes = periodFiltered.filter(m => m.status === "pago").reduce((s, m) => s + Number(m.valor_realizado), 0);
  const vencidos = periodFiltered.filter(m => m.status === "atrasado").reduce((s, m) => s + Number(m.valor_previsto), 0);

  async function handleSave() {
    if (!form.descricao || !form.valor_previsto || !form.data_competencia || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const baseRecord = {
      tipo: "despesa" as const,
      descricao: form.descricao,
      fornecedor_id: form.fornecedor_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      valor_previsto: parseFloat(form.valor_previsto),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
      recorrente: form.recorrente,
      frequencia_recorrencia: form.recorrente ? form.frequencia_recorrencia : null,
      created_by: user?.id,
    };

    // Insert the first record
    const { data: parentData, error } = await supabase.from("movimentacoes").insert(baseRecord).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }

    // If recorrente, create 11 more months (total 12)
    if (form.recorrente && parentData) {
      const recurrences: any[] = [];
      for (let i = 1; i <= 11; i++) {
        const competencia = addMonths(form.data_competencia, i);
        const vencimento = addMonths(form.data_vencimento, i);
        recurrences.push({
          ...baseRecord,
          data_competencia: competencia,
          data_vencimento: vencimento,
          movimentacao_pai_id: parentData.id,
        });
      }
      const { error: recError } = await supabase.from("movimentacoes").insert(recurrences);
      if (recError) { toast.error("Erro ao criar recorrências"); }
    }

    toast.success(form.recorrente ? "Conta recorrente criada (12 meses)!" : "Conta a pagar criada!");
    setOpenNew(false);
    setForm({ descricao: "", fornecedor_id: "", conta_bancaria_id: "", valor_previsto: "", data_competencia: "", data_vencimento: "", recorrente: false, frequencia_recorrencia: "mensal", observacoes: "" });
    setFornecedorSearch("");
    loadAll();
  }

  function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  }

  function openRegistrarPag(m: any) {
    setSelectedMov(m);
    setPagForm({
      valor_realizado: String(m.valor_previsto),
      data_pagamento: new Date().toISOString().split("T")[0],
      conta_bancaria_id: m.conta_bancaria_id || "",
      meio_pagamento_id: "",
    });
    setComprovanteFile(null);
    setAiFields(new Set());
    setOpenPag(true);
  }

  async function handlePagamento() {
    if (!selectedMov) return;
    const valorPago = parseFloat(pagForm.valor_realizado);
    const valorPrev = Number(selectedMov.valor_previsto);

    await supabase.from("movimentacoes").update({
      status: "pago",
      valor_realizado: valorPago,
      data_pagamento: pagForm.data_pagamento,
      conta_bancaria_id: pagForm.conta_bancaria_id || null,
      meio_pagamento_id: pagForm.meio_pagamento_id || null,
    }).eq("id", selectedMov.id);

    if (valorPago < valorPrev) {
      await supabase.from("movimentacoes").insert({
        tipo: "despesa",
        descricao: `${selectedMov.descricao} (Saldo)`,
        valor_previsto: valorPrev - valorPago,
        data_competencia: selectedMov.data_competencia,
        data_vencimento: selectedMov.data_vencimento,
        fornecedor_id: selectedMov.fornecedor_id,
        projeto_id: selectedMov.projeto_id,
        categoria_id: selectedMov.categoria_id,
        created_by: user?.id,
      });
    }

    if (comprovanteFile) {
      try { await uploadComprovanteToMovimentacao(comprovanteFile, selectedMov.id); }
      catch (e) { console.error(e); toast.error("Pagamento registrado, mas falhou ao salvar o comprovante."); }
    }

    toast.success("Pagamento registrado!");
    setOpenPag(false);
    loadAll();
  }

  async function handleDelete(id: string) {
    const mov = movs.find((m) => m.id === id);
    const ok = await confirmDialog({
      title: "Excluir Movimentação",
      description: (
        <>
          Tem certeza que deseja excluir a movimentação{" "}
          <span className="font-medium text-foreground">"{mov?.descricao ?? ""}"</span>? Esta ação
          não pode ser desfeita.
        </>
      ),
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    await supabase.from("movimentacoes").delete().eq("id", id);
    toast.success("Movimentação excluída");
    loadAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas a Pagar</h1>
        <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) setFornecedorSearch(""); }}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Nova Conta a Pagar</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[820px] max-h-[85vh] overflow-y-auto p-8 bg-white dark:bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">Nova Conta a Pagar</DialogTitle>
            </DialogHeader>

            {/* DADOS PRINCIPAIS */}
            <div className="mt-5 mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.15em] uppercase flex items-center gap-1.5">
                📋 DADOS PRINCIPAIS
              </p>
              <Separator className="mt-2" />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 items-end mt-1">
              <div>
                <Label className="text-[13px] font-semibold text-foreground mb-1 block">Fornecedor *</Label>
                <Popover open={fornecedorOpen} onOpenChange={setFornecedorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={fornecedorOpen} className="w-full justify-between font-normal h-10 text-sm bg-[#FDF8F4] dark:bg-muted border-border/50">
                      {selectedFornecedorNome || "Selecione..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Buscar..." value={fornecedorSearch} onValueChange={setFornecedorSearch} />
                      <CommandList>
                        <CommandEmpty>
                          {fornecedorSearch.trim() ? "Nenhum fornecedor encontrado" : "Digite para buscar"}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredFornecedores.map(f => (
                            <CommandItem key={f.id} value={f.id} onSelect={() => {
                              setForm(prev => ({ ...prev, fornecedor_id: f.id }));
                              setFornecedorOpen(false);
                              setFornecedorSearch("");
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                              {f.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {showCreateFornecedor && (
                          <CommandGroup>
                            <CommandItem onSelect={handleCreateFornecedor} className="text-primary font-medium">
                              <Plus className="mr-2 h-4 w-4" />
                              Criar "{fornecedorSearch.trim()}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 border-border/50" onClick={() => {
                setFornecedorOpen(true);
                setFornecedorSearch("");
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4">
              <Label className="text-[13px] font-semibold text-foreground mb-1 block">Descrição da Movimentação *</Label>
              <Input placeholder="Descrição da movimentação" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="h-10 text-sm bg-[#FDF8F4] dark:bg-muted border-border/50" />
            </div>

            {/* PRAZOS E VALORES */}
            <div className="mt-7 mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.15em] uppercase flex items-center gap-1.5">
                📅 PRAZOS E VALORES
              </p>
              <Separator className="mt-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-1">
              <div>
                <Label className="text-[13px] font-semibold text-foreground mb-1 block">Valor Previsto (R$) *</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.valor_previsto} onChange={e => setForm({...form, valor_previsto: e.target.value})} className="h-10 text-sm bg-[#FDF8F4] dark:bg-muted border-border/50" />
              </div>
              <div>
                <Label className="text-[13px] font-semibold text-foreground mb-1 block">Data de Competência *</Label>
                <Input type="date" value={form.data_competencia} onChange={e => setForm({...form, data_competencia: e.target.value})} className="h-10 text-sm bg-[#FDF8F4] dark:bg-muted border-border/50" />
              </div>
              <div>
                <Label className="text-[13px] font-semibold text-foreground mb-1 block">Data de Vencimento *</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="h-10 text-sm bg-[#FDF8F4] dark:bg-muted border-border/50" />
              </div>
            </div>

            <div className="mt-4 max-w-[240px]">
              <Label className="text-[13px] font-semibold text-foreground mb-1 block">Conta Bancária</Label>
              <Select value={form.conta_bancaria_id} onValueChange={v => setForm({...form, conta_bancaria_id: v})}>
                <SelectTrigger className="h-10 text-sm bg-[#FDF8F4] dark:bg-muted border-border/50"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* OBSERVAÇÕES INTERNAS */}
            <div className="mt-7 mb-2">
              <p className="text-[11px] font-semibold text-primary tracking-[0.15em] uppercase flex items-center gap-1.5">
                💬 OBSERVAÇÕES INTERNAS
              </p>
              <Separator className="mt-2" />
            </div>

            <Textarea
              placeholder="Observações adicionais..."
              value={form.observacoes}
              onChange={e => setForm({...form, observacoes: e.target.value})}
              className="min-h-[80px] text-sm bg-[#FDF8F4] dark:bg-muted border-border/50 resize-none"
            />

            {/* RECORRÊNCIA */}
            <div className="mt-7 mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.15em] uppercase flex items-center gap-1.5">
                🔄 RECORRÊNCIA
              </p>
              <Separator className="mt-2" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Conta recorrente</p>
                <p className="text-xs text-muted-foreground">Cria automaticamente para os próximos 12 meses</p>
              </div>
              <Switch checked={form.recorrente} onCheckedChange={v => setForm({...form, recorrente: v})} />
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-border">
              <Button variant="outline" onClick={() => setOpenNew(false)} className="px-6 h-10">Cancelar</Button>
              <Button onClick={handleSave} className="px-6 h-10 bg-[#7C2D12] hover:bg-[#63240e] text-white">Confirmar Cadastro</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total a Pagar" value={totalPendente} icon={ArrowUpFromLine} variant="danger" />
        <KPICard title="Pago no Mês" value={pagoMes} icon={ArrowUpFromLine} />
        <KPICard title="Vencidos" value={vencidos} icon={ArrowUpFromLine} variant="danger" />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <PeriodFilter preset={periodPreset} customRange={periodCustom} onPresetChange={setPeriodPreset} onCustomRangeChange={setPeriodCustom} />
            {["todos", "pendente", "pago", "atrasado", "cancelado"].map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize">
                {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Vencimento" sortKey="data_vencimento" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Descrição" sortKey="descricao" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Fornecedor" sortKey="fornecedores" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Valor Previsto" sortKey="valor_previsto" currentSort={sortConfig} onSort={setSortConfig} className="text-right" />
                  <SortableTableHead label="Valor Pago" sortKey="valor_realizado" currentSort={sortConfig} onSort={setSortConfig} className="text-right" />
                  <SortableTableHead label="Status" sortKey="status" currentSort={sortConfig} onSort={setSortConfig} />
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta a pagar encontrada</TableCell></TableRow>
                ) : filtered.map(m => (
                  <TableRow key={m.id} className={m.status === "atrasado" ? "bg-destructive/5" : ""}>
                    <TableCell className="text-sm">{formatDate(m.data_vencimento)}</TableCell>
                    <TableCell className="text-sm font-medium">{m.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(m.fornecedores as any)?.nome || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(Number(m.valor_previsto))}</TableCell>
                    <TableCell className="text-right text-sm">{Number(m.valor_realizado) > 0 ? formatCurrency(Number(m.valor_realizado)) : "—"}</TableCell>
                    <TableCell><StatusBadge status={m.status as StatusType} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {m.status !== "pago" && m.status !== "cancelado" && (
                          <Button size="sm" variant="outline" onClick={() => openRegistrarPag(m)}>Pagar</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(m.id)}>Excluir</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openPag} onOpenChange={setOpenPag}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Valor Pago (R$)</Label><Input type="number" step="0.01" value={pagForm.valor_realizado} onChange={e => setPagForm({...pagForm, valor_realizado: e.target.value})} /></div>
            <div><Label>Data do Pagamento</Label><Input type="date" value={pagForm.data_pagamento} onChange={e => setPagForm({...pagForm, data_pagamento: e.target.value})} /></div>
            <div><Label>Conta Bancária</Label>
              <Select value={pagForm.conta_bancaria_id} onValueChange={v => setPagForm({...pagForm, conta_bancaria_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Meio de Pagamento</Label>
              <Select value={pagForm.meio_pagamento_id} onValueChange={v => setPagForm({...pagForm, meio_pagamento_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{meios.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handlePagamento} className="w-full">Confirmar Pagamento</Button>
          </div>
        </DialogContent>
      </Dialog>
      {confirmDialogEl}
    </div>
  );
}
