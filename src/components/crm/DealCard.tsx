import { ACTIVITY_ICON, DEAL_STAGE_BAR, DEAL_STAGE_TONE, PROJECT_TYPE_LABEL } from '@/constants/dealStages';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { Deal } from '@/types/crm';

function daysLabel(date: string | null) {
  if (!date) return 'sem previsão';
  const today = new Date();
  const target = new Date(`${date}T12:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `atrasado há ${Math.abs(diff)} dias`;
  if (diff === 0) return 'fecha hoje';
  return `fecha em ${diff} dias`;
}

function relativeActivity(iso?: string | null) {
  if (!iso) return 'sem contato registrado';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

export function DealCard({ deal, dragging, onClick }: { deal: Deal; dragging?: boolean; onClick?: () => void }) {
  const activityDate = deal.last_activity?.happened_at ?? deal.last_activity?.scheduled_at;
  const initials = deal.owner?.display_name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'GB';
  const isUrgent = deal.expected_close_date && Math.ceil((new Date(`${deal.expected_close_date}T12:00:00`).getTime() - Date.now()) / 86400000) <= 7;
  const isLate = deal.expected_close_date && new Date(`${deal.expected_close_date}T12:00:00`).getTime() < Date.now();
  return (
    <button type="button" onClick={onClick} className={cn('w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-accent/50 hover:shadow-md', 'border-l-4', DEAL_STAGE_TONE[deal.stage], dragging && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono">{deal.code}</span>
        {deal.project_type && <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5">{PROJECT_TYPE_LABEL[deal.project_type] ?? deal.project_type}</span>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground">{deal.title}</h3>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span className="max-w-[150px] truncate rounded bg-accent/10 px-1.5 py-0.5 text-accent">{deal.company?.trade_name || deal.company?.legal_name}</span>
        {deal.contact && <span className="truncate text-muted-foreground">{deal.contact.full_name}</span>}
      </div>
      <p className="mt-3 text-lg font-semibold text-foreground">{formatCurrency(Number(deal.estimated_value ?? 0))}</p>
      <div className="mt-2 space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', DEAL_STAGE_BAR[deal.stage])} style={{ width: `${deal.probability_pct}%` }} /></div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{deal.probability_pct}% probabilidade</span><span className={cn(isUrgent && 'text-warning', isLate && 'text-destructive')}>{daysLabel(deal.expected_close_date)}</span></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{deal.last_activity ? ACTIVITY_ICON[deal.last_activity.type] : '•'} último contato: {relativeActivity(activityDate)}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-foreground">{initials}</span>
      </div>
    </button>
  );
}
