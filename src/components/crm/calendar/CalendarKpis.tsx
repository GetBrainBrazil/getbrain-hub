import { CalendarClock, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  hoje: number;
  atrasadas: number;
  semana: number;
  feitas7d: number;
  loading?: boolean;
  onPick?: (filter: 'hoje' | 'atrasadas' | 'semana' | 'feitas7d') => void;
}

const ITEMS = [
  { key: 'hoje', label: 'Hoje', icon: CalendarClock, tone: 'text-accent', ring: 'hover:border-accent/50' },
  { key: 'atrasadas', label: 'Atrasadas', icon: AlertTriangle, tone: 'text-destructive', ring: 'hover:border-destructive/50' },
  { key: 'semana', label: 'Próximos 7 dias', icon: CalendarDays, tone: 'text-foreground', ring: 'hover:border-border' },
  { key: 'feitas7d', label: 'Realizadas (7d)', icon: CheckCircle2, tone: 'text-success', ring: 'hover:border-success/50' },
] as const;

export function CalendarKpis({ hoje, atrasadas, semana, feitas7d, loading, onPick }: Props) {
  const values = { hoje, atrasadas, semana, feitas7d };
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {ITEMS.map(({ key, label, icon: Icon, tone, ring }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick?.(key)}
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-3 text-left transition',
            ring,
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={cn('font-mono text-2xl font-semibold tabular-nums', tone)}>
              {loading ? '—' : values[key]}
            </p>
          </div>
          <Icon className={cn('h-5 w-5 shrink-0', tone)} />
        </button>
      ))}
    </div>
  );
}
