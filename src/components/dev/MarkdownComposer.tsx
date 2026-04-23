/**
 * Editor markdown leve com toggle "Escrever" / "Preview" no padrão GitHub.
 * Usa @uiw/react-md-editor pra escrita e react-markdown pra render final.
 */
import { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function MarkdownComposer({ value, onChange, placeholder, minHeight = 120 }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <Button
          variant={tab === "write" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setTab("write")}
        >
          Escrever
        </Button>
        <Button
          variant={tab === "preview" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setTab("preview")}
        >
          Preview
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">Markdown · Ctrl+Enter pra enviar</span>
      </div>
      {tab === "write" ? (
        <div data-color-mode="dark">
          <MDEditor
            value={value}
            onChange={(v) => onChange(v ?? "")}
            preview="edit"
            hideToolbar
            visibleDragbar={false}
            height={minHeight}
            textareaProps={{ placeholder }}
          />
        </div>
      ) : (
        <div className={cn("prose prose-sm prose-invert max-w-none px-3 py-3 min-h-[120px]")}>
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nada para visualizar.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Render-only de markdown (sem editor). */
export function MarkdownView({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn("prose prose-sm prose-invert max-w-none break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}

/** Editor split-view (write + preview lado a lado) para descrição da task. */
export function MarkdownSplitEditor({
  value,
  onChange,
  minHeight = 280,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
}) {
  return (
    <div data-color-mode="dark" className="rounded-md overflow-hidden border border-border">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={minHeight}
        preview="live"
        visibleDragbar={false}
      />
    </div>
  );
}
