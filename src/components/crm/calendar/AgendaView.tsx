import { useMemo } from 'react';
import { format, isSameDay, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DealActivity } from '@/types/crm';
import { ActivityBlock, getActivityStatus } from './ActivityBlock';

interface Props {
  events: DealActivity[];
  onPick: (a: DealActivity) => void;
}

interface Group {
  key: string;
  label: string;
  tone: 'destructive' | 'accent' | 'foreground' | 'muted';
  items: DealActivity[];
}

/**
 * Lista agrupada por bucket lógico (Atrasadas / Hoje / Amanhã / Próximos / Realizadas).
 */
export function AgendaView({ events, onPick }: Props) {
  const groups = useMemo<Group[]>(() => {
    const overdue: DealActivity[] = [];
    const today: DealActivity[] = [];
    const tomorrow: DealActivity[] = [];
    const upcoming: DealActivity[] = [];
    const done: DealActivity[] = [];

    for (const ev of events) {
      const status = getActivityStatus(ev);
      const dt = new Date(ev.scheduled_at ?? ev.happened_at ?? 0);
      if (status === 'realizadas') done.push(ev);
      else if (status === 'atrasadas') overdue.push(ev);
      else if (isToday(dt)) today.push(ev);
      else if (isTomorrow(dt)) tomorrow.push(ev);
      else upcoming.push(ev);
    }

    const byDate = (a: DealActivity, b: DealActivity) =>
      new Date(a.scheduled_at ?? a.happened_at ?? 0).getTime() -
      new Date(b.scheduled_at ?? b.happened_at ?? 0).getTime();

    return [
      { key: 'atrasadas', label: 'Atrasadas', tone: 'destructive' as const, items: overdue.sort(byDate) },
      { key: 'hoje', label: 'Hoje', tone: 'accent' as const, items: today.sort(byDate) },
      { key: 'amanha', label: 'Amanhã', tone: 'foreground' as const, items: tomorrow.sort(byDate) },
      { key: 'proximos', label: 'Próximos', tone: 'foreground' as const, items: upcoming.sort(byDate) },
      { key: 'feitas', label: 'Realizadas no período', tone: 'muted' as const, items: done.sort(byDate).reverse() },
    ].filter((g) => g.items.length > 0);
  }, [events]);

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card/30 py-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade nos filtros atuais.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 flex items-baseline gap-2 border-b border-border/60 pb-1.5">
            <span className={
              g.tone === 'destructive' ? 'text-sm font-semibold text-destructive' :
              g.tone === 'accent' ? 'text-sm font-semibold text-accent' :
              g.tone === 'muted' ? 'text-sm font-semibold text-muted-foreground' :
              'text-sm font-semibold text-foreground'
            }>{g.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{g.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {g.items.map((it) => (
              <ActivityBlock key={it.id} activity={it} onClick={() => onPick(it)} showDate />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
