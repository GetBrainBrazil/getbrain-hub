import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useCrmProjectTypes,
  useCreateProjectType,
  useProjectTypeUsage,
  type CrmProjectType,
} from '@/hooks/crm/useCrmProjectTypes';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
  /** Quantos chips mostrar inline. Default: 6. */
  inlineLimit?: number;
}

/** Threshold em que entramos no "modo compacto" (esconde chips, foca na busca). */
const COMPACT_THRESHOLD = 20;

function bgDot(colorClass?: string | null) {
  if (!colorClass) return 'bg-muted-foreground/40';
  return colorClass.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-muted-foreground/40';
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface ChipProps {
  type: CrmProjectType;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  onClear?: () => void;
}

function TypeChip({ type, selected, disabled, onClick, onClear }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
        selected
          ? cn(
              type.color ?? 'bg-muted text-muted-foreground border-border',
              'shadow-sm ring-2 ring-current/30 ring-offset-1 ring-offset-background',
            )
          : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full transition',
          selected ? bgDot(type.color) : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60',
        )}
      />
      <span className="max-w-[14rem] truncate">{type.name}</span>
      {!type.is_active && <span className="ml-0.5 text-[9px] opacity-60">(inativo)</span>}
      {selected && onClear ? (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="ml-0.5 rounded-sm opacity-70 hover:bg-foreground/10 hover:opacity-100"
          aria-label="Remover seleção"
        >
          <X className="h-3 w-3" />
        </span>
      ) : selected ? (
        <Check className="h-3 w-3 opacity-80" />
      ) : null}
    </button>
  );
}

export function ProjectTypeSelect({ value, onChange, disabled, inlineLimit = 6 }: Props) {
  const { isAdmin } = useAuth();
  const { data: active = [], isLoading } = useCrmProjectTypes({ onlyActive: true });
  const { data: all = [] } = useCrmProjectTypes();
  const { data: usage = {} } = useProjectTypeUsage();
  const create = useCreateProjectType();

  const [query, setQuery] = useState('');
  const [overflowOpen, setOverflowOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const compactMode = all.length >= COMPACT_THRESHOLD;
  const selectedType = value ? all.find((c) => c.slug === value) ?? null : null;

  // Ranking inline: selecionado > top usados > resto pela ordem da tabela
  const inlineChips = useMemo<CrmProjectType[]>(() => {
    if (compactMode) return selectedType ? [selectedType] : [];

    const sorted = [...active].sort((a, b) => {
      const ua = usage[a.slug] ?? 0;
      const ub = usage[b.slug] ?? 0;
      if (ua !== ub) return ub - ua;
      return a.display_order - b.display_order;
    });

    const base = sorted.slice(0, inlineLimit);
    if (!selectedType) return base;
    if (base.find((c) => c.slug === selectedType.slug)) return base;
    if (selectedType.is_active) {
      return [
        selectedType,
        ...sorted.filter((c) => c.slug !== selectedType.slug).slice(0, inlineLimit - 1),
      ];
    }
    return [selectedType, ...base];
  }, [active, usage, selectedType, inlineLimit, compactMode]);

  // Filtragem por busca (aplica em todos os ativos, não só inline)
  const term = normalize(query);
  const filtered = useMemo(() => {
    if (!term) return null;
    return active.filter((c) => normalize(c.name).includes(term));
  }, [term, active]);

  const exact = term ? active.find((c) => normalize(c.name) === term) : null;
  const canCreate = !!isAdmin && !!term && !exact;

  // Lista de overflow (para o popover "+N outros")
  const overflowItems = useMemo(() => {
    const inlineSlugs = new Set(inlineChips.map((c) => c.slug));
    return active.filter((c) => !inlineSlugs.has(c.slug));
  }, [active, inlineChips]);

  const handleCreate = async () => {
    if (!canCreate) return;
    const created = await create.mutateAsync({ name: query.trim() });
    onChange(created.slug);
    setQuery('');
  };

  const handleSelectFirstFiltered = () => {
    if (filtered && filtered.length > 0) {
      onChange(filtered[0].slug);
      setQuery('');
      inputRef.current?.blur();
    } else if (canCreate) {
      handleCreate();
    }
  };

  // Fecha overflow quando começa a digitar (busca já cobre tudo)
  useEffect(() => {
    if (term) setOverflowOpen(false);
  }, [term]);

  if (isLoading) {
    return <div className="h-16 w-full animate-pulse rounded-md bg-muted/40" />;
  }

  // O que renderizar como chips (ou resultado de busca)
  const displayChips = filtered ?? inlineChips;

  return (
    <div className="space-y-2">
      {/* Input de busca sempre visível */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSelectFirstFiltered();
            } else if (e.key === 'Escape') {
              setQuery('');
            }
          }}
          placeholder={
            isAdmin
              ? compactMode
                ? `Buscar entre ${active.length} tipos ou criar novo...`
                : 'Buscar tipo ou digitar para criar...'
              : compactMode
                ? `Buscar entre ${active.length} tipos...`
                : 'Buscar tipo...'
          }
          className={cn(
            'h-8 w-full rounded-md border border-border bg-background pl-8 pr-8 text-xs outline-none transition',
            'placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          aria-label="Buscar tipo de projeto"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Linha de chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {displayChips.length === 0 && term && (
          <div className="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <span>Nenhum tipo encontrado.</span>
            {canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" /> Criar "{query.trim()}"
              </button>
            )}
          </div>
        )}

        {displayChips.map((cat) => {
          const selected = cat.slug === value;
          return (
            <TypeChip
              key={cat.slug}
              type={cat}
              selected={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? null : cat.slug)}
              onClear={selected ? () => onChange(null) : undefined}
            />
          );
        })}

        {/* "+N outros" — só quando NÃO está buscando e há overflow */}
        {!term && overflowItems.length > 0 && (
          <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                +{overflowItems.length} {overflowItems.length === 1 ? 'outro' : 'outros'}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start" sideOffset={6}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Todos os tipos ({active.length})
              </div>
              <div className="flex max-h-[280px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {active.map((cat) => {
                  const selected = cat.slug === value;
                  return (
                    <TypeChip
                      key={cat.slug}
                      type={cat}
                      selected={selected}
                      disabled={disabled}
                      onClick={() => {
                        onChange(selected ? null : cat.slug);
                        setOverflowOpen(false);
                      }}
                    />
                  );
                })}
              </div>
              {isAdmin && (
                <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
                  Para criar um novo tipo, digite o nome no campo de busca acima.
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Sugestão de criar quando há busca ativa e nenhuma correspondência exata */}
        {term && filtered && filtered.length > 0 && canCreate && (
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-primary/40 px-2 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> Criar "{query.trim()}"
          </button>
        )}
      </div>
    </div>
  );
}
