/**
 * Aba "Anexos" do editor de proposta.
 *
 * - Drag-and-drop ou seletor pra upload (múltiplos arquivos).
 * - Preview thumbnail (imagens via signed URL, PDFs via ícone).
 * - Edição inline de label, kind e visibilidade (web/PDF).
 * - Reordenação por setas (sobe/desce) — drag-reorder fica pra um turno futuro.
 * - Exclusão com confirmação.
 *
 * O cliente final vê esses anexos na proposta web e (quando `show_in_pdf`) no PDF.
 */
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Network,
  File as FileIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  useProposalAttachments,
  useUploadAttachment,
  useUpdateAttachment,
  useDeleteAttachment,
  useReorderAttachments,
  getInternalAttachmentUrl,
  type AttachmentKind,
  type ProposalAttachment,
} from "@/hooks/orcamentos/useProposalAttachments";

const KIND_LABEL: Record<AttachmentKind, string> = {
  organograma: "Organograma",
  documento: "Documento",
  imagem: "Imagem",
  outro: "Outro",
};

function KindIcon({ kind, mime }: { kind: AttachmentKind; mime: string }) {
  if (kind === "organograma") return <Network className="h-5 w-5" />;
  if (kind === "imagem" || mime.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
  if (mime === "application/pdf" || kind === "documento") return <FileText className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AbaAnexos({ proposalId }: { proposalId: string }) {
  const { data: attachments = [], isLoading } = useProposalAttachments(proposalId);
  const upload = useUploadAttachment();
  const update = useUpdateAttachment();
  const del = useDeleteAttachment();
  const reorder = useReorderAttachments();
  const { confirm, dialog } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} tem mais de 25 MB — pule arquivos enormes ou compacte.`);
        continue;
      }
      try {
        await upload.mutateAsync({ proposalId, file });
        toast.success(`${file.name} anexado`);
      } catch (e: any) {
        toast.error(`Falha ao anexar ${file.name}: ${e?.message || "erro"}`);
      }
    }
  }

  function move(att: ProposalAttachment, dir: -1 | 1) {
    const idx = attachments.findIndex((a) => a.id === att.id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= attachments.length) return;
    const next = [...attachments];
    [next[idx], next[target]] = [next[target], next[idx]];
    reorder.mutate({ proposalId, orderedIds: next.map((a) => a.id) });
  }

  async function handleDelete(att: ProposalAttachment) {
    const ok = await confirm({
      title: "Remover anexo?",
      description: `"${att.label}" será removido da proposta. Essa ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    del.mutate(
      { id: att.id, proposalId, filePath: att.file_path },
      { onSuccess: () => toast.success("Anexo removido") },
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Anexos da proposta</h2>
        <p className="text-sm text-muted-foreground">
          Organogramas, documentos e imagens que vão aparecer na proposta web e
          (opcionalmente) no PDF enviado ao cliente.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">
          Arraste arquivos aqui ou clique pra selecionar
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, imagens (PNG/JPG/SVG), planilhas — até 25 MB por arquivo
        </p>
        {upload.isPending && (
          <p className="text-xs text-primary mt-2 inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Enviando…
          </p>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">
          Nenhum anexo ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att, idx) => (
            <AttachmentRow
              key={att.id}
              att={att}
              isFirst={idx === 0}
              isLast={idx === attachments.length - 1}
              onMoveUp={() => move(att, -1)}
              onMoveDown={() => move(att, 1)}
              onDelete={() => handleDelete(att)}
              onUpdate={(patch) =>
                update.mutate({ id: att.id, proposalId, patch })
              }
            />
          ))}
        </div>
      )}

      {dialog}
    </div>
  );
}

function AttachmentRow({
  att,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdate,
}: {
  att: ProposalAttachment;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<ProposalAttachment>) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [label, setLabel] = useState(att.label);

  useEffect(() => setLabel(att.label), [att.label]);

  useEffect(() => {
    if (!att.mime_type.startsWith("image/")) return;
    let cancelled = false;
    getInternalAttachmentUrl(att.file_path).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [att.file_path, att.mime_type]);

  function commitLabel() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === att.label) return;
    onUpdate({ label: trimmed });
  }

  return (
    <div className="rounded-lg border border-border p-3 flex flex-col md:flex-row md:items-center gap-3">
      {/* Thumb */}
      <div className="h-16 w-16 rounded bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
        {previewUrl ? (
          <img src={previewUrl} alt={att.label} className="h-full w-full object-cover" />
        ) : (
          <KindIcon kind={att.kind} mime={att.mime_type} />
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0 space-y-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          className="h-8 text-sm font-medium"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatBytes(att.size_bytes)}</span>
          <span>·</span>
          <span className="font-mono text-[10px]">{att.mime_type}</span>
        </div>
      </div>

      {/* Tipo */}
      <div className="w-full md:w-44">
        <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
        <Select
          value={att.kind}
          onValueChange={(v) => onUpdate({ kind: v as AttachmentKind })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABEL) as AttachmentKind[]).map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visibilidade */}
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={att.show_in_web}
            onCheckedChange={(v) => onUpdate({ show_in_web: v })}
          />
          Web
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={att.show_in_pdf}
            onCheckedChange={(v) => onUpdate({ show_in_pdf: v })}
          />
          PDF
        </label>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onMoveUp}
          disabled={isFirst}
          title="Subir"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onMoveDown}
          disabled={isLast}
          title="Descer"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        {previewUrl && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            asChild
            title="Abrir preview"
          >
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
