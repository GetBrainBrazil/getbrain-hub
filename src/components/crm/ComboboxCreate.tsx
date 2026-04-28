import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ComboOption = { value: string; label: string; hint?: string };

interface ComboboxCreateProps {
  value: string;
  options: ComboOption[];
  onChange: (value: string) => void;
  /** Chamado quando o usuário pressiona Enter ou clica em "Criar" para um termo novo. */
  onCreate?: (label: string) => void | Promise<void>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  createLabel?: (term: string) => string;
  disabled?: boolean;
  loading?: boolean;
  /** Permite que o trigger ocupe a largura total do container. */
  className?: string;
}

export function ComboboxCreate({
  value,
  options,
  onChange,
  onCreate,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar ou digitar para criar...',
  emptyLabel = 'Nenhum resultado',
  createLabel = (t) => `Criar "${t}"`,
  disabled,
  loading,
  className,
}: ComboboxCreateProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const term = query.trim();
  const exact = term ? options.find((o) => o.label.toLowerCase() === term.toLowerCase()) : null;
  const canCreate = !!onCreate && !!term && !exact;

  const handleCreate = async () => {
    if (!canCreate || !onCreate) return;
    await onCreate(term);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter>
          <CommandInput
            placeholder={searchPlaceholder}
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
                  <Plus className="h-4 w-4" /> {createLabel(term)}
                </button>
              ) : (
                <span className="block px-2 py-3 text-center text-sm text-muted-foreground">
                  {loading ? 'Carregando...' : emptyLabel}
                </span>
              )}
            </CommandEmpty>
            {options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.hint ?? ''}`}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && <span className="truncate text-xs text-muted-foreground">{opt.hint}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreate && options.length > 0 && (
              <CommandGroup heading="Criar novo">
                <CommandItem value={`__create__${term}`} onSelect={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> {createLabel(term)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
