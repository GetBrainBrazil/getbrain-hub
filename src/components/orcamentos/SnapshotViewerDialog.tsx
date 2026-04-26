import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  snapshot: Record<string, any> | null;
  meta: string;
  onClose: () => void;
}

export function SnapshotViewerDialog({ snapshot, meta, onClose }: Props) {
  return (
    <Dialog open={!!snapshot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Snapshot — {meta}</DialogTitle>
          <DialogDescription>
            Estado da proposta no momento em que esta versão foi gerada.
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-muted/40 border border-border rounded p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-[60vh] overflow-y-auto">
          {snapshot ? JSON.stringify(snapshot, null, 2) : ""}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
