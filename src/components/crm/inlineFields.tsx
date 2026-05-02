import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput, IntegerInput } from '@/components/ui/currency-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* FieldLabel                                                                  */
/* -------------------------------------------------------------------------- */

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </Label>
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChipGroup                                                                   */
/* -------------------------------------------------------------------------- */

export function ChipGroup<T extends string>({
  options, value, onChange, labels, colors, allowClear = true,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
  labels: Record<T, string>;
  colors?: Partial<Record<T, string>>;
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active && allowClear ? null : o)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
              active
                ? cn(
                    colors?.[o] ?? 'bg-accent/20 text-accent border-accent',
                    'font-semibold ring-2 ring-accent/40 ring-offset-1 ring-offset-background shadow-sm',
                  )
                : 'border-border bg-muted/20 text-muted-foreground hover:border-accent/40 hover:text-foreground hover:bg-muted/40',
            )}
          >
            {active && <Check className="h-3 w-3" strokeWidth={3} />}
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* InlineText (single line + multiline rich)                                   */
/* -------------------------------------------------------------------------- */

export function InlineText({
  value, onSave, placeholder, multiline = false, minHeight,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
}) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);

  const commit = () => {
    const trimmed = local.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next !== (value ?? null)) onSave(next);
  };

  if (multiline) {
    return (
      <RichTextEditor
        value={local}
        onChange={setLocal}
        onSave={(v) => {
          const trimmed = v.trim();
          const next = trimmed === '' ? null : trimmed;
          if (next !== (value ?? null)) onSave(next);
        }}
        placeholder={placeholder}
        minHeight={minHeight}
        autoFocus={false}
      />
    );
  }

  return (
    <Input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
      className="bg-background/60"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* InlineMoney                                                                 */
/* -------------------------------------------------------------------------- */

export function InlineMoney({
  value, onSave, placeholder,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value === null ? '' : String(value));
  useEffect(() => { setLocal(value === null ? '' : String(value)); }, [value]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === '') {
      if (value !== null) onSave(null);
      return;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n) && n !== value) onSave(n);
  };

  return (
    <CurrencyInput
      value={local}
      onValueChange={setLocal}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      withPrefix
    />
  );
}

/* -------------------------------------------------------------------------- */
/* InlineInteger                                                               */
/* -------------------------------------------------------------------------- */

export function InlineInteger({
  value, onSave, placeholder, suffix,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  placeholder?: string;
  suffix?: string;
}) {
  const [local, setLocal] = useState(value === null ? '' : String(value));
  useEffect(() => { setLocal(value === null ? '' : String(value)); }, [value]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === '') {
      if (value !== null) onSave(null);
      return;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n) && n !== value) onSave(n);
  };

  return (
    <div className="flex items-center rounded-md border border-input bg-background/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      <IntegerInput
        value={local}
        onValueChange={setLocal}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
        placeholder={placeholder}
        withSeparator
        className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {suffix && <span className="pr-2.5 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}
