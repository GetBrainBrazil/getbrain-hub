import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { getHierarchicalOptions, type CategoriaRaw } from "@/lib/categorias-hierarchy";
import {
  Check, ChevronLeft, ChevronRight, FileUp, Loader2, Sparkles, Camera, X,
} from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contas: { id: string; nome: string; banco?: string | null }[];
}

const STEPS = ["Upload", "Conferência", "Confirmação"];

interface ExtractedData {
  valor?: number;
  data?: string;
  tipo?: "entrada" | "saida";
  destinatario_nome?: string;
  destinatario_documento?: string;
  remetente_nome?: string;
  remetente_documento?: string;
  id_transacao?: string;
  tipo_transacao?: string;
  banco_origem?: string;
  banco_destino?: string;
  descricao?: string;
}

interface FormState {
  data: string;
  tipo: "entrada" | "saida";
  valor: string;
  descricao: string;
  contraparte_nome: string;
  contraparte_documento: string;
  tipo_transacao: string;
  id_transacao: string;
  categoria_id: string;
  fornecedor_id: string;
  cliente_id: string;
}

const TIPOS_TRANSACAO = ["PIX", "TED", "DOC", "Boleto", "Transferência"];

// Sparkle indicator
const AISparkle = () => (
  <Sparkles className="h-3.5 w-3.5 inline-block ml-1" style={{ color: "#0EA5E9" }} aria-label="Preenchido pela IA" />
);

