import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { CheckCircle2 } from "lucide-react";

/**
 * Editor markdown unificado do sistema.
 *
 * - Toolbar: negrito, itálico, listas, lista numerada, checklist e alinhamento.
 * - Auto-save no blur (chama onSave apenas se o valor mudou).
 * - Suporte a `[]`, `[ ]`, `[x]` no parser do RichTextView.
 * - Continuação automática de listas ao pressionar Enter.
 */
export interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  /**
   * Chamado quando o usuário sai do textarea (blur) ou pressiona Ctrl/Cmd+Enter.
   * Receba o valor atual e persista — somente é chamado quando difere do baseline.
   */
  onSave?: (value: string) => void | Promise<void>;
  /** Chamado ao pressionar Esc */
  onCancel?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

export const RichTextEditor = forwardRef<HTMLTextAreaElement, RichTextEditorProps>(
  function RichTextEditor(
    { value, onChange, onSave, onCancel, placeholder, rows = 6, className, autoFocus = true },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const baselineRef = useRef(value);
    useEffect(() => {
      baselineRef.current = value;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function maybeSave() {
      if (!onSave) return;
      const cur = innerRef.current?.value ?? value;
      if (cur === baselineRef.current) return;
      baselineRef.current = cur;
      onSave(cur);
    }

    return (
      <div className="space-y-2">
        <MarkdownToolbar textareaRef={innerRef} setDraft={onChange} />
        <Textarea
          ref={innerRef}
          autoFocus={autoFocus}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.closest?.("[data-md-toolbar]")) return;
            maybeSave();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel?.();
              return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              maybeSave();
              return;
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
              e.preventDefault();
              wrapSelection(e.currentTarget, "**", onChange, "negrito");
              return;
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === "i" || e.key === "I")) {
              e.preventDefault();
              wrapSelection(e.currentTarget, "*", onChange, "itálico");
              return;
            }
            if (e.key === "Enter") {
              const ta = e.currentTarget;
              const before = ta.value.slice(0, ta.selectionStart);
              const lineStart = before.lastIndexOf("\n") + 1;
              const line = before.slice(lineStart);
              const m = line.match(/^(\s*)([-*]\s\[[ xX]?\]\s|[-*]\s|\d+\.\s)/);
              if (m) {
                e.preventDefault();
                const prefix = m[1] + m[2].replace(/\[[xX]\]/, "[ ]").replace(/\[\]/, "[ ]");
                if (line.trim() === m[2].trim()) {
                  const start = lineStart;
                  const end = ta.selectionStart;
                  const newVal = ta.value.slice(0, start) + ta.value.slice(end);
                  onChange(newVal);
                  requestAnimationFrame(() => {
                    ta.selectionStart = ta.selectionEnd = start;
                  });
                } else {
                  insertAtCursor(ta, "\n" + prefix, onChange);
                }
              }
            }
          }}
          className={cn("resize-y font-mono text-sm", className)}
        />
        <p className="text-[11px] text-muted-foreground">
          Salva ao sair do campo · ⌘/Ctrl+Enter salva · Esc cancela
        </p>
      </div>
    );
  },
);

// =============== Toolbar ===============

