import { useEffect, useMemo, useRef } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DealActivity } from '@/types/crm';
import { ActivityBlock } from './ActivityBlock';
import { cn } from '@/lib/utils';

interface Props {
  date: Date;
  events: DealActivity[];
  onPick: (a: DealActivity) => void;
  onCreateAt: (slot: Date) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08..20

/**
 * Timeline vertical do dia, com slots de 1h e linha "agora".
 */
export function TodayView({ date, events, onPick, onCreateAt }: Props) {
  const dayStart = startOfDay(date);
  const isToday = isSameDay(date, new Date());
  const nowRef = useRef<HTMLDivElement>(null);

  const slots = useMemo(() => {
    const map = new Map<number, DealActivity[]>();
    HOURS.forEach((h) => map.set(h, []));
    for (const ev of events) {
      const dt = ev.scheduled_at ?? ev.happened_at;
      if (!dt) continue;
      const evDate = new Date(dt);
      if (!isSameDay(evDate, date)) continue;
      const h = evDate.getHours();
      const bucket = h < 8 ? 8 : h > 20 ? 20 : h;
      map.set(bucket, [...(map.get(bucket) ?? []), ev]);
    }
    return map;
  }, [events, date]);

  // scroll p/ "agora" no primeiro render
  useEffect(() => {
    if (isToday && nowRef.current) nowRef.current.scrollIntoView({ block: 'center' });
  }, [isToday]);

  const now = new Date();
  const nowMinutesFromStart = (now.getHours() - 8) * 60 + now.getMinutes();
  const SLOT_HEIGHT = 64; // px

  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="border-b border-border px-4 py-2">
        <p className="text-sm font-semibold text-foreground capitalize">
          {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
      <div className="relative">
        {HOURS.map((h) => {
          const items = slots.get(h) ?? [];
          const slotDate = new Date(dayStart); slotDate.setHours(h);
          return (
            <div key={h} className="flex border-b border-border/40 last:border-0" style={{ minHeight: SLOT_HEIGHT }}>
              <div className="w-14 shrink-0 border-r border-border/40 px-2 py-1.5 text-right">
                <span className="font-mono text-[11px] text-muted-foreground">{String(h).padStart(2, '0')}:00</span>
              </div>
              <button
                type="button"
                onClick={() => onCreateAt(slotDate)}
                className="group flex flex-1 flex-col gap-1 px-2 py-1.5 text-left transition hover:bg-muted/30"
              >
                {items.length === 0 ? (
                  <span className="text-[11px] text-transparent group-hover:text-muted-foreground">+ Nova</span>
                ) : (
                  items.map((it) => (
                    <span
                      key={it.id}
                      onClick={(e) => { e.stopPropagation(); onPick(it); }}
                      className="block"
                    >
                      <ActivityBlock activity={it} onClick={() => onPick(it)} density="compact" />
                    </span>
                  ))
                )}
              </button>
            </div>
          );
        })}

        {isToday && nowMinutesFromStart >= 0 && nowMinutesFromStart <= 13 * 60 && (
          <div
            ref={nowRef}
            className="pointer-events-none absolute left-14 right-0 z-10 flex items-center"
            style={{ top: (nowMinutesFromStart / 60) * SLOT_HEIGHT }}
          >
            <div className="h-2 w-2 -ml-1 rounded-full bg-destructive" />
            <div className={cn('h-px flex-1 bg-destructive')} />
            <span className="ml-2 mr-2 rounded bg-destructive px-1.5 py-0.5 font-mono text-[10px] text-destructive-foreground">
              {format(now, 'HH:mm')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
