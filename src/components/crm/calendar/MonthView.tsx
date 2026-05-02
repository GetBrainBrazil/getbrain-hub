import { useMemo } from 'react';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DealActivity } from '@/types/crm';
import { ACTIVITY_TYPE_STYLES } from '@/lib/crm/activityColors';
import { cn } from '@/lib/utils';

interface Props {
  monthAnchor: Date;
  events: DealActivity[];
  onPickDay: (d: Date) => void;
}

/**
 * Mês compacto: cada dia mostra contador + até 4 pontinhos coloridos por tipo.
 * Clicar no dia abre a Semana correspondente.
 */
export function MonthView({ monthAnchor, events, onPickDay }: Props) {
  const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, DealActivity[]>();
    for (const d of days) map.set(format(d, 'yyyy-MM-dd'), []);
    for (const ev of events) {
      const dt = ev.scheduled_at ?? ev.happened_at;
      if (!dt) continue;
      const key = format(new Date(dt), 'yyyy-MM-dd');
      if (map.has(key)) map.set(key, [...(map.get(key) ?? []), ev]);
    }
    return map;
  }, [days, events]);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
        <div key={d} className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
      ))}
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const items = byDay.get(key) ?? [];
        const isToday = isSameDay(d, today);
        const inMonth = isSameMonth(d, monthAnchor);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPickDay(d)}
            className={cn(
              'flex h-20 flex-col items-stretch rounded-md border bg-card/40 p-1.5 text-left transition',
              'border-border/60 hover:border-border hover:bg-card',
              !inMonth && 'opacity-40',
              isToday && 'border-accent/60 bg-accent/5',
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                'font-mono text-xs font-semibold',
                isToday ? 'rounded bg-accent px-1.5 py-0.5 text-accent-foreground' : 'text-foreground',
              )}>{format(d, 'dd')}</span>
              {items.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              )}
            </div>
            <div className="mt-auto flex flex-wrap gap-1">
              {items.slice(0, 6).map((it) => (
                <span
                  key={it.id}
                  className={cn('h-1.5 w-1.5 rounded-full', ACTIVITY_TYPE_STYLES[it.type]?.dot ?? 'bg-muted-foreground')}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
