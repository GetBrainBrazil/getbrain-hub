import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextView } from "@/components/ui/rich-text-editor";
import { StringListEditor } from "@/components/shared/StringListEditor";
import { AcceptanceCriteriaEditor } from "@/components/shared/AcceptanceCriteriaEditor";
import type { AcceptanceCriterion } from "@/types/shared";

// Campos textuais simples (mantêm RichTextEditor)
type TextField = "business_context" | "scope_in" | "scope_out";
// Campos array de strings
type ArrayField = "deliverables" | "premises" | "technical_stack" | "identified_risks";
// Campo JSONB checklist
type AcField = "acceptance_criteria";

export type ScopeField = TextField | ArrayField | AcField;

export interface ScopeValues {
  business_context: string | null;
  scope_in: string | null;
  scope_out: string | null;
  deliverables: string[];
  premises: string[];
  technical_stack: string[];
  identified_risks: string[];
  acceptance_criteria: AcceptanceCriterion[];
}

interface Props {
  projectId: string;
  initialValues: ScopeValues;
  onFieldSaved: <K extends ScopeField>(field: K, value: ScopeValues[K]) => void;
}

const TEXT_CARDS: Array<{
  field: TextField;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  placeholder: string;
}> = [
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
];

const ARRAY_CARDS: Array<{
  field: ArrayField;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  placeholder: string;
  emptyHint: string;
  hint?: string;
}> = [
  {
    field: "premises",
    title: "Premissas",
    icon: Compass,
    iconClassName: "text-blue-400",
    placeholder: "Premissa...",
    emptyHint:
      "Premissas que assumimos como verdadeiras (ex: cliente fornece acesso até X data).",
  },
  {
    field: "deliverables",
    title: "Entregáveis",
    icon: Package,
    iconClassName: "text-purple-400",
    placeholder: "Entregável...",
    emptyHint:
      "Entregáveis formais (sistema em produção, documentação técnica, treinamento).",
  },
  {
    field: "technical_stack",
    title: "Stack Técnico",
    icon: Wrench,
    iconClassName: "text-accent",
    placeholder: "Tecnologia...",
    emptyHint:
      "Tecnologias envolvidas: linguagens, frameworks, banco de dados, hospedagem, integrações.",
  },
  {
    field: "identified_risks",
    title: "Riscos Iniciais",
    icon: AlertTriangle,
    iconClassName: "text-warning",
    placeholder: "Risco...",
    emptyHint: "Riscos identificados no início do projeto.",
    hint: "Uma visão geral. Use a aba Riscos para tracking detalhado.",
  },
];

export function AbaEscopo({ projectId, initialValues, onFieldSaved }: Props) {
  return (
    <div className="space-y-4">
      {TEXT_CARDS.map((card) => (
        <TextCardBlock
          key={card.field}
          card={card}
          projectId={projectId}
          initialValue={initialValues[card.field]}
          onFieldSaved={(v) => onFieldSaved(card.field, v)}
        />
      ))}

      {ARRAY_CARDS.map((card) => (
        <ArrayCardBlock
          key={card.field}
          card={card}
          projectId={projectId}
          initialValue={initialValues[card.field]}
          onFieldSaved={(v) => onFieldSaved(card.field, v)}
        />
      ))}

      <AcceptanceCriteriaCard
        projectId={projectId}
        initialValue={initialValues.acceptance_criteria}
        onFieldSaved={(v) => onFieldSaved("acceptance_criteria", v)}
      />
    </div>
  );
}

// ----------------- Container compartilhado -----------------
function CardShell({
  title,
  Icon,
  iconClassName,
  hint,
  children,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card transition-colors hover:border-border/80">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className={cn("h-4 w-4", iconClassName)} />
          {title}
        </h3>
      </header>
      <div className="space-y-2 px-5 py-4">
        {children}
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </section>
  );
}

// ----------------- Texto livre (markdown) -----------------
function TextCardBlock({
  card,
  projectId,
  initialValue,
  onFieldSaved,
}: {
  card: (typeof TEXT_CARDS)[number];
  projectId: string;
  initialValue: string | null;
  onFieldSaved: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue ?? "");
  const [value, setValue] = useState<string | null>(initialValue);

  useEffect(() => {
    setValue(initialValue);
    setDraft(initialValue ?? "");
  }, [initialValue]);

  async function persist(next: string | null) {
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    const { error } = await supabase
      .from("projects")
      .update({ [card.field]: next } as never)
      .eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setValue(next);
    setEditing(false);
    onFieldSaved(next);
  }

  const isEmpty = !value || !value.trim();

  return (
    <CardShell title={card.title} Icon={card.icon} iconClassName={card.iconClassName}>
      {editing ? (
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          onSave={(v) => persist(v.trim() || null)}
          onCancel={() => {
            setDraft(value ?? "");
            setEditing(false);
          }}
          placeholder={card.placeholder}
        />
      ) : isEmpty ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-md border border-dashed border-border bg-muted/10 p-4 text-left text-sm italic text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
        >
          {card.placeholder}
        </button>
      ) : (
        <div onClick={() => setEditing(true)} className="cursor-text">
          <RichTextView text={value!} onToggle={() => {}} />
        </div>
      )}
    </CardShell>
  );
}

// ----------------- Array de strings -----------------
function ArrayCardBlock({
  card,
  projectId,
  initialValue,
  onFieldSaved,
}: {
  card: (typeof ARRAY_CARDS)[number];
  projectId: string;
  initialValue: string[];
  onFieldSaved: (value: string[]) => void;
}) {
  const [value, setValue] = useState<string[]>(initialValue ?? []);

  useEffect(() => {
    setValue(initialValue ?? []);
  }, [initialValue]);

  async function persist(next: string[]) {
    setValue(next);
    const { error } = await supabase
      .from("projects")
      .update({ [card.field]: next } as never)
      .eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onFieldSaved(next);
  }

  return (
    <CardShell title={card.title} Icon={card.icon} iconClassName={card.iconClassName} hint={card.hint}>
      <StringListEditor
        value={value}
        onChange={persist}
        placeholder={card.placeholder}
        emptyHint={card.emptyHint}
      />
    </CardShell>
  );
}

// ----------------- Critérios de aceite -----------------
function AcceptanceCriteriaCard({
  projectId,
  initialValue,
  onFieldSaved,
}: {
  projectId: string;
  initialValue: AcceptanceCriterion[];
  onFieldSaved: (value: AcceptanceCriterion[]) => void;
}) {
  const [value, setValue] = useState<AcceptanceCriterion[]>(initialValue ?? []);

  useEffect(() => {
    setValue(initialValue ?? []);
  }, [initialValue]);

  async function persist(next: AcceptanceCriterion[]) {
    setValue(next);
    const { error } = await supabase
      .from("projects")
      .update({ acceptance_criteria: next as never } as never)
      .eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onFieldSaved(next);
  }

  return (
    <CardShell title="Critérios de Aceite" Icon={ListChecks} iconClassName="text-accent">
      <AcceptanceCriteriaEditor value={value} onChange={persist} />
    </CardShell>
  );
}
