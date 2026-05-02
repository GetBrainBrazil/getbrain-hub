/**
 * Primitivas visuais usadas por todos os painéis da sub-aba Conteúdo.
 *
 * Hierarquia visual:
 *  PainelHeader  → topo do painel (ícone + título grande + chip de escopo)
 *  CampoGroup    → agrupador opcional (card interno com título uppercase)
 *  Campo         → label + controle + hint (com ícone)
 *  CommitInput / CommitTextarea → autosave enquanto digita, com flash visual
 */
import { ReactNode, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightbulb, Check } from "lucide-react";
import { getIcon } from "@/lib/iconMap";
import { cn } from "@/lib/utils";

interface PainelHeaderProps {
  icon: string;
  title: string;
  description?: string;
  /** "proposta" mostra chip cyan; "global" mostra chip âmbar (afeta todas). */
  scope?: "proposta" | "global";
  action?: ReactNode;
}

export function PainelHeader({ icon, title, description, scope, action }: PainelHeaderProps) {
  const Icon = getIcon(icon);
  return (
    <div className="pb-5 mb-6 border-b border-border/50 flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent flex items-center justify-center shrink-0 ring-1 ring-accent/15">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground leading-tight tracking-tight">{title}</h3>
            {scope === "proposta" && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                Esta proposta
              </span>
            )}
            {scope === "global" && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Global · todas as propostas
              </span>
            )}
          </div>
          {description ? (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface CampoGroupProps {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Agrupador visual dentro de um painel — card sutil com título uppercase. */
export function CampoGroup({ title, hint, children, className }: CampoGroupProps) {
  return (
    <section className={cn(
      "rounded-xl border border-border/50 bg-muted/20 p-4 sm:p-5 space-y-4",
      className,
    )}>
      {(title || hint) && (
        <header className="flex items-baseline justify-between gap-3">
          {title && (
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {title}
            </h4>
          )}
          {hint && (
            <p className="text-[11px] text-muted-foreground/80 truncate">{hint}</p>
          )}
        </header>
      )}
      <div className="space-y-4">{children}</div>
    </section>
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
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-[13px] font-semibold text-foreground">
          {label}
          {typeof count === "number" ? (
            <span className="text-muted-foreground font-normal ml-1.5 text-xs">({count})</span>
          ) : null}
        </Label>
      </div>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-0.5 leading-relaxed">
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
  maxLength?: number;
  className?: string;
}

export function CommitInput({ value, onCommit, placeholder, onDirtyChange, maxLength, className }: CommitInputProps) {
  const [v, setV] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const id = setTimeout(() => {
      onCommit(v);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1100);
      onDirtyChange?.(false);
    }, 500);
    return () => clearTimeout(id);
  }, [v, value, onCommit, onDirtyChange]);
  return (
    <div className="relative">
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
            setTimeout(() => setSavedFlash(false), 1100);
          }
          onDirtyChange?.(false);
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "h-10 text-sm transition-colors focus-visible:ring-accent/40",
          savedFlash && "border-emerald-500/60 ring-1 ring-emerald-500/20",
          className,
        )}
      />
      {savedFlash && <SavedBadge />}
    </div>
  );
}

interface CommitTextareaProps extends CommitInputProps {
  rows?: number;
}

export function CommitTextarea({ value, onCommit, placeholder, onDirtyChange, rows = 3, maxLength, className }: CommitTextareaProps) {
  const [v, setV] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const id = setTimeout(() => {
      onCommit(v);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1100);
      onDirtyChange?.(false);
    }, 600);
    return () => clearTimeout(id);
  }, [v, value, onCommit, onDirtyChange]);
  return (
    <div className="relative">
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
            setTimeout(() => setSavedFlash(false), 1100);
          }
          onDirtyChange?.(false);
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "text-sm resize-y transition-colors focus-visible:ring-accent/40",
          savedFlash && "border-emerald-500/60 ring-1 ring-emerald-500/20",
          className,
        )}
      />
      {maxLength && (
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground/50 pointer-events-none">
          {v.length}/{maxLength}
        </div>
      )}
      {savedFlash && <SavedBadge />}
    </div>
  );
}

function SavedBadge() {
  return (
    <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 shadow-sm">
      <Check className="h-2.5 w-2.5" />
      Salvo
    </div>
  );
}
