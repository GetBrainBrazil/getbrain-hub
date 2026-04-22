import { useEffect, useMemo, useRef, useState } from "react";
import { getHierarchicalOptions, getVinculacaoTipo, type VinculacaoTipo } from "@/lib/categorias-hierarchy";
import CategoryPicker from "@/components/CategoryPicker";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
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
  Repeat,
  Landmark,
  Users,
  UserCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ComprovanteUploadField, uploadComprovanteToMovimentacao, type ComprovanteAIResult } from "@/components/ComprovanteUploadField";
import { Sparkles } from "lucide-react";
import { applyMoneyMask, parseMoney, formatMoneyForInput } from "@/components/config-financeiras/shared";
import { useConfirm } from "@/components/ConfirmDialog";

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

function addByFrequency(dateStr: string, amount: number, freq: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (freq === "diario") d.setDate(d.getDate() + amount);
  else if (freq === "semanal") d.setDate(d.getDate() + amount * 7);
  else if (freq === "anual") d.setFullYear(d.getFullYear() + amount);
  else d.setMonth(d.getMonth() + amount);
  return d.toISOString().split("T")[0];
}

const emptyForm = {
  descricao: "",
  cliente_id: "",
  fornecedor_id: "",
  colaborador_id: "",
  projeto_id: "",
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
};

