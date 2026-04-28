import { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateSector, useSectors } from '@/hooks/crm/useSectors';
import { cn } from '@/lib/utils';

interface SectorPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export function SectorPicker({ value, onChange, placeholder = 'Selecione um setor' }: SectorPickerProps) {
  const { data: tree, isLoading } = useSectors();
  const createSector = useCreateSector();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const flat = useMemo(() => {
    const list: { id: string; label: string; depth: number; rootId: string; rootName: string }[] = [];
    for (const root of tree ?? []) {
      list.push({ id: root.id, label: root.name, depth: 0, rootId: root.id, rootName: root.name });
      for (const child of root.children) {
        list.push({ id: child.id, label: child.name, depth: 1, rootId: root.id, rootName: root.name });
      }
    }
    return list;
  }, [tree]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter((s) =>
      s.label.toLowerCase().includes(q) || s.rootName.toLowerCase().includes(q),
    );
  }, [flat, query]);

  const trimmedQuery = query.trim();
  const exactMatch = trimmedQuery
    ? flat.some((s) => s.label.toLowerCase() === trimmedQuery.toLowerCase())
    : false;
  const canCreate = trimmedQuery.length >= 2 && !exactMatch && !createSector.isPending;

  const handleCreate = () => {
    if (!canCreate) return;
    createSector.mutate(
      { name: trimmedQuery, parent_sector_id: null },
      {
        onSuccess: (sector) => {
          toast.success(`Setor "${sector.name}" criado`);
          onChange(sector.id);
          setQuery('');
          setOpen(false);
        },
        onError: (e: any) => toast.error(e?.message ?? 'Erro ao criar setor'),
      },
    );
  };

  const current = flat.find((s) => s.id === value);
  const currentLabel = current
    ? current.depth === 1
      ? `${current.rootName} › ${current.label}`
      : current.label
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'h-9 w-full justify-between bg-background/60 font-normal',
            !currentLabel && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{currentLabel ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar setor..."
            className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              Limpar
            </Button>
          )}
        </div>
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="space-y-1 p-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Nenhum setor encontrado.</p>
          ) : (
            <ul className="p-1">
              {filtered.map((s) => {
                const active = value === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => { onChange(s.id); setOpen(false); }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        s.depth === 1 && 'pl-6 text-muted-foreground',
                        active ? 'bg-accent/15 text-accent' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="truncate">
                        {s.depth === 1 && <span className="mr-1 text-muted-foreground/60">└</span>}
                        {s.label}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
