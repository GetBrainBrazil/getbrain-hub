import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code,
  Link as LinkIcon,
  Quote,
  Heading2,
  Heading3,
  Palette,
  CheckCircle2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Editor markdown unificado do sistema.
 *
 * Recursos:
 * - Toolbar flutuante que aparece SÓ quando o campo está em foco.
 * - Atalhos: Ctrl+B/I/U/E/K/Shift+S, listas e checklist.
 * - Markdown shortcuts ao digitar: "- ", "* ", "1. ", "[] ", "> ", "# ", "## ", "### ".
 * - Continuação automática de listas no Enter.
 * - Cor da letra (paleta do design system).
 * - Auto-save no blur (chama onSave apenas quando o valor muda).
 */

export interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** Auto-save chamado no blur ou Ctrl/Cmd+Enter, somente se diferente do baseline. */
  onSave?: (value: string) => void | Promise<void>;
  /** Chamado ao pressionar Esc */
  onCancel?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  /** minHeight em px (alternativa a rows) */
  minHeight?: number;
}

type ColorToken =
  | "default"
  | "primary"
  | "accent"
  | "destructive"
  | "warning"
  | "success"
  | "muted";

const COLOR_PALETTE: { id: ColorToken; label: string; cls: string; swatch: string }[] = [
  { id: "default", label: "Padrão", cls: "text-foreground", swatch: "bg-foreground" },
  { id: "primary", label: "Primária", cls: "text-primary", swatch: "bg-primary" },
  { id: "accent", label: "Destaque", cls: "text-accent", swatch: "bg-accent" },
  { id: "destructive", label: "Erro", cls: "text-destructive", swatch: "bg-destructive" },
  { id: "warning", label: "Atenção", cls: "text-amber-500", swatch: "bg-amber-500" },
  { id: "success", label: "Sucesso", cls: "text-emerald-500", swatch: "bg-emerald-500" },
  { id: "muted", label: "Discreta", cls: "text-muted-foreground", swatch: "bg-muted-foreground" },
];

export const RichTextEditor = forwardRef<HTMLTextAreaElement, RichTextEditorProps>(
  function RichTextEditor(
    { value, onChange, onSave, onCancel, placeholder, rows = 6, className, autoFocus = false, minHeight },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const baselineRef = useRef(value);
    const [focused, setFocused] = useState(false);

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
      <div className="relative">
        {/* Toolbar flutuante (focus-only) — posicionada absolute para não ocupar espaço no layout */}
        <div
          className={cn(
            "absolute left-0 right-0 bottom-full z-20 mb-1 flex items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-md border border-border bg-popover/95 px-1 py-0.5 shadow-md backdrop-blur-sm transition-all duration-150 [scrollbar-width:thin]",
            focused
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0",
          )}
          data-md-toolbar
        >
          <MarkdownToolbar textareaRef={innerRef} setDraft={onChange} />
        </div>

        <Textarea
          ref={innerRef}
          autoFocus={autoFocus}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.closest?.("[data-md-toolbar]")) return;
            setFocused(false);
            maybeSave();
          }}
          onKeyDown={(e) => handleKeyDown(e, onChange, maybeSave, onCancel)}
          style={minHeight ? { minHeight } : undefined}
          className={cn("resize-y font-mono text-sm leading-relaxed", className)}
        />
      </div>
    );
  },
);

// ============================================================
// Keyboard handling
// ============================================================

function handleKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  setDraft: (v: string) => void,
  maybeSave: () => void,
  onCancel?: () => void,
) {
  const ta = e.currentTarget;
  const mod = e.metaKey || e.ctrlKey;

  if (e.key === "Escape") {
    e.preventDefault();
    ta.blur();
    onCancel?.();
    return;
  }
  if (mod && e.key === "Enter") {
    e.preventDefault();
    maybeSave();
    return;
  }

  // Atalhos de formatação
  if (mod && !e.shiftKey && (e.key === "b" || e.key === "B")) {
    e.preventDefault();
    wrapSelection(ta, "**", setDraft, "negrito");
    return;
  }
  if (mod && !e.shiftKey && (e.key === "i" || e.key === "I")) {
    e.preventDefault();
    wrapSelection(ta, "*", setDraft, "itálico");
    return;
  }
  if (mod && !e.shiftKey && (e.key === "u" || e.key === "U")) {
    e.preventDefault();
    wrapSelection(ta, "__", setDraft, "sublinhado");
    return;
  }
  if (mod && e.shiftKey && (e.key === "s" || e.key === "S" || e.key === "X" || e.key === "x")) {
    e.preventDefault();
    wrapSelection(ta, "~~", setDraft, "riscado");
    return;
  }
  if (mod && !e.shiftKey && (e.key === "e" || e.key === "E")) {
    e.preventDefault();
    wrapSelection(ta, "`", setDraft, "código");
    return;
  }
  if (mod && !e.shiftKey && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    insertLink(ta, setDraft);
    return;
  }
  if (mod && e.shiftKey && e.key === "&") {
    // Ctrl+Shift+7 → numeradas (key '&' depende do layout, melhor ignorar atalho com tecla numérica)
  }

  // Markdown shortcuts ao digitar SPACE
  if (e.key === " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (tryMarkdownShortcut(ta, setDraft)) {
      e.preventDefault();
      return;
    }
  }

  // Continuação de listas no Enter
  if (e.key === "Enter" && !e.shiftKey && !mod) {
    const before = ta.value.slice(0, ta.selectionStart);
    const lineStart = before.lastIndexOf("\n") + 1;
    const line = before.slice(lineStart);
    const m = line.match(/^(\s*)([-*]\s\[[ xX]?\]\s|[-*]\s|\d+\.\s|>\s)/);
    if (m) {
      e.preventDefault();
      let prefix = m[1] + m[2].replace(/\[[xX]\]/, "[ ]").replace(/\[\]/, "[ ]");
      // numerada: incrementa
      const numMatch = m[2].match(/^(\d+)\.\s$/);
      if (numMatch) {
        const next = parseInt(numMatch[1], 10) + 1;
        prefix = m[1] + `${next}. `;
      }
      if (line.trim() === m[2].trim()) {
        // linha vazia: sai da lista
        const start = lineStart;
        const end = ta.selectionStart;
        const newVal = ta.value.slice(0, start) + ta.value.slice(end);
        setDraft(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start;
        });
      } else {
        insertAtCursor(ta, "\n" + prefix, setDraft);
      }
    }
  }
}

/**
 * Detecta se o usuário acabou de digitar `- `, `1. `, `[] `, `> `, `# ` etc.
 * Retorna true se substituiu (caller deve preventDefault no space).
 */
function tryMarkdownShortcut(
  ta: HTMLTextAreaElement,
  setDraft: (v: string) => void,
): boolean {
  const pos = ta.selectionStart;
  if (pos !== ta.selectionEnd) return false;

  const before = ta.value.slice(0, pos);
  const lineStart = before.lastIndexOf("\n") + 1;
  const linePrefix = before.slice(lineStart);

  // Mapeamento "input → resultado"
  const rules: { match: RegExp; replace: string }[] = [
    { match: /^[-*]$/, replace: "- " },
    { match: /^\d+[.)]$/, replace: linePrefix.replace(/^(\d+)[.)]/, "$1. ") },
    { match: /^\[\s?\]$/, replace: "- [ ] " },
    { match: /^>$/, replace: "> " },
    { match: /^#$/, replace: "# " },
    { match: /^##$/, replace: "## " },
    { match: /^###$/, replace: "### " },
  ];

  for (const r of rules) {
    if (r.match.test(linePrefix)) {
      const newLine = r.replace + " ".repeat(0); // espaço já vem do replace
      const newVal = ta.value.slice(0, lineStart) + newLine + ta.value.slice(pos);
      setDraft(newVal);
      const newCursor = lineStart + newLine.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = newCursor;
      });
      return true;
    }
  }
  return false;
}

