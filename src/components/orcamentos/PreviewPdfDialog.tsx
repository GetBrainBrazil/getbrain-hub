/**
 * Diálogo que pré-visualiza o PDF de uma proposta usando React-PDF
 * sem fazer upload nem criar versão. Útil pro editor checar layout antes
 * de gerar definitivamente.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { renderProposalPdfPreview } from "@/hooks/orcamentos/useGenerateProposalPDF";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposal: any;
  templateKey?: string | null;
}

export function PreviewPdfDialog({ open, onOpenChange, proposal, templateKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    renderProposalPdfPreview(proposal, templateKey)
      .then((res) => {
        if (cancelled) {
          URL.revokeObjectURL(res.url);
          return;
        }
        setUrl(res.url);
      })
      .catch((e: any) => {
        toast.error(e?.message || "Falha ao renderizar pré-visualização");
        onOpenChange(false);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-sm">
            Pré-visualização do PDF — não cria versão
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 bg-muted/30">
          {loading || !url ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Renderizando PDF…
            </div>
          ) : (
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
