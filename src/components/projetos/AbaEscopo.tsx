import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { RichTextEditor, RichTextView } from "@/components/ui/rich-text-editor";

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

  useEffect(() => {
    setValue(initialValue);
    setDraft(initialValue ?? "");
  }, [initialValue]);

  async function persist(next: string | null, opts?: { silent?: boolean }) {
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

  async function save(opts?: { silent?: boolean }) {
    const next = draft.trim() || null;
    await persist(next, opts);
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
            <RichTextEditor
              value={draft}
              onChange={setDraft}
              onSave={(v) => persist(v.trim() || null, { silent: true })}
              onCancel={cancel}
              placeholder={card.placeholder}
            />
            {card.hint && (
              <p className="text-[11px] text-muted-foreground">{card.hint}</p>
            )}
          </div>
        ) : isEmpty ? (
          <p className="text-sm italic text-muted-foreground">{card.placeholder}</p>
        ) : (
          <RichTextView
            text={value!}
            onToggle={async (newText) => {
              const { error } = await supabase
                .from("projects")
                .update({ [card.field]: newText } as any)
                .eq("id", projectId);
              if (error) {
                toast.error(error.message);
                return;
              }
              setValue(newText);
              setDraft(newText);
              onFieldSaved(card.field, newText);
            }}
          />
        )}
      </div>
    </section>
  );
}