// ============================================================
// Toolbar
// ============================================================

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
    <>
      {/* Inline format */}
      <ToolbarButton title="Negrito (Ctrl+B)" onMouseDown={act((ta) => wrapSelection(ta, "**", setDraft, "negrito"))}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Itálico (Ctrl+I)" onMouseDown={act((ta) => wrapSelection(ta, "*", setDraft, "itálico"))}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Sublinhado (Ctrl+U)" onMouseDown={act((ta) => wrapSelection(ta, "__", setDraft, "sublinhado"))}>
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Riscado (Ctrl+Shift+S)" onMouseDown={act((ta) => wrapSelection(ta, "~~", setDraft, "riscado"))}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton title="Título" onMouseDown={act((ta) => prefixLines(ta, "## ", setDraft))}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Subtítulo" onMouseDown={act((ta) => prefixLines(ta, "### ", setDraft))}>
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton title="Lista" onMouseDown={act((ta) => prefixLines(ta, "- ", setDraft))}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" onMouseDown={act((ta) => prefixLines(ta, (i) => `${i + 1}. `, setDraft))}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Checklist" onMouseDown={act((ta) => prefixLines(ta, "- [ ] ", setDraft))}>
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Block + inline extras */}
      <ToolbarButton title="Citação" onMouseDown={act((ta) => prefixLines(ta, "> ", setDraft))}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Código (Ctrl+E)" onMouseDown={act((ta) => wrapSelection(ta, "`", setDraft, "código"))}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Link (Ctrl+K)" onMouseDown={act((ta) => insertLink(ta, setDraft))}>
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Cor */}
      <ColorPickerButton textareaRef={textareaRef} setDraft={setDraft} />

      <Divider />

      {/* Alinhamento */}
      <ToolbarButton title="Alinhar à esquerda" onMouseDown={act((ta) => setLineAlignment(ta, "left", setDraft))}>
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Centralizar" onMouseDown={act((ta) => setLineAlignment(ta, "center", setDraft))}>
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Alinhar à direita" onMouseDown={act((ta) => setLineAlignment(ta, "right", setDraft))}>
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Justificar" onMouseDown={act((ta) => setLineAlignment(ta, "justify", setDraft))}>
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>
    </>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-border/70" />;
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
      tabIndex={-1}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ColorPickerButton({
  textareaRef,
  setDraft,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  setDraft: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Cor do texto"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start" data-md-toolbar>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cor do texto
        </div>
        <div className="grid grid-cols-1 gap-0.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                const ta = textareaRef.current;
                if (!ta) return;
                if (c.id === "default") {
                  // remove wrappers de cor da seleção
                  removeColor(ta, setDraft);
                } else {
                  applyColor(ta, c.id, setDraft);
                }
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
            >
              <span className={cn("h-3 w-3 rounded-full border border-border", c.swatch)} />
              <span className={c.cls}>{c.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// Helpers de manipulação do textarea
// ============================================================

function insertAtCursor(ta: HTMLTextAreaElement, text: string, setDraft: (v: string) => void) {
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
  const newVal = ta.value.slice(0, start) + wrapper + selected + wrapper + ta.value.slice(end);
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = start + wrapper.length;
    ta.selectionEnd = start + wrapper.length + selected.length;
  });
}

function insertLink(ta: HTMLTextAreaElement, setDraft: (v: string) => void) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = ta.value.slice(start, end) || "texto";
  const url = "url";
  const inserted = `[${sel}](${url})`;
  const newVal = ta.value.slice(0, start) + inserted + ta.value.slice(end);
  setDraft(newVal);
  // posiciona seleção em "url"
  const urlStart = start + sel.length + 3; // [sel](
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = urlStart;
    ta.selectionEnd = urlStart + url.length;
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
      l.match(/^(\s*)([-*]\s\[[ xX]?\]\s|[-*]\s|\d+\.\s|>\s|#{1,3}\s)/)
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

const COLOR_RE = /\{color:(default|primary|accent|destructive|warning|success|muted)\}([\s\S]*?)\{\/color\}/g;

function applyColor(ta: HTMLTextAreaElement, color: ColorToken, setDraft: (v: string) => void) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || "texto";
  // Remove wrappers de cor já existentes na seleção, depois envolve
  const cleaned = selected.replace(COLOR_RE, "$2");
  const wrapped = `{color:${color}}${cleaned}{/color}`;
  const newVal = ta.value.slice(0, start) + wrapped + ta.value.slice(end);
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = start + `{color:${color}}`.length;
    ta.selectionEnd = ta.selectionStart + cleaned.length;
  });
}

function removeColor(ta: HTMLTextAreaElement, setDraft: (v: string) => void) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  if (!selected) return;
  const cleaned = selected.replace(COLOR_RE, "$2");
  const newVal = ta.value.slice(0, start) + cleaned + ta.value.slice(end);
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = start;
    ta.selectionEnd = start + cleaned.length;
  });
}

// ============================================================
// Renderizador (RichTextView)
// ============================================================

/**
 * Renderiza markdown salvo no banco. Suporta:
 * - **negrito**, *itálico*, __sublinhado__, ~~riscado~~, `código`
 * - links [texto](url)
 * - listas, listas numeradas, checkboxes (toggleáveis se onToggle dado)
 * - citações `> `
 * - headings `#`, `##`, `###`
 * - alinhamento por linha via `::center::`, `::right::`, `::justify::`
 * - cor: `{color:primary}texto{/color}`
 */
