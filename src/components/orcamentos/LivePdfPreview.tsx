/**
 * Pré-visualização ao vivo do PDF dentro do editor de proposta.
 *
 * Renderiza o PDF React-PDF de forma debounced (500ms após o último
 * `proposalKey` mudar) e exibe num iframe. Substitui o antigo painel
 * HTML que reaproveitava `Page1Cover/Page2/Page3` (10B).
 *
 * Performance: o blob URL é revogado a cada novo render pra evitar leak.
 * Se o render demorar (>800ms) mostra um spinner overlay sem desmontar
 * o iframe anterior — evita "flash branco" durante a digitação.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { renderProposalPdfPreview } from "@/hooks/orcamentos/useGenerateProposalPDF";

interface Props {
  proposal: any;
  templateKey?: string | null;
  /** Chave que dispara re-render — geralmente um JSON estável dos campos. */
  proposalKey: string;
}

export function LivePdfPreview({ proposal, templateKey, proposalKey }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const res = await renderProposalPdfPreview(proposal, templateKey);
        if (cancelled) {
          URL.revokeObjectURL(res.url);
          return;
        }
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = res.url;
        setUrl(res.url);
      } catch (e) {
        console.error("[LivePdfPreview] erro ao renderizar", e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalKey]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-muted/30 rounded">
      {url ? (
        <iframe
          title="Pré-visualização ao vivo"
          src={`${url}#toolbar=0&navpanes=0`}
          className="w-full h-full border-0 rounded"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Renderizando pré-visualização…
        </div>
      )}
      {rendering && url && (
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur border border-border rounded-md px-2 py-1 text-[10px] flex items-center gap-1.5 shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          atualizando…
        </div>
      )}
    </div>
  );
}
