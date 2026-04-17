import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, X, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

export interface ComprovanteAIResult {
  data?: string;          // ISO yyyy-mm-dd
  valor?: number;
  conta_bancaria_id?: string; // matched by banco_origem/banco_destino
  bancoTexto?: string;    // raw banco text from AI for fallback display
  rawTipo?: "entrada" | "saida";
}

interface Props {
  /** Called when user selects/clears a file. Pass null when removed. */
  onFileChange: (file: File | null) => void;
  /** Called after successful AI analysis with extracted normalized fields. */
  onAIResult?: (res: ComprovanteAIResult) => void;
  /** Used to show the divergence alert (alert about mismatch with movimentação valor). */
  valorEsperado?: number;
  /** Used to match banco -> conta_bancaria_id */
  contas?: { id: string; nome: string; banco?: string | null }[];
}

function parseDateBR(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return s.substring(0, 10);
  return undefined;
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

function normalizeBancoStr(s?: string | null): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function matchConta(bancoTexto: string, contas: { id: string; nome: string; banco?: string | null }[]): string | undefined {
  const target = normalizeBancoStr(bancoTexto);
  if (!target) return;
  // Try exact, then includes either way
  let found = contas.find((c) => normalizeBancoStr(c.banco) === target || normalizeBancoStr(c.nome) === target);
  if (!found) found = contas.find((c) => {
    const b = normalizeBancoStr(c.banco);
    const n = normalizeBancoStr(c.nome);
    return (b && (target.includes(b) || b.includes(target))) || (n && (target.includes(n) || n.includes(target)));
  });
  return found?.id;
}

export function ComprovanteUploadField({ onFileChange, onAIResult, valorEsperado, contas = [] }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [valorIA, setValorIA] = useState<number | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFile = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAnalyzed(false);
    setAiFailed(false);
    setValorIA(null);
    if (!f) {
      setFile(null); setPreviewUrl(""); onFileChange(null); return;
    }
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(f.type)) {
      toast.error("Formato não suportado. Use JPG, PNG ou PDF.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    onFileChange(f);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setAiFailed(false);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-receipt", {
        body: { image: base64, mimeType: file.type },
      });
      if (error || !data?.data) throw new Error(error?.message || "Falha");
      const ex = data.data as any;
      const dataIso = parseDateBR(ex.data);
      const valor = typeof ex.valor === "number" ? ex.valor : parseFloat(ex.valor);
      const tipo: "entrada" | "saida" = ex.tipo === "entrada" ? "entrada" : "saida";
      const bancoTexto = (tipo === "saida" ? ex.banco_origem : ex.banco_destino) || ex.banco_origem || ex.banco_destino || "";
      const contaId = matchConta(bancoTexto, contas);

      setValorIA(!isNaN(valor) ? valor : null);
      setAnalyzed(true);

      onAIResult?.({
        data: dataIso,
        valor: !isNaN(valor) ? valor : undefined,
        conta_bancaria_id: contaId,
        bancoTexto,
        rawTipo: tipo,
      });
    } catch (err) {
      console.error(err);
      setAiFailed(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const isPdf = file?.type === "application/pdf";
  const divergencia = analyzed && valorIA != null && valorEsperado != null && Math.abs(valorIA - valorEsperado) > 0.01;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
        📎 Comprovante (opcional)
      </p>

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-md border border-dashed border-input bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
          style={{ height: 80 }}
        >
          <Upload className="h-4 w-4" />
          Anexar comprovante de pagamento
          <span className="text-[11px] opacity-70">(JPG, PNG, PDF)</span>
        </button>
      ) : (
        <div className="rounded-md border border-input bg-muted/20 p-2">
          <div className="flex items-center gap-3">
            {/* Preview thumb */}
            <div className="shrink-0 rounded border bg-background flex items-center justify-center overflow-hidden" style={{ width: 64, height: 64 }}>
              {isPdf ? (
                <FileText className="h-8 w-8 text-muted-foreground" />
              ) : (
                <img src={previewUrl} alt="" className="object-cover w-full h-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              {analyzed && !aiFailed && (
                <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "#0EA5E9" }}>
                  <Sparkles className="h-3 w-3" /> Campos preenchidos pela IA
                </p>
              )}
              {aiFailed && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Não foi possível analisar automaticamente</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!analyzed && !aiFailed && (
                <Button type="button" size="sm" variant="outline" onClick={analyze} disabled={analyzing} className="gap-1.5 h-8">
                  {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" style={{ color: "#0EA5E9" }} />}
                  {analyzing ? "Analisando comprovante..." : "Analisar com IA"}
                </Button>
              )}
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleFile(null)} aria-label="Remover">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {divergencia && (
            <div
              className="mt-2 rounded px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              O valor do comprovante ({formatCurrency(valorIA!)}) difere do valor da movimentação ({formatCurrency(valorEsperado!)}). Verifique se está correto.
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

/** Helper a página chama no submit para subir o comprovante e criar o anexo na movimentação. */
export async function uploadComprovanteToMovimentacao(file: File, movimentacaoId: string): Promise<void> {
  const ANEXOS_BUCKET = "anexos-movimentacoes";
  const path = `${movimentacaoId}/${Date.now()}-${file.name}`;
  const up = await supabase.storage.from(ANEXOS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const pub = supabase.storage.from(ANEXOS_BUCKET).getPublicUrl(path);
  const { data: userData } = await supabase.auth.getUser();
  const ins = await supabase.from("anexos").insert({
    nome_arquivo: file.name,
    url: pub.data.publicUrl,
    tipo: file.type || null,
    tamanho_bytes: file.size,
    movimentacao_id: movimentacaoId,
    uploaded_by: userData.user?.id || null,
    descricao: "Comprovante de pagamento",
  } as any);
  if (ins.error) throw ins.error;
}