export function RichTextView({
  text,
  onToggle,
}: {
  text: string;
  onToggle?: (next: string) => void;
}) {
  if (!text || !text.trim()) {
    return <p className="text-xs italic text-muted-foreground">—</p>;
  }
  const lines = text.split("\n");

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
          <span className="text-muted-foreground">{done} de {tasks.length} concluídos</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
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
                      t.checked ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent",
                    )}
                  >
                    {t.checked && <CheckCircle2 className="h-3 w-3" />}
                  </button>
                  <span className={cn("text-sm", t.checked && "text-muted-foreground line-through")}>
                    {renderInline(t.label)}
                  </span>
                </li>
              );
            }
            return raw.trim() ? (
              <li key={i} className="list-none text-sm text-foreground/80">
                {renderAlignedInline(raw)}
              </li>
            ) : null;
          })}
        </ul>
      </div>
    );
  }

  // Renderização padrão (parágrafos + listas + headings + citações)
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = h[2];
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as keyof JSX.IntrinsicElements;
      const cls =
        level === 1
          ? "text-lg font-semibold text-foreground"
          : level === 2
            ? "text-base font-semibold text-foreground"
            : "text-sm font-semibold text-foreground/90";
      blocks.push(
        <Tag key={key++} className={cls}>
          {renderInline(content)}
        </Tag>,
      );
      i++;
      continue;
    }

    // bloco de citação
    if (/^>\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^>\s/.test(lines[i])) {
        items.push(lines[i].replace(/^>\s/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-accent/60 bg-muted/20 pl-3 py-1 text-sm italic text-foreground/80">
          {items.map((it, idx) => <div key={idx}>{renderInline(it)}</div>)}
        </blockquote>,
      );
      continue;
    }

    // lista bullet
    if (/^\s*[-*]\s/.test(line) && !/^\s*[-*]\s\[[ xX]?\]/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i]) && !/^\s*[-*]\s\[[ xX]?\]/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => <li key={idx}>{renderAlignedInline(it)}</li>)}
        </ul>,
      );
      continue;
    }

    // numerada
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="ml-4 list-decimal space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => <li key={idx}>{renderAlignedInline(it)}</li>)}
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

const COLOR_TO_CLASS: Record<ColorToken, string> = {
  default: "text-foreground",
  primary: "text-primary",
  accent: "text-accent",
  destructive: "text-destructive",
  warning: "text-amber-500",
  success: "text-emerald-500",
  muted: "text-muted-foreground",
};

/**
 * Tokeniza inline markdown: cores, negrito, itálico, sublinhado, riscado, código, link.
 * Ordem importa: cores primeiro (envolvem outros), depois inline.
 */
function renderInline(text: string): React.ReactNode[] {
  // Pass 1: extrai cores (segmentos podem conter outros marcadores)
  const segments: { text: string; color?: ColorToken }[] = [];
  let lastIndex = 0;
  let cm: RegExpExecArray | null;
  COLOR_RE.lastIndex = 0;
  while ((cm = COLOR_RE.exec(text)) !== null) {
    if (cm.index > lastIndex) segments.push({ text: text.slice(lastIndex, cm.index) });
    segments.push({ text: cm[2], color: cm[1] as ColorToken });
    lastIndex = cm.index + cm[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  if (segments.length === 0) segments.push({ text });

  let key = 0;
  const out: React.ReactNode[] = [];
  for (const seg of segments) {
    const inner = renderInlineSegment(seg.text, () => key++);
    if (seg.color) {
      out.push(
        <span key={key++} className={COLOR_TO_CLASS[seg.color]}>
          {inner}
        </span>,
      );
    } else {
      out.push(...inner);
    }
  }
  return out.length ? out : [text];
}

/** Renderiza marcadores inline (sem cor). */
function renderInlineSegment(text: string, nextKey: () => number): React.ReactNode[] {
  // Regex unificado: link, negrito, itálico, sublinhado, riscado, código
  // grupos: 1=link txt, 2=link url, 3=bold, 4=italic, 5=underline, 6=strike, 7=code
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|__([^_\n]+)__|~~([^~\n]+)~~|`([^`\n]+)`/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <a key={nextKey()} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
          {m[1]}
        </a>,
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={nextKey()} className="font-semibold text-foreground">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={nextKey()} className="italic">{m[4]}</em>);
    } else if (m[5] !== undefined) {
      out.push(<span key={nextKey()} className="underline underline-offset-2">{m[5]}</span>);
    } else if (m[6] !== undefined) {
      out.push(<span key={nextKey()} className="line-through opacity-80">{m[6]}</span>);
    } else if (m[7] !== undefined) {
      out.push(
        <code key={nextKey()} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground/90">
          {m[7]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}
