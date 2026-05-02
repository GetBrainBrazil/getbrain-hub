/**
 * SubTab "Acesso" — link público, senha, mockup interativo e, abaixo,
 * a pré-visualização ao vivo da página pública.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, Send } from "lucide-react";
import { AcessoClienteCard } from "@/components/orcamentos/AcessoClienteCard";
import { SubTabPreview } from "./SubTabPreview";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
  state: { clientName: string; mockupUrl: string };
  setField: (field: any, value: any) => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  onPasswordUpdated: () => void;
  /** Bumped quando o conteúdo global muda → força reload do iframe */
  previewBust?: number;
}

export interface SubTabAcessoHandle {
  scrollToPreview: () => void;
}

export const SubTabAcesso = forwardRef<SubTabAcessoHandle, Props>(function SubTabAcesso(
  { proposal, state, setField, onPreviewAsClient, onOpenSendDialog, onPasswordUpdated, previewBust = 0 },
  ref,
) {
  const accessToken = (proposal as any).access_token as string | null;
  const previewRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToPreview: () => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  return (
    <div className="space-y-4">
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

      {/* Pré-visualização ao vivo — embutida abaixo do mockup */}
      <div ref={previewRef} className="scroll-mt-4">
        <SubTabPreview
          proposal={proposal}
          onPreviewAsClient={onPreviewAsClient}
          onOpenSendDialog={onOpenSendDialog}
          externalRefreshKey={previewBust}
        />
      </div>
    </div>
  );
});