function MarkdownToolbar({
  textareaRef,
  setDraft,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  setDraft: (v: string) => void;
}) {
  const act = (fn: (ta: HTMLTextAreaElement) => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    const ta = textareaRef.current;
    if (!ta) return;
    fn(ta);
  };

  return (
    <div
      data-md-toolbar
      className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/20 p-1"
    >
      <ToolbarButton
        title="Negrito (Ctrl+B)"
        onMouseDown={act((ta) => wrapSelection(ta, "**", setDraft, "negrito"))}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Itálico (Ctrl+I)"
        onMouseDown={act((ta) => wrapSelection(ta, "*", setDraft, "itálico"))}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        title="Lista com marcadores"
        onMouseDown={act((ta) => prefixLines(ta, "- ", setDraft))}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        onMouseDown={act((ta) => prefixLines(ta, (i) => `${i + 1}. `, setDraft))}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Checklist"
        onMouseDown={act((ta) => prefixLines(ta, "- [ ] ", setDraft))}
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        title="Alinhar à esquerda"
        onMouseDown={act((ta) => setLineAlignment(ta, "left", setDraft))}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Centralizar"
        onMouseDown={act((ta) => setLineAlignment(ta, "center", setDraft))}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Alinhar à direita"
        onMouseDown={act((ta) => setLineAlignment(ta, "right", setDraft))}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Justificar"
        onMouseDown={act((ta) => setLineAlignment(ta, "justify", setDraft))}
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  children,
  title,
  onMouseDown,
}: {
  children: React.ReactNode;
  title: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

// =============== Helpers ===============

function insertAtCursor(
  ta: HTMLTextAreaElement,
  text: string,
  setDraft: (v: string) => void,
) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const newVal = ta.value.slice(0, start) + text + ta.value.slice(end);
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + text.length;
  });
}

function wrapSelection(
  ta: HTMLTextAreaElement,
  wrapper: string,
  setDraft: (v: string) => void,
  placeholder = "texto",
) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || placeholder;
  const newVal =
    ta.value.slice(0, start) + wrapper + selected + wrapper + ta.value.slice(end);
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = start + wrapper.length;
    ta.selectionEnd = start + wrapper.length + selected.length;
  });
}

function prefixLines(
  ta: HTMLTextAreaElement,
  prefix: string | ((idx: number) => string),
  setDraft: (v: string) => void,
) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const sel = ta.value.slice(start, end) || "";
  const after = ta.value.slice(end);
  const lineStart = before.lastIndexOf("\n") + 1;
  const head = ta.value.slice(lineStart, start);
  const block = head + sel;
  const lines = block.split("\n");
  const transformed = lines
    .map((l, i) =>
      l.match(/^(\s*)([-*]\s\[[ xX]?\]\s|[-*]\s|\d+\.\s)/)
        ? l
        : (typeof prefix === "function" ? prefix(i) : prefix) + l,
    )
    .join("\n");
  const newVal = ta.value.slice(0, lineStart) + transformed + after;
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = lineStart;
    ta.selectionEnd = lineStart + transformed.length;
  });
}

const ALIGN_RE = /^::(left|center|right|justify)::\s?/;

function setLineAlignment(
  ta: HTMLTextAreaElement,
  align: "left" | "center" | "right" | "justify",
  setDraft: (v: string) => void,
) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const sel = ta.value.slice(start, end) || "";
  const after = ta.value.slice(end);
  const lineStart = before.lastIndexOf("\n") + 1;
  const head = ta.value.slice(lineStart, start);
  const block = head + sel;
  const lines = block.split("\n");
  const transformed = lines
    .map((l) => {
      const stripped = l.replace(ALIGN_RE, "");
      return align === "left" ? stripped : `::${align}:: ${stripped}`;
    })
    .join("\n");
  const newVal = ta.value.slice(0, lineStart) + transformed + after;
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = lineStart;
    ta.selectionEnd = lineStart + transformed.length;
  });
}

// =============== Renderizador (RichTextView) ===============

/**
 * Renderiza markdown salvo no banco. Suporta:
 * - **negrito**, *itálico*
 * - listas com `-`/`*`, listas numeradas `1.`
 * - checkboxes interativos: `- [ ]`, `- [x]`, `- []`, `[ ]`, `[x]`, `[]`
 * - alinhamento por linha via `::center::`, `::right::`, `::justify::`
 *
 * Se `onToggle` for fornecido e houver checkboxes, eles ficam clicáveis.
 */
