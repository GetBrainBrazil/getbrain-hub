import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useCrmProjectTypes,
  useCreateProjectType,
  type CrmProjectType,
} from '@/hooks/crm/useCrmProjectTypes';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
}

function bgDot(colorClass?: string | null) {
  if (!colorClass) return 'bg-muted-foreground/40';
  return colorClass.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-muted-foreground/40';
}

export function ProjectTypeSelect({ value, onChange, disabled }: Props) {
  const { isAdmin } = useAuth();
  const { data: active = [], isLoading } = useCrmProjectTypes({ onlyActive: true });
  const { data: all = [] } = useCrmProjectTypes();
  const create = useCreateProjectType();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo<CrmProjectType | null>(
    () => (value ? all.find((c) => c.slug === value) ?? null : null),
    [value, all],
  );

  const term = query.trim();
  const exact = term ? active.find((c) => c.name.toLowerCase() === term.toLowerCase()) : null;
  const canCreate = !!isAdmin && !!term && !exact;

  const handleCreate = async () => {
    if (!canCreate) return;
    const created = await create.mutateAsync({ name: term });
    onChange(created.slug);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Chip do selecionado (em cima) */}
      {selected && (
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium shadow-sm',
              selected.color ?? 'bg-muted text-muted-foreground border-border',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', bgDot(selected.color))} />
            <span className="max-w-[16rem] truncate">{selected.name}</span>
            {!selected.is_active && <span className="text-[9px] opacity-70">(inativo)</span>}
            <Check className="h-3 w-3 opacity-80" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="ml-0.5 rounded-sm opacity-70 hover:bg-foreground/10 hover:opacity-100"
                aria-label={`Remover ${selected.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        </div>
      )}

      {/* Barra de seleção (embaixo, discreta) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            size="sm"
            className="h-8 w-full justify-between text-xs font-normal text-muted-foreground"
          >
            <span className="truncate">
              {selected ? 'Trocar tipo de projeto...' : 'Selecionar tipo de projeto...'}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter>
            <CommandInput
              placeholder={isAdmin ? 'Buscar ou digitar para criar...' : 'Buscar tipo...'}
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Plus className="h-4 w-4" /> Criar tipo "{term}"
                  </button>
                ) : (
                  <span className="block px-2 py-3 text-center text-sm text-muted-foreground">
                    {isLoading
                      ? 'Carregando...'
                      : isAdmin
                        ? 'Digite para criar um novo'
                        : 'Nenhum tipo — peça a um admin para criar'}
                  </span>
                )}
              </CommandEmpty>
              {active.length > 0 && (
                <CommandGroup>
                  {active.map((cat) => {
                    const isSel = cat.slug === value;
                    return (
                      <CommandItem
                        key={cat.slug}
                        value={cat.name}
                        onSelect={() => {
                          onChange(isSel ? null : cat.slug);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', isSel ? 'opacity-100' : 'opacity-0')} />
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span className={cn('ml-2 h-2 w-2 rounded-full', bgDot(cat.color))} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {canCreate && active.length > 0 && (
                <CommandGroup heading="Criar novo">
                  <CommandItem value={`__create__${term}`} onSelect={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Criar "{term}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
