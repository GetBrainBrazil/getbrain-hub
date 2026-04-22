import { useEffect, useState } from "react";
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
  onSaved: () => void;
}

export function AbaEscopo({ projectId, initialValues, onSaved }: Props) {
  return (
    <div className="space-y-4">
      {CARDS.map((card) => (
        <ScopeCardBlock
          key={card.field}
          card={card}
          projectId={projectId}
          initialValue={initialValues[card.field]}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

function ScopeCardBlock({
  card,
  projectId,
  initialValue,
  onSaved,
}: {
  card: ScopeCard;
  projectId: string;
  initialValue: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string | null>(initialValue);

  useEffect(() => {
    setValue(initialValue);
    setDraft(initialValue ?? "");
  }, [initialValue]);

  async function save() {
    setSaving(true);
    const next = draft.trim() || null;
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
    toast.success("Salvo", { duration: 1500 });
    onSaved();
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
              <Button size="sm" variant="ghost" onClick={save} disabled={saving}>
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
            <Textarea
              autoFocus
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={card.placeholder}
              className={cn("resize-y", card.isCriteria && "font-mono text-sm")}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancel();
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
              }}
            />
            {card.hint && (
              <p className="text-[11px] text-muted-foreground">{card.hint}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              ⌘/Ctrl+Enter para salvar · Esc para cancelar
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
              onSaved();
            }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {value}
          </p>
        )}
      </div>
    </section>
  );
}

// Reaproveita a mesma lógica de checkbox markdown da aba Visão Geral.
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
    return <p className="whitespace-pre-wrap text-sm text-foreground/90">{text}</p>;
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
                {it.label}
              </span>
            </li>
          ) : it.raw.trim() ? (
            <li key={it.idx} className="text-sm text-foreground/80">
              {it.raw}
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
