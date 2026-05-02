import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

type Option = { value: string; label: string };

export function MultiFilter({
  label,
  selected,
  options,
  onChange,
  icon,
}: {
  label: string;
  selected: string[];
  options: Option[];
  onChange: (v: string[]) => void;
  icon?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const isActive = selected.length > 0;
  // Resumo quando 1 selecionado: mostra o nome em vez de só "1".
  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v);
  const summary =
    selected.length === 0
      ? null
      : selected.length === 1
      ? selectedLabels[0]
      : `${selectedLabels[0]} +${selected.length - 1}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 whitespace-nowrap rounded-full px-3 text-xs transition-colors',
            isActive
              ? 'border-accent/60 bg-accent/10 text-accent hover:bg-accent/15'
              : 'border-border/70 text-muted-foreground hover:text-foreground',
          )}
        >
          {icon && <span className="opacity-70">{icon}</span>}
          <span className="font-medium">{label}</span>
          {summary && (
            <>
              <span className="opacity-40">·</span>
              <span className="max-w-[120px] truncate text-foreground">{summary}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] p-0"
      >
        {options.length > 6 && (
          <div className="border-b border-border/50 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}...`}
                className="h-8 pl-7 text-xs"
                autoFocus
              />
            </div>
          </div>
        )}
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">Nada encontrado</p>
          )}
          {filtered.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  checked ? 'bg-accent/10 text-foreground' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    checked
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border bg-background',
                  )}
                  aria-hidden
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/50 px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => onChange(options.map((o) => o.value))}
            disabled={options.length === 0 || selected.length === options.length}
          >
            Selecionar todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
          >
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ValueRangeFilter({
  value,
  onChange,
  icon,
}: {
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
  icon?: ReactNode;
}) {
  const isActive = !!value;
  const summary = value
    ? `${formatCurrency(value[0])} – ${formatCurrency(value[1])}`
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 whitespace-nowrap rounded-full px-3 text-xs transition-colors',
            isActive
              ? 'border-accent/60 bg-accent/10 text-accent hover:bg-accent/15'
              : 'border-border/70 text-muted-foreground hover:text-foreground',
          )}
        >
          {icon && <span className="opacity-70">{icon}</span>}
          <span className="font-medium">Valor</span>
          {summary && (
            <>
              <span className="opacity-40">·</span>
              <span className="max-w-[140px] truncate text-foreground">{summary}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] space-y-3 p-3"
      >
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Implementação (one-time)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mínimo</Label>
            <Input
              type="number"
              placeholder="0"
              value={value?.[0] ?? ''}
              onChange={(e) =>
                onChange([Number(e.target.value || 0), value?.[1] ?? 999999])
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Máximo</Label>
            <Input
              type="number"
              placeholder="∞"
              value={value?.[1] ?? ''}
              onChange={(e) =>
                onChange([value?.[0] ?? 0, Number(e.target.value || 999999)])
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-[11px] text-muted-foreground hover:text-destructive"
          onClick={() => onChange(null)}
          disabled={!value}
        >
          Limpar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-[260px]">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 sm:h-9 w-full pl-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