function parseDateBR(s?: string): string {
  if (!s) return "";
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return s.substring(0, 10);
  return "";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.substring(idx + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function normalizeDoc(s?: string | null): string {
  return (s || "").replace(/\D/g, "");
}

function normalizeName(s?: string | null): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function RegistrarComprovanteWizard({ open, onOpenChange, contas }: Props) {
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [contaId, setContaId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [aiFields, setAiFields] = useState<Set<keyof FormState>>(new Set());
  const [aiFailed, setAiFailed] = useState(false);
  const [form, setForm] = useState<FormState>({
    data: "",
    tipo: "saida",
    valor: "",
    descricao: "",
    contraparte_nome: "",
    contraparte_documento: "",
    tipo_transacao: "",
    id_transacao: "",
    categoria_id: "",
    fornecedor_id: "",
    cliente_id: "",
  });

  // Fetch categorias / fornecedores / clientes for matching & dropdowns
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias_for_receipt"],
    queryFn: async () => {
      const { data } = await supabase.from("categorias").select("id, nome, tipo, categoria_pai_id, ativo");
      return (data || []) as CategoriaRaw[];
    },
    enabled: open,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_for_receipt"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome, cpf_cnpj, razao_social").eq("ativo", true).order("nome");
      return data || [];
    },
    enabled: open,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_for_receipt"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome, cpf_cnpj, razao_social, nome_empresa").eq("ativo", true).order("nome");
      return data || [];
    },
    enabled: open,
  });

  const categoriaOptions = useMemo(
    () => getHierarchicalOptions(categorias, form.tipo === "entrada" ? ["receitas"] : ["despesas", "impostos", "retirada"]),
    [categorias, form.tipo]
  );

  const reset = useCallback(() => {
    setStep(0);
    setContaId("");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setExtracted(null);
    setAiFields(new Set());
    setAiFailed(false);
    setForm({
      data: "", tipo: "saida", valor: "", descricao: "",
      contraparte_nome: "", contraparte_documento: "", tipo_transacao: "",
      id_transacao: "", categoria_id: "", fornecedor_id: "", cliente_id: "",
    });
  }, [previewUrl]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleFile = (f: File) => {
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(f.type)) {
      toast.error("Formato não suportado. Use JPG, PNG ou PDF.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const tryMatchContraparte = (tipo: "entrada" | "saida", nome: string, doc: string) => {
    const docNorm = normalizeDoc(doc);
    const nameNorm = normalizeName(nome);
    if (tipo === "saida") {
      // procurar em fornecedores
      let found = docNorm ? fornecedores.find((f: any) => normalizeDoc(f.cpf_cnpj) === docNorm) : null;
      if (!found && nameNorm) {
        found = fornecedores.find((f: any) =>
          normalizeName(f.nome) === nameNorm || normalizeName(f.razao_social) === nameNorm
        ) || fornecedores.find((f: any) =>
          normalizeName(f.nome).includes(nameNorm) || nameNorm.includes(normalizeName(f.nome))
        );
      }
      return { fornecedor_id: found?.id || "", cliente_id: "" };
    } else {
      let found = docNorm ? clientes.find((c: any) => normalizeDoc(c.cpf_cnpj) === docNorm) : null;
      if (!found && nameNorm) {
        found = clientes.find((c: any) =>
          normalizeName(c.nome) === nameNorm ||
          normalizeName(c.razao_social) === nameNorm ||
          normalizeName(c.nome_empresa) === nameNorm
        ) || clientes.find((c: any) =>
          normalizeName(c.nome).includes(nameNorm) || nameNorm.includes(normalizeName(c.nome))
        );
      }
      return { fornecedor_id: "", cliente_id: found?.id || "" };
    }
  };

  const analyze = async () => {
    if (!contaId) { toast.error("Selecione a conta bancária."); return; }
    if (!file) { toast.error("Faça upload do comprovante."); return; }
    setLoading(true);
    setAiFailed(false);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-receipt", {
        body: { image: base64, mimeType: file.type },
      });
      if (error || !data?.data) {
        throw new Error(error?.message || "Falha na análise");
      }
      const ex: ExtractedData = data.data;
      setExtracted(ex);

      const tipo: "entrada" | "saida" = ex.tipo === "entrada" ? "entrada" : "saida";
      const contraparteNome = tipo === "saida" ? (ex.destinatario_nome || "") : (ex.remetente_nome || "");
      const contraparteDoc = tipo === "saida" ? (ex.destinatario_documento || "") : (ex.remetente_documento || "");
      const dataIso = parseDateBR(ex.data);

      const ai = new Set<keyof FormState>();
      if (dataIso) ai.add("data");
      if (ex.tipo) ai.add("tipo");
      if (ex.valor != null) ai.add("valor");
      if (ex.descricao) ai.add("descricao");
      if (contraparteNome) ai.add("contraparte_nome");
      if (contraparteDoc) ai.add("contraparte_documento");
      if (ex.tipo_transacao) ai.add("tipo_transacao");
      if (ex.id_transacao) ai.add("id_transacao");

      const match = tryMatchContraparte(tipo, contraparteNome, contraparteDoc);

      setForm({
        data: dataIso,
        tipo,
        valor: ex.valor != null ? String(ex.valor) : "",
        descricao: ex.descricao || "",
        contraparte_nome: contraparteNome,
        contraparte_documento: contraparteDoc,
        tipo_transacao: ex.tipo_transacao && TIPOS_TRANSACAO.includes(ex.tipo_transacao) ? ex.tipo_transacao : "",
        id_transacao: ex.id_transacao || "",
        categoria_id: "",
        fornecedor_id: match.fornecedor_id,
        cliente_id: match.cliente_id,
      });
      setAiFields(ai);
      setStep(1);
    } catch (err: any) {
      console.error(err);
      setAiFailed(true);
      setAiFields(new Set());
      setForm((f) => ({ ...f, data: "", tipo: "saida", valor: "", descricao: "" }));
      toast.error("Não foi possível analisar o comprovante automaticamente. Preencha os dados manualmente.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const labelWithSparkle = (text: string, key: keyof FormState) => (
    <Label>
      {text}
      {aiFields.has(key) && <AISparkle />}
    </Label>
  );

  const handleConfirm = async () => {
    if (!form.data || !form.valor || !contaId) {
      toast.error("Preencha data, valor e conta.");
      return;
    }
    const valorNum = parseFloat(form.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    setLoading(true);
    try {
      // 1. Try matching with existing movimentações (valor + ±2 dias)
      const dt = new Date(form.data);
      const start = new Date(dt); start.setDate(start.getDate() - 2);
      const end = new Date(dt); end.setDate(end.getDate() + 2);
      const tipoMov = form.tipo === "entrada" ? "receita" : "despesa";

      const { data: candidates } = await supabase
        .from("movimentacoes")
        .select("id, descricao, valor_realizado, valor_previsto, data_pagamento, data_vencimento, tipo")
        .eq("conta_bancaria_id", contaId)
        .eq("tipo", tipoMov)
        .gte("data_vencimento", start.toISOString().split("T")[0])
        .lte("data_vencimento", end.toISOString().split("T")[0]);

      const match = (candidates || []).find((m: any) => {
        const v = m.valor_realizado ?? m.valor_previsto ?? 0;
        return Math.abs(v - valorNum) < 0.01;
      });

      let conciliarMatch = false;
      if (match) {
        conciliarMatch = await confirmDialog({
          title: "Conciliar com lançamento existente?",
          description: `Encontramos um lançamento correspondente: "${match.descricao}" de ${formatCurrency(match.valor_realizado ?? match.valor_previsto ?? 0)}. Deseja conciliar automaticamente?`,
          confirmLabel: "Conciliar",
          cancelLabel: "Criar novo",
          variant: "default",
        });
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // 2. Upload comprovante to Storage (bucket: comprovantes)
      const ext = file!.name.split(".").pop() || "bin";
      const filePath = `${userId || "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("comprovantes").upload(filePath, file!, {
        contentType: file!.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("comprovantes").getPublicUrl(filePath);
      const fileUrl = pub.publicUrl;

      // 3. Create importação umbrella
      const { data: imp } = await supabase.from("extrato_importacoes").insert({
        conta_bancaria_id: contaId,
        data_inicio: form.data,
        data_fim: form.data,
        nome_arquivo: file!.name,
        total_transacoes: 1,
        transacoes_conciliadas: conciliarMatch ? 1 : 0,
        transacoes_criadas: conciliarMatch ? 0 : 1,
        status: "comprovante",
        created_by: userId,
      }).select("id").single();
      if (!imp) throw new Error("Falha ao criar registro de importação");

      let movimentacaoId: string | null = null;

      if (conciliarMatch && match) {
        // Conciliate with existing movimentação
        movimentacaoId = match.id;
        await supabase.from("movimentacoes").update({ conciliado: true }).eq("id", match.id);
      } else {
        // Create a new movimentação (already paid)
        const descricaoFinal = form.descricao || `Comprovante ${form.tipo_transacao || ""}`.trim();
        const { data: novaMov } = await supabase.from("movimentacoes").insert({
          tipo: tipoMov,
          descricao: descricaoFinal,
          valor_previsto: valorNum,
          valor_realizado: valorNum,
          data_competencia: form.data,
          data_vencimento: form.data,
          data_pagamento: form.data,
          status: "pago",
          conciliado: true,
          conta_bancaria_id: contaId,
          categoria_id: form.categoria_id || null,
          fornecedor_id: form.fornecedor_id || null,
          cliente_id: form.cliente_id || null,
          observacoes: [
            form.tipo_transacao && `Tipo: ${form.tipo_transacao}`,
            form.id_transacao && `ID: ${form.id_transacao}`,
            form.contraparte_nome && `Contraparte: ${form.contraparte_nome}`,
            form.contraparte_documento && `Doc: ${form.contraparte_documento}`,
          ].filter(Boolean).join(" | ") || null,
          created_by: userId,
        }).select("id").single();
        movimentacaoId = novaMov?.id || null;
      }

      // 4. Insert extrato_transacao linked
      await supabase.from("extrato_transacoes").insert({
        importacao_id: imp.id,
        conta_bancaria_id: contaId,
        data_transacao: form.data,
        descricao_banco: form.descricao || file!.name,
        valor: valorNum,
        tipo: form.tipo,
        status_match: movimentacaoId ? "conciliado" : "sem_match",
        movimentacao_id: movimentacaoId,
        conciliado: !!movimentacaoId,
      });

      // 5. Save anexo linked to movimentação
      if (movimentacaoId) {
        await supabase.from("anexos").insert({
          movimentacao_id: movimentacaoId,
          nome_arquivo: file!.name,
          url: fileUrl,
          tipo: file!.type,
          tamanho_bytes: file!.size,
          descricao: "Comprovante de pagamento",
          uploaded_by: userId,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["extrato_transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["extrato_importacoes"] });
      invalidateFinanceCaches(queryClient);

      toast.success("Transação registrada com sucesso a partir do comprovante");
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao registrar comprovante: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const isPdf = file?.type === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Comprovante</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                i < step ? "bg-success text-success-foreground" :
                i === step ? "bg-accent text-accent-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>De qual conta é este comprovante?</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} {c.banco ? `(${c.banco})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("comprovante-file-input")?.click()}
            >
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">{file?.name || "Arraste o comprovante aqui ou clique para selecionar"}</p>
              <p className="text-sm text-muted-foreground mt-1">Comprovantes de PIX, TED, boleto ou transferência</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: JPG, PNG, PDF</p>
              <input
                id="comprovante-file-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {previewUrl && (
              <div className="flex justify-center">
                <div className="rounded-lg border overflow-hidden bg-muted/30 inline-flex items-center justify-center relative">
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
                    onClick={(e) => { e.stopPropagation(); setFile(null); URL.revokeObjectURL(previewUrl); setPreviewUrl(""); }}
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {isPdf ? (
                    <embed src={previewUrl} type="application/pdf" style={{ maxHeight: 300, width: 400 }} />
                  ) : (
                    <img src={previewUrl} alt="Preview" style={{ maxHeight: 300, borderRadius: 8 }} />
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={analyze} disabled={!contaId || !file || loading}>
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {loading ? "Analisando comprovante..." : "Analisar Comprovante"}
                {!loading && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Conferência */}
        {step === 1 && (
          <div className="space-y-4">
            {aiFailed ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Não foi possível analisar o comprovante automaticamente. Preencha os dados manualmente.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" style={{ color: "#0EA5E9" }} />
                Confira os dados extraídos do comprovante e ajuste se necessário.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Form */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {labelWithSparkle("Data", "data")}
                    <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                  </div>
                  <div>
                    {labelWithSparkle("Tipo", "tipo")}
                    <Select value={form.tipo} onValueChange={(v: "entrada" | "saida") => setForm({ ...form, tipo: v, categoria_id: "", fornecedor_id: "", cliente_id: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  {labelWithSparkle("Valor (R$)", "valor")}
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor}
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  {labelWithSparkle("Descrição", "descricao")}
                  <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição da transação" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {labelWithSparkle(form.tipo === "saida" ? "Destinatário" : "Remetente", "contraparte_nome")}
                    <Input value={form.contraparte_nome} onChange={e => setForm({ ...form, contraparte_nome: e.target.value })} placeholder="Nome" />
                  </div>
                  <div>
                    {labelWithSparkle("CPF/CNPJ", "contraparte_documento")}
                    <Input value={form.contraparte_documento} onChange={e => setForm({ ...form, contraparte_documento: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {labelWithSparkle("Tipo de Transação", "tipo_transacao")}
                    <Select value={form.tipo_transacao || undefined} onValueChange={v => setForm({ ...form, tipo_transacao: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_TRANSACAO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {labelWithSparkle("ID da Transação", "id_transacao")}
                    <Input value={form.id_transacao} onChange={e => setForm({ ...form, id_transacao: e.target.value })} placeholder="E2E / autenticação" />
                  </div>
                </div>

                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria_id || undefined} onValueChange={v => setForm({ ...form, categoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {categoriaOptions.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.tipo === "saida" ? (
                  <div>
                    <Label>
                      Fornecedor
                      {aiFields.has("contraparte_nome") && form.fornecedor_id && <AISparkle />}
                    </Label>
                    <Select value={form.fornecedor_id || undefined} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>
                      Cliente
                      {aiFields.has("contraparte_nome") && form.cliente_id && <AISparkle />}
                    </Label>
                    <Select value={form.cliente_id || undefined} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>
                        {clientes.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="lg:sticky lg:top-0 lg:self-start">
                <Label>Comprovante</Label>
                <div className="rounded-lg border overflow-hidden bg-muted/30 flex items-center justify-center mt-1">
                  {isPdf ? (
                    <embed src={previewUrl} type="application/pdf" style={{ height: 400, width: "100%" }} />
                  ) : (
                    <img src={previewUrl} alt="Comprovante" style={{ maxHeight: 400, borderRadius: 8 }} />
                  )}
                </div>
                {extracted && (
                  <Badge variant="secondary" className="mt-2 gap-1">
                    <Sparkles className="h-3 w-3" style={{ color: "#0EA5E9" }} /> Dados extraídos pela IA
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Confirmar Registro
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      {confirmDialogEl}
    </Dialog>
  );
}
