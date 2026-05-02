/**
 * Diálogo que pré-visualiza o PDF de uma proposta usando React-PDF
 * sem fazer upload nem criar versão. Útil pro editor checar layout antes
 * de gerar definitivamente.
 *
 * UX:
 *  - Etapas de progresso visíveis (montando layout → renderizando → pronto).
 *  - Timeout de 30s com fallback "Baixar em vez disso".
 *  - Erros mostrados inline com botão de retry — não fecha o dialog do nada.
 *  - Header com ações: baixar e abrir em nova aba.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, AlertTriangle, RefreshCw } from "lucide-react";
import { renderProposalPdfPreview } from "@/hooks/orcamentos/useGenerateProposalPDF";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposal: any;
  templateKey?: string | null;
}

type Stage = "idle" | "preparing" | "rendering" | "ready" | "error" | "timeout";

export function PreviewPdfDialog({ open, onOpenChange, proposal, templateKey }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      setStage("idle");
      setError(null);
      return;
    }
    let cancelled = false;
    setStage("preparing");
    setError(null);
    startedAt.current = Date.now();

    // micro delay p/ a UI mostrar a etapa "preparing" antes do trabalho pesado
    const prepTimer = setTimeout(() => {
      if (cancelled) return;
      setStage("rendering");
      renderProposalPdfPreview(proposal, templateKey)
        .then((res) => {
          if (cancelled) {
            URL.revokeObjectURL(res.url);
            return;
          }
          setUrl(res.url);
          setStage("ready");
        })
        .catch((e: any) => {
          if (cancelled) return;
          setError(e?.message || "Falha ao renderizar pré-visualização");
          setStage("error");
        });
    }, 60);

    // Timeout de 30s — sugere baixar
    const timeoutTimer = setTimeout(() => {
      if (cancelled) return;
      setStage((s) => (s === "rendering" ? "timeout" : s));
    }, 30_000);

    return () => {
      cancelled = true;
      clearTimeout(prepTimer);
      clearTimeout(timeoutTimer);
    };
  }, [open, attempt, proposal, templateKey]);

  function handleRetry() {
    setAttempt((n) => n + 1);
  }

  function handleDownload() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${proposal?.code || "preview"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleOpenInTab() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between gap-2">
          <DialogTitle className="text-sm flex-1">
            Pré-visualização do PDF — não cria versão
          </DialogTitle>
          {stage === "ready" && url && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8" onClick={handleOpenInTab}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Abrir em nova aba
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Baixar
              </Button>
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 bg-muted/30 overflow-hidden">
          {stage === "preparing" && (
            <ProgressState label="Montando layout…" />
          )}
          {stage === "rendering" && (
            <ProgressState label="Renderizando páginas… isso pode levar alguns segundos" />
          )}
          {stage === "timeout" && (
            <ErrorState
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              title="A renderização está demorando mais que o normal"
              hint="Propostas com muito conteúdo podem travar a aba. Recomendamos baixar o arquivo direto."
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Tentar novamente
                  </Button>
                </>
              }
            />
          )}
          {stage === "error" && (
            <ErrorState
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              title="Não foi possível renderizar o PDF"
              hint={error || "Erro desconhecido"}
              actions={
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar novamente
                </Button>
              }
            />
          )}
          {stage === "ready" && url && (
            <iframe
              title="Pré-visualização PDF"
              src={url}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressState({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {label}
    </div>
  );
}

function ErrorState({
  icon,
  title,
  hint,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="rounded-full p-3 bg-muted">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">{hint}</p>
      </div>
      <div className="flex items-center gap-2 mt-2">{actions}</div>
    </div>
  );
}
