import { format } from 'date-fns';
import type { DealActivity } from '@/types/crm';
import { cn } from '@/lib/utils';
import { ACTIVITY_TYPE_SHORT, ACTIVITY_TYPE_STYLES } from '@/lib/crm/activityColors';

export function getActivityStatus(a: DealActivity) {
  if (a.happened_at) return 'realizadas' as const;
  if (a.scheduled_at && new Date(a.scheduled_at).getTime() < Date.now()) return 'atrasadas' as const;
  return 'agendadas' as const;
}

interface Props {
  activity: DealActivity;
  onClick?: () => void;
  density?: 'compact' | 'comfortable';
  showDate?: boolean;
}

/**
 * Bloco visual padronizado de uma atividade.
 * Borda esquerda colorida pelo tipo, texto truncado, hover claro.
 */
export function ActivityBlock({ activity, onClick, density = 'comfortable', showDate = false }: Props) {
  const styles = ACTIVITY_TYPE_STYLES[activity.type] ?? ACTIVITY_TYPE_STYLES.outro;
  const status = getActivityStatus(activity);
  const date = activity.scheduled_at ?? activity.happened_at;
  const isDone = status === 'realizadas';
  const isOverdue = status === 'atrasadas';

  const ref = activity.deal_code ?? activity.lead_code;
  const owner = activity.owner?.display_name;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group block w-full overflow-hidden rounded-md border border-l-[3px] text-left transition',
        'border-border/50 bg-card/60 hover:border-border hover:bg-card',
        styles.border,
        density === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2',
        isDone && 'opacity-60',
      )}
    >
      <div className="flex items-baseline gap-1.5 text-[11px] leading-none">
        <span className={cn('font-mono font-semibold', isOverdue ? 'text-destructive' : styles.text)}>
          {date ? format(new Date(date), showDate ? 'dd/MM HH:mm' : 'HH:mm') : '—'}
        </span>
        <span className="truncate text-muted-foreground">{ACTIVITY_TYPE_SHORT[activity.type]}</span>
      </div>
      <p className={cn(
        'mt-0.5 truncate text-xs font-medium text-foreground',
        isDone && 'line-through',
        density === 'comfortable' && 'text-sm',
      )}>
        {activity.title}
      </p>
      {(ref || owner) && density === 'comfortable' && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {ref && <span className="font-mono">{ref}</span>}
          {ref && owner && ' · '}
          {owner}
        </p>
      )}
    </button>
  );
}
