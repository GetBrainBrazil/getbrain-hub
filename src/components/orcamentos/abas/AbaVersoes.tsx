import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileSearch, Loader2, RefreshCw } from "lucide-react";
import { useProposalVersions } from "@/hooks/orcamentos/useProposalVersions";
import { useProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { useGenerateProposalPDF } from "@/hooks/orcamentos/useGenerateProposalPDF";
import { SnapshotViewerDialog } from "../SnapshotViewerDialog";
import { openProposalPdf } from "@/lib/orcamentos/storage";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

interface Props {
  proposalId: string;
}

export function AbaVersoes({ proposalId }: Props) {
  const { data, isLoading } = useProposalVersions(proposalId);
  const { data: proposal } = useProposalDetail(proposalId);
  const regen = useGenerateProposalPDF();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [viewSnapshot, setViewSnapshot] = useState<Record<string, any> | null>(
    null
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<string>("");

  async function handleRegenerate() {
    if (!proposal) {
      toast.error("Proposta ainda carregando");
      return;
    }
    const ok = await confirm({
      title: "Regenerar PDF?",
      description:
        "Cria uma nova versão do PDF usando o conteúdo atual da proposta. As versões anteriores são preservadas.",
      confirmLabel: "Regenerar",
    });
    if (!ok) return;
    regen.mutate({
      proposalId,
      proposal,
      templateKey: (proposal as any).template_key,
      isRegeneration: true,
      triggerDownload: false,
    });
  }

  async function handleDownload(versionId: string, path: string) {
    setDownloadingId(versionId);
    try {
      await openProposalPdf(path);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
        Carregando versões…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <>
        <Card className="p-6 text-center text-sm text-muted-foreground border-dashed space-y-3">
          <p>Nenhum PDF gerado ainda.</p>
          <Button
            size="sm"
            onClick={handleRegenerate}
            disabled={regen.isPending || !proposal}
          >
            {regen.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Gerar primeira versão
          </Button>
        </Card>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={regen.isPending || !proposal}
        >
          {regen.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Regenerar PDF
        </Button>
      </div>
      <div className="space-y-2">
        {data.map((v, i) => {
          const isCurrent = i === 0;
          const dt = new Date(v.generated_at);
          return (
            <Card
              key={v.id}
              className="p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm">
                    v{v.version_number}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] uppercase tracking-wider text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5 font-semibold">
                      versão atual
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {dt.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingId === v.id}
                onClick={() => handleDownload(v.id, v.pdf_storage_path || v.pdf_url)}
              >
                {downloadingId === v.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}{" "}
                PDF
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setViewSnapshot(v.snapshot);
                  setSnapshotMeta(`v${v.version_number} · ${dt.toLocaleString("pt-BR")}`);
                }}
              >
                <FileSearch className="h-3.5 w-3.5" /> Snapshot
              </Button>
            </Card>
          );
        })}
      </div>
      <SnapshotViewerDialog
        snapshot={viewSnapshot}
        meta={snapshotMeta}
        onClose={() => setViewSnapshot(null)}
      />
      {confirmDialog}
    </>
  );
}
