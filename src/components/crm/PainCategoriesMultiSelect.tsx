import { useMemo, useState } from 'react';
import { Check, Plus, X, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCrmPainCategories, useCreatePainCategory } from '@/hooks/crm/useCrmPainCategories';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
}

export function PainCategoriesMultiSelect({ value, onChange, disabled }: Props) {
  const { isAdmin } = useAuth();
  const { data: active = [], isLoading } = useCrmPainCategories({ onlyActive: true });
  const { data: all = [] } = useCrmPainCategories();
  const create = useCreatePainCategory();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedItems = useMemo(
    () => value.map((slug) => all.find((c) => c.slug === slug)).filter(Boolean) as typeof all,
    [value, all],
  );

  const toggle = (slug: string) => {
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug));
    else onChange([...value, slug]);
  };

  const remove = (slug: string) => onChange(value.filter((s) => s !== slug));

  const term = query.trim();
  const exact = term ? active.find((c) => c.name.toLowerCase() === term.toLowerCase()) : null;
  const canCreate = !!isAdmin && !!term && !exact;

  const handleCreate = async () => {
    if (!canCreate) return;
    const created = await create.mutateAsync({ name: term });
    if (!value.includes(created.slug)) onChange([...value, created.slug]);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      {/* Chips selecionados */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((cat) => {
            const dot = cat.color?.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-muted-foreground/40';
            return (
              <span
                key={cat.slug}
                className={cn(
                  'group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium shadow-sm',
                  cat.color ?? 'bg-muted text-muted-foreground border-border',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', dot)} />
                <span className="max-w-[16rem] truncate">{cat.name}</span>
                {!cat.is_active && <span className="text-[9px] opacity-70">(inativa)</span>}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(cat.slug)}
                    className="ml-0.5 rounded-sm opacity-70 hover:bg-foreground/10 hover:opacity-100"
                    aria-label={`Remover ${cat.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            size="sm"
            className="h-8 w-full justify-between text-xs font-normal text-muted-foreground"
          >
            <span className="truncate">
              {selectedItems.length === 0
                ? 'Selecionar categorias de dor...'
                : `${selectedItems.length} selecionada${selectedItems.length > 1 ? 's' : ''} — adicionar mais`}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
          <Command shouldFilter>
            <CommandInput
              placeholder={isAdmin ? 'Buscar ou digitar para criar...' : 'Buscar categoria...'}
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
                    <Plus className="h-4 w-4" /> Criar nova categoria "{term}"
                  </button>
                ) : (
                  <span className="block px-2 py-3 text-center text-sm text-muted-foreground">
                    {isLoading
                      ? 'Carregando...'
                      : isAdmin
                        ? 'Digite para criar uma nova'
                        : 'Nenhuma categoria — peça a um admin para criar'}
                  </span>
                )}
              </CommandEmpty>
              {active.length > 0 && (
                <CommandGroup>
                  {active.map((cat) => {
                    const checked = value.includes(cat.slug);
                    return (
                      <CommandItem
                        key={cat.slug}
                        value={cat.name}
                        onSelect={() => toggle(cat.slug)}
                      >
                        <Check className={cn('mr-2 h-4 w-4', checked ? 'opacity-100' : 'opacity-0')} />
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span
                          className={cn(
                            'ml-2 h-2 w-2 rounded-full',
                            cat.color?.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-muted-foreground/40',
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {canCreate && active.length > 0 && (
                <CommandGroup heading="Criar nova">
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
