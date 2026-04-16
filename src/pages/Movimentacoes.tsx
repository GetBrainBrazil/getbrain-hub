import { useEffect, useState, useMemo } from "react";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Search, Clock, TrendingUp, TrendingDown, AlertTriangle, Plus, X, CheckCircle, Pencil, Trash2, Building2, Check, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type TabType = "pagar" | "receber";

export default function Movimentacoes() {
  const { user } = useAuth();
  const [tab, setTab] = usePersistedState<TabType>("movimentacoes_tab", "pagar");
  const [movs, setMovs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [search, setSearch] = usePersistedState("movimentacoes_search", "");
  const [statusFilter, setStatusFilter] = usePersistedState("movimentacoes_status", "todas");
  const [periodPreset, setPeriodPreset] = usePersistedState<PeriodPreset>("movimentacoes_period", "month");
  const [periodCustom, setPeriodCustom] = usePersistedState<{ start: string | null; end: string | null }>("movimentacoes_period_custom", { start: null, end: null });
  const [sortConfig, setSortConfig] = usePersistedState<SortConfig>("movimentacoes_sort", { key: null, direction: null });
  const [openNew, setOpenNew] = useState(false);
  const [openBaixa, setOpenBaixa] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedMov, setSelectedMov] = useState<any>(null);
  const [detailMov, setDetailMov] = useState<any>(null);

  // Fornecedor combobox state
  const [fornecedorOpen, setFornecedorOpen] = useState(false);
  const [fornecedorSearch, setFornecedorSearch] = useState("");

  // Cliente combobox state
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");

  const [form, setForm] = useState({
    descricao: "", cliente_id: "", fornecedor_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "",
    valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "",
    recorrente: false, frequencia_recorrencia: "mensal", quantidade_recorrencia: "12",
  });
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "", data_pagamento: "", conta_bancaria_id: "", meio_pagamento_id: "",
  });

  useEffect(() => { loadAll(); }, [tab]);

  const tipo = tab === "pagar" ? "despesa" : "receita";
  const isPagar = tab === "pagar";

  async function loadAll() {
    setLoading(true);
    setMovs([]);
    try {
      const [, r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
        supabase.rpc("update_status_atrasado" as any),
        supabase.from("movimentacoes").select("*, clientes(nome), fornecedores(nome), categorias(nome), projetos(nome)").eq("tipo", tipo).order("data_vencimento", { ascending: false }),
        supabase.from("clientes").select("*").eq("ativo", true).order("nome"),
        supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
        supabase.from("categorias").select("*").eq("ativo", true),
        supabase.from("contas_bancarias").select("*").eq("ativo", true),
        supabase.from("projetos").select("*"),
        supabase.from("meios_pagamento").select("*").eq("ativo", true),
      ]);
      setMovs(r1.data || []);
      setClientes(r2.data || []);
      setFornecedores(r3.data || []);
      setCategorias(r4.data || []);
      setContas(r5.data || []);
      setProjetos(r6.data || []);
      setMeios(r7.data || []);
    } finally {
      setLoading(false);
    }
  }

  // Fornecedor combobox helpers
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

  // Cliente combobox helpers
  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes;
    return clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()));
  }, [clientes, clienteSearch]);

  const showCreateCliente = clienteSearch.trim().length > 0 &&
    !clientes.some(c => c.nome.toLowerCase() === clienteSearch.trim().toLowerCase());

  async function handleCreateCliente() {
    const nome = clienteSearch.trim();
    if (!nome) return;
    const { data, error } = await supabase.from("clientes").insert({ nome }).select().single();
    if (error) { toast.error("Erro ao criar cliente"); return; }
    toast.success(`Cliente "${nome}" criado!`);
    setClientes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm(prev => ({ ...prev, cliente_id: data.id }));
    setClienteSearch("");
    setClienteOpen(false);
  }

  const selectedClienteNome = clientes.find(c => c.id === form.cliente_id)?.nome;

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
    if (statusFilter === "pendentes" && m.status !== "pendente") return false;
    if (statusFilter === "recebidas" && m.status !== "pago") return false;
    if (statusFilter === "pagas" && m.status !== "pago") return false;
    if (statusFilter === "atrasadas" && m.status !== "atrasado") return false;
    if (search && !m.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), sortConfig);

  const totalPendente = periodFiltered.filter(m => m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0);
  const totalRecebidoPago = periodFiltered.filter(m => m.status === "pago").reduce((s, m) => s + Number(m.valor_realizado || m.valor_previsto), 0);
  const totalAtrasado = periodFiltered.filter(m => m.status === "atrasado").reduce((s, m) => s + Number(m.valor_previsto), 0);

  const entityLabel = isPagar ? "Fornecedor" : "Cliente";

  function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  }

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  function addYears(dateStr: string, years: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split("T")[0];
  }

  function addByFrequency(dateStr: string, amount: number, freq: string): string {
    if (freq === "diario") return addDays(dateStr, amount);
    if (freq === "anual") return addYears(dateStr, amount);
    return addMonths(dateStr, amount);
  }

  async function handleSave() {
    if (!form.descricao || !form.valor_previsto || !form.data_competencia || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const baseRecord = {
      tipo,
      descricao: form.descricao,
      cliente_id: !isPagar ? (form.cliente_id || null) : null,
      fornecedor_id: isPagar ? (form.fornecedor_id || null) : null,
      projeto_id: form.projeto_id || null,
      categoria_id: form.categoria_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      valor_previsto: parseFloat(form.valor_previsto),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
      recorrente: form.recorrente,
      frequencia_recorrencia: form.recorrente ? form.frequencia_recorrencia : null,
      created_by: user?.id,
    };

    const { data: parentData, error } = await supabase.from("movimentacoes").insert(baseRecord).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }

    // If recorrente, create additional occurrences
    const qtdRecorrencia = parseInt(form.quantidade_recorrencia) || 1;
    if (form.recorrente && parentData && qtdRecorrencia > 1) {
      const recurrences: any[] = [];
      for (let i = 1; i < qtdRecorrencia; i++) {
        const competencia = addByFrequency(form.data_competencia, i, form.frequencia_recorrencia);
        const vencimento = addByFrequency(form.data_vencimento, i, form.frequencia_recorrencia);
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

    const freqLabel = form.frequencia_recorrencia === "diario" ? "dias" : form.frequencia_recorrencia === "anual" ? "anos" : "meses";
    toast.success(
      form.recorrente
        ? `${isPagar ? "Conta a pagar" : "Conta a receber"} recorrente criada (${qtdRecorrencia} ${freqLabel})!`
        : `${isPagar ? "Conta a pagar" : "Conta a receber"} criada!`
    );
    setOpenNew(false);
    resetForm();
    loadAll();
  }

  function resetForm() {
    setForm({ descricao: "", cliente_id: "", fornecedor_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "", valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "", recorrente: false, frequencia_recorrencia: "mensal", quantidade_recorrencia: "12" });
    setFornecedorSearch("");
    setClienteSearch("");
  }

  function openDarBaixa(m: any) {
    setSelectedMov(m);
    setBaixaForm({
      valor_realizado: String(m.valor_previsto),
      data_pagamento: new Date().toISOString().split("T")[0],
      conta_bancaria_id: m.conta_bancaria_id || "",
      meio_pagamento_id: "",
    });
    setOpenBaixa(true);
  }

  async function handleBaixa() {
    if (!selectedMov) return;
    const valorRec = parseFloat(baixaForm.valor_realizado);
    const valorPrev = Number(selectedMov.valor_previsto);

    const { error } = await supabase.from("movimentacoes").update({
      status: "pago",
      valor_realizado: valorRec,
      data_pagamento: baixaForm.data_pagamento,
      conta_bancaria_id: baixaForm.conta_bancaria_id || null,
      meio_pagamento_id: baixaForm.meio_pagamento_id || null,
    }).eq("id", selectedMov.id);

    if (error) { toast.error("Erro ao registrar"); return; }

    if (valorRec < valorPrev) {
      await supabase.from("movimentacoes").insert({
        tipo,
        descricao: `${selectedMov.descricao} (Saldo)`,
        valor_previsto: valorPrev - valorRec,
        data_competencia: selectedMov.data_competencia,
        data_vencimento: selectedMov.data_vencimento,
        cliente_id: selectedMov.cliente_id,
        fornecedor_id: selectedMov.fornecedor_id,
        projeto_id: selectedMov.projeto_id,
        categoria_id: selectedMov.categoria_id,
        created_by: user?.id,
      });
    }

    toast.success(isPagar ? "Pagamento registrado!" : "Recebimento registrado!");
    setOpenBaixa(false);
    setDetailMov(null);
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta movimentação?")) return;
    await supabase.from("movimentacoes").delete().eq("id", id);
    toast.success("Movimentação excluída");
    setDetailMov(null);
    loadAll();
  }

  function openEditModal(m: any) {
    setForm({
      descricao: m.descricao || "",
      cliente_id: m.cliente_id || "",
      fornecedor_id: m.fornecedor_id || "",
      projeto_id: m.projeto_id || "",
      categoria_id: m.categoria_id || "",
      conta_bancaria_id: m.conta_bancaria_id || "",
      valor_previsto: String(m.valor_previsto || ""),
      data_competencia: m.data_competencia || "",
      data_vencimento: m.data_vencimento || "",
      observacoes: m.observacoes || "",
      recorrente: m.recorrente || false,
      frequencia_recorrencia: m.frequencia_recorrencia || "mensal",
      quantidade_recorrencia: "12",
    });
    setSelectedMov(m);
    setOpenEdit(true);
  }

  async function handleEditSave() {
    if (!selectedMov) return;
    if (!form.descricao || !form.valor_previsto || !form.data_competencia || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const { error } = await supabase.from("movimentacoes").update({
      descricao: form.descricao,
      cliente_id: !isPagar ? (form.cliente_id || null) : null,
      fornecedor_id: isPagar ? (form.fornecedor_id || null) : null,
      projeto_id: form.projeto_id || null,
      categoria_id: form.categoria_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      valor_previsto: parseFloat(form.valor_previsto),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
    }).eq("id", selectedMov.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Movimentação atualizada!");
    setOpenEdit(false);
    setDetailMov(null);
    resetForm();
    loadAll();
  }

  const statusButtons = isPagar
    ? [
        { key: "todas", label: "Todas" },
        { key: "pendentes", label: "Pendentes" },
        { key: "pagas", label: "Pagas" },
        { key: "atrasadas", label: "Atrasadas" },
      ]
    : [
        { key: "todas", label: "Todas" },
        { key: "pendentes", label: "Pendentes" },
        { key: "recebidas", label: "Recebidas" },
        { key: "atrasadas", label: "Atrasadas" },
      ];

  // Shared modal form content for both create and edit
  function renderModalForm(onSave: () => void, saveLabel: string, onCancel: () => void) {
    return (
      <div className="space-y-6">
        {/* DADOS PRINCIPAIS */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5 mb-2">
            <span className="text-sm">📋</span> DADOS PRINCIPAIS
          </p>
          <Separator />
        </div>

        {/* Entity field: Fornecedor or Cliente */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">
              {isPagar ? "Fornecedor *" : "Cliente *"}
            </Label>
            {isPagar ? (
              <Popover open={fornecedorOpen} onOpenChange={setFornecedorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={fornecedorOpen} className="w-full justify-between font-normal h-10 text-sm bg-background border-input">
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
            ) : (
              <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={clienteOpen} className="w-full justify-between font-normal h-10 text-sm bg-background border-input">
                    {selectedClienteNome || "Selecione..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Buscar..." value={clienteSearch} onValueChange={setClienteSearch} />
                    <CommandList>
                      <CommandEmpty>
                        {clienteSearch.trim() ? "Nenhum cliente encontrado" : "Digite para buscar"}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredClientes.map(c => (
                          <CommandItem key={c.id} value={c.id} onSelect={() => {
                            setForm(prev => ({ ...prev, cliente_id: c.id }));
                            setClienteOpen(false);
                            setClienteSearch("");
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.cliente_id === c.id ? "opacity-100" : "opacity-0")} />
                            {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {showCreateCliente && (
                        <CommandGroup>
                          <CommandItem onSelect={handleCreateCliente} className="text-primary font-medium">
                            <Plus className="mr-2 h-4 w-4" />
                            Criar "{clienteSearch.trim()}"
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 border-input" onClick={() => {
            if (isPagar) { setFornecedorOpen(true); setFornecedorSearch(""); }
            else { setClienteOpen(true); setClienteSearch(""); }
          }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Descrição da Movimentação *</Label>
          <Input placeholder="Descrição da movimentação" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="h-10 text-sm" />
        </div>

        {/* PRAZOS E VALORES */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5 mb-2">
            <span className="text-sm">💰</span> PRAZOS E VALORES
          </p>
          <Separator />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Valor Previsto (R$) *</Label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.valor_previsto} onChange={e => setForm({...form, valor_previsto: e.target.value})} className="h-10 text-sm" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Data de Competência *</Label>
            <Input type="date" value={form.data_competencia} onChange={e => setForm({...form, data_competencia: e.target.value})} className="h-10 text-sm" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Data de Vencimento *</Label>
            <Input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="h-10 text-sm" />
          </div>
        </div>

        <div className="max-w-[240px]">
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Conta Bancária</Label>
          <Select value={form.conta_bancaria_id} onValueChange={v => setForm({...form, conta_bancaria_id: v})}>
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* OBSERVAÇÕES */}
        <div>
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Observações Internas</Label>
          <Textarea
            placeholder="Observações adicionais..."
            value={form.observacoes}
            onChange={e => setForm({...form, observacoes: e.target.value})}
            className="min-h-[72px] text-sm resize-none"
          />
        </div>

        {/* RECORRÊNCIA */}
        <div className="rounded-lg border border-input p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Conta recorrente</p>
              <p className="text-xs text-muted-foreground">Cria automaticamente múltiplas ocorrências</p>
            </div>
            <Switch checked={form.recorrente} onCheckedChange={v => setForm({...form, recorrente: v})} />
          </div>
          {form.recorrente && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">A cada</span>
              <Input
                type="number"
                min="1"
                value={form.quantidade_recorrencia}
                onChange={e => setForm({...form, quantidade_recorrencia: e.target.value})}
                className="w-20 h-9 text-sm"
              />
              <Select value={form.frequencia_recorrencia} onValueChange={v => setForm({...form, frequencia_recorrencia: v})}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Dia(s)</SelectItem>
                  <SelectItem value="mensal">Mês(es)</SelectItem>
                  <SelectItem value="anual">Ano(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onCancel} className="px-5 h-10">Cancelar</Button>
          <Button onClick={onSave} className="px-5 h-10">{saveLabel}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimentações</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas contas e liquidações financeiras</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openNew && isPagar} onOpenChange={v => { setOpenNew(v); if (!v) resetForm(); if (v) setTab("pagar"); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 border-border text-foreground hover:bg-muted" onClick={() => setTab("pagar")}>
                <Plus className="h-4 w-4" /> Conta a Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto p-7">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span>📄</span> Nova Conta a Pagar
                </DialogTitle>
              </DialogHeader>
              {renderModalForm(handleSave, "Confirmar Cadastro", () => setOpenNew(false))}
            </DialogContent>
          </Dialog>
          <Dialog open={openNew && !isPagar} onOpenChange={v => { setOpenNew(v); if (!v) resetForm(); if (v) setTab("receber"); }}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-sidebar text-sidebar-foreground hover:bg-sidebar/90" onClick={() => setTab("receber")}>
                <Plus className="h-4 w-4" /> Conta a Receber
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto p-7">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span>📄</span> Nova Conta a Receber
                </DialogTitle>
              </DialogHeader>
              {renderModalForm(handleSave, "Confirmar Cadastro", () => setOpenNew(false))}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total Pendente" value={totalPendente} icon={Clock} />
        <KPICard title={isPagar ? "Total Pago" : "Total Recebido"} value={totalRecebidoPago} icon={TrendingUp} variant="success" />
        <KPICard title="Total em Atraso" value={totalAtrasado} icon={AlertTriangle} variant="danger" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => { setTab("pagar"); setStatusFilter("todas"); setDetailMov(null); }}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${tab === "pagar" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          A Pagar
        </button>
        <button
          onClick={() => { setTab("receber"); setStatusFilter("todas"); setDetailMov(null); }}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${tab === "receber" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          A Receber
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <PeriodFilter preset={periodPreset} customRange={periodCustom} onPresetChange={setPeriodPreset} onCustomRangeChange={setPeriodCustom} />
        <div className="flex gap-1.5 ml-auto">
          {statusButtons.map(s => (
            <Button
              key={s.key}
              size="sm"
              variant={statusFilter === s.key ? "default" : "outline"}
              onClick={() => setStatusFilter(s.key)}
              className="text-xs"
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={entityLabel} sortKey={isPagar ? "fornecedores" : "clientes"} currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Descrição" sortKey="descricao" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Categoria" sortKey="categorias" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Valor" sortKey="valor_previsto" currentSort={sortConfig} onSort={setSortConfig} className="text-right" />
                  <SortableTableHead label="Vencimento" sortKey="data_vencimento" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label={isPagar ? "Pagamento" : "Recebimento"} sortKey="data_pagamento" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Status" sortKey="status" currentSort={sortConfig} onSort={setSortConfig} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(m => (
                  <TableRow
                    key={m.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${m.status === "atrasado" ? "bg-destructive/5" : ""} ${detailMov?.id === m.id ? "bg-muted" : ""}`}
                    onClick={() => setDetailMov(m)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {isPagar ? (m.fornecedores as any)?.nome || "—" : (m.clientes as any)?.nome || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{m.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(m.categorias as any)?.nome || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(Number(m.valor_previsto))}</TableCell>
                    <TableCell className="text-sm">{formatDate(m.data_vencimento)}</TableCell>
                    <TableCell className="text-sm">{m.data_pagamento ? formatDate(m.data_pagamento) : "—"}</TableCell>
                    <TableCell><StatusBadge status={m.status as StatusType} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!detailMov} onOpenChange={open => { if (!open) setDetailMov(null); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[460px] p-0 overflow-y-auto">
          {detailMov && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-0">
                <div className="flex items-center gap-2">
                  {isPagar ? <TrendingDown className="h-5 w-5 text-destructive" /> : <TrendingUp className="h-5 w-5 text-success" />}
                  <StatusBadge status={detailMov.status as StatusType} />
                  <span className="text-sm text-muted-foreground">{isPagar ? "A Pagar" : "A Receber"}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailMov(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Value */}
              <div className="px-5 pt-2 pb-4">
                <p className={`text-2xl font-semibold ${detailMov.status === "atrasado" ? "text-destructive" : isPagar ? "text-destructive" : "text-success"}`}>
                  {formatCurrency(Number(detailMov.valor_previsto))}
                </p>
                {detailMov.valor_realizado != null && Number(detailMov.valor_realizado) > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor {isPagar ? "pago" : "recebido"}: <span className="font-medium text-foreground">{formatCurrency(Number(detailMov.valor_realizado))}</span>
                  </p>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div className="px-5 py-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm">{detailMov.descricao}</p>
                </div>

                {/* Entity */}
                {(isPagar ? (detailMov.fornecedores as any)?.nome : (detailMov.clientes as any)?.nome) && (
                  <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{entityLabel}</p>
                      <p className="text-sm font-medium">{isPagar ? (detailMov.fornecedores as any)?.nome : (detailMov.clientes as any)?.nome}</p>
                    </div>
                  </div>
                )}

                {/* Project */}
                {(detailMov.projetos as any)?.nome && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Projeto</p>
                    <p className="text-sm">{(detailMov.projetos as any).nome}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Dates */}
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Datas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="text-sm font-medium">{formatDate(detailMov.data_vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Competência</p>
                    <p className="text-sm font-medium">{formatDate(detailMov.data_competencia)}</p>
                  </div>
                  {detailMov.data_pagamento && (
                    <div>
                      <p className="text-xs text-muted-foreground">{isPagar ? "Pagamento" : "Recebimento"}</p>
                      <p className="text-sm font-medium">{formatDate(detailMov.data_pagamento)}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Category */}
              {(detailMov.categorias as any)?.nome && (
                <>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Classificação</p>
                    <span className="inline-block text-xs bg-muted px-3 py-1.5 rounded-full font-medium">
                      {(detailMov.categorias as any).nome}
                    </span>
                  </div>
                  <Separator />
                </>
              )}

              {/* Observations */}
              {detailMov.observacoes && (
                <>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground">{detailMov.observacoes}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Actions */}
              <div className="px-5 pt-2 pb-5 flex items-center gap-2">
                {detailMov.status !== "pago" && detailMov.status !== "cancelado" && (
                  <Button
                    className="gap-1.5 bg-success hover:bg-success/90 text-white"
                    onClick={() => { openDarBaixa(detailMov); }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isPagar ? "Registrar Pagamento" : "Registrar Recebimento"}
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5" onClick={() => openEditModal(detailMov)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="ml-auto"
                  onClick={() => handleDelete(detailMov.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Baixa Dialog */}
      <Dialog open={openBaixa} onOpenChange={setOpenBaixa}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isPagar ? "Registrar Pagamento" : "Dar Baixa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Valor {isPagar ? "Pago" : "Recebido"} (R$)</Label><Input type="number" step="0.01" value={baixaForm.valor_realizado} onChange={e => setBaixaForm({...baixaForm, valor_realizado: e.target.value})} /></div>
            <div><Label>Data do {isPagar ? "Pagamento" : "Recebimento"}</Label><Input type="date" value={baixaForm.data_pagamento} onChange={e => setBaixaForm({...baixaForm, data_pagamento: e.target.value})} /></div>
            <div><Label>Conta Bancária</Label>
              <Select value={baixaForm.conta_bancaria_id} onValueChange={v => setBaixaForm({...baixaForm, conta_bancaria_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Meio de {isPagar ? "Pagamento" : "Recebimento"}</Label>
              <Select value={baixaForm.meio_pagamento_id} onValueChange={v => setBaixaForm({...baixaForm, meio_pagamento_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{meios.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleBaixa} className="w-full">Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog — same layout as create */}
      <Dialog open={openEdit} onOpenChange={(v) => { setOpenEdit(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>📄</span> Editar Movimentação
            </DialogTitle>
          </DialogHeader>
          {renderModalForm(handleEditSave, "Salvar Alterações", () => setOpenEdit(false))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
