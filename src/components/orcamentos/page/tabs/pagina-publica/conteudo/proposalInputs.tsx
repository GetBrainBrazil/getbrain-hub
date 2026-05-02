/**
 * Inputs por-proposta com autosave enquanto digita + patch in-memory para o iframe.
 * Usado pelos painéis do grupo "Esta proposta" do CMS da página pública.
 */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseProps<T extends string | number> {
  value: T;
  /** Persiste no estado/banco (debounced enquanto digita e flush no blur). */
  onCommit: (v: T) => void;
  /** Patch in-memory no iframe (debounced enquanto digita). */
  onLivePatch?: (v: T) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

function SavedBadge() {
  return (
    <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 shadow-sm pointer-events-none z-10">
      <Check className="h-2.5 w-2.5" />
      Salvo
    </div>
  );
}

export function ProposalCommitInput({
  value, onCommit, onLivePatch, placeholder, className, maxLength,
}: BaseProps<string>) {
  const [v, setV] = useState(value ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value ?? ""), [value]);

  useEffect(() => {
    if (v === value) return;
    const id = setTimeout(() => {
      onLivePatch?.(v);
      onCommit(v);
    }, 300);
    return () => clearTimeout(id);
  }, [v, value, onLivePatch, onCommit]);

  return (
    <div className="relative">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v !== value) {
            onLivePatch?.(v);
            onCommit(v);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1100);
          }
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

interface NumberInputProps {
  value: number | "";
  onCommit: (v: number | "") => void;
  onLivePatch?: (v: number | "") => void;
  placeholder?: string;
  step?: string;
  min?: number;
  className?: string;
  /** Prefixo visual (R$, %, etc.). */
  prefix?: string;
  /** Sufixo visual (dias, %, etc.). */
  suffix?: string;
}

export function ProposalCommitNumber({
  value, onCommit, onLivePatch, placeholder, step = "1", min, className, prefix, suffix,
}: NumberInputProps) {
  const [v, setV] = useState<string>(value === "" || value == null ? "" : String(value));
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    setV(value === "" || value == null ? "" : String(value));
  }, [value]);

  const parsed = (): number | "" => {
    const t = v.trim();
    if (t === "") return "";
    const n = Number(t);
    return Number.isFinite(n) ? n : "";
  };

  useEffect(() => {
    if (!onLivePatch) return;
    const p = parsed();
    if (p === value) return;
    const id = setTimeout(() => onLivePatch(p), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        step={step}
        min={min}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const p = parsed();
          if (p !== value) {
            onCommit(p);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1100);
          }
        }}
        placeholder={placeholder}
        className={cn(
          "h-10 text-sm transition-colors focus-visible:ring-accent/40 tabular-nums",
          prefix && "pl-9",
          suffix && "pr-12",
          savedFlash && "border-emerald-500/60 ring-1 ring-emerald-500/20",
          className,
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
      {savedFlash && <SavedBadge />}
    </div>
  );
}

interface TextareaProps {
  value: string;
  onCommit: (v: string) => void;
  onLivePatch?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  maxLength?: number;
}

export function ProposalCommitTextarea({
  value, onCommit, onLivePatch, placeholder, rows = 5, className, maxLength,
}: TextareaProps) {
  const [v, setV] = useState(value ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value ?? ""), [value]);

  useEffect(() => {
    if (!onLivePatch) return;
    if (v === value) return;
    const id = setTimeout(() => onLivePatch(v), 300);
    return () => clearTimeout(id);
  }, [v, value, onLivePatch]);

  return (
    <div className="relative">
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v !== value) {
            onCommit(v);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1100);
          }
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

/* ============ Color picker compacto ============ */
interface ColorProps {
  value: string;
  onCommit: (v: string) => void;
  onLivePatch?: (v: string) => void;
  placeholder?: string;
}

export function ProposalCommitColor({ value, onCommit, onLivePatch, placeholder }: ColorProps) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);

  useEffect(() => {
    if (!onLivePatch) return;
    if (v === value) return;
    const id = setTimeout(() => onLivePatch(v), 200);
    return () => clearTimeout(id);
  }, [v, value, onLivePatch]);

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(v);
  const safeColor = isValidHex ? v : "#22D3EE";

  return (
    <div className="flex items-center gap-2">
      <label className="relative h-10 w-12 rounded-md border border-input overflow-hidden cursor-pointer shrink-0 ring-offset-background hover:ring-2 hover:ring-accent/40 transition-all">
        <span
          className="absolute inset-0"
          style={{ backgroundColor: safeColor }}
        />
        <input
          type="color"
          value={safeColor}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            if (v !== value) onCommit(v);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v !== value) onCommit(v);
        }}
        placeholder={placeholder || "#22D3EE"}
        className="h-10 text-sm font-mono uppercase max-w-[140px]"
      />
      {!v && (
        <span className="text-[11px] text-muted-foreground">Padrão · cyan</span>
      )}
    </div>
  );
}

/* ============ Toggle ============ */
interface ToggleProps {
  checked: boolean;
  onCommit: (v: boolean) => void;
  onLivePatch?: (v: boolean) => void;
  label: string;
  description?: string;
}

export function ProposalCommitToggle({ checked, onCommit, onLivePatch, label, description }: ToggleProps) {
  const handleChange = (next: boolean) => {
    onLivePatch?.(next);
    onCommit(next);
  };
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-border bg-background/40 hover:bg-background/70 cursor-pointer transition-colors">
      <Switch checked={checked} onCheckedChange={handleChange} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground leading-tight">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</div>
        )}
      </div>
    </label>
  );
}