export default function MovimentacaoDetalhe() {
  const { id, tipo: tipoParam } = useParams<{ id?: string; tipo?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Modos: create | edit | view
  const isCreate = !id && !!tipoParam;
  const initialTipo: "despesa" | "receita" =
    tipoParam === "receber" ? "receita" : tipoParam === "pagar" ? "despesa" : "despesa";

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [mov, setMov] = useState<any>(null);
  const [tipoLocal, setTipoLocal] = useState<"despesa" | "receita">(initialTipo);

  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [meios, setMeios] = useState<any[]>([]);
  const [centros, setCentros] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<Array<{ id: string; name: string; code: string; company_id: string }>>([]);
  const [anexos, setAnexos] = useState<any[]>([]);

  const [form, setForm] = useState({ ...emptyForm });

  // Recorrência (somente create)
  const [recorrente, setRecorrente] = useState(false);
  const [recIntervalo, setRecIntervalo] = useState("1");
  const [recPeriodo, setRecPeriodo] = useState<"diario" | "semanal" | "mensal" | "anual">("mensal");
  const [recAte, setRecAte] = useState<string>("");

  const [openBaixa, setOpenBaixa] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [baixaForm, setBaixaForm] = useState({
    valor_realizado: "",
    data_pagamento: "",
    conta_bancaria_id: "",
    meio_pagamento_id: "",
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [aiFields, setAiFields] = useState<Set<"data_pagamento" | "valor_realizado" | "conta_bancaria_id">>(new Set());

  const [fornecedorOpen, setFornecedorOpen] = useState(false);
  const [fornecedorSearch, setFornecedorSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [colaboradorOpen, setColaboradorOpen] = useState(false);
  const [colaboradorSearch, setColaboradorSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ── Rascunho persistente (apenas no modo create) ─────────────────
  // Salva o que o usuário está preenchendo em localStorage para que
  // recargas acidentais, tela branca momentânea, refresh e reabertura do navegador não percam dados.
  const draftKey = isCreate ? `mov-draft::${tipoParam}` : null;
  const draftLoadedRef = useRef(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tipoParam]);

  // Restaura rascunho após load() inicial (apenas create)
  useEffect(() => {
    if (!draftKey || loading || draftLoadedRef.current) return;
    try {
        const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form) setForm((prev) => ({ ...prev, ...parsed.form }));
        if (parsed?.tipoLocal) setTipoLocal(parsed.tipoLocal);
        if (typeof parsed?.recorrente === "boolean") setRecorrente(parsed.recorrente);
        if (parsed?.recIntervalo) setRecIntervalo(parsed.recIntervalo);
        if (parsed?.recPeriodo) setRecPeriodo(parsed.recPeriodo);
        if (typeof parsed?.recAte === "string") setRecAte(parsed.recAte);
      }
    } catch { /* ignore */ }
    draftLoadedRef.current = true;
  }, [draftKey, loading]);

  // Salva rascunho a cada mudança (debounced)
  useEffect(() => {
    if (!draftKey || !draftLoadedRef.current) return;
    const t = setTimeout(() => {
      try {
          localStorage.setItem(
          draftKey,
          JSON.stringify({ form, tipoLocal, recorrente, recIntervalo, recPeriodo, recAte })
        );
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [draftKey, form, tipoLocal, recorrente, recIntervalo, recPeriodo, recAte]);

  function clearDraft() {
    if (draftKey) {
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    }
  }

  async function loadReferences() {
    const [rClientes, rFornecedores, rColaboradores, rCategorias, rContas, rMeios, rCentros, rProjetos] = await Promise.all([
      supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("colaboradores").select("id, nome, cargo").eq("ativo", true).order("nome"),
      supabase.from("categorias").select("id, nome, tipo, categoria_pai_id, ativo").eq("ativo", true).order("nome"),
      supabase.from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("meios_pagamento").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("projects").select("id, name, code, company_id").is("deleted_at", null).order("code"),
    ]);
    setClientes(rClientes.data || []);
    setFornecedores(rFornecedores.data || []);
    setColaboradores(rColaboradores.data || []);
    setCategorias(rCategorias.data || []);
    setContas(rContas.data || []);
    setMeios(rMeios.data || []);
    setCentros(rCentros.data || []);
    setProjetos(rProjetos.data || []);
  }

  async function load() {
    setLoading(true);
    try {
      await loadReferences();

      if (isCreate) {
        const today = new Date().toISOString().split("T")[0];
        setForm({ ...emptyForm, data_competencia: today, data_vencimento: today });
        setMov(null);
        setLoading(false);
        return;
      }

      const [rMov, rAnexos] = await Promise.all([
        supabase.from("movimentacoes").select("*").eq("id", id!).maybeSingle(),
        supabase.from("anexos").select("*").eq("movimentacao_id", id!).order("created_at"),
      ]);

      if (rMov.error || !rMov.data) {
        toast.error("Movimentação não encontrada");
        navigate("/financeiro/movimentacoes");
        return;
      }

      const m: any = rMov.data;
      setMov(m);
      setTipoLocal(m.tipo === "receita" ? "receita" : "despesa");
      setForm({
        descricao: m.descricao || "",
        cliente_id: m.cliente_id || "",
        fornecedor_id: m.fornecedor_id || "",
        colaborador_id: (m as any).colaborador_id || "",
        projeto_id: (m as any).projeto_id || "",
        categoria_id: m.categoria_id || "",
        centro_custo_id: m.centro_custo_id || "",
        conta_bancaria_id: m.conta_bancaria_id || "",
        meio_pagamento_id: m.meio_pagamento_id || "",
        valor_previsto: m.valor_previsto != null ? formatMoneyForInput(Number(m.valor_previsto)) : "",
        desconto_previsto: m.desconto_previsto != null ? formatMoneyForInput(Number(m.desconto_previsto)) : "",
        juros: m.juros != null ? formatMoneyForInput(Number(m.juros)) : "",
        multa: m.multa != null ? formatMoneyForInput(Number(m.multa)) : "",
        taxas_adm: m.taxas_adm != null ? formatMoneyForInput(Number(m.taxas_adm)) : "",
        pis: m.pis != null ? formatMoneyForInput(Number(m.pis)) : "",
        cofins: m.cofins != null ? formatMoneyForInput(Number(m.cofins)) : "",
        csll: m.csll != null ? formatMoneyForInput(Number(m.csll)) : "",
        iss: m.iss != null ? formatMoneyForInput(Number(m.iss)) : "",
        ir: m.ir != null ? formatMoneyForInput(Number(m.ir)) : "",
        inss: m.inss != null ? formatMoneyForInput(Number(m.inss)) : "",
        data_competencia: m.data_competencia || "",
        data_vencimento: m.data_vencimento || "",
        observacoes: m.observacoes || "",
      });
      setAnexos(rAnexos.data || []);
    } finally {
      setLoading(false);
    }
  }

  const isPagar = tipoLocal === "despesa";
  const backUrl = `/financeiro/movimentacoes?aba=${isPagar ? "pagar" : "receber"}`;

  const categoriasFiltradas = useMemo(() => {
    const restrict = isPagar ? (["despesas", "impostos"] as any) : (["receitas"] as any);
    return getHierarchicalOptions(categorias as any, restrict);
  }, [categorias, isPagar]);

  // Combobox helpers
  const filteredFornecedores = useMemo(() => {
    if (!fornecedorSearch) return fornecedores;
    return fornecedores.filter((f) => f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase()));
  }, [fornecedores, fornecedorSearch]);
  const showCreateFornecedor =
    fornecedorSearch.trim().length > 0 &&
    !fornecedores.some((f) => f.nome.toLowerCase() === fornecedorSearch.trim().toLowerCase());

  async function handleCreateFornecedor() {
    const nome = fornecedorSearch.trim();
    if (!nome) return;
    const { data, error } = await supabase.from("fornecedores").insert({ nome }).select().single();
    if (error) { toast.error("Erro ao criar fornecedor"); return; }
    toast.success(`Fornecedor "${nome}" criado!`);
    setFornecedores((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm((prev) => ({ ...prev, fornecedor_id: data.id }));
    setFornecedorSearch("");
    setFornecedorOpen(false);
  }

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()));
  }, [clientes, clienteSearch]);
  const showCreateCliente =
    clienteSearch.trim().length > 0 &&
    !clientes.some((c) => c.nome.toLowerCase() === clienteSearch.trim().toLowerCase());

  async function handleCreateCliente() {
    const nome = clienteSearch.trim();
    if (!nome) return;
    const { data, error } = await supabase.from("clientes").insert({ nome }).select().single();
    if (error) { toast.error("Erro ao criar cliente"); return; }
    toast.success(`Cliente "${nome}" criado!`);
    setClientes((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm((prev) => ({ ...prev, cliente_id: data.id }));
    setClienteSearch("");
    setClienteOpen(false);
  }

  const selectedFornecedorNome = fornecedores.find((f) => f.id === form.fornecedor_id)?.nome;
  const selectedClienteNome = clientes.find((c) => c.id === form.cliente_id)?.nome;
  const selectedColaboradorNome = colaboradores.find((c) => c.id === form.colaborador_id)?.nome;

  // Colaborador combobox
  const filteredColaboradores = useMemo(() => {
    if (!colaboradorSearch) return colaboradores;
    return colaboradores.filter((c) => c.nome.toLowerCase().includes(colaboradorSearch.toLowerCase()));
  }, [colaboradores, colaboradorSearch]);
  const showCreateColaborador =
    colaboradorSearch.trim().length > 0 &&
    !colaboradores.some((c) => c.nome.toLowerCase() === colaboradorSearch.trim().toLowerCase());

  async function handleCreateColaborador() {
    const nome = colaboradorSearch.trim();
    if (!nome) return;
    const { data, error } = await supabase.from("colaboradores").insert({ nome }).select().single();
    if (error) { toast.error("Erro ao criar colaborador"); return; }
    toast.success(`Colaborador "${nome}" criado!`);
    setColaboradores((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm((prev) => ({ ...prev, colaborador_id: data.id }));
    setColaboradorSearch("");
    setColaboradorOpen(false);
  }

  // Tipo de vinculação dinâmico baseado na categoria
  const vinculacaoTipo: VinculacaoTipo | null = useMemo(() => {
    if (!isPagar) return "cliente";
    if (!form.categoria_id) return null;
    return getVinculacaoTipo(form.categoria_id, categorias as any, isPagar);
  }, [form.categoria_id, categorias, isPagar]);

  // Limpa o vínculo anterior quando o tipo de vinculação muda
  const prevVincTipoRef = useRef<VinculacaoTipo | null>(null);
  useEffect(() => {
    const prev = prevVincTipoRef.current;
    if (prev && vinculacaoTipo && prev !== vinculacaoTipo) {
      setForm((f) => ({ ...f, fornecedor_id: "", colaborador_id: "", cliente_id: !isPagar ? f.cliente_id : "" }));
    }
    prevVincTipoRef.current = vinculacaoTipo;
  }, [vinculacaoTipo, isPagar]);

  const totalPrevisto = useMemo(() => {
    const n = (v: string) => (v ? parseMoney(v) || 0 : 0);
    return n(form.valor_previsto) - n(form.desconto_previsto) + n(form.juros) + n(form.multa) + n(form.taxas_adm);
  }, [form.valor_previsto, form.desconto_previsto, form.juros, form.multa, form.taxas_adm]);

  function buildPayload() {
    const num = (v: string) => (v === "" || v == null ? 0 : parseMoney(v) || 0);
    const isFornecedor = vinculacaoTipo === "fornecedor";
    const isColab = vinculacaoTipo === "colaborador" || vinculacaoTipo === "socio";
    return {
      tipo: tipoLocal,
      descricao: form.descricao,
      cliente_id: !isPagar ? form.cliente_id || null : null,
      fornecedor_id: isPagar && isFornecedor ? form.fornecedor_id || null : null,
      colaborador_id: isPagar && isColab ? form.colaborador_id || null : null,
      categoria_id: form.categoria_id || null,
      centro_custo_id: form.centro_custo_id || null,
      projeto_id: form.projeto_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      meio_pagamento_id: form.meio_pagamento_id || null,
      valor_previsto: num(form.valor_previsto),
      desconto_previsto: num(form.desconto_previsto),
      juros: num(form.juros),
      multa: num(form.multa),
      taxas_adm: num(form.taxas_adm),
      pis: isPagar ? num(form.pis) : 0,
      cofins: isPagar ? num(form.cofins) : 0,
      csll: isPagar ? num(form.csll) : 0,
      iss: isPagar ? num(form.iss) : 0,
      ir: isPagar ? num(form.ir) : 0,
      inss: isPagar ? num(form.inss) : 0,
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
    };
  }

  function validate(): boolean {
    if (!form.descricao || !form.valor_previsto || !form.data_competencia || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return false;
    }
    if (!form.categoria_id) { toast.error("Selecione uma categoria"); return false; }
    if (vinculacaoTipo === "fornecedor" && !form.fornecedor_id) { toast.error("Selecione um fornecedor"); return false; }
    if (vinculacaoTipo === "colaborador" && !form.colaborador_id) { toast.error("Selecione um colaborador"); return false; }
    if (vinculacaoTipo === "socio" && !form.colaborador_id) { toast.error("Selecione um sócio"); return false; }
    if (vinculacaoTipo === "cliente" && !form.cliente_id) { toast.error("Selecione um cliente"); return false; }
    return true;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    const base = { ...buildPayload(), created_by: user?.id ?? null };

    const { data: parent, error } = await supabase
      .from("movimentacoes")
      .insert(base as any)
      .select()
      .single();

    if (error || !parent) {
      setSaving(false);
      toast.error("Erro ao salvar. Tente novamente.");
      return;
    }

    // Recorrência: gera ocorrências retroativas (data inicial → hoje) e futuras (até "recAte" ou 120 períodos).
    // Para frequência mensal sem prazo, o cron mensal "generate-recurring-movimentacoes" continua criando o mês corrente.
    if (recorrente) {
      const intervalo = Math.max(parseInt(recIntervalo) || 1, 1);
      const limite = recAte ? new Date(recAte + "T12:00:00") : null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const maxOcorrencias = 240; // teto de segurança
      const recurrences: any[] = [];
      for (let i = 1; i < maxOcorrencias; i++) {
        const competencia = addByFrequency(form.data_competencia, intervalo * i, recPeriodo);
        const vencimento = addByFrequency(form.data_vencimento, intervalo * i, recPeriodo);
        const venc = new Date(vencimento + "T12:00:00");
        if (limite && venc > limite) break;
        // Sem prazo: gera tudo até hoje + 120 períodos no futuro
        if (!limite) {
          const todayIso = new Date().toISOString().slice(0, 10);
          const futureCutoff = addByFrequency(todayIso, 120, recPeriodo);
          if (vencimento > futureCutoff) break;
        }
        const status = venc < today ? "atrasado" : "pendente";
        recurrences.push({
          ...base,
          data_competencia: competencia,
          data_vencimento: vencimento,
          status,
          movimentacao_pai_id: parent.id,
          recorrente: true,
          frequencia_recorrencia: recPeriodo,
        });
      }
      if (recurrences.length > 0) {
        await supabase.from("movimentacoes").insert(recurrences as any);
      }
      // Atualiza pai para marcar como recorrente
      await supabase
        .from("movimentacoes")
        .update({ recorrente: true, frequencia_recorrencia: recPeriodo } as any)
        .eq("id", parent.id);
    }

    setSaving(false);
    toast.success(isPagar ? "Conta a pagar cadastrada com sucesso" : "Conta a receber cadastrada com sucesso");
    clearDraft();
    navigate(backUrl);
  }

  async function handleSaveEdit() {
    if (!mov) return;
    if (!validate()) return;
    setSaving(true);
    const { data: updated, error } = await supabase
      .from("movimentacoes")
      .update(buildPayload() as any)
      .eq("id", mov.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error || !updated) {
      toast.error("Erro ao salvar. Tente novamente.");
      return;
    }
    toast.success("Movimentação atualizada com sucesso");
    navigate(backUrl);
  }

  function openDarBaixa() {
    if (!mov) return;
    const baseValor = totalPrevisto || parseMoney(form.valor_previsto || "0") || Number(mov.valor_previsto) || 0;
    setBaixaForm({
      valor_realizado: formatMoneyForInput(baseValor),
      data_pagamento: new Date().toISOString().split("T")[0],
      conta_bancaria_id: form.conta_bancaria_id || mov.conta_bancaria_id || "",
      meio_pagamento_id: "",
    });
    setComprovanteFile(null);
    setAiFields(new Set());
    setOpenBaixa(true);
  }

  async function handleBaixa() {
    if (!mov) return;
    const valorRec = parseMoney(baixaForm.valor_realizado) || 0;
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
    if (comprovanteFile) {
      try { await uploadComprovanteToMovimentacao(comprovanteFile, mov.id); }
      catch (e) { console.error(e); toast.error("Pagamento registrado, mas falhou ao salvar o comprovante."); }
    }
    toast.success(isPagar ? "Pagamento registrado!" : "Recebimento registrado!");
    setOpenBaixa(false);
    void load();
  }

  async function handleDelete() {
    if (!mov) return;
    const { error } = await supabase.from("movimentacoes").delete().eq("id", mov.id);
    if (error) {
      toast.error(`Não foi possível excluir: ${error.message}`);
      return;
    }
    toast.success("Movimentação excluída com sucesso");
    navigate(backUrl);
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

  if (!isCreate && !mov) return null;

  const podeBaixa = !isCreate && mov && mov.status !== "pago" && mov.status !== "cancelado";
  const totalColor = isPagar ? "text-destructive" : "text-success";

  const headerTitle = isCreate
    ? isPagar
      ? "Nova Conta a Pagar"
      : "Nova Conta a Receber"
    : isPagar
      ? "Editar Conta a Pagar"
      : "Editar Conta a Receber";

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{headerTitle}</h1>
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
              {/* Tipo de Movimentação — apenas no create */}
              {isCreate && (
                <div>
                  <Label className="text-[13px] font-medium mb-1.5 block">Tipo de Movimentação *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoLocal("despesa");
                        setForm((prev) => ({ ...prev, cliente_id: "", categoria_id: "", colaborador_id: "" }));
                      }}
                      className={cn(
                        "rounded-lg border-2 p-4 text-left transition-all",
                        isPagar
                          ? "border-destructive bg-destructive/5"
                          : "border-input bg-background hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-md flex items-center justify-center",
                          isPagar ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                        )}>
                          <ArrowDown className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Conta a Pagar</p>
                          <p className="text-xs text-muted-foreground">Saída de recursos</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoLocal("receita");
                        setForm((prev) => ({ ...prev, fornecedor_id: "", categoria_id: "", colaborador_id: "" }));
                      }}
                      className={cn(
                        "rounded-lg border-2 p-4 text-left transition-all",
                        !isPagar
                          ? "border-success bg-success/5"
                          : "border-input bg-background hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-md flex items-center justify-center",
                          !isPagar ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          <ArrowUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Conta a Receber</p>
                          <p className="text-xs text-muted-foreground">Entrada de recursos</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Descrição da Movimentação */}
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Descrição da Movimentação *</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição da movimentação"
                />
              </div>
            </div>
          </section>

          {/* 2. CLASSIFICAÇÃO FINANCEIRA */}
          <section>
            <SectionHeader icon={Tags} title="Classificação Financeira" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Categoria *</Label>
                <CategoryPicker
                  categorias={categorias as any}
                  value={form.categoria_id}
                  onChange={(id) => setForm({ ...form, categoria_id: id || "" })}
                  restrictTipos={isPagar ? ["despesas", "impostos"] : ["receitas"]}
                  placeholder="Buscar categoria..."
                />
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
              <div className="md:col-span-2">
                <Label className="text-[13px] font-medium mb-1.5 block">Projeto</Label>
                <Select
                  value={form.projeto_id || "none"}
                  onValueChange={(v) => setForm({ ...form, projeto_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vincula esta movimentação ao projeto. Aparece nos relatórios financeiros do projeto.
                </p>
              </div>
            </div>
          </section>

          {/* 2.5 VINCULAÇÃO — campo dinâmico baseado na categoria */}
          <section>
            <SectionHeader icon={Users} title="Vinculação" />
            {vinculacaoTipo === null ? (
              <p className="text-sm italic text-muted-foreground">
                Selecione uma categoria para definir o tipo de vinculação
              </p>
            ) : (
              <div key={vinculacaoTipo} className="animate-fade-in">
                {vinculacaoTipo === "fornecedor" && (
                  <div>
                    <Label className="text-[13px] font-medium mb-1.5 block">Fornecedor *</Label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Popover open={fornecedorOpen} onOpenChange={setFornecedorOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {selectedFornecedorNome || "Selecione o fornecedor..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput placeholder="Buscar fornecedor..." value={fornecedorSearch} onValueChange={setFornecedorSearch} />
                            <CommandList>
                              <CommandEmpty>{fornecedorSearch.trim() ? "Nenhum encontrado" : "Digite para buscar"}</CommandEmpty>
                              <CommandGroup>
                                {filteredFornecedores.map((f) => (
                                  <CommandItem key={f.id} value={f.id} onSelect={() => { setForm({ ...form, fornecedor_id: f.id }); setFornecedorOpen(false); setFornecedorSearch(""); }}>
                                    <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                                    {f.nome}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {showCreateFornecedor && (
                                <CommandGroup>
                                  <CommandItem onSelect={handleCreateFornecedor} className="text-primary font-medium">
                                    <Plus className="mr-2 h-4 w-4" /> Criar "{fornecedorSearch.trim()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setFornecedorOpen(true); setFornecedorSearch(""); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {(vinculacaoTipo === "colaborador" || vinculacaoTipo === "socio") && (
                  <div>
                    <Label className="text-[13px] font-medium mb-1.5 block">
                      {vinculacaoTipo === "socio" ? "Sócio *" : "Colaborador *"}
                    </Label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Popover open={colaboradorOpen} onOpenChange={setColaboradorOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {selectedColaboradorNome || (vinculacaoTipo === "socio" ? "Selecione o sócio..." : "Selecione o colaborador...")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput placeholder={vinculacaoTipo === "socio" ? "Buscar sócio..." : "Buscar colaborador..."} value={colaboradorSearch} onValueChange={setColaboradorSearch} />
                            <CommandList>
                              <CommandEmpty>{colaboradorSearch.trim() ? "Nenhum encontrado" : "Digite para buscar"}</CommandEmpty>
                              <CommandGroup>
                                {filteredColaboradores.map((c) => (
                                  <CommandItem key={c.id} value={c.id} onSelect={() => { setForm({ ...form, colaborador_id: c.id }); setColaboradorOpen(false); setColaboradorSearch(""); }}>
                                    <Check className={cn("mr-2 h-4 w-4", form.colaborador_id === c.id ? "opacity-100" : "opacity-0")} />
                                    <span className="flex-1">{c.nome}</span>
                                    {c.cargo && <span className="text-xs text-muted-foreground ml-2">{c.cargo}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {showCreateColaborador && (
                                <CommandGroup>
                                  <CommandItem onSelect={handleCreateColaborador} className="text-primary font-medium">
                                    <Plus className="mr-2 h-4 w-4" /> Criar "{colaboradorSearch.trim()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setColaboradorOpen(true); setColaboradorSearch(""); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {vinculacaoTipo === "cliente" && (
                  <div>
                    <Label className="text-[13px] font-medium mb-1.5 block">Cliente *</Label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {selectedClienteNome || "Selecione o cliente..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput placeholder="Buscar cliente..." value={clienteSearch} onValueChange={setClienteSearch} />
                            <CommandList>
                              <CommandEmpty>{clienteSearch.trim() ? "Nenhum encontrado" : "Digite para buscar"}</CommandEmpty>
                              <CommandGroup>
                                {filteredClientes.map((c) => (
                                  <CommandItem key={c.id} value={c.id} onSelect={() => { setForm({ ...form, cliente_id: c.id }); setClienteOpen(false); setClienteSearch(""); }}>
                                    <Check className={cn("mr-2 h-4 w-4", form.cliente_id === c.id ? "opacity-100" : "opacity-0")} />
                                    {c.nome}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {showCreateCliente && (
                                <CommandGroup>
                                  <CommandItem onSelect={handleCreateCliente} className="text-primary font-medium">
                                    <Plus className="mr-2 h-4 w-4" /> Criar "{clienteSearch.trim()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setClienteOpen(true); setClienteSearch(""); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <SectionHeader icon={CalendarDays} title="Datas e Condições" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label className="text-[13px] font-medium mb-1.5 block">Conta Bancária</Label>
                <Select
                  value={form.conta_bancaria_id || "none"}
                  onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
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
            {!isCreate && mov && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Status:</span>
                <StatusBadge status={mov.status as StatusType} />
              </div>
            )}
          </section>

          {/* 4. VALORES E ENCARGOS */}
          <section>
            <SectionHeader icon={DollarSign} title="Valores e Encargos" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Valor Base (R$) *</Label>
                <Input
                  inputMode="decimal"
                  value={form.valor_previsto}
                  onChange={(e) => setForm({ ...form, valor_previsto: applyMoneyMask(e.target.value) })}
                  placeholder="0,00"
                  className="text-right font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Desconto Previsto (-)</Label>
                <Input
                  inputMode="decimal"
                  value={form.desconto_previsto}
                  onChange={(e) => setForm({ ...form, desconto_previsto: applyMoneyMask(e.target.value) })}
                  placeholder="0,00"
                  className="text-right font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Juros Previstos (+)</Label>
                <Input
                  inputMode="decimal"
                  value={form.juros}
                  onChange={(e) => setForm({ ...form, juros: applyMoneyMask(e.target.value) })}
                  placeholder="0,00"
                  className="text-right font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Multa Prevista (+)</Label>
                <Input
                  inputMode="decimal"
                  value={form.multa}
                  onChange={(e) => setForm({ ...form, multa: applyMoneyMask(e.target.value) })}
                  placeholder="0,00"
                  className="text-right font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium mb-1.5 block">Taxas ADM (+)</Label>
                <Input
                  inputMode="decimal"
                  value={form.taxas_adm}
                  onChange={(e) => setForm({ ...form, taxas_adm: applyMoneyMask(e.target.value) })}
                  placeholder="0,00"
                  className="text-right font-mono"
                />
              </div>
            </div>
            <div className="mt-4 rounded-md bg-muted/60 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Valor Total Previsto</span>
              <span className={cn("text-lg font-bold font-mono", totalColor)}>{formatCurrency(totalPrevisto)}</span>
            </div>
          </section>

          {/* 5. IMPOSTOS RETIDOS — apenas para Conta a Pagar */}
          {isPagar && (
            <section>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-[11px] font-semibold text-warning-foreground tracking-widest uppercase mb-1 flex items-center gap-2">
                  <Landmark className="h-3.5 w-3.5" />
                  Impostos Retidos na Fonte (-)
                </p>
                <p className="text-xs text-muted-foreground mb-3">Não interferem no valor total previsto</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {(["pis", "cofins", "csll", "iss", "ir", "inss"] as const).map((k) => (
                    <div key={k}>
                      <Label className="text-[11px] font-medium uppercase mb-1 block text-destructive">{k}</Label>
                      <Input
                        inputMode="decimal"
                        value={(form as any)[k]}
                        onChange={(e) => setForm({ ...form, [k]: applyMoneyMask(e.target.value) } as any)}
                        placeholder="0,00"
                        className="h-9 text-sm text-right font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 6. OBSERVAÇÕES */}
          <section>
            <SectionHeader icon={FileText} title="Observações Internas" />
            <Textarea
              rows={4}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
            />
          </section>

          {/* 7. ANEXOS — apenas para movimentação existente */}
          {!isCreate && (
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
                  {uploading ? "Enviando..." : "Clique para anexar arquivo ou arraste aqui"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileSelected(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </section>
          )}

          {/* 8. RECORRÊNCIA — apenas para create */}
          {isCreate && (
            <section>
              <div className="rounded-lg border border-input p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Conta recorrente</p>
                      <p className="text-xs text-muted-foreground">Cria automaticamente múltiplas ocorrências</p>
                    </div>
                  </div>
                  <Switch checked={recorrente} onCheckedChange={setRecorrente} />
                </div>
                {recorrente && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div>
                      <Label className="text-[12px] font-medium mb-1.5 block">A cada</Label>
                      <Input
                        type="number"
                        min="1"
                        value={recIntervalo}
                        onChange={(e) => setRecIntervalo(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[12px] font-medium mb-1.5 block">Período</Label>
                      <Select value={recPeriodo} onValueChange={(v) => setRecPeriodo(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Dia(s)</SelectItem>
                          <SelectItem value="semanal">Semana(s)</SelectItem>
                          <SelectItem value="mensal">Mês(es)</SelectItem>
                          <SelectItem value="anual">Ano(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[12px] font-medium mb-1.5 block">Repetir até (opcional)</Label>
                      <Input type="date" value={recAte} onChange={(e) => setRecAte(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Footer com ações dentro do card */}
          <div className="border-t border-border pt-4 flex items-center gap-2 flex-wrap">
            {!isCreate && (
              <>
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
              </>
            )}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => { clearDraft(); navigate(backUrl); }}>
                Cancelar
              </Button>
              {isCreate ? (
                <Button onClick={handleCreate} disabled={saving} className="gap-1.5">
                  <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Confirmar Cadastro"}
                </Button>
              ) : (
                <Button onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
                  <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
            <ComprovanteUploadField
              onFileChange={setComprovanteFile}
              valorEsperado={mov ? Number(mov.valor_previsto) : undefined}
              contas={contas as any}
              onAIResult={(res: ComprovanteAIResult) => {
                const next: typeof aiFields = new Set(aiFields);
                setBaixaForm((prev) => {
                  const upd = { ...prev };
                  if (res.data) { upd.data_pagamento = res.data; next.add("data_pagamento"); }
                  if (res.valor != null) { upd.valor_realizado = formatMoneyForInput(Number(res.valor)); next.add("valor_realizado"); }
                  if (res.conta_bancaria_id) { upd.conta_bancaria_id = res.conta_bancaria_id; next.add("conta_bancaria_id"); }
                  return upd;
                });
                setAiFields(next);
              }}
            />
            <div>
              <Label className="flex items-center gap-1">
                Valor {isPagar ? "Pago" : "Recebido"} (R$)
                {aiFields.has("valor_realizado") && <Sparkles className="h-3.5 w-3.5" style={{ color: "#0EA5E9" }} />}
              </Label>
              <Input
                inputMode="decimal"
                value={baixaForm.valor_realizado}
                onChange={(e) => setBaixaForm({ ...baixaForm, valor_realizado: applyMoneyMask(e.target.value) })}
                placeholder="0,00"
                className="text-right font-mono"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Data do {isPagar ? "Pagamento" : "Recebimento"}
                {aiFields.has("data_pagamento") && <Sparkles className="h-3.5 w-3.5" style={{ color: "#0EA5E9" }} />}
              </Label>
              <Input
                type="date"
                value={baixaForm.data_pagamento}
                onChange={(e) => setBaixaForm({ ...baixaForm, data_pagamento: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Conta Bancária
                {aiFields.has("conta_bancaria_id") && <Sparkles className="h-3.5 w-3.5" style={{ color: "#0EA5E9" }} />}
              </Label>
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
