import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileSearch, Loader2 } from "lucide-react";
import { useProposalVersions } from "@/hooks/orcamentos/useProposalVersions";
import { SnapshotViewerDialog } from "../SnapshotViewerDialog";
import { openProposalPdf } from "@/lib/orcamentos/storage";
import { toast } from "sonner";

interface Props {
  proposalId: string;
}

export function AbaVersoes({ proposalId }: Props) {
  const { data, isLoading } = useProposalVersions(proposalId);
  const [viewSnapshot, setViewSnapshot] = useState<Record<string, any> | null>(
    null
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<string>("");

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
  const [snapshotMeta, setSnapshotMeta] = useState<string>("");

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
      <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
        Nenhum PDF gerado ainda. Vá pro editor e clique em "PDF" pra gerar a
        primeira versão.
      </Card>
    );
  }

  return (
    <>
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
                onClick={() => window.open(v.pdf_url, "_blank")}
              >
                <Download className="h-3.5 w-3.5" /> PDF
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
    </>
  );
}
