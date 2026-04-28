import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DEAL_STAGE_LABEL, DEAL_STAGE_PROBABILITY, DEAL_STAGES } from '@/constants/dealStages';
import { cn } from '@/lib/utils';
import type { DealStage } from '@/types/crm';

// Etapas em progresso, na ordem do funil. Ganho/Perdido ficam fora do stepper
// para evitar cliques acidentais que abrem o modal de fechamento.
const PROGRESS_STAGES: DealStage[] = ['presencial_agendada', 'presencial_feita', 'orcamento_enviado', 'em_negociacao'];

export function DetailShell({ children }: { children: React.ReactNode }) { return <div className="mx-auto max-w-[1600px] px-1 pb-12 animate-fade-in">{children}</div>; }
export function DetailBreadcrumb({ items, closeTo }: { items: { label: string; to?: string }[]; closeTo: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
          <Link to={closeTo} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        </Button>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 overflow-hidden">
          {items.map((item, i) => (
            <span key={`${item.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              {item.to
                ? <Link to={item.to} className="hover:text-foreground truncate">{item.label}</Link>
                : <span className="font-mono text-foreground truncate">{item.label}</span>}
            </span>
          ))}
        </nav>
      </div>
      <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Fechar">
        <Link to={closeTo} aria-label="Fechar"><X className="h-4 w-4" /></Link>
      </Button>
    </div>
  );
}

export function StageStepper({ stage, onChange }: { stage: DealStage; onChange?: (stage: DealStage) => void }) {
  const isClosed = stage === 'fechado_ganho' || stage === 'fechado_perdido';

  if (isClosed) {
    const isWon = stage === 'fechado_ganho';
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium',
        isWon
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-destructive/40 bg-destructive/10 text-destructive'
      )}>
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', isWon ? 'bg-success/20' : 'bg-destructive/20')}>
          {isWon ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        </span>
        Deal {DEAL_STAGE_LABEL[stage]}
      </div>
    );
  }

  const currentIndex = PROGRESS_STAGES.indexOf(stage);
  // Se por algum motivo o stage não estiver entre as etapas em progresso, considera tudo "futuro".
  const safeIndex = currentIndex === -1 ? -1 : currentIndex;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full min-w-0 items-stretch gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {PROGRESS_STAGES.map((s, i) => {
          const isDone = safeIndex >= 0 && i < safeIndex;
          const isCurrent = i === safeIndex;
          const isFuture = !isDone && !isCurrent;
          const showConnector = i < PROGRESS_STAGES.length - 1;
          return (
            <div key={s} className="flex flex-1 min-w-[110px] items-start gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange?.(s)}
                    disabled={!onChange}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cn(
                      'group flex flex-1 flex-col items-center gap-1.5 rounded-md px-2 py-2 text-center transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                      onChange ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default',
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                      isDone && 'border-accent bg-accent text-accent-foreground',
                      isCurrent && 'border-accent bg-accent text-accent-foreground ring-4 ring-accent/20',
                      isFuture && 'border-border bg-background',
                    )}>
                      {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={cn(
                      'text-[11px] leading-tight transition',
                      isCurrent && 'font-semibold text-foreground',
                      isDone && 'text-foreground/80',
                      isFuture && 'text-muted-foreground',
                    )}>
                      {DEAL_STAGE_LABEL[s]}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{DEAL_STAGE_LABEL[s]}</p>
                  <p className="text-xs text-muted-foreground">Probabilidade padrão: {DEAL_STAGE_PROBABILITY[s]}%</p>
                </TooltipContent>
              </Tooltip>
              {showConnector && (
                <span className={cn(
                  'mt-[14px] h-1 flex-1 min-w-[16px] rounded-full transition',
                  i < safeIndex ? 'bg-accent' : 'bg-border'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export function InfoBadge({ children, className }: { children: React.ReactNode; className?: string }) { return <Badge variant="outline" className={cn('rounded-md border-border bg-muted/40 font-normal', className)}>{children}</Badge>; }

