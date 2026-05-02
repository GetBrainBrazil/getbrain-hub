/**
 * PreviewPane — iframe ao vivo da página pública usado em "lado a lado".
 *
 * Comunicação com o iframe via postMessage (same-origin):
 *  - send "scroll-to" { section } → faz scrollIntoView na seção e destaca
 *  - send "settings-changed"     → re-fetcha page_settings sem reload
 *  - send "proposal-patch" { patch } → merge in-memory dos campos por-proposta
 *  - receives "ready"            → libera fila de mensagens pendentes
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye, RefreshCw, Loader2, AlertTriangle, Send, MonitorSmartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { cn } from "@/lib/utils";

interface Props {
  proposal: ProposalDetail;
  /** Bumped quando settings globais mudam (força reload do iframe) */
  externalRefreshKey?: number;
  /** Estilo opcional (h-full quando dentro de aside) */
  className?: string;
  onOpenInNewTab: () => void;
  onOpenSendDialog: () => void;
}

export interface PreviewPaneHandle {
  scrollToSection: (section: string) => void;
  applyProposalPatch: (patch: Record<string, any>) => void;
  notifySettingsChanged: () => void;
  reload: () => void;
}

export const PreviewPane = forwardRef<PreviewPaneHandle, Props>(function PreviewPane(
  { proposal, externalRefreshKey = 0, className, onOpenInNewTab, onOpenSendDialog },
  ref,
) {
  const accessToken = (proposal as any).access_token as string | null;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<any[]>([]);
  const [previewJwt, setPreviewJwt] = useState<string | null>(null);
  const [loadingJwt, setLoadingJwt] = useState(false);
  const [jwtError, setJwtError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

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

  // Reseta o gate de "ready" quando o iframe é remontado (refresh ou bust externo)
  useEffect(() => {
    readyRef.current = false;
  }, [refreshKey, externalRefreshKey, previewJwt]);

  // Listener para "ready" do iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "preview-ready") {
        readyRef.current = true;
        // descarrega fila
        const q = queueRef.current.splice(0);
        for (const m of q) postToFrame(m);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function postToFrame(msg: any) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (!readyRef.current) {
      queueRef.current.push(msg);
      return;
    }
    win.postMessage(msg, window.location.origin);
  }

  useImperativeHandle(ref, () => ({
    scrollToSection: (section: string) => postToFrame({ type: "scroll-to", section }),
    applyProposalPatch: (patch) => postToFrame({ type: "proposal-patch", patch }),
    notifySettingsChanged: () => postToFrame({ type: "settings-changed" }),
    reload: () => {
      readyRef.current = false;
      queueRef.current = [];
      setRefreshKey((k) => k + 1);
    },
  }));

  const previewSrc = accessToken && previewJwt
    ? `/p/${accessToken}?preview=${encodeURIComponent(previewJwt)}&_=${refreshKey}_${externalRefreshKey}`
    : null;

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hidden sm:inline">
            Preview ao vivo
          </span>
          {accessToken && (
            <span className="text-[10px] text-muted-foreground/70 font-mono truncate hidden md:inline">
              /p/{accessToken.slice(0, 6)}…
            </span>
          )}
        </div>
        {accessToken && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="icon" variant={device === "desktop" ? "secondary" : "ghost"}
              className="h-7 w-7"
              title="Desktop"
              onClick={() => setDevice("desktop")}
            >
              <MonitorSmartphone className="h-3.5 w-3.5 rotate-0" />
            </Button>
            <Button
              size="icon" variant={device === "mobile" ? "secondary" : "ghost"}
              className="h-7 w-7"
              title="Mobile"
              onClick={() => setDevice("mobile")}
            >
              <span className="text-[11px] font-bold">M</span>
            </Button>
            <span className="w-px h-4 bg-border mx-1" />
            <Button
              size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => { fetchJwt(); setRefreshKey((k) => k + 1); }}
              disabled={loadingJwt}
              title="Recarregar"
            >
              {loadingJwt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onOpenInNewTab} title="Abrir em nova aba">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Iframe ou estados vazios */}
      <div className="flex-1 min-h-0 bg-muted/20 flex items-center justify-center">
        {!accessToken ? (
          <div className="p-6 text-center space-y-2">
            <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground">A página pública ainda não foi gerada.</p>
            <Button size="sm" onClick={onOpenSendDialog} className="bg-accent hover:bg-accent/90">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Gerar e enviar
            </Button>
          </div>
        ) : jwtError ? (
          <div className="p-6 text-center space-y-2 max-w-xs">
            <AlertTriangle className="h-7 w-7 text-amber-500/60 mx-auto" />
            <p className="text-xs">Não foi possível gerar o preview</p>
            <p className="text-[11px] text-muted-foreground">{jwtError}</p>
            <Button size="sm" variant="outline" onClick={fetchJwt}>Tentar de novo</Button>
          </div>
        ) : !previewSrc ? (
          <div className="p-6 text-center">
            <Loader2 className="h-5 w-5 text-muted-foreground/50 mx-auto animate-spin" />
            <p className="text-[11px] text-muted-foreground mt-2">Carregando…</p>
          </div>
        ) : (
          <div className={cn(
            "h-full w-full flex items-start justify-center overflow-auto",
            device === "mobile" && "py-4",
          )}>
            <iframe
              ref={iframeRef}
              key={`${refreshKey}-${externalRefreshKey}`}
              src={previewSrc}
              title="Preview"
              className={cn(
                "border-0 bg-background shadow-lg transition-all",
                device === "desktop" ? "w-full h-full" : "rounded-2xl",
              )}
              style={device === "mobile" ? { width: 390, height: "min(100%, 844px)", maxHeight: "100%" } : undefined}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
});
