import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Target,
  CheckCircle2,
  XCircle,
  Compass,
  Package,
  Wrench,
  AlertTriangle,
  ListChecks,
  Pencil,
  Save,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScopeField =
  | "business_context"
  | "scope_in"
  | "scope_out"
  | "premises"
  | "deliverables"
  | "technical_stack"
  | "identified_risks"
  | "acceptance_criteria";

interface ScopeCard {
  field: ScopeField;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  placeholder: string;
  hint?: string;
  isCriteria?: boolean;
}

const CARDS: ScopeCard[] = [
  {
    field: "business_context",
    title: "Contexto de Negócio",
    icon: Target,
    iconClassName: "text-accent",
    placeholder:
      "Documente aqui o contexto e a dor que o cliente quer resolver. Um bom contexto de negócio é a base para um escopo bem definido.",
  },
  {
    field: "scope_in",
    title: "O Que Está Incluso (In-Scope)",
    icon: CheckCircle2,
    iconClassName: "text-success",
    placeholder:
      "Liste os módulos, telas e funcionalidades que estão dentro deste contrato.",
  },
  {
    field: "scope_out",
    title: "O Que NÃO Está Incluso",
    icon: XCircle,
    iconClassName: "text-destructive",
    placeholder:
      "Liste o que está fora do escopo. Isso protege o projeto contra cobranças invisíveis e mal-entendidos com o cliente.",
  },
  {
    field: "premises",
    title: "Premissas",
    icon: Compass,
    iconClassName: "text-blue-400",
    placeholder:
      "Premissas que assumimos como verdadeiras para esta proposta (ex: cliente fornece acesso até X data; infraestrutura na AWS; etc.).",
  },
  {
    field: "deliverables",
    title: "Entregáveis",
    icon: Package,
    iconClassName: "text-purple-400",
    placeholder:
      "Liste os entregáveis formais (ex: sistema em produção, documentação técnica, treinamento da equipe).",
  },
  {
    field: "technical_stack",
    title: "Stack Técnico",
    icon: Wrench,
    iconClassName: "text-accent",
    placeholder:
      "Tecnologias envolvidas: linguagens, frameworks, banco de dados, hospedagem, integrações principais.",
  },
  {
    field: "identified_risks",
    title: "Riscos Iniciais",
    icon: AlertTriangle,
    iconClassName: "text-warning",
    placeholder:
      "Riscos identificados no início do projeto. Dica: depois você pode detalhar cada risco na aba Riscos ao lado.",
    hint: "Uma visão geral. Use a aba Riscos para tracking detalhado.",
  },
  {
    field: "acceptance_criteria",
    title: "Critérios de Aceite",
    icon: ListChecks,
    iconClassName: "text-accent",
    placeholder:
      "Critérios formais de aceite. Suporta checkboxes em markdown:\n- [ ] Entrega A funcionando\n- [ ] Entrega B documentada",
    isCriteria: true,
  },
];

interface Props {
  projectId: string;
  initialValues: Record<ScopeField, string | null>;
  onFieldSaved: (field: ScopeField, value: string | null) => void;
}

export function AbaEscopo({ projectId, initialValues, onFieldSaved }: Props) {
  return (
    <div className="space-y-4">
      {CARDS.map((card) => (
        <ScopeCardBlock
          key={card.field}
          card={card}
          projectId={projectId}
          initialValue={initialValues[card.field]}
          onFieldSaved={onFieldSaved}
        />
      ))}
    </div>
  );
}

function ScopeCardBlock({
  card,
  projectId,
  initialValue,
  onFieldSaved,
}: {
  card: ScopeCard;
  projectId: string;
  initialValue: string | null;
  onFieldSaved: (field: ScopeField, value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string | null>(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
    setDraft(initialValue ?? "");
  }, [initialValue]);

  async function save(opts?: { silent?: boolean }) {
    const next = draft.trim() || null;
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ [card.field]: next } as any)
      .eq("id", projectId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setValue(next);
    setEditing(false);
    if (!opts?.silent) toast.success("Salvo", { duration: 1500 });
    onFieldSaved(card.field, next);
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  const Icon = card.icon;
  const isEmpty = !value || !value.trim();

  return (
    <section className="group/card rounded-lg border border-border bg-card transition-colors hover:border-border/80">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className={cn("h-4 w-4", card.iconClassName ?? "text-accent")} />
          {card.title}
        </h3>
        <div
          className={cn(
            "flex gap-1 transition-opacity",
            editing ? "opacity-100" : "opacity-0 group-hover/card:opacity-100",
          )}
        >
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => save()} disabled={saving}>
                <Save className="mr-1 h-3.5 w-3.5" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
          )}
        </div>
      </header>

      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-2">
            <MarkdownToolbar
              textareaRef={textareaRef}
              draft={draft}
              setDraft={setDraft}
              showChecklist={card.isCriteria}
            />
            <Textarea
              ref={textareaRef}
              autoFocus
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => {
                // Não salvar se o foco foi para um botão da toolbar
                const next = e.relatedTarget as HTMLElement | null;
                if (next?.closest?.("[data-md-toolbar]")) return;
                save({ silent: true });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancel();
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
                // Continuar lista ao pressionar Enter dentro de bullet
                if (e.key === "Enter") {
                  const ta = e.currentTarget;
                  const before = ta.value.slice(0, ta.selectionStart);
                  const lineStart = before.lastIndexOf("\n") + 1;
                  const line = before.slice(lineStart);
                  const m = line.match(/^(\s*)([-*]\s\[[ xX]\]\s|[-*]\s|\d+\.\s)/);
                  if (m) {
                    e.preventDefault();
                    const prefix = m[1] + m[2].replace(/\[[xX]\]/, "[ ]");
                    if (line.trim() === m[2].trim()) {
                      // linha vazia: encerra a lista
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
              }}
              placeholder={card.placeholder}
              className={cn("resize-y font-mono text-sm")}
            />
            {card.hint && (
              <p className="text-[11px] text-muted-foreground">{card.hint}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Salva ao sair do campo · ⌘/Ctrl+Enter para salvar · Esc para cancelar
            </p>
          </div>
        ) : isEmpty ? (
          <p className="text-sm italic text-muted-foreground">{card.placeholder}</p>
        ) : card.isCriteria ? (
          <CriteriaList
            text={value!}
            onToggle={async (newText) => {
              const { error } = await supabase
                .from("projects")
                .update({ acceptance_criteria: newText } as any)
                .eq("id", projectId);
              if (error) {
                toast.error(error.message);
                return;
              }
              setValue(newText);
              setDraft(newText);
              onFieldSaved("acceptance_criteria", newText);
            }}
          />
        ) : (
          <MarkdownView text={value!} />
        )}
      </div>
    </section>
  );
}

