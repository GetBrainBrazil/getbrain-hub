import React, { useEffect, useState, useMemo } from "react";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Search, Clock, TrendingUp, TrendingDown, AlertTriangle, Plus, X, CheckCircle, Pencil, Trash2, Building2, Check, ChevronsUpDown, ArrowDown, ArrowUp, MoreHorizontal, Copy, CornerDownRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useNavigate } from "react-router-dom";
import { HelpTooltip } from "@/components/HelpTooltip";
import { Lightbulb } from "lucide-react";

type TabType = "pagar" | "receber";

const tipoByTab: Record<TabType, "despesa" | "receita"> = {
  pagar: "despesa",
  receber: "receita",
};

export default function Movimentacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = usePersistedState<TabType>("movimentacoes_tab", "pagar");
  const [movsByTab, setMovsByTab] = useState<Record<TabType, any[]>>({ pagar: [], receber: [] });
  const [loadingByTab, setLoadingByTab] = useState<Record<TabType, boolean>>({ pagar: true, receber: true });
  const [referencesLoading, setReferencesLoading] = useState(true);
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
  const [showSaldosParciais, setShowSaldosParciais] = usePersistedState("movimentacoes_saldos_parciais", false);
  const [tipBannerDismissed, setTipBannerDismissed] = usePersistedState("movimentacoes_tip_banner_dismissed", false);
  const [openNew, setOpenNew] = useState(false);
  const [openBaixa, setOpenBaixa] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedMov, setSelectedMov] = useState<any>(null);
  

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
    desconto: "", juros: "", multa: "", taxas: "",
    pis: "", cofins: "", csll: "", iss: "", ir: "", inss: "",
    observacoes_pagamento: "",
  });

  const tipo = tipoByTab[tab];
  const isPagar = tab === "pagar";
  const movs = movsByTab[tab];
  const loading = referencesLoading || loadingByTab[tab];

  useEffect(() => {
    void loadInitialData();
  }, []);

  function setTabsLoading(targetTabs: TabType[], value: boolean) {
    setLoadingByTab((prev) => {
      const next = { ...prev };
      targetTabs.forEach((targetTab) => {
        next[targetTab] = value;
      });
      return next;
    });
  }

  function getMovimentacoesQuery(targetTab: TabType) {
    return supabase
      .from("movimentacoes")
      .select("*, clientes(nome), fornecedores(nome), categorias(nome), projetos(nome)")
      .eq("tipo", tipoByTab[targetTab])
      .order("data_vencimento", { ascending: false });
  }

  async function loadReferenceData() {
    const [rClientes, rFornecedores, rCategorias, rContas, rProjetos, rMeios] = await Promise.all([
      supabase.from("clientes").select("*").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
      supabase.from("categorias").select("*").eq("ativo", true),
      supabase.from("contas_bancarias").select("*").eq("ativo", true),
      supabase.from("projetos").select("*"),
      supabase.from("meios_pagamento").select("*").eq("ativo", true),
    ]);

    setClientes(rClientes.data || []);
    setFornecedores(rFornecedores.data || []);
    setCategorias(rCategorias.data || []);
    setContas(rContas.data || []);
    setProjetos(rProjetos.data || []);
    setMeios(rMeios.data || []);
  }

  async function refreshTabs(targetTabs: TabType[]) {
    setTabsLoading(targetTabs, true);
    try {
      const results = await Promise.all([
        supabase.rpc("update_status_atrasado" as any),
        ...targetTabs.map((targetTab) => getMovimentacoesQuery(targetTab)),
      ]);

      setMovsByTab((prev) => {
        const next = { ...prev };
        targetTabs.forEach((targetTab, index) => {
          next[targetTab] = (results[index + 1] as any)?.data || [];
        });
        return next;
      });
    } finally {
      setTabsLoading(targetTabs, false);
    }
  }

  async function loadInitialData() {
    setReferencesLoading(true);
    try {
      await Promise.all([
        loadReferenceData(),
        refreshTabs(["pagar", "receber"]),
      ]);
    } finally {
      setReferencesLoading(false);
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

  const filtered = useMemo(() => (
    applySorting(periodFiltered.filter(m => {
      if (statusFilter === "pendentes" && m.status !== "pendente") return false;
      if (statusFilter === "recebidas" && m.status !== "pago") return false;
      if (statusFilter === "pagas" && m.status !== "pago") return false;
      if (statusFilter === "atrasadas" && m.status !== "atrasado") return false;
      if (search && !m.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), sortConfig)
  ), [periodFiltered, search, sortConfig, statusFilter]);

  const { totalPendente, totalRecebidoPago, totalAtrasado } = useMemo(() => ({
    totalPendente: periodFiltered.filter(m => m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0),
    totalRecebidoPago: periodFiltered.filter(m => m.status === "pago").reduce((s, m) => s + Number(m.valor_realizado || m.valor_previsto), 0),
    totalAtrasado: periodFiltered.filter(m => m.status === "atrasado").reduce((s, m) => s + Number(m.valor_previsto), 0),
  }), [periodFiltered]);

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
    void refreshTabs([tab]);
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
      desconto: "", juros: "", multa: "", taxas: "",
      pis: "", cofins: "", csll: "", iss: "", ir: "", inss: "",
      observacoes_pagamento: "",
    });
    setOpenBaixa(true);
  }

  const baixaTotals = useMemo(() => {
    const base = parseFloat(baixaForm.valor_realizado) || 0;
    const desconto = parseFloat(baixaForm.desconto) || 0;
    const juros = parseFloat(baixaForm.juros) || 0;
    const multa = parseFloat(baixaForm.multa) || 0;
    const taxas = parseFloat(baixaForm.taxas) || 0;
    const pis = parseFloat(baixaForm.pis) || 0;
    const cofins = parseFloat(baixaForm.cofins) || 0;
    const csll = parseFloat(baixaForm.csll) || 0;
    const iss = parseFloat(baixaForm.iss) || 0;
    const ir = parseFloat(baixaForm.ir) || 0;
    const inss = parseFloat(baixaForm.inss) || 0;
    const impostos = pis + cofins + csll + iss + ir + inss;
    const totalPago = base - desconto + juros + multa + taxas;
    const valorOriginal = Number(selectedMov?.valor_previsto) || 0;
    const diferenca = totalPago - valorOriginal;
    return { base, desconto, juros, multa, taxas, impostos, totalPago, valorOriginal, diferenca, ajustes: -desconto + juros + multa + taxas };
  }, [baixaForm, selectedMov]);

  async function handleBaixa() {
    if (!selectedMov) return;
    const totalPago = baixaTotals.totalPago;
    const valorPrev = Number(selectedMov.valor_previsto);

    const { error } = await supabase.from("movimentacoes").update({
      status: "pago",
      valor_realizado: totalPago,
      data_pagamento: baixaForm.data_pagamento,
      conta_bancaria_id: baixaForm.conta_bancaria_id || null,
      meio_pagamento_id: baixaForm.meio_pagamento_id || null,
      desconto_previsto: parseFloat(baixaForm.desconto) || null,
      juros: parseFloat(baixaForm.juros) || null,
      multa: parseFloat(baixaForm.multa) || null,
      taxas_adm: parseFloat(baixaForm.taxas) || null,
      pis: parseFloat(baixaForm.pis) || null,
      cofins: parseFloat(baixaForm.cofins) || null,
      csll: parseFloat(baixaForm.csll) || null,
      iss: parseFloat(baixaForm.iss) || null,
      ir: parseFloat(baixaForm.ir) || null,
      inss: parseFloat(baixaForm.inss) || null,
      observacoes: baixaForm.observacoes_pagamento
        ? `${selectedMov.observacoes ? selectedMov.observacoes + "\n\n" : ""}[Pagamento] ${baixaForm.observacoes_pagamento}`
        : selectedMov.observacoes,
    }).eq("id", selectedMov.id);

    if (error) { toast.error("Erro ao registrar"); return; }

    const baseValue = parseFloat(baixaForm.valor_realizado) || 0;
    if (baseValue < valorPrev) {
      await supabase.from("movimentacoes").insert({
        tipo,
        descricao: `${selectedMov.descricao} (Saldo)`,
        valor_previsto: valorPrev - baseValue,
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
    void refreshTabs([tab]);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta movimentação?")) return;
    await supabase.from("movimentacoes").delete().eq("id", id);
    toast.success("Movimentação excluída");
    void refreshTabs([tab]);
  }

  async function handleDuplicate(m: any) {
    const { id, created_at, updated_at, clientes, fornecedores, categorias, projetos, ...rest } = m;
    const { error } = await supabase.from("movimentacoes").insert({
      ...rest,
      descricao: `${m.descricao} (Cópia)`,
      status: "pendente",
      valor_realizado: null,
      data_pagamento: null,
      conciliado: false,
      created_by: user?.id,
    });
    if (error) { toast.error("Erro ao duplicar"); return; }
    toast.success("Movimentação duplicada!");
    void refreshTabs([tab]);
  }

  function openEditModal(m: any) {
    navigate(`/financeiro/movimentacoes/${m.id}`);
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimentações</h1>
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground text-sm">Gerencie suas contas e liquidações financeiras</p>
            <HelpTooltip content="Aqui você registra todas as entradas e saídas financeiras da empresa. Use 'Conta a Pagar' para despesas e 'Conta a Receber' para receitas." />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5 bg-background border-primary/40 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/60"
            onClick={() => navigate("/financeiro/movimentacoes/novo/pagar")}
          >
            <ArrowDown className="h-4 w-4 text-destructive" /> Conta a Pagar
          </Button>
          <Button
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate("/financeiro/movimentacoes/novo/receber")}
          >
            <ArrowUp className="h-4 w-4 text-primary-foreground" /> Conta a Receber
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <Card><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
          </>
        ) : (
          <>
            <KPICard title="Total Pendente" value={totalPendente} icon={Clock} helpText="Soma das movimentações que ainda não foram pagas nem recebidas e que não estão vencidas." />
            <KPICard title={isPagar ? "Total Pago" : "Total Recebido"} value={totalRecebidoPago} icon={TrendingUp} variant="success" helpText="Soma de todas as movimentações já liquidadas no período selecionado." />
            <KPICard title="Total em Atraso" value={totalAtrasado} icon={AlertTriangle} variant="danger" helpText="Soma das movimentações com data de vencimento ultrapassada e que ainda não foram pagas. Requer atenção imediata." />
          </>
        )}
      </div>

      {/* Tip banner (first visit / no movements) */}
      {!tipBannerDismissed && !loading && movs.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 animate-fade-in">
          <Lightbulb className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-foreground flex-1">
            <span className="font-semibold">Dica:</span> comece registrando suas despesas fixas (aluguel, ferramentas, salários) como Contas a Pagar, e os recebimentos de clientes como Contas a Receber.
          </p>
          <Button size="sm" variant="outline" onClick={() => setTipBannerDismissed(true)} className="shrink-0">
            Entendi
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => { setTab("pagar"); setStatusFilter("todas"); }}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${tab === "pagar" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          A Pagar
        </button>
        <button
          onClick={() => { setTab("receber"); setStatusFilter("todas"); }}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${tab === "receber" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          A Receber
        </button>
        <HelpTooltip content="A aba 'A Pagar' mostra suas despesas e obrigações. A aba 'A Receber' mostra valores que clientes devem para você." className="mb-2" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <PeriodFilter preset={periodPreset} customRange={periodCustom} onPresetChange={setPeriodPreset} onCustomRangeChange={setPeriodCustom} />
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <Switch checked={showSaldosParciais} onCheckedChange={setShowSaldosParciais} />
          Exibir Saldos Parciais
          <HelpTooltip content="Quando ativado, mostra o saldo parcial de movimentações que tiveram pagamento parcial registrado." />
        </label>
        <div className="flex items-center gap-1.5">
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
          <HelpTooltip content="Filtre as movimentações por status: Pendentes aguardam pagamento, Pagas já foram liquidadas, Atrasadas passaram do vencimento sem pagamento." className="ml-1" />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="w-10 pl-5">
                    <input type="checkbox" disabled className="h-4 w-4 rounded-full border-input accent-primary cursor-not-allowed opacity-60 appearance-none border bg-background" />
                  </TableHead>
                  <SortableTableHead label={entityLabel.toUpperCase()} sortKey={isPagar ? "fornecedores" : "clientes"} currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground" />
                  <SortableTableHead label="DESCRIÇÃO" sortKey="descricao" currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground" />
                  <SortableTableHead label="CATEGORIA" sortKey="categorias" currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground" />
                  <SortableTableHead label="VALOR" sortKey="valor_previsto" currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground text-right" />
                  <SortableTableHead label="VENCIMENTO" sortKey="data_vencimento" currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground" />
                  <SortableTableHead label={isPagar ? "PAGAMENTO" : "RECEBIMENTO"} sortKey="data_pagamento" currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground" />
                  <SortableTableHead label="STATUS" sortKey="status" currentSort={sortConfig} onSort={setSortConfig} className="text-[11px] font-semibold tracking-wider text-muted-foreground" extra={<HelpTooltip content="Pago: liquidado com sucesso. Pendente: aguardando vencimento. Atrasado: vencimento ultrapassado sem pagamento." />} />
                  <TableHead className="w-12 text-[11px] font-semibold tracking-wider text-muted-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j} className="py-4"><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                      Nenhuma movimentação encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(m => {
                  const valueColor = isPagar ? "text-destructive" : "text-success";
                  const valorPrevisto = Number(m.valor_previsto) || 0;
                  const valorPago = Number(m.valor_realizado) || 0;
                  const valorRestante = Math.max(valorPrevisto - valorPago, 0);
                  const isPartial = m.status === "pago" && valorPago > 0 && valorPago < valorPrevisto;
                  const showPartial = showSaldosParciais && isPartial;
                  return (
                  <React.Fragment key={m.id}>
                  <TableRow
                    className="cursor-pointer transition-colors hover:bg-muted/40 border-b border-border/60 last:border-0"
                    onClick={() => navigate(`/financeiro/movimentacoes/${m.id}`)}
                  >
                    <TableCell className="pl-5 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 appearance-none rounded-full border border-input bg-background cursor-pointer transition-colors checked:border-primary checked:bg-primary checked:bg-[radial-gradient(circle,hsl(var(--primary-foreground))_35%,transparent_40%)]"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {isPagar ? (m.fornecedores as any)?.nome || "—" : (m.clientes as any)?.nome || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground py-4">
                      <div className="flex items-center gap-2">
                        <span>{m.descricao}</span>
                        {showPartial && (
                          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary whitespace-nowrap">
                            Paga Parcialmente
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-4">{(m.categorias as any)?.nome || "—"}</TableCell>
                    <TableCell className={cn("text-right text-sm font-semibold font-mono py-4", valueColor)}>
                      <div className="flex flex-col items-end leading-tight">
                        <span>{formatCurrency(valorPrevisto)}</span>
                        {showPartial && (
                          <span className="text-[10px] font-normal text-muted-foreground mt-0.5">
                            Real: {formatCurrency(valorPago)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground py-4">{formatDate(m.data_vencimento)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-4">{m.data_pagamento ? formatDate(m.data_pagamento) : "—"}</TableCell>
                    <TableCell className="py-4"><StatusBadge status={m.status as StatusType} className="rounded-full px-3 py-0.5" /></TableCell>
                    <TableCell className="py-4 pr-4 text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {m.status !== "pago" && (
                            <DropdownMenuItem onClick={() => openDarBaixa(m)} className="cursor-pointer">
                              <CheckCircle className="mr-2 h-4 w-4 text-success" />
                              Liquidar Conta
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEditModal(m)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(m)} className="cursor-pointer">
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(m.id)} className="cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {showPartial && (
                    <TableRow
                      className="hover:bg-muted/30 border-b border-border/60 cursor-pointer"
                      onClick={() => navigate(`/financeiro/movimentacoes/${m.id}`)}
                    >
                      <TableCell className="pl-5 py-3"></TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 pl-4 text-muted-foreground">
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm font-medium text-foreground">
                            {isPagar ? (m.fornecedores as any)?.nome || "—" : (m.clientes as any)?.nome || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{m.descricao} — Saldo Restante</span>
                          <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning whitespace-nowrap">
                            Saldo Restante
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-3">{(m.categorias as any)?.nome || "—"}</TableCell>
                      <TableCell className={cn("text-right text-sm font-semibold font-mono py-3", valueColor)}>
                        {formatCurrency(valorRestante)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground py-3">{formatDate(m.data_vencimento)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground py-3">—</TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={(new Date(m.data_vencimento + "T12:00:00") < new Date() ? "atrasado" : "pendente") as StatusType} className="rounded-full px-3 py-0.5" />
                      </TableCell>
                      <TableCell className="py-3"></TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Baixa / Registrar Pagamento Dialog */}
      <Dialog open={openBaixa} onOpenChange={setOpenBaixa}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-success flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {isPagar ? "Registrar Pagamento" : "Registrar Recebimento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Linha 1: Data, Forma, Conta */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-[12px] font-medium text-foreground mb-1.5 block">
                  Data do {isPagar ? "Pagamento" : "Recebimento"}
                </Label>
                <Input type="date" value={baixaForm.data_pagamento} onChange={e => setBaixaForm({ ...baixaForm, data_pagamento: e.target.value })} className="h-10 text-sm" />
              </div>
              <div>
                <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Forma de Pagamento</Label>
                <Select value={baixaForm.meio_pagamento_id} onValueChange={v => setBaixaForm({ ...baixaForm, meio_pagamento_id: v })}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{meios.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Conta Bancária</Label>
                <Select value={baixaForm.conta_bancaria_id} onValueChange={v => setBaixaForm({ ...baixaForm, conta_bancaria_id: v })}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Bloco Valor + ajustes */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <Label className="text-[11px] font-medium text-foreground mb-1.5 block">Valor Base (R$) *</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={baixaForm.valor_realizado} onChange={e => setBaixaForm({ ...baixaForm, valor_realizado: e.target.value })} className="h-10 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Desconto (-)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={baixaForm.desconto} onChange={e => setBaixaForm({ ...baixaForm, desconto: e.target.value })} className="h-10 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Juros (+)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={baixaForm.juros} onChange={e => setBaixaForm({ ...baixaForm, juros: e.target.value })} className="h-10 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Multa (+)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={baixaForm.multa} onChange={e => setBaixaForm({ ...baixaForm, multa: e.target.value })} className="h-10 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Taxas (+)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={baixaForm.taxas} onChange={e => setBaixaForm({ ...baixaForm, taxas: e.target.value })} className="h-10 text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Valor Total {isPagar ? "Pago" : "Recebido"}
                </span>
                <span className="text-lg font-bold font-mono text-foreground">{formatCurrency(baixaTotals.totalPago)}</span>
              </div>
            </div>

            {/* Impostos retidos */}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-[11px] font-semibold text-destructive uppercase tracking-widest">Impostos Retidos</p>
              <div className="grid grid-cols-6 gap-3">
                {(["pis", "cofins", "csll", "iss", "ir", "inss"] as const).map(k => (
                  <div key={k}>
                    <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase">{k}</Label>
                    <Input type="number" step="0.01" placeholder="0,00" value={baixaForm[k]} onChange={e => setBaixaForm({ ...baixaForm, [k]: e.target.value })} className="h-10 text-sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 grid grid-cols-6 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Previsão Original</p>
                <p className="text-xs font-semibold text-foreground">{selectedMov?.data_vencimento ? formatDate(selectedMov.data_vencimento) : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Valor Original</p>
                <p className="text-xs font-semibold text-foreground font-mono">{formatCurrency(baixaTotals.valorOriginal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Descontos</p>
                <p className="text-xs font-semibold text-success font-mono">- {formatCurrency(baixaTotals.desconto)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Juros/Multas/Taxas</p>
                <p className="text-xs font-semibold text-warning font-mono">+ {formatCurrency(baixaTotals.juros + baixaTotals.multa + baixaTotals.taxas)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Impostos Retidos</p>
                <p className="text-xs font-semibold text-destructive font-mono">- {formatCurrency(baixaTotals.impostos)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Diferença</p>
                <p className={cn("text-xs font-semibold font-mono", baixaTotals.diferenca === 0 ? "text-muted-foreground" : baixaTotals.diferenca > 0 ? "text-success" : "text-destructive")}>
                  {baixaTotals.diferenca >= 0 ? "+ " : "- "}{formatCurrency(Math.abs(baixaTotals.diferenca))}
                </p>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Observações deste {isPagar ? "Pagamento" : "Recebimento"}</Label>
              <Textarea
                placeholder={`Observações deste ${isPagar ? "pagamento" : "recebimento"}...`}
                value={baixaForm.observacoes_pagamento}
                onChange={e => setBaixaForm({ ...baixaForm, observacoes_pagamento: e.target.value })}
                className="min-h-[72px] text-sm resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setOpenBaixa(false)} className="px-5 h-10">Cancelar</Button>
              <Button onClick={handleBaixa} className="px-5 h-10 bg-success text-success-foreground hover:bg-success/90">
                Confirmar {isPagar ? "Pagamento" : "Recebimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
