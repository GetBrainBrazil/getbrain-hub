/**
 * Editor de "tags" / chips: array de strings exibidas como badges com X
 * para remover. Input no final pra adicionar (Enter ou vírgula).
 */
import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onCommit: (next: string[]) => void;
  placeholder?: string;
}

export function EditorTags({ value, onCommit, placeholder = "Digite e pressione Enter…" }: Props) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onCommit([...value, t]);
    setDraft("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onCommit(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background min-h-[44px] focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/20 transition-colors">
      {value.map((tag, i) => (
        <Badge
          key={`${tag}-${i}`}
          variant="secondary"
          className="gap-1 pr-1 h-7 text-xs font-normal"
        >
          {tag}
          <button
            type="button"
            onClick={() => onCommit(value.filter((_, idx) => idx !== i))}
            className="ml-0.5 rounded hover:bg-destructive/10 hover:text-destructive p-0.5 transition-colors"
            aria-label={`Remover ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : "+ adicionar"}
        className="border-0 bg-transparent h-7 px-1 flex-1 min-w-[120px] focus-visible:ring-0 text-xs"
      />
    </div>
  );
}
