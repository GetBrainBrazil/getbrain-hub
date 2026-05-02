/**
 * Tab "Página Pública" — preview ao vivo da página que o cliente vê + bloco
 * de acesso (link, senha, ver como cliente) + mockup interativo.
 *
 * Iframe estratégia: usa `preview-proposal-as-internal` para obter um JWT
 * curto (5min) e renderizar a página pública real em /p/{token}?preview={jwt},
 * pulando o gate de senha. Recarrega o JWT sob demanda.
 */
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye, RefreshCw, Send, Loader2, AlertTriangle } from "lucide-react";
import { AcessoClienteCard } from "@/components/orcamentos/AcessoClienteCard";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  proposal: ProposalDetail;
  state: {
    clientName: string;
    mockupUrl: string;
  };
  setField: (field: any, value: any) => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  onPasswordUpdated: () => void;
}

export function TabPaginaPublica({
  proposal,
  state,
  setField,
  onPreviewAsClient,
  onOpenSendDialog,
  onPasswordUpdated,
}: Props) {
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

  // Busca JWT na primeira montagem da tab quando há token público.
  useEffect(() => {
    if (accessToken && !previewJwt) fetchJwt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const previewSrc = accessToken && previewJwt
    ? `/p/${accessToken}?preview=${encodeURIComponent(previewJwt)}&_=${refreshKey}`
    : null;

  return (
    <div className="space-y-4">
      {/* Acesso do cliente */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acesso do cliente
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Link público + senha + opção de visualizar como o cliente vê.
            </p>
          </div>
          {accessToken && (
            <Button size="sm" variant="outline" onClick={onPreviewAsClient} className="h-8">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Abrir em nova aba
            </Button>
          )}
        </div>
        <AcessoClienteCard
          proposalId={proposal.id}
          proposalCode={proposal.code}
          clientName={state.clientName || proposal.client_company_name}
          accessToken={accessToken}
          passwordPlain={(proposal as any).access_password_plain ?? null}
          hasPasswordHash={!!(proposal as any).access_password_hash}
          onPasswordUpdated={onPasswordUpdated}
        />
      </Card>

      {/* Mockup interativo */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mockup interativo
          </h3>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
            Beta
          </span>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">URL do mockup</Label>
          <Input
            value={state.mockupUrl}
            onChange={(e) => setField("mockupUrl", e.target.value)}
            placeholder="https://figma.com/proto/… ou https://..."
            className="h-9 mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            CTA destacado na página pública e QR code no PDF.
          </p>
        </div>
      </Card>

      {/* Preview ao vivo */}
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
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  fetchJwt();
                  setRefreshKey((k) => k + 1);
                }}
                disabled={loadingJwt}
                title="Recarregar preview (renova token)"
              >
                {loadingJwt ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={onPreviewAsClient}
                title="Abrir em nova aba"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {!accessToken ? (
          <div className="p-10 text-center space-y-3">
            <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-foreground">A página pública ainda não foi gerada.</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Quando você gerar e enviar a proposta, um link único e protegido por senha
              será criado para o cliente acessar.
            </p>
            <Button onClick={onOpenSendDialog} className="bg-accent hover:bg-accent/90">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Gerar e enviar
            </Button>
          </div>
        ) : jwtError ? (
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500/60 mx-auto" />
            <p className="text-sm text-foreground">Não foi possível gerar o preview</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{jwtError}</p>
            <Button size="sm" variant="outline" onClick={fetchJwt}>
              Tentar de novo
            </Button>
          </div>
        ) : !previewSrc ? (
          <div className="p-10 text-center space-y-2">
            <Loader2 className="h-6 w-6 text-muted-foreground/40 mx-auto animate-spin" />
            <p className="text-xs text-muted-foreground">Gerando token de preview…</p>
          </div>
        ) : (
          <div className="bg-muted/20" style={{ height: "min(75vh, 900px)" }}>
            <iframe
              key={refreshKey}
              src={previewSrc}
              className="w-full h-full border-0"
              title="Pré-visualização da página pública"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
