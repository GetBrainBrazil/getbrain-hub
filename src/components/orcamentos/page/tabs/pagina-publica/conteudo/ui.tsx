/**
 * Primitivas visuais usadas por todos os painéis da sub-aba Conteúdo.
 * - PainelHeader: título + descrição + ícone, com separador.
 * - Campo: label legível + dica opcional + slot do controle.
 * - CommitInput / CommitTextarea: inputs com autosave on blur.
 */
import { ReactNode, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightbulb } from "lucide-react";
import { getIcon } from "@/lib/iconMap";

interface PainelHeaderProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PainelHeader({ icon, title, description, action }: PainelHeaderProps) {
  const Icon = getIcon(icon);
  return (
    <div className="pb-4 mb-5 border-b border-border/60 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

interface CampoProps {
  label: string;
  hint?: string;
  count?: number;
  children: ReactNode;
}

export function Campo({ label, hint, count, children }: CampoProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">
          {label}
          {typeof count === "number" ? (
            <span className="text-muted-foreground font-normal ml-1">({count})</span>
          ) : null}
        </Label>
      </div>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-0.5">
          <Lightbulb className="h-3 w-3 mt-0.5 text-accent/70 shrink-0" />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}

interface CommitInputProps {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  /** Marca a área como "dirty" enquanto digitando. */
  onDirtyChange?: (dirty: boolean) => void;
}

export function CommitInput({ value, onCommit, placeholder, onDirtyChange }: CommitInputProps) {
  const [v, setV] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value), [value]);
  return (
    <Input
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        onDirtyChange?.(e.target.value !== value);
      }}
      onBlur={() => {
        if (v !== value) {
          onCommit(v);
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 900);
        }
        onDirtyChange?.(false);
      }}
      placeholder={placeholder}
      className={`h-9 text-sm transition-colors ${savedFlash ? "border-emerald-500/60 ring-1 ring-emerald-500/20" : ""}`}
    />
  );
}

interface CommitTextareaProps extends CommitInputProps {
  rows?: number;
}

export function CommitTextarea({ value, onCommit, placeholder, onDirtyChange, rows = 3 }: CommitTextareaProps) {
  const [v, setV] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value), [value]);
  return (
    <Textarea
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        onDirtyChange?.(e.target.value !== value);
      }}
      onBlur={() => {
        if (v !== value) {
          onCommit(v);
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 900);
        }
        onDirtyChange?.(false);
      }}
      placeholder={placeholder}
      rows={rows}
      className={`text-sm resize-y transition-colors ${savedFlash ? "border-emerald-500/60 ring-1 ring-emerald-500/20" : ""}`}
    />
  );
}
