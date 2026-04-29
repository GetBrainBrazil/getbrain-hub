import { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCrmProjectTypes, useCreateProjectType, type CrmProjectType } from '@/hooks/crm/useCrmProjectTypes';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
  /** Quantos chips mostrar inline antes do botão "Mais opções". Default: 5. */
  inlineLimit?: number;
}

function bgDot(colorClass?: string | null) {
  if (!colorClass) return 'bg-muted-foreground/40';
  return colorClass.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-muted-foreground/40';
}

export function ProjectTypeSelect({ value, onChange, disabled, inlineLimit = 5 }: Props) {
  const { isAdmin } = useAuth();
  const { data: active = [], isLoading } = useCrmProjectTypes({ onlyActive: true });
  const { data: all = [] } = useCrmProjectTypes();
  const create = useCreateProjectType();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Garante que o item selecionado SEMPRE aparece como chip (mesmo se inativo
  // ou fora dos primeiros N), pra usuário ver o estado atual sem abrir popover.
  const inlineChips = useMemo<CrmProjectType[]>(() => {
    const base = active.slice(0, inlineLimit);
    if (!value) return base;
    if (base.find((c) => c.slug === value)) return base;
    const selected = all.find((c) => c.slug === value);
    if (!selected) return base;
    // Se estiver ativo mas fora do limite, troca o último
    if (selected.is_active) {
      return [...active.filter((c) => c.slug !== selected.slug).slice(0, inlineLimit - 1), selected];
    }
    // Se inativo (histórico), prepende
    return [selected, ...base];
  }, [active, all, value, inlineLimit]);

  const restCount = Math.max(0, active.length - inlineChips.filter((c) => c.is_active).length);

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

  if (isLoading) {
    return <div className="h-8 w-48 animate-pulse rounded-md bg-muted/40" />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-1.5">
        {inlineChips.map((cat) => {
          const selected = cat.slug === value;
          return (
            <button
              key={cat.slug}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected ? null : cat.slug)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
                selected
                  ? cn(cat.color ?? 'bg-muted text-muted-foreground border-border', 'ring-2 ring-offset-1 ring-offset-background ring-current/40 shadow-sm')
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full transition',
                  selected ? bgDot(cat.color) : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60',
                )}
              />
              <span>{cat.name}</span>
              {selected && <Check className="h-3 w-3 opacity-80" />}
              {!cat.is_active && (
                <span className="ml-0.5 text-[9px] opacity-60">(inativo)</span>
              )}
            </button>
          );
        })}

        {/* Botão "Mais opções / criar" */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  {restCount > 0 ? `Mais ${restCount}` : isAdmin ? 'Criar novo' : 'Buscar'}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isAdmin ? 'Buscar tipo ou criar um novo' : 'Buscar entre todos os tipos'}
              </TooltipContent>
            </Tooltip>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start" sideOffset={6}>
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
                      {isAdmin ? 'Digite para criar um novo' : 'Nenhum tipo — peça a um admin para criar'}
                    </span>
                  )}
                </CommandEmpty>
                {active.length > 0 && (
                  <CommandGroup heading="Tipos disponíveis">
                    {active.map((cat) => {
                      const selected = cat.slug === value;
                      return (
                        <CommandItem
                          key={cat.slug}
                          value={cat.name}
                          onSelect={() => {
                            onChange(selected ? null : cat.slug);
                            setOpen(false);
                          }}
                        >
                          <span className={cn('mr-2 h-2 w-2 rounded-full', bgDot(cat.color))} />
                          <span className="flex-1 truncate">{cat.name}</span>
                          {selected && <Check className="h-4 w-4 opacity-80" />}
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
    </TooltipProvider>
  );
}