// =============== Toolbar / helpers ===============

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
  const sel = ta.value.slice(start, end) || "item";
  const after = ta.value.slice(end);
  const lineStart = before.lastIndexOf("\n") + 1;
  const head = ta.value.slice(lineStart, start);
  const block = head + sel;
  const lines = block.split("\n");
  const transformed = lines
    .map((l, i) => (l.match(/^(\s*)([-*]\s\[[ xX]\]\s|[-*]\s|\d+\.\s)/) ? l : (typeof prefix === "function" ? prefix(i) : prefix) + l))
    .join("\n");
  const newVal = ta.value.slice(0, lineStart) + transformed + after;
  setDraft(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.selectionStart = lineStart;
    ta.selectionEnd = lineStart + transformed.length;
  });
}

function MarkdownToolbar({
  textareaRef,
  draft,
  setDraft,
  showChecklist,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  draft: string;
  setDraft: (v: string) => void;
  showChecklist?: boolean;
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
      {showChecklist && (
        <ToolbarButton
          title="Checklist"
          onMouseDown={act((ta) => prefixLines(ta, "- [ ] ", setDraft))}
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
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

// =============== Markdown rendering (simples) ===============

/**
 * Renderizador minimalista: suporta **negrito**, *itálico*, listas com `-`/`*`,
 * listas numeradas `1.` e parágrafos. Suficiente para os campos de escopo.
 */
function MarkdownView({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*[-*]\s/.test(line) && !/^\s*[-*]\s\[[ xX]\]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i]) && !/^\s*[-*]\s\[[ xX]\]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
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
            <li key={idx}>{renderInline(it)}</li>
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
    blocks.push(
      <p key={key++} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {renderInline(line)}
      </p>,
    );
    i++;
  }
  return <div className="space-y-1">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  // Tokeniza **bold** e *italic*. Ordem importa: bold antes de italic.
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

// =============== Critérios de aceite (checkboxes) ===============

function CriteriaList({
  text,
  onToggle,
}: {
  text: string;
  onToggle: (next: string) => void;
}) {
  const lines = text.split("\n");
  const items = lines.map((l, i) => {
    const m = l.match(/^\s*-\s+\[( |x|X)\]\s+(.*)$/);
    if (m) {
      return {
        idx: i,
        checked: m[1].toLowerCase() === "x",
        label: m[2],
        isTask: true as const,
        raw: l,
      };
    }
    return { idx: i, isTask: false as const, raw: l };
  });

  const tasks = items.filter((it) => it.isTask);
  if (tasks.length === 0) {
    return <MarkdownView text={text} />;
  }

  function toggle(idx: number) {
    const newLines = [...lines];
    const m = newLines[idx].match(/^(\s*-\s+\[)( |x|X)(\]\s+.*)$/);
    if (!m) return;
    const next = m[2].toLowerCase() === "x" ? " " : "x";
    newLines[idx] = `${m[1]}${next}${m[3]}`;
    onToggle(newLines.join("\n"));
  }

  const done = tasks.filter((t) => t.isTask && t.checked).length;

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
        {items.map((it) =>
          it.isTask ? (
            <li key={it.idx} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggle(it.idx)}
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  it.checked
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border hover:border-accent",
                )}
              >
                {it.checked && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <span
                className={cn(
                  "text-sm",
                  it.checked && "text-muted-foreground line-through",
                )}
              >
                {renderInline(it.label)}
              </span>
            </li>
          ) : it.raw.trim() ? (
            <li key={it.idx} className="text-sm text-foreground/80">
              {renderInline(it.raw)}
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
