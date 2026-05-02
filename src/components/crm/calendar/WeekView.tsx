import { useMemo } from 'react';
import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DealActivity } from '@/types/crm';
import { ActivityBlock } from './ActivityBlock';
import { cn } from '@/lib/utils';

interface Props {
  weekAnchor: Date;
  events: DealActivity[];
  onPick: (a: DealActivity) => void;
  onCreateAt: (slot: Date) => void;
}

/**
 * Grid semanal compacto: 7 colunas × dias. Mostra todas as atividades empilhadas por dia.
 * Não usa grade horária (é a especialidade do TodayView) — foca em densidade e rapidez.
 */
export function WeekView({ weekAnchor, events, onPick, onCreateAt }: Props) {
  const start = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const end = endOfWeek(weekAnchor, { weekStartsOn: 1 });
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
    // ordena cada dia por horário
    for (const k of map.keys()) {
      map.set(k, (map.get(k) ?? []).sort((a, b) => {
        const ta = new Date(a.scheduled_at ?? a.happened_at ?? 0).getTime();
        const tb = new Date(b.scheduled_at ?? b.happened_at ?? 0).getTime();
        return ta - tb;
      }));
    }
    return map;
  }, [days, events]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[840px] grid-cols-7 gap-2">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const items = byDay.get(key) ?? [];
          const isToday = isSameDay(d, today);
          return (
            <div key={key} className="flex flex-col rounded-lg border border-border bg-card/40">
              <div className={cn(
                'flex items-center justify-between border-b border-border/60 px-2 py-1.5',
                isToday && 'bg-accent/10',
              )}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] uppercase text-muted-foreground">{format(d, 'EEE', { locale: ptBR })}</span>
                  <span className={cn('font-mono text-sm font-semibold', isToday ? 'text-accent' : 'text-foreground')}>
                    {format(d, 'dd')}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{items.length || ''}</span>
              </div>
              <div className="flex min-h-[160px] flex-col gap-1 p-1.5">
                {items.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const slot = new Date(d); slot.setHours(9, 0, 0, 0);
                      onCreateAt(slot);
                    }}
                    className="flex-1 rounded-md border border-dashed border-border/60 text-[11px] text-muted-foreground transition hover:border-border hover:bg-muted/30"
                  >
                    + agendar
                  </button>
                ) : (
                  items.map((it) => (
                    <ActivityBlock key={it.id} activity={it} onClick={() => onPick(it)} density="compact" />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