export function RichTextView({
  text,
  onToggle,
}: {
  text: string;
  onToggle?: (next: string) => void;
}) {
  const lines = text.split("\n");

  // Detecta checkboxes em qualquer linha (com ou sem hífen)
  const taskMatches = lines.map((l, i) => {
    const m =
      l.match(/^(\s*)-\s+\[( |x|X|)\]\s*(.*)$/) ||
      l.match(/^(\s*)\[( |x|X|)\]\s*(.*)$/);
    if (m) {
      return {
        idx: i,
        indent: m[1] ?? "",
        checked: (m[2] ?? "").toLowerCase() === "x",
        label: m[3] ?? "",
      };
    }
    return null;
  });

  const hasTasks = taskMatches.some(Boolean) && !!onToggle;

  function toggle(idx: number) {
    if (!onToggle) return;
    const newLines = [...lines];
    const l = newLines[idx];
    const m1 = l.match(/^(\s*)-\s+\[( |x|X|)\]\s*(.*)$/);
    const m2 = l.match(/^(\s*)\[( |x|X|)\]\s*(.*)$/);
    const m = m1 ?? m2;
    if (!m) return;
    const next = (m[2] ?? "").toLowerCase() === "x" ? " " : "x";
    const indent = m[1] ?? "";
    const label = m[3] ?? "";
    newLines[idx] = `${indent}- [${next}] ${label}`;
    onToggle(newLines.join("\n"));
  }

  if (hasTasks) {
    const tasks = taskMatches.filter(Boolean) as Array<{
      idx: number;
      checked: boolean;
      label: string;
      indent: string;
    }>;
    const done = tasks.filter((t) => t.checked).length;
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {done} de {tasks.length} concluídos
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(done / tasks.length) * 100}%` }}
            />
          </div>
        </div>
        <ul className="space-y-1.5">
          {lines.map((raw, i) => {
            const t = taskMatches[i];
            if (t) {
              return (
                <li key={i} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      t.checked
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border hover:border-accent",
                    )}
                  >
                    {t.checked && <CheckCircle2 className="h-3 w-3" />}
                  </button>
                  <span
                    className={cn(
                      "text-sm",
                      t.checked && "text-muted-foreground line-through",
                    )}
                  >
                    {renderInline(t.label)}
                  </span>
                </li>
              );
            }
            return raw.trim() ? (
              <li key={i} className="text-sm text-foreground/80 list-none">
                {renderAlignedInline(raw)}
              </li>
            ) : null;
          })}
        </ul>
      </div>
    );
  }

  // Renderização padrão (parágrafos + listas)
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*[-*]\s/.test(line) && !/^\s*[-*]\s\[[ xX]?\]/.test(line)) {
      const items: string[] = [];
      while (
        i < lines.length &&
        /^\s*[-*]\s/.test(lines[i]) &&
        !/^\s*[-*]\s\[[ xX]?\]/.test(lines[i])
      ) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => (
            <li key={idx}>{renderAlignedInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="ml-4 list-decimal space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => (
            <li key={idx}>{renderAlignedInline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (line.trim() === "") {
      blocks.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }
    const { align, content } = stripAlignment(line);
    blocks.push(
      <p
        key={key++}
        className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
        style={align ? { textAlign: align } : undefined}
      >
        {renderInline(content)}
      </p>,
    );
    i++;
  }
  return <div className="space-y-1">{blocks}</div>;
}

function stripAlignment(line: string): {
  align: "left" | "center" | "right" | "justify" | null;
  content: string;
} {
  const m = line.match(ALIGN_RE);
  if (!m) return { align: null, content: line };
  return { align: m[1] as any, content: line.replace(ALIGN_RE, "") };
}

function renderAlignedInline(text: string): React.ReactNode {
  const { align, content } = stripAlignment(text);
  const inner = renderInline(content);
  if (!align) return <>{inner}</>;
  return <span style={{ display: "block", textAlign: align }}>{inner}</span>;
}

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) out.push(text.slice(lastIndex, m.index));
    if (m[2] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold text-foreground">
          {m[2]}
        </strong>,
      );
    } else if (m[3] !== undefined) {
      out.push(
        <em key={key++} className="italic">
          {m[3]}
        </em>,
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out.length ? out : [text];
}
