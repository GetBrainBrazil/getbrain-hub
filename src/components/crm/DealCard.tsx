import { ArrowRight, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { DEAL_STAGE_BAR, DEAL_STAGE_TONE } from '@/constants/dealStages';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCrmPainCategories } from '@/hooks/crm/useCrmPainCategories';
import { useCrmProjectTypes } from '@/hooks/crm/useCrmProjectTypes';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { chipStyleFromHex, resolveHex } from '@/lib/crm/colorUtils';
import type { Deal } from '@/types/crm';

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
  const hasCategory = (deal.pain_categories?.length ?? 0) > 0 || !!deal.pain_category;
  if (!hasCategory) missing.push('categoria da dor');
  if (!deal.pain_description || deal.pain_description.trim().length < 40) missing.push('descrição da dor (≥ 40 caracteres)');
  if (!deal.project_type_v2 || deal.project_type_v2.length === 0) missing.push('tipo de projeto');
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

  const slugs = useMemo(() => {
    const arr = deal.pain_categories ?? [];
    if (arr.length) return arr;
    return deal.pain_category ? [deal.pain_category] : [];
  }, [deal.pain_categories, deal.pain_category]);
  const { data: allCats = [] } = useCrmPainCategories();
  const painChips = useMemo(
    () => slugs.map((s) => allCats.find((c) => c.slug === s)).filter(Boolean) as typeof allCats,
    [slugs, allCats],
  );

  const { data: projectTypes = [] } = useCrmProjectTypes();
  const projectTypeChips = useMemo(
    () =>
      (deal.project_type_v2 ?? [])
        .map((slug) => projectTypes.find((t) => t.slug === slug))
        .filter(Boolean) as typeof projectTypes,
    [projectTypes, deal.project_type_v2],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group w-full overflow-hidden rounded-xl border border-border/80 bg-card text-left shadow-sm transition-all',
          'hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
          'border-l-[3px]',
          DEAL_STAGE_TONE[deal.stage],
          dragging && 'opacity-0',
        )}
      >
        <div className="p-3.5">
          {/* Top row: code + project_type chip + discovery indicator */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">{deal.code}</span>
            <div className="flex items-center gap-1.5">
              {projectTypeChips.slice(0, 2).map((pt) => (
                <span
                  key={pt.slug}
                  className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                  style={chipStyleFromHex(pt.color)}
                >
                  {pt.name}
                </span>
              ))}
              {projectTypeChips.length > 2 && (
                <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  +{projectTypeChips.length - 2}
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'inline-flex h-4 w-4 items-center justify-center rounded-full transition',
                      discovery.complete ? 'text-success' : 'text-muted-foreground/30',
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
          <h3 className="mt-2 line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground">
            {deal.title}
          </h3>


          {/* Company */}
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onCompanyClick?.(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCompanyClick?.(); } }}
              className="max-w-[200px] truncate rounded-md bg-accent/10 px-2 py-0.5 text-accent transition hover:bg-accent/20"
            >
              🏢 {deal.company?.trade_name || deal.company?.legal_name}
            </span>
          </div>

          {/* Pain categories chips */}
          {painChips.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1">
              {painChips.slice(0, 3).map((cat) => (
                <Tooltip key={cat.slug}>
                  <TooltipTrigger asChild>
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                      style={chipStyleFromHex(cat.color)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: resolveHex(cat.color) }} />
                      {cat.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Categoria da dor: {cat.name}</TooltipContent>
                </Tooltip>
              ))}
              {painChips.length > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      +{painChips.length - 3}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{painChips.slice(3).map((c) => c.name).join(', ')}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Values: Implementação + MRR (smart display) */}
          {(() => {
            const impl = deal.estimated_implementation_value;
            const mrr = deal.estimated_mrr_value;
            const hasImpl = impl != null && Number(impl) > 0;
            const hasMrr = mrr != null && Number(mrr) > 0;
            const hasBoth = hasImpl && hasMrr;
            const fallback = Number(deal.estimated_value ?? 0);

            return (
              <div className="mt-3">
                <div className="flex items-start justify-between gap-2">
                  {hasBoth ? (
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-baseline gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500/90">Impl</span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-amber-500">{formatCurrency(Number(impl))}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">Valor de implementação (one-time)</TooltipContent>
                      </Tooltip>
                      <span className="text-muted-foreground/30 text-xs">·</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-baseline gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-accent/80">MRR</span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-accent">{formatCurrency(Number(mrr))}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">/mês</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">Receita recorrente mensal</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : hasImpl ? (
                    <p className="font-mono text-base font-semibold tabular-nums text-amber-500">
                      {formatCurrency(Number(impl))}
                      <span className="ml-1 font-sans text-[10px] font-medium uppercase tracking-wider text-amber-500/70">impl</span>
                    </p>
                  ) : hasMrr ? (
                    <p className="font-mono text-base font-semibold tabular-nums text-accent">
                      {formatCurrency(Number(mrr))}
                      <span className="ml-1 font-sans text-[10px] font-normal text-muted-foreground">/mês MRR</span>
                    </p>
                  ) : (
                    <p className="font-mono text-base font-semibold tabular-nums text-foreground">{formatCurrency(fallback)}</p>
                  )}
                  <span className="shrink-0 whitespace-nowrap text-[10.5px] text-muted-foreground/80">
                    {daysLabel(deal.expected_close_date)}
                  </span>
                </div>

                {/* Probability bar with explicit label */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Sparkles className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 shrink-0">
                        Chance
                      </span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full transition-all', DEAL_STAGE_BAR[deal.stage])} style={{ width: `${deal.probability_pct}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums text-foreground/80 shrink-0">
                        {deal.probability_pct}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Probabilidade de fechamento (definida pela etapa)</TooltipContent>
                </Tooltip>
              </div>
            );
          })()}
        </div>

        {/* Footer: next step (com fundo discreto pra separar visualmente) */}
        <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-muted/30 px-3.5 py-2 text-[11px]">
          {deal.next_step ? (
            <span className={cn('flex min-w-0 items-center gap-1 truncate', isLate ? 'text-destructive font-medium' : 'text-foreground/90')}>
              {isLate ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <ArrowRight className="h-3 w-3 shrink-0 text-accent" />}
              <span className="truncate">{deal.next_step}</span>
              {deal.next_step_date && (
                <span className="shrink-0 text-muted-foreground">· {daysLabel(deal.next_step_date)}</span>
              )}
            </span>
          ) : (
            <span className="italic text-muted-foreground/50">— sem próxima ação</span>
          )}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold text-foreground" title={deal.owner?.display_name ?? ''}>
            {initials}
          </span>
        </div>
      </button>
    </TooltipProvider>
  );
}
