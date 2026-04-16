import { useEffect, useMemo, useRef, useState } from "react";
import { getHierarchicalOptions } from "@/lib/categorias-hierarchy";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Trash2,
  Save,
  Check,
  ChevronsUpDown,
  FileText,
  Tags,
  CalendarDays,
  DollarSign,
  Paperclip,
  Upload,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ANEXOS_BUCKET = "anexos-movimentacoes";

function formatBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <Separator className="mt-2" />
    </div>
  );
}

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
  const [meios, setMeios] = useState<any[]>([]);
  const [centros, setCentros] = useState<any[]>([]);
  const [anexos, setAnexos] = useState<any[]>([]);

  const [form, setForm] = useState({
    descricao: "",
    cliente_id: "",
    fornecedor_id: "",
    categoria_id: "",
    centro_custo_id: "",
    conta_bancaria_id: "",
    meio_pagamento_id: "",
    valor_previsto: "",
    desconto_previsto: "",
    juros: "",
    multa: "",
    taxas_adm: "",
    pis: "",
    cofins: "",
    csll: "",
    iss: "",
    ir: "",
    inss: "",
    data_competencia: "",
    data_vencimento: "",
    observacoes: "",
  });

  const [openBaixa, setOpenBaixa] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "",
    data_pagamento: "",
    conta_bancaria_id: "",
    meio_pagamento_id: "",
  });

  const [fornecedorOpen, setFornecedorOpen] = useState(false);
  const [clienteOpen, setClienteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [rMov, rClientes, rFornecedores, rCategorias, rContas, rMeios, rCentros, rAnexos] = await Promise.all([
        supabase.from("movimentacoes").select("*").eq("id", id!).maybeSingle(),
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("categorias").select("id, nome, tipo").eq("ativo", true).order("nome"),
        supabase.from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("meios_pagamento").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("anexos").select("*").eq("movimentacao_id", id!).order("created_at"),
      ]);

      if (rMov.error || !rMov.data) {
        toast.error("Movimentação não encontrada");
        navigate("/financeiro/movimentacoes");
        return;
      }

      const m: any = rMov.data;
      setMov(m);
      setForm({
        descricao: m.descricao || "",
        cliente_id: m.cliente_id || "",
        fornecedor_id: m.fornecedor_id || "",
        categoria_id: m.categoria_id || "",
        centro_custo_id: m.centro_custo_id || "",
        conta_bancaria_id: m.conta_bancaria_id || "",
        meio_pagamento_id: m.meio_pagamento_id || "",
        valor_previsto: String(m.valor_previsto ?? ""),
        desconto_previsto: m.desconto_previsto != null ? String(m.desconto_previsto) : "",
        juros: m.juros != null ? String(m.juros) : "",
        multa: m.multa != null ? String(m.multa) : "",
        taxas_adm: m.taxas_adm != null ? String(m.taxas_adm) : "",
        pis: m.pis != null ? String(m.pis) : "",
        cofins: m.cofins != null ? String(m.cofins) : "",
        csll: m.csll != null ? String(m.csll) : "",
        iss: m.iss != null ? String(m.iss) : "",
        ir: m.ir != null ? String(m.ir) : "",
        inss: m.inss != null ? String(m.inss) : "",
        data_competencia: m.data_competencia || "",
        data_vencimento: m.data_vencimento || "",
        observacoes: m.observacoes || "",
      });
      setClientes(rClientes.data || []);
      setFornecedores(rFornecedores.data || []);
      setCategorias(rCategorias.data || []);
      setContas(rContas.data || []);
      setMeios(rMeios.data || []);
      setCentros(rCentros.data || []);
      setAnexos(rAnexos.data || []);
    } finally {
      setLoading(false);
    }
  }

  const isPagar = mov?.tipo === "despesa";

  const categoriasFiltradas = useMemo(() => {
    if (!mov) return [] as any[];
    // Mapear tipo da movimentação (receita/despesa) para o novo enum (receitas/despesas)
    const tipoFiltro = mov.tipo === "receita" ? "receitas" : "despesas";
    const restrict = [tipoFiltro] as any;
    // Importação local do helper hierárquico
    return getHierarchicalOptions(categorias as any, restrict);
  }, [categorias, mov]);

  const selectedFornecedorNome = fornecedores.find((f) => f.id === form.fornecedor_id)?.nome;
  const selectedClienteNome = clientes.find((c) => c.id === form.cliente_id)?.nome;

  const totalPrevisto = useMemo(() => {
    const n = (v: string) => parseFloat(v || "0") || 0;
    return n(form.valor_previsto) - n(form.desconto_previsto) + n(form.juros) + n(form.multa) + n(form.taxas_adm);
  }, [form.valor_previsto, form.desconto_previsto, form.juros, form.multa, form.taxas_adm]);

  function buildPayload() {
    const num = (v: string) => (v === "" || v == null ? 0 : parseFloat(v) || 0);
    return {
      descricao: form.descricao,
      cliente_id: !isPagar ? form.cliente_id || null : null,
      fornecedor_id: isPagar ? form.fornecedor_id || null : null,
      categoria_id: form.categoria_id || null,
      centro_custo_id: form.centro_custo_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      meio_pagamento_id: form.meio_pagamento_id || null,
      valor_previsto: num(form.valor_previsto),
      desconto_previsto: num(form.desconto_previsto),
      juros: num(form.juros),
      multa: num(form.multa),
      taxas_adm: num(form.taxas_adm),
      pis: num(form.pis),
      cofins: num(form.cofins),
      csll: num(form.csll),
      iss: num(form.iss),
      ir: num(form.ir),
      inss: num(form.inss),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
    };
  }

  async function handleSave(closeAfter = false) {
    if (!mov) return;
    if (!form.descricao || !form.valor_previsto || !form.data_competencia || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("movimentacoes").update(buildPayload()).eq("id", mov.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Alterações salvas!");
    if (closeAfter) navigate("/financeiro/movimentacoes");
    else void load();
  }

  function openDarBaixa() {
    if (!mov) return;
    setBaixaForm({
      valor_realizado: String(totalPrevisto || form.valor_previsto || mov.valor_previsto),
      data_pagamento: new Date().toISOString().split("T")[0],
      conta_bancaria_id: form.conta_bancaria_id || mov.conta_bancaria_id || "",
      meio_pagamento_id: "",
    });
    setOpenBaixa(true);
  }

  async function handleBaixa() {
    if (!mov) return;
    const valorRec = parseFloat(baixaForm.valor_realizado);
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
    toast.success(isPagar ? "Pagamento registrado!" : "Recebimento registrado!");
    setOpenBaixa(false);
    void load();
  }

  async function handleDelete() {
    if (!mov) return;
    const { error } = await supabase.from("movimentacoes").delete().eq("id", mov.id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Movimentação excluída");
    navigate("/financeiro/movimentacoes");
  }

  // ─── Anexos ──────────────────────────────────────────────────────
  async function handleFileSelected(file: File) {
    if (!mov) return;
    setUploading(true);
    try {
      const path = `${mov.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from(ANEXOS_BUCKET).upload(path, file);
      if (up.error) {
        toast.error("Erro ao enviar arquivo");
        return;
      }
      const pub = supabase.storage.from(ANEXOS_BUCKET).getPublicUrl(path);
      const { data: userData } = await supabase.auth.getUser();
      const ins = await supabase.from("anexos").insert({
        nome_arquivo: file.name,
        url: pub.data.publicUrl,
        tipo: file.type || null,
        tamanho_bytes: file.size,
        movimentacao_id: mov.id,
        uploaded_by: userData.user?.id || null,
        descricao: null,
      } as any).select().single();
      if (ins.error) {
        toast.error("Erro ao registrar anexo");
        return;
      }
      setAnexos((prev) => [...prev, ins.data]);
      toast.success("Anexo enviado!");
    } finally {
      setUploading(false);
    }
  }

  async function updateAnexoDescricao(anexoId: string, descricao: string) {
    setAnexos((prev) => prev.map((a) => (a.id === anexoId ? { ...a, descricao } : a)));
    await supabase.from("anexos").update({ descricao } as any).eq("id", anexoId);
  }

  async function removeAnexo(anexo: any) {
    const { error } = await supabase.from("anexos").delete().eq("id", anexo.id);
    if (error) {
      toast.error("Erro ao remover anexo");
      return;
    }
    // tenta remover do storage (best-effort)
    try {
      const url: string = anexo.url || "";
      const idx = url.indexOf(`/${ANEXOS_BUCKET}/`);
      if (idx >= 0) {
        const path = url.substring(idx + ANEXOS_BUCKET.length + 2);
        await supabase.storage.from(ANEXOS_BUCKET).remove([path]);
      }
    } catch {}
    setAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
    toast.success("Anexo removido");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!mov) return null;

  const podeBaixa = mov.status !== "pago" && mov.status !== "cancelado";
  const totalColor = isPagar ? "text-destructive" : "text-success";

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/financeiro/movimentacoes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Editar Movimentação</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados da movimentação financeira</p>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <Card>
        <CardContent className="p-6 space-y-8">
          {/* 1. DADOS PRINCIPAIS */}
          <section>
            <SectionHeader icon={FileText} title="Dados Principais" />
            <div className="space-y-4">
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Descrição da Movimentação *</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Pagamento mensal de aluguel"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">{isPagar ? "Fornecedor *" : "Cliente *"}</Label>
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
            </div>
          </section>

          {/* 2. CLASSIFICAÇÃO FINANCEIRA */}
          <section>
            <SectionHeader icon={Tags} title="Classificação Financeira" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Categoria *</Label>
                <Select
                  value={form.categoria_id || "none"}
                  onValueChange={(v) => setForm({ ...form, categoria_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {categoriasFiltradas.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-1.5">
                          {c.level === 3 && <span className="text-muted-foreground text-xs">└─</span>}
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Centro de Custo</Label>
                <Select
                  value={form.centro_custo_id || "none"}
                  onValueChange={(v) => setForm({ ...form, centro_custo_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
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
            </div>
          </section>

          {/* 3. DATAS E CONDIÇÕES */}
          <section>
            <SectionHeader icon={CalendarDays} title="Datas e Condições" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Data de Competência *</Label>
                <Input
                  type="date"
                  value={form.data_competencia}
                  onChange={(e) => setForm({ ...form, data_competencia: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Forma de Pagamento</Label>
                <Select
                  value={form.meio_pagamento_id || "none"}
                  onValueChange={(v) => setForm({ ...form, meio_pagamento_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {meios.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Conta Bancária</Label>
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
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Status:</span>
              <StatusBadge status={mov.status as StatusType} />
            </div>
          </section>

          {/* 4. VALORES E ENCARGOS */}
          <section>
            <SectionHeader icon={DollarSign} title="Valores e Encargos" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Valor Base (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_previsto}
                  onChange={(e) => setForm({ ...form, valor_previsto: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Desconto Previsto (-)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.desconto_previsto}
                  onChange={(e) => setForm({ ...form, desconto_previsto: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Juros Previstos (+)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.juros}
                  onChange={(e) => setForm({ ...form, juros: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Multa Prevista (+)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.multa}
                  onChange={(e) => setForm({ ...form, multa: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Taxas ADM (+)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.taxas_adm}
                  onChange={(e) => setForm({ ...form, taxas_adm: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="mt-4 rounded-md bg-muted/60 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Valor Total Previsto</span>
              <span className={cn("text-lg font-bold font-mono", totalColor)}>{formatCurrency(totalPrevisto)}</span>
            </div>
          </section>

          {/* 5. IMPOSTOS RETIDOS */}
          <section>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-[11px] font-semibold text-destructive tracking-widest uppercase mb-1">
                Impostos Retidos na Fonte (-)
              </p>
              <p className="text-xs text-muted-foreground mb-3">Não interferem no valor total previsto</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {(["pis", "cofins", "csll", "iss", "ir", "inss"] as const).map((k) => (
                  <div key={k}>
                    <Label className="text-[11px] font-medium uppercase mb-1 block">{k}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(form as any)[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value } as any)}
                      placeholder="0,00"
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. OBSERVAÇÕES */}
          <section>
            <SectionHeader icon={FileText} title="Observações Internas" />
            <Textarea
              rows={4}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Adicione observações sobre esta movimentação..."
            />
          </section>

          {/* 7. ANEXOS */}
          <section>
            <SectionHeader icon={Paperclip} title="Anexos" />
            <div className="space-y-2">
              {anexos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline truncate max-w-[200px]"
                    title={a.nome_arquivo}
                  >
                    {a.nome_arquivo}
                  </a>
                  <Input
                    placeholder="Descrição do anexo..."
                    defaultValue={a.descricao || ""}
                    onBlur={(e) => {
                      if ((e.target.value || "") !== (a.descricao || "")) {
                        void updateAnexoDescricao(a.id, e.target.value);
                      }
                    }}
                    className="flex-1 h-9 text-sm"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatBytes(a.tamanho_bytes)}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeAnexo(a)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-md border border-dashed border-input bg-muted/30 hover:bg-muted/60 transition-colors p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando..." : "Clique para anexar arquivo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileSelected(f);
                  e.target.value = "";
                }}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Footer fixo de ações */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width,16rem)] bg-background border-t border-border p-4 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
          <Button variant="destructive" onClick={() => setOpenDelete(true)} className="gap-1.5">
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          {podeBaixa && (
            <Button
              variant="outline"
              onClick={openDarBaixa}
              className="gap-1.5 border-success text-success hover:bg-success hover:text-white"
            >
              <CheckCircle className="h-4 w-4" />
              {isPagar ? "Registrar Pagamento" : "Registrar Recebimento"}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/financeiro/movimentacoes")}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" /> Salvar e Fechar
            </Button>
            <Button variant="destructive" onClick={() => handleSave(false)} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm delete */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Baixa Dialog */}
      <Dialog open={openBaixa} onOpenChange={setOpenBaixa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPagar ? "Registrar Pagamento" : "Registrar Recebimento"}</DialogTitle>
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
              <Label>Forma de {isPagar ? "Pagamento" : "Recebimento"}</Label>
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
