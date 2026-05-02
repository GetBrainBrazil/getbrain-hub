/**
 * SubTab "Pré-visualização" — iframe ao vivo da página pública.
 * Lógica idêntica à anterior, isolada em um componente.
 */
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye, RefreshCw, Send, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  /** Incrementa quando settings globais mudam, força refresh do iframe */
  externalRefreshKey?: number;
}

export function SubTabPreview({ proposal, onPreviewAsClient, onOpenSendDialog, externalRefreshKey = 0 }: Props) {
  const accessToken = (proposal as any).access_token as string | null;
  const [previewJwt, setPreviewJwt] = useState<string | null>(null);
  const [loadingJwt, setLoadingJwt] = useState(false);
  const [jwtError, setJwtError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchJwt = useCallback(async () => {
    if (!accessToken) return;
    setLoadingJwt(true);
    setJwtError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "preview-proposal-as-internal",
        { body: { proposal_id: proposal.id } },
      );
      if (error) throw error;
      const jwt = (data as any)?.access_jwt as string | undefined;
      if (!jwt) throw new Error("Falha ao gerar token de preview");
      setPreviewJwt(jwt);
    } catch (e: any) {
      setJwtError(e?.message || "Falha ao gerar preview");
    } finally {
      setLoadingJwt(false);
    }
  }, [accessToken, proposal.id]);

  useEffect(() => {
    if (accessToken && !previewJwt) fetchJwt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const previewSrc = accessToken && previewJwt
    ? `/p/${accessToken}?preview=${encodeURIComponent(previewJwt)}&_=${refreshKey}_${externalRefreshKey}`
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pré-visualização ao vivo
          </h3>
          {accessToken && (
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              /p/{accessToken.slice(0, 8)}…
            </span>
          )}
        </div>
        {accessToken && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm" variant="ghost" className="h-7"
              onClick={() => { fetchJwt(); setRefreshKey((k) => k + 1); }}
              disabled={loadingJwt}
              title="Recarregar preview"
            >
              {loadingJwt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={onPreviewAsClient} title="Abrir em nova aba">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {!accessToken ? (
        <div className="p-10 text-center space-y-3">
          <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm">A página pública ainda não foi gerada.</p>
          <Button onClick={onOpenSendDialog} className="bg-accent hover:bg-accent/90">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Gerar e enviar
          </Button>
        </div>
      ) : jwtError ? (
        <div className="p-10 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500/60 mx-auto" />
          <p className="text-sm">Não foi possível gerar o preview</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{jwtError}</p>
          <Button size="sm" variant="outline" onClick={fetchJwt}>Tentar de novo</Button>
        </div>
      ) : !previewSrc ? (
        <div className="p-10 text-center space-y-2">
          <Loader2 className="h-6 w-6 text-muted-foreground/40 mx-auto animate-spin" />
          <p className="text-xs text-muted-foreground">Gerando token de preview…</p>
        </div>
      ) : (
        <div className="bg-muted/20" style={{ height: "min(75vh, 900px)" }}>
          <iframe
            key={`${refreshKey}-${externalRefreshKey}`}
            src={previewSrc}
            className="w-full h-full border-0"
            title="Pré-visualização da página pública"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
    </Card>
  );
}
