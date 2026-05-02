import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DEAL_STAGE_LABEL, DEAL_STAGE_PROBABILITY, DEAL_STAGES } from '@/constants/dealStages';
import { cn } from '@/lib/utils';
import type { DealStage } from '@/types/crm';

// Etapas em progresso, na ordem do funil.
// `com_interesse` é o sinal do cliente vindo da proposta pública ("Quero avançar"),
// renderizado com destaque verde para diferenciar dos passos empurrados pelo vendedor.
const PROGRESS_STAGES: DealStage[] = ['descoberta_marcada', 'descobrindo', 'proposta_na_mesa', 'ajustando', 'gelado', 'com_interesse'];
const INTEREST_STAGE: DealStage = 'com_interesse';
// Etapas finais — sempre visíveis no fim do stepper, com estilo distinto.
const CLOSED_STAGES: DealStage[] = ['ganho', 'perdido'];

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
  const progressIndex = PROGRESS_STAGES.indexOf(stage);
  const isClosedStage = CLOSED_STAGES.includes(stage);

  const renderStep = (s: DealStage, opts: { isDone: boolean; isCurrent: boolean; kind: 'progress' | 'interest' | 'won' | 'lost' }) => {
    const { isDone, isCurrent, kind } = opts;
    const isFuture = !isDone && !isCurrent;
    const isInterest = kind === 'interest';
    const isWon = kind === 'won';
    const isLost = kind === 'lost';

    return (
      <Tooltip key={s}>
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
              // Em progresso: usa accent
              kind === 'progress' && isDone && 'border-accent bg-accent text-accent-foreground',
              kind === 'progress' && isCurrent && 'border-accent bg-accent text-accent-foreground ring-4 ring-accent/20',
              kind === 'progress' && isFuture && 'border-border bg-background',
              // Com interesse — sinal do cliente, sempre verde
              isInterest && isCurrent && 'border-success bg-success text-success-foreground ring-4 ring-success/25 animate-pulse',
              isInterest && isDone && 'border-success bg-success text-success-foreground',
              isInterest && isFuture && 'border-success/40 bg-background text-success',
              // Convertido (won)
              isWon && isCurrent && 'border-success bg-success text-success-foreground ring-4 ring-success/20',
              isWon && !isCurrent && 'border-success/40 bg-background text-success',
              // Perdido (lost)
              isLost && isCurrent && 'border-destructive bg-destructive text-destructive-foreground ring-4 ring-destructive/20',
              isLost && !isCurrent && 'border-destructive/40 bg-background text-destructive',
            )}>
              {kind === 'progress' && isDone && <Check className="h-3 w-3" strokeWidth={3} />}
              {isInterest && <Sparkles className="h-3 w-3" strokeWidth={3} />}
              {isWon && <Check className="h-3 w-3" strokeWidth={3} />}
              {isLost && <X className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={cn(
              'text-[11px] leading-tight transition',
              isCurrent && 'font-semibold text-foreground',
              isDone && 'text-foreground/80',
              isFuture && 'text-muted-foreground',
              isInterest && isCurrent && 'font-semibold text-success',
              isInterest && !isCurrent && 'text-success/80',
              isWon && !isCurrent && 'text-success/80',
              isLost && !isCurrent && 'text-destructive/80',
            )}>
              {DEAL_STAGE_LABEL[s]}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">{DEAL_STAGE_LABEL[s]}</p>
          {isInterest ? (
            <p className="text-xs text-muted-foreground">Cliente clicou em "Quero avançar" na proposta pública.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Probabilidade padrão: {DEAL_STAGE_PROBABILITY[s]}%</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full min-w-0 items-stretch gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {PROGRESS_STAGES.map((s, i) => {
          const isDone = progressIndex >= 0 && i < progressIndex;
          const isCurrent = i === progressIndex;
          const showConnector = i < PROGRESS_STAGES.length - 1;
          const stepKind = s === INTEREST_STAGE ? 'interest' : 'progress';
          // Conector que precede o passo "Com Interesse" fica verde quando ativo,
          // pra reforçar que o sinal vem do cliente.
          const nextIsInterest = PROGRESS_STAGES[i + 1] === INTEREST_STAGE;
          const connectorActive = i < progressIndex;
          return (
            <div key={s} className="flex flex-1 min-w-[110px] items-start gap-1">
              {renderStep(s, { isDone, isCurrent, kind: stepKind })}
              {showConnector && (
                <span className={cn(
                  'mt-[14px] h-1 flex-1 min-w-[16px] rounded-full transition',
                  connectorActive
                    ? (nextIsInterest ? 'bg-success' : 'bg-accent')
                    : (nextIsInterest ? 'bg-success/30' : 'bg-border'),
                )} />
              )}
            </div>
          );
        })}

        {/* Separador entre etapas em progresso e fechamentos */}
        <div className="mx-1 flex shrink-0 items-stretch" aria-hidden>
          <div className="my-1 w-px bg-border/60" />
        </div>

        {/* Etapas finais: Convertido / Perdido */}
        {CLOSED_STAGES.map((s) => (
          <div key={s} className="flex shrink-0 min-w-[100px] items-start">
            {renderStep(s, {
              isDone: false,
              isCurrent: stage === s,
              kind: s === 'ganho' ? 'won' : 'lost',
            })}
          </div>
        ))}
      </div>
      {isClosedStage && (
        <p className={cn(
          'mt-1 text-xs',
          stage === 'ganho' ? 'text-success' : 'text-destructive',
        )}>
          Deal {DEAL_STAGE_LABEL[stage]} — clique em outra etapa para reabrir.
        </p>
      )}
    </TooltipProvider>
  );
}

export function InfoBadge({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) { return <Badge variant="outline" className={cn('rounded-md border-border bg-muted/40 font-normal', className)} style={style}>{children}</Badge>; }

