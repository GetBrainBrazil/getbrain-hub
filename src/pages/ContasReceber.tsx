import { useEffect, useState, useMemo } from "react";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Plus, ArrowDownToLine, Search, Filter } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { PeriodFilter, getDateRange, PeriodPreset } from "@/components/PeriodFilter";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function ContasReceber() {
  const { user } = useAuth();
  const [movs, setMovs] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [search, setSearch] = usePersistedState("contas_receber_search", "");
  const [statusFilter, setStatusFilter] = usePersistedState("contas_receber_status", "todos");
  const [periodPreset, setPeriodPreset] = usePersistedState<PeriodPreset>("contas_receber_period", "month");
  const [periodCustom, setPeriodCustom] = usePersistedState<{ start: string | null; end: string | null }>("contas_receber_period_custom", { start: null, end: null });
  const [sortConfig, setSortConfig] = usePersistedState<SortConfig>("contas_receber_sort", { key: null, direction: null });
  const [openNew, setOpenNew] = useState(false);
  const [openBaixa, setOpenBaixa] = useState(false);
  const [selectedMov, setSelectedMov] = useState<any>(null);
  const [form, setForm] = useState({
    descricao: "", cliente_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "",
    valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "",
  });
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "", data_pagamento: "", conta_bancaria_id: "", meio_pagamento_id: "",
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await supabase.rpc("update_status_atrasado" as any);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase.from("movimentacoes").select("*, clientes(nome), projetos(nome)").eq("tipo", "receita").order("data_vencimento", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true),
      supabase.from("categorias").select("*").eq("ativo", true).in("tipo", ["receita", "ambos"]),
      supabase.from("contas_bancarias").select("*").eq("ativo", true),
      supabase.from("projetos").select("*"),
      supabase.from("meios_pagamento").select("*").eq("ativo", true),
    ]);
    setMovs(r1.data || []);
    setClientes(r2.data || []);
    setCategorias(r3.data || []);
    setContas(r4.data || []);
    setProjetos(r5.data || []);
    setMeios(r6.data || []);
  }

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
  const recebidoMes = periodFiltered.filter(m => m.status === "pago").reduce((s, m) => s + Number(m.valor_realizado), 0);
  const vencidos = periodFiltered.filter(m => m.status === "atrasado").reduce((s, m) => s + Number(m.valor_previsto), 0);

  async function handleSave() {
    const { error } = await supabase.from("movimentacoes").insert({
      tipo: "receita",
      descricao: form.descricao,
      cliente_id: form.cliente_id || null,
      projeto_id: form.projeto_id || null,
      categoria_id: form.categoria_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      valor_previsto: parseFloat(form.valor_previsto),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
      created_by: user?.id,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Conta a receber criada!");
    setOpenNew(false);
    setForm({ descricao: "", cliente_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "", valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "" });
    loadAll();
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

    if (error) { toast.error("Erro ao dar baixa"); return; }

    // Baixa parcial
    if (valorRec < valorPrev) {
      await supabase.from("movimentacoes").insert({
        tipo: "receita",
        descricao: `${selectedMov.descricao} (Saldo)`,
        valor_previsto: valorPrev - valorRec,
        data_competencia: selectedMov.data_competencia,
        data_vencimento: selectedMov.data_vencimento,
        cliente_id: selectedMov.cliente_id,
        projeto_id: selectedMov.projeto_id,
        categoria_id: selectedMov.categoria_id,
        created_by: user?.id,
      });
    }

    toast.success("Baixa registrada!");
    setOpenBaixa(false);
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta movimentação?")) return;
    await supabase.from("movimentacoes").delete().eq("id", id);
    toast.success("Movimentação excluída");
    loadAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas a Receber</h1>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Nova Conta a Receber</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
              <div><Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Projeto</Label>
                <Select value={form.projeto_id} onValueChange={v => setForm({...form, projeto_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{projetos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={v => setForm({...form, categoria_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valor Previsto (R$) *</Label><Input type="number" step="0.01" value={form.valor_previsto} onChange={e => setForm({...form, valor_previsto: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data Competência *</Label><Input type="date" value={form.data_competencia} onChange={e => setForm({...form, data_competencia: e.target.value})} /></div>
                <div><Label>Data Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} /></div>
              </div>
              <div><Label>Conta Bancária</Label>
                <Select value={form.conta_bancaria_id} onValueChange={v => setForm({...form, conta_bancaria_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total a Receber" value={totalPendente} icon={ArrowDownToLine} variant="success" />
        <KPICard title="Recebido no Mês" value={recebidoMes} icon={ArrowDownToLine} />
        <KPICard title="Vencidos" value={vencidos} icon={ArrowDownToLine} variant="danger" />
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
                  <SortableTableHead label="Cliente" sortKey="clientes" currentSort={sortConfig} onSort={setSortConfig} />
                  <SortableTableHead label="Valor Previsto" sortKey="valor_previsto" currentSort={sortConfig} onSort={setSortConfig} className="text-right" />
                  <SortableTableHead label="Valor Recebido" sortKey="valor_realizado" currentSort={sortConfig} onSort={setSortConfig} className="text-right" />
                  <SortableTableHead label="Status" sortKey="status" currentSort={sortConfig} onSort={setSortConfig} />
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta a receber encontrada</TableCell></TableRow>
                ) : filtered.map(m => (
                  <TableRow key={m.id} className={m.status === "atrasado" ? "bg-destructive/5" : ""}>
                    <TableCell className="text-sm">{formatDate(m.data_vencimento)}</TableCell>
                    <TableCell className="text-sm font-medium">{m.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(m.clientes as any)?.nome || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(Number(m.valor_previsto))}</TableCell>
                    <TableCell className="text-right text-sm">{Number(m.valor_realizado) > 0 ? formatCurrency(Number(m.valor_realizado)) : "—"}</TableCell>
                    <TableCell><StatusBadge status={m.status as StatusType} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {m.status !== "pago" && m.status !== "cancelado" && (
                          <Button size="sm" variant="outline" onClick={() => openDarBaixa(m)}>Dar Baixa</Button>
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

      <Dialog open={openBaixa} onOpenChange={setOpenBaixa}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dar Baixa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Valor Recebido (R$)</Label><Input type="number" step="0.01" value={baixaForm.valor_realizado} onChange={e => setBaixaForm({...baixaForm, valor_realizado: e.target.value})} /></div>
            <div><Label>Data do Recebimento</Label><Input type="date" value={baixaForm.data_pagamento} onChange={e => setBaixaForm({...baixaForm, data_pagamento: e.target.value})} /></div>
            <div><Label>Conta Bancária</Label>
              <Select value={baixaForm.conta_bancaria_id} onValueChange={v => setBaixaForm({...baixaForm, conta_bancaria_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Meio de Recebimento</Label>
              <Select value={baixaForm.meio_pagamento_id} onValueChange={v => setBaixaForm({...baixaForm, meio_pagamento_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{meios.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleBaixa} className="w-full">Confirmar Recebimento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
