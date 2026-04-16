import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Trash2, TrendingDown, TrendingUp, Save, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MovimentacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mov, setMov] = useState<any>(null);

  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [centros, setCentros] = useState<any[]>([]);

  const [form, setForm] = useState({
    descricao: "",
    cliente_id: "",
    fornecedor_id: "",
    projeto_id: "",
    categoria_id: "",
    centro_custo_id: "",
    conta_bancaria_id: "",
    meio_pagamento_id: "",
    valor_previsto: "",
    valor_realizado: "",
    data_competencia: "",
    data_vencimento: "",
    data_pagamento: "",
    observacoes: "",
  });

  const [openBaixa, setOpenBaixa] = useState(false);
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "",
    data_pagamento: "",
    conta_bancaria_id: "",
    meio_pagamento_id: "",
  });

  const [fornecedorOpen, setFornecedorOpen] = useState(false);
  const [clienteOpen, setClienteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [rMov, rClientes, rFornecedores, rCategorias, rContas, rProjetos, rMeios, rCentros] = await Promise.all([
        supabase.from("movimentacoes").select("*, clientes(nome), fornecedores(nome), categorias(nome), projetos(nome)").eq("id", id!).maybeSingle(),
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("categorias").select("id, nome, tipo").eq("ativo", true).order("nome"),
        supabase.from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("projetos").select("id, nome").order("nome"),
        supabase.from("meios_pagamento").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome"),
      ]);

      if (rMov.error || !rMov.data) {
        toast.error("Movimentação não encontrada");
        navigate("/financeiro/movimentacoes");
        return;
      }

      const m = rMov.data;
      setMov(m);
      setForm({
        descricao: m.descricao || "",
        cliente_id: m.cliente_id || "",
        fornecedor_id: m.fornecedor_id || "",
        projeto_id: m.projeto_id || "",
        categoria_id: m.categoria_id || "",
        centro_custo_id: m.centro_custo_id || "",
        conta_bancaria_id: m.conta_bancaria_id || "",
        meio_pagamento_id: m.meio_pagamento_id || "",
        valor_previsto: String(m.valor_previsto ?? ""),
        valor_realizado: m.valor_realizado != null ? String(m.valor_realizado) : "",
        data_competencia: m.data_competencia || "",
        data_vencimento: m.data_vencimento || "",
        data_pagamento: m.data_pagamento || "",
        observacoes: m.observacoes || "",
      });
      setClientes(rClientes.data || []);
      setFornecedores(rFornecedores.data || []);
      setCategorias(rCategorias.data || []);
      setContas(rContas.data || []);
      setProjetos(rProjetos.data || []);
      setMeios(rMeios.data || []);
      setCentros(rCentros.data || []);
    } finally {
      setLoading(false);
    }
  }

  const isPagar = mov?.tipo === "despesa";
  const entityLabel = isPagar ? "Fornecedor" : "Cliente";

  const categoriasFiltradas = useMemo(() => {
    if (!mov) return categorias;
    return categorias.filter((c) => !c.tipo || c.tipo === mov.tipo);
  }, [categorias, mov]);

  const selectedFornecedorNome = fornecedores.find((f) => f.id === form.fornecedor_id)?.nome;
  const selectedClienteNome = clientes.find((c) => c.id === form.cliente_id)?.nome;

  async function handleSave() {
    if (!mov) return;
    if (!form.descricao || !form.valor_previsto || !form.data_competencia || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("movimentacoes")
      .update({
        descricao: form.descricao,
        cliente_id: !isPagar ? form.cliente_id || null : null,
        fornecedor_id: isPagar ? form.fornecedor_id || null : null,
        projeto_id: form.projeto_id || null,
        categoria_id: form.categoria_id || null,
        centro_custo_id: form.centro_custo_id || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        meio_pagamento_id: form.meio_pagamento_id || null,
        valor_previsto: parseFloat(form.valor_previsto),
        valor_realizado: form.valor_realizado ? parseFloat(form.valor_realizado) : null,
        data_competencia: form.data_competencia,
        data_vencimento: form.data_vencimento,
        data_pagamento: form.data_pagamento || null,
        observacoes: form.observacoes || null,
      })
      .eq("id", mov.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Alterações salvas!");
    void load();
  }

  function openDarBaixa() {
    if (!mov) return;
    setBaixaForm({
      valor_realizado: form.valor_previsto || String(mov.valor_previsto),
      data_pagamento: new Date().toISOString().split("T")[0],
      conta_bancaria_id: form.conta_bancaria_id || mov.conta_bancaria_id || "",
      meio_pagamento_id: "",
    });
    setOpenBaixa(true);
  }

  async function handleBaixa() {
    if (!mov) return;
    const valorRec = parseFloat(baixaForm.valor_realizado);
    const valorPrev = Number(mov.valor_previsto);

    const { error } = await supabase
      .from("movimentacoes")
      .update({
        status: "pago",
        valor_realizado: valorRec,
        data_pagamento: baixaForm.data_pagamento,
        conta_bancaria_id: baixaForm.conta_bancaria_id || null,
        meio_pagamento_id: baixaForm.meio_pagamento_id || null,
      })
      .eq("id", mov.id);

    if (error) {
      toast.error("Erro ao registrar");
      return;
    }

    if (valorRec < valorPrev) {
      await supabase.from("movimentacoes").insert({
        tipo: mov.tipo,
        descricao: `${mov.descricao} (Saldo)`,
        valor_previsto: valorPrev - valorRec,
        data_competencia: mov.data_competencia,
        data_vencimento: mov.data_vencimento,
        cliente_id: mov.cliente_id,
        fornecedor_id: mov.fornecedor_id,
        projeto_id: mov.projeto_id,
        categoria_id: mov.categoria_id,
      });
    }

    toast.success(isPagar ? "Pagamento registrado!" : "Recebimento registrado!");
    setOpenBaixa(false);
    void load();
  }

  async function handleDelete() {
    if (!mov) return;
    if (!confirm("Excluir esta movimentação?")) return;
    const { error } = await supabase.from("movimentacoes").delete().eq("id", mov.id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Movimentação excluída");
    navigate("/financeiro/movimentacoes");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!mov) return null;

  const podeBaixa = mov.status !== "pago" && mov.status !== "cancelado";

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/financeiro/movimentacoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isPagar ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-success" />
              )}
              <span>{isPagar ? "Conta a Pagar" : "Conta a Receber"}</span>
              <span>·</span>
              <StatusBadge status={mov.status as StatusType} />
            </div>
            <h1 className="text-2xl font-bold mt-1">{form.descricao || "Movimentação"}</h1>
            <p
              className={cn(
                "text-2xl font-semibold mt-1 font-mono",
                mov.status === "atrasado" ? "text-destructive" : isPagar ? "text-destructive" : "text-success",
              )}
            >
              {formatCurrency(Number(form.valor_previsto || mov.valor_previsto))}
            </p>
          </div>
        </div>
      </div>

      {/* Informações principais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Valor previsto (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_previsto}
                onChange={(e) => setForm({ ...form, valor_previsto: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor realizado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_realizado}
                onChange={(e) => setForm({ ...form, valor_realizado: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Competência *</Label>
              <Input
                type="date"
                value={form.data_competencia}
                onChange={(e) => setForm({ ...form, data_competencia: e.target.value })}
              />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              />
            </div>
            <div>
              <Label>{isPagar ? "Pagamento" : "Recebimento"}</Label>
              <Input
                type="date"
                value={form.data_pagamento}
                onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vinculações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vinculações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{entityLabel}</Label>
              {isPagar ? (
                <Popover open={fornecedorOpen} onOpenChange={setFornecedorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedFornecedorNome || "Selecione..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar fornecedor..." />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                        <CommandGroup>
                          {fornecedores.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={f.nome}
                              onSelect={() => {
                                setForm({ ...form, fornecedor_id: f.id });
                                setFornecedorOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                              {f.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedClienteNome || "Selecione..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clientes.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.nome}
                              onSelect={() => {
                                setForm({ ...form, cliente_id: c.id });
                                setClienteOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.cliente_id === c.id ? "opacity-100" : "opacity-0")} />
                              {c.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div>
              <Label>Projeto</Label>
              <Select
                value={form.projeto_id || "none"}
                onValueChange={(v) => setForm({ ...form, projeto_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.categoria_id || "none"}
                onValueChange={(v) => setForm({ ...form, categoria_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {categoriasFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de Custo</Label>
              <Select
                value={form.centro_custo_id || "none"}
                onValueChange={(v) => setForm({ ...form, centro_custo_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {centros.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta Bancária</Label>
              <Select
                value={form.conta_bancaria_id || "none"}
                onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meio de {isPagar ? "Pagamento" : "Recebimento"}</Label>
              <Select
                value={form.meio_pagamento_id || "none"}
                onValueChange={(v) => setForm({ ...form, meio_pagamento_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {meios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Adicione observações sobre esta movimentação..."
          />
        </CardContent>
      </Card>

      {/* Footer fixo de ações */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width,16rem)] bg-background border-t border-border p-4 z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-2 justify-end flex-wrap">
          <Button variant="destructive" size="icon" onClick={handleDelete} title="Excluir">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/financeiro/movimentacoes")}>
            Cancelar
          </Button>
          {podeBaixa && (
            <Button className="gap-1.5 bg-success hover:bg-success/90 text-white" onClick={openDarBaixa}>
              <CheckCircle className="h-4 w-4" />
              {isPagar ? "Registrar Pagamento" : "Registrar Recebimento"}
            </Button>
          )}
          <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      {/* Baixa Dialog */}
      <Dialog open={openBaixa} onOpenChange={setOpenBaixa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPagar ? "Registrar Pagamento" : "Dar Baixa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor {isPagar ? "Pago" : "Recebido"} (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={baixaForm.valor_realizado}
                onChange={(e) => setBaixaForm({ ...baixaForm, valor_realizado: e.target.value })}
              />
            </div>
            <div>
              <Label>Data do {isPagar ? "Pagamento" : "Recebimento"}</Label>
              <Input
                type="date"
                value={baixaForm.data_pagamento}
                onChange={(e) => setBaixaForm({ ...baixaForm, data_pagamento: e.target.value })}
              />
            </div>
            <div>
              <Label>Conta Bancária</Label>
              <Select
                value={baixaForm.conta_bancaria_id}
                onValueChange={(v) => setBaixaForm({ ...baixaForm, conta_bancaria_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meio de {isPagar ? "Pagamento" : "Recebimento"}</Label>
              <Select
                value={baixaForm.meio_pagamento_id}
                onValueChange={(v) => setBaixaForm({ ...baixaForm, meio_pagamento_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {meios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleBaixa} className="w-full">
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
