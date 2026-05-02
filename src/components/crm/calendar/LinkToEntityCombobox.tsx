import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDeals } from '@/hooks/crm/useDeals';
import { useLeads } from '@/hooks/crm/useLeads';
import { cn } from '@/lib/utils';

export type EntityLink =
  | { kind: 'deal'; id: string; code: string; title: string }
  | { kind: 'lead'; id: string; code: string; title: string }
  | null;

interface Props {
  value: EntityLink;
  onChange: (v: EntityLink) => void;
}

/**
 * Combobox unificado para vincular uma atividade a um Deal ou Lead.
 * Busca por code ou título; mostra prefixo DEAL/LEAD.
 */
export function LinkToEntityCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { data: deals = [] } = useDeals();
  const { data: leads = [] } = useLeads();

  const items = useMemo(() => {
    const d = deals.map((x: any) => ({ kind: 'deal' as const, id: x.id, code: x.code, title: x.title }));
    const l = leads.map((x: any) => ({ kind: 'lead' as const, id: x.id, code: x.code, title: x.title }));
    return [...d, ...l];
  }, [deals, leads]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="flex min-w-0 items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? (
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className={cn(
                  'font-mono text-[10px] uppercase tracking-wide',
                  value.kind === 'deal' ? 'text-accent' : 'text-warning',
                )}>{value.code}</span>
                <span className="truncate">{value.title}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Sem vínculo</span>
            )}
          </span>
          <span className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar Deal ou Lead..." />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Deals">
              {items.filter((i) => i.kind === 'deal').slice(0, 50).map((i) => (
                <CommandItem
                  key={`d-${i.id}`}
                  value={`${i.code} ${i.title}`}
                  onSelect={() => { onChange(i); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value?.kind === 'deal' && value.id === i.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="font-mono text-[10px] text-accent mr-2">{i.code}</span>
                  <span className="truncate">{i.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Leads">
              {items.filter((i) => i.kind === 'lead').slice(0, 50).map((i) => (
                <CommandItem
                  key={`l-${i.id}`}
                  value={`${i.code} ${i.title}`}
                  onSelect={() => { onChange(i); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value?.kind === 'lead' && value.id === i.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="font-mono text-[10px] text-warning mr-2">{i.code}</span>
                  <span className="truncate">{i.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
