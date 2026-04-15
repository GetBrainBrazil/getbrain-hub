import { useEffect, useState } from "react";
import { Plus, ArrowUpFromLine, Search } from "lucide-react";
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
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function ContasPagar() {
  const { user } = useAuth();
  const [movs, setMovs] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [openNew, setOpenNew] = useState(false);
  const [openPag, setOpenPag] = useState(false);
  const [selectedMov, setSelectedMov] = useState<any>(null);
  const [form, setForm] = useState({
    descricao: "", fornecedor_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "",
    valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "",
  });
  const [pagForm, setPagForm] = useState({
    valor_realizado: "", data_pagamento: "", conta_bancaria_id: "", meio_pagamento_id: "",
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await supabase.rpc("update_status_atrasado" as any);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase.from("movimentacoes").select("*, fornecedores(nome), projetos(nome)").eq("tipo", "despesa").order("data_vencimento", { ascending: false }),
      supabase.from("fornecedores").select("*").eq("ativo", true),
      supabase.from("categorias").select("*").eq("ativo", true).in("tipo", ["despesa", "ambos"]),
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

  const filtered = movs.filter(m => {
    if (statusFilter !== "todos" && m.status !== statusFilter) return false;
    if (search && !m.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPendente = movs.filter(m => m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0);
  const pagoMes = movs.filter(m => m.status === "pago").reduce((s, m) => s + Number(m.valor_realizado), 0);
  const vencidos = movs.filter(m => m.status === "atrasado").reduce((s, m) => s + Number(m.valor_previsto), 0);

  async function handleSave() {
    const { error } = await supabase.from("movimentacoes").insert({
      tipo: "despesa",
      descricao: form.descricao,
      fornecedor_id: form.fornecedor_id || null,
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
    toast.success("Conta a pagar criada!");
    setOpenNew(false);
    setForm({ descricao: "", fornecedor_id: "", projeto_id: "", categoria_id: "", conta_bancaria_id: "", valor_previsto: "", data_competencia: "", data_vencimento: "", observacoes: "" });
    loadAll();
  }

  function openRegistrarPag(m: any) {
    setSelectedMov(m);
    setPagForm({
      valor_realizado: String(m.valor_previsto),
      data_pagamento: new Date().toISOString().split("T")[0],
      conta_bancaria_id: m.conta_bancaria_id || "",
      meio_pagamento_id: "",
    });
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

    toast.success("Pagamento registrado!");
    setOpenPag(false);
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
        <h1 className="text-2xl font-bold">Contas a Pagar</h1>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Nova Conta a Pagar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
              <div><Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={v => setForm({...form, fornecedor_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
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
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor Previsto</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead>Status</TableHead>
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
    </div>
  );
}
