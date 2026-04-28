import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DEAL_STAGE_BAR, DEAL_STAGE_TONE } from '@/constants/dealStages';
import { PROJECT_TYPE_V2_COLOR, PROJECT_TYPE_V2_LABEL } from '@/constants/dealEnumLabels';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { Deal, DealProjectType } from '@/types/crm';

function daysLabel(date: string | null) {
  if (!date) return 'sem previsão';
  const today = new Date();
  const target = new Date(`${date}T12:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `atrasado há ${Math.abs(diff)}d`;
  if (diff === 0) return 'fecha hoje';
  return `fecha em ${diff}d`;
}

export function isDiscoveryComplete(deal: Deal): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!deal.pain_category) missing.push('categoria da dor');
  if (!deal.pain_description || deal.pain_description.trim().length < 40) missing.push('descrição da dor (≥ 40 caracteres)');
  if (!deal.project_type_v2) missing.push('tipo de projeto');
  if (!deal.scope_summary || deal.scope_summary.trim().length < 40) missing.push('resumo do escopo (≥ 40 caracteres)');
  const dlv = (deal.deliverables ?? []).length;
  const ac = (deal.acceptance_criteria ?? []).length;
  if (dlv < 3 && ac < 3) missing.push('3 entregáveis OU 3 critérios de aceite');
  return { complete: missing.length === 0, missing };
}

export function DealCard({ deal, dragging, onClick, onCompanyClick }: { deal: Deal; dragging?: boolean; onClick?: () => void; onCompanyClick?: () => void }) {
  const initials = deal.owner?.display_name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'GB';
  const isLate = deal.next_step_date && deal.next_step_date < new Date().toISOString().slice(0, 10);
  const discovery = isDiscoveryComplete(deal);
  const projectTypeV2 = deal.project_type_v2 as DealProjectType | null;

  return (
    <TooltipProvider delayDuration={200}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-accent/50 hover:shadow-md',
          'border-l-4',
          DEAL_STAGE_TONE[deal.stage],
          dragging && 'opacity-0',
        )}
      >
        {/* Top row: code + project_type chip + discovery indicator */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-mono text-muted-foreground">{deal.code}</span>
          <div className="flex items-center gap-1.5">
            {projectTypeV2 && (
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', PROJECT_TYPE_V2_COLOR[projectTypeV2])}>
                {PROJECT_TYPE_V2_LABEL[projectTypeV2]}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex h-4 w-4 items-center justify-center rounded-full',
                    discovery.complete ? 'text-success' : 'text-muted-foreground/40',
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {discovery.complete
                  ? 'Descoberta completa'
                  : `Descoberta incompleta. Falta: ${discovery.missing.join(', ')}`}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground">{deal.title}</h3>

        {/* Company */}
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onCompanyClick?.(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCompanyClick?.(); } }}
            className="max-w-[180px] truncate rounded bg-accent/10 px-1.5 py-0.5 text-accent hover:bg-accent/20"
          >
            🏢 {deal.company?.trade_name || deal.company?.legal_name}
          </span>
        </div>

        {/* Value + prob + close date */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-foreground">
            {formatCurrency(Number(deal.estimated_value ?? 0))}{' '}
            <span className="text-xs font-normal text-muted-foreground">· {deal.probability_pct}%</span>
          </p>
          <span className="text-[11px] text-muted-foreground">{daysLabel(deal.expected_close_date)}</span>
        </div>

        {/* Probability bar */}
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full', DEAL_STAGE_BAR[deal.stage])} style={{ width: `${deal.probability_pct}%` }} />
        </div>

        {/* Next step */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px]">
          {deal.next_step ? (
            <span className={cn('flex min-w-0 items-center gap-1 truncate', isLate ? 'text-destructive font-medium' : 'text-foreground')}>
              {isLate ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <ArrowRight className="h-3 w-3 shrink-0 text-accent" />}
              <span className="truncate">{deal.next_step}</span>
              {deal.next_step_date && (
                <span className="shrink-0 text-muted-foreground">· {daysLabel(deal.next_step_date)}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground/60">— sem próxima ação</span>
          )}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-foreground" title={deal.owner?.display_name ?? ''}>
            {initials}
          </span>
        </div>
      </button>
    </TooltipProvider>
  );
}
