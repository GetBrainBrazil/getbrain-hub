import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function MultiFilter({ label, selected, options, onChange }: { label: string; selected: string[]; options: { value: string; label: string }[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs">
          {label}{selected.length > 0 && <span className="ml-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent">{selected.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {options.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Sem opções</p>}
          {options.map((o) => (
            <Label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal hover:bg-muted">
              <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ValueRangeFilter({ value, onChange }: { value: [number, number] | null; onChange: (v: [number, number] | null) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs">
          Valor{value && <span className="ml-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent">ativo</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-xs">Mínimo</Label><Input type="number" value={value?.[0] ?? ''} onChange={(e) => onChange([Number(e.target.value || 0), value?.[1] ?? 999999])} /></div>
          <div className="space-y-1"><Label className="text-xs">Máximo</Label><Input type="number" value={value?.[1] ?? ''} onChange={(e) => onChange([value?.[0] ?? 0, Number(e.target.value || 999999)])} /></div>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(null)}>Limpar valor</Button>
      </PopoverContent>
    </Popover>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Buscar...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-[260px] pl-8 text-sm" />
    </div>
  );
}
