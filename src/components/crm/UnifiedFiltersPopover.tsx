import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string };

export type UnifiedFiltersValue = {
  owners: string[];
  sources: string[];
  valueRange: [number, number] | null;
  stages: string[];
  projectTypes: string[];
};

type Props = {
  value: UnifiedFiltersValue;
  onChange: (next: UnifiedFiltersValue) => void;
  ownerOptions: Option[];
  sourceOptions: Option[];
  stageOptions: Option[];
  projectTypeOptions: Option[];
  onClearAll: () => void;
};

function CheckboxGroup({
  title,
  selected,
  options,
  onToggle,
}: {
  title: string;
  selected: string[];
  options: Option[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ScrollArea className="max-h-40 pr-2">
        <div className="space-y-0.5">
          {options.length === 0 && (
            <p className="px-1 py-1 text-xs text-muted-foreground">Sem opções</p>
          )}
          {options.map((o) => (
            <Label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm font-normal hover:bg-muted"
            >
              <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </Label>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function UnifiedFiltersPopover({
  value,
  onChange,
  ownerOptions,
  sourceOptions,
  stageOptions,
  projectTypeOptions,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState(false);
  const activeCount =
    value.owners.length +
    value.sources.length +
    (value.valueRange ? 1 : 0) +
    value.stages.length +
    value.projectTypes.length;

  const toggle = (key: keyof UnifiedFiltersValue, v: string) => {
    const current = value[key] as string[];
    onChange({
      ...value,
      [key]: current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
    });
  };

  const setRange = (range: [number, number] | null) => onChange({ ...value, valueRange: range });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 text-xs whitespace-nowrap',
            activeCount > 0 && 'border-accent/50 text-foreground',
          )}
          aria-label={activeCount > 0 ? `${activeCount} filtros ativos` : 'Filtros'}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono leading-none text-accent">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] p-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Filtros</p>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => {
                onClearAll();
              }}
            >
              <X className="h-3 w-3" /> Limpar tudo
            </Button>
          )}
        </div>
        <Separator className="mb-3" />
        <div className="space-y-3">
          <CheckboxGroup
            title="Estágio"
            selected={value.stages}
            options={stageOptions}
            onToggle={(v) => toggle('stages', v)}
          />
          <CheckboxGroup
            title="Tipo de projeto"
            selected={value.projectTypes}
            options={projectTypeOptions}
            onToggle={(v) => toggle('projectTypes', v)}
          />
          <CheckboxGroup
            title="Dono"
            selected={value.owners}
            options={ownerOptions}
            onToggle={(v) => toggle('owners', v)}
          />
          <CheckboxGroup
            title="Origem"
            selected={value.sources}
            options={sourceOptions}
            onToggle={(v) => toggle('sources', v)}
          />
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Faixa de valor (R$)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Mín"
                value={value.valueRange?.[0] ?? ''}
                onChange={(e) =>
                  setRange([Number(e.target.value || 0), value.valueRange?.[1] ?? 999999])
                }
                className="h-9 text-sm"
              />
              <Input
                type="number"
                placeholder="Máx"
                value={value.valueRange?.[1] ?? ''}
                onChange={(e) =>
                  setRange([value.valueRange?.[0] ?? 0, Number(e.target.value || 999999)])
                }
                className="h-9 text-sm"
              />
            </div>
            {value.valueRange && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground"
                onClick={() => setRange(null)}
              >
                Limpar faixa
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
