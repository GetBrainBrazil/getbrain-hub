/**
 * Inputs por-proposta com autosave on blur + patch in-memory para o iframe.
 * Usado pelos painéis do grupo "Esta proposta" do CMS da página pública.
 */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BaseProps<T extends string | number> {
  value: T;
  /** Persiste no banco (chamado on blur, only-if-dirty). */
  onCommit: (v: T) => void;
  /** Patch in-memory no iframe (debounced enquanto digita). */
  onLivePatch?: (v: T) => void;
  placeholder?: string;
  className?: string;
}

export function ProposalCommitInput({
  value, onCommit, onLivePatch, placeholder, className,
}: BaseProps<string>) {
  const [v, setV] = useState(value ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => setV(value ?? ""), [value]);

  // debounce do patch live
  useEffect(() => {
    if (!onLivePatch) return;
    if (v === value) return;
    const id = setTimeout(() => onLivePatch(v), 250);
    return () => clearTimeout(id);
  }, [v, value, onLivePatch]);

  return (
    <Input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) {
          onCommit(v);
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 900);
        }
      }}
      placeholder={placeholder}
      className={`h-9 text-sm transition-colors ${className ?? ""} ${savedFlash ? "border-emerald-500/60 ring-1 ring-emerald-500/20" : ""}`}
    />
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
}

export function ProposalCommitNumber({
  value, onCommit, onLivePatch, placeholder, step = "1", min, className,
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
          setTimeout(() => setSavedFlash(false), 900);
        }
      }}
      placeholder={placeholder}
      className={`h-9 text-sm transition-colors ${className ?? ""} ${savedFlash ? "border-emerald-500/60 ring-1 ring-emerald-500/20" : ""}`}
    />
  );
}

interface TextareaProps {
  value: string;
  onCommit: (v: string) => void;
  onLivePatch?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function ProposalCommitTextarea({
  value, onCommit, onLivePatch, placeholder, rows = 5, className,
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
    <Textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) {
          onCommit(v);
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 900);
        }
      }}
      placeholder={placeholder}
      rows={rows}
      className={`text-sm resize-y transition-colors ${className ?? ""} ${savedFlash ? "border-emerald-500/60 ring-1 ring-emerald-500/20" : ""}`}
    />
  );
}
