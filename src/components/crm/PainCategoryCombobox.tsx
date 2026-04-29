import { useMemo } from 'react';
import { ComboboxCreate, type ComboOption } from '@/components/crm/ComboboxCreate';
import { useCrmPainCategories, useCreatePainCategory } from '@/hooks/crm/useCrmPainCategories';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PainCategoryComboboxProps {
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
}

export function PainCategoryCombobox({ value, onChange, disabled }: PainCategoryComboboxProps) {
  const { isAdmin } = useAuth();
  const { data: categories = [], isLoading } = useCrmPainCategories({ onlyActive: true });
  const create = useCreatePainCategory();

  // Mostra a selecionada mesmo se estiver inativa (para não "perder" o valor histórico)
  const { data: allCategories = [] } = useCrmPainCategories();
  const selected = allCategories.find((c) => c.slug === value);

  const options: ComboOption[] = useMemo(() => {
    const base = categories.map((c) => ({ value: c.slug, label: c.name }));
    if (selected && !categories.find((c) => c.slug === selected.slug)) {
      // a atual está inativa — mostra mesmo assim com hint
      base.unshift({ value: selected.slug, label: selected.name, hint: 'inativa' });
    }
    return base;
  }, [categories, selected]);

  const handleCreate = async (label: string) => {
    if (!isAdmin) return;
    const created = await create.mutateAsync({ name: label });
    onChange(created.slug);
  };

  return (
    <div className="space-y-2">
      <ComboboxCreate
        value={value ?? ''}
        options={options}
        onChange={(v) => onChange(v || null)}
        onCreate={isAdmin ? handleCreate : undefined}
        placeholder="Selecionar categoria..."
        searchPlaceholder={isAdmin ? 'Buscar ou digitar para criar...' : 'Buscar categoria...'}
        emptyLabel={isAdmin ? 'Digite para criar uma nova' : 'Nenhuma categoria — peça a um admin para criar'}
        createLabel={(t) => `Criar nova categoria "${t}"`}
        loading={isLoading}
        disabled={disabled}
      />
      {selected && (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            selected.color ?? 'bg-muted text-muted-foreground border-border',
          )}
        >
          {selected.name}
          {!selected.is_active && <span className="ml-1 text-[9px] opacity-70">(inativa)</span>}
        </span>
      )}
    </div>
  );
}
