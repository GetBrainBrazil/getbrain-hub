import { useEffect, useState } from "react";
import { Search, Clock, TrendingUp, TrendingDown, AlertTriangle, Plus, X, CheckCircle, Pencil, Trash2, Building2 } from "lucide-react";
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
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type TabType = "pagar" | "receber";

export default function Movimentacoes() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("pagar");
  const [movs, setMovs] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [openNew, setOpenNew] = useState(false);
  const [openBaixa, setOpenBaixa] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedMov, setSelectedMov] = useState<any>(null);
  const [detailMov, setDetailMov] = useState<any>(null);
  const [form, setForm] = useState({
    descricao: "", cliente_id: "", fornecedor_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "",
    valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "",
  });
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "", data_pagamento: "", conta_bancaria_id: "", meio_pagamento_id: "",
  });

  useEffect(() => { loadAll(); }, [tab]);

  const tipo = tab === "pagar" ? "despesa" : "receita";
  const isPagar = tab === "pagar";

  async function loadAll() {
    await supabase.rpc("update_status_atrasado" as any);
    const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
      supabase.from("movimentacoes").select("*, clientes(nome), fornecedores(nome), categorias(nome), projetos(nome)").eq("tipo", tipo).order("data_vencimento", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true),
      supabase.from("fornecedores").select("*").eq("ativo", true),
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
  }

  const filtered = movs.filter(m => {
    if (statusFilter === "pendentes" && m.status !== "pendente") return false;
    if (statusFilter === "recebidas" && m.status !== "pago") return false;
    if (statusFilter === "pagas" && m.status !== "pago") return false;
    if (statusFilter === "atrasadas" && m.status !== "atrasado") return false;
    if (search && !m.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPendente = movs.filter(m => m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0);
  const totalRecebidoPago = movs.filter(m => m.status === "pago").reduce((s, m) => s + Number(m.valor_realizado || m.valor_previsto), 0);
  const totalAtrasado = movs.filter(m => m.status === "atrasado").reduce((s, m) => s + Number(m.valor_previsto), 0);

  const entityLabel = isPagar ? "Fornecedor" : "Cliente";

  async function handleSave() {
    const { error } = await supabase.from("movimentacoes").insert({
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
      created_by: user?.id,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success(isPagar ? "Conta a pagar criada!" : "Conta a receber criada!");
    setOpenNew(false);
    resetForm();
    loadAll();
  }

  function resetForm() {
    setForm({ descricao: "", cliente_id: "", fornecedor_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "", valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "" });
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
    });
    setSelectedMov(m);
    setOpenEdit(true);
  }

  async function handleEditSave() {
    if (!selectedMov) return;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimentações</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas contas e liquidações financeiras</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openNew && isPagar} onOpenChange={v => { setOpenNew(v); if (v) setTab("pagar"); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 border-border text-foreground hover:bg-muted" onClick={() => setTab("pagar")}>
                <Plus className="h-4 w-4" /> Conta a Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
              <NewForm isPagar form={form} setForm={setForm} fornecedores={fornecedores} clientes={clientes} projetos={projetos} categorias={categorias.filter(c => ["despesa","ambos"].includes(c.tipo))} contas={contas} onSave={handleSave} />
            </DialogContent>
          </Dialog>
          <Dialog open={openNew && !isPagar} onOpenChange={v => { setOpenNew(v); if (v) setTab("receber"); }}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-sidebar text-sidebar-foreground hover:bg-sidebar/90" onClick={() => setTab("receber")}>
                <Plus className="h-4 w-4" /> Conta a Receber
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
              <NewForm isPagar={false} form={form} setForm={setForm} fornecedores={fornecedores} clientes={clientes} projetos={projetos} categorias={categorias.filter(c => ["receita","ambos"].includes(c.tipo))} contas={contas} onSave={handleSave} />
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
                  <TableHead>{entityLabel}</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>{isPagar ? "Pagamento" : "Recebimento"}</TableHead>
                  <TableHead>Status</TableHead>
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

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={(v) => { setOpenEdit(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Movimentação</DialogTitle></DialogHeader>
          <NewForm
            isPagar={isPagar}
            form={form}
            setForm={setForm}
            fornecedores={fornecedores}
            clientes={clientes}
            projetos={projetos}
            categorias={categorias}
            contas={contas}
            onSave={handleEditSave}
            saveLabel="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Sub-component for the new entry form */
function NewForm({ isPagar, form, setForm, fornecedores, clientes, projetos, categorias, contas, onSave }: any) {
  return (
    <div className="space-y-4">
      <div><Label>Descrição *</Label><Input value={form.descricao} onChange={(e: any) => setForm({...form, descricao: e.target.value})} /></div>
      {isPagar ? (
        <div><Label>Fornecedor</Label>
          <Select value={form.fornecedor_id} onValueChange={(v: string) => setForm({...form, fornecedor_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{fornecedores.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ) : (
        <div><Label>Cliente</Label>
          <Select value={form.cliente_id} onValueChange={(v: string) => setForm({...form, cliente_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Projeto</Label>
        <Select value={form.projeto_id} onValueChange={(v: string) => setForm({...form, projeto_id: v})}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Categoria</Label>
        <Select value={form.categoria_id} onValueChange={(v: string) => setForm({...form, categoria_id: v})}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{categorias.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Valor Previsto (R$) *</Label><Input type="number" step="0.01" value={form.valor_previsto} onChange={(e: any) => setForm({...form, valor_previsto: e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Data Competência *</Label><Input type="date" value={form.data_competencia} onChange={(e: any) => setForm({...form, data_competencia: e.target.value})} /></div>
        <div><Label>Data Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={(e: any) => setForm({...form, data_vencimento: e.target.value})} /></div>
      </div>
      <div><Label>Conta Bancária</Label>
        <Select value={form.conta_bancaria_id} onValueChange={(v: string) => setForm({...form, conta_bancaria_id: v})}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{contas.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e: any) => setForm({...form, observacoes: e.target.value})} /></div>
      <Button onClick={onSave} className="w-full">Salvar</Button>
    </div>
  );
}
