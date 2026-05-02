import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileText, Link2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { DEAL_STAGE_LABEL, DEAL_STAGE_TONE } from '@/constants/dealStages';
import { isDiscoveryComplete } from '@/components/crm/DealCard';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { Deal } from '@/types/crm';

export type DealsListSort = 'next_step' | 'value' | 'value_asc' | 'probability' | 'close' | 'recent';

interface Props {
  deals: Deal[];
  overdueDepsByDeal: Record<string, number>;
  onClearFilters?: () => void;
}

function whenLabel(date: string | null): { text: string; tone: 'late' | 'today' | 'soon' | 'normal' | 'none' } {
  if (!date) return { text: '—', tone: 'none' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T12:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `atrasado ${Math.abs(diff)}d`, tone: 'late' };
  if (diff === 0) return { text: 'hoje', tone: 'today' };
  if (diff <= 3) return { text: `em ${diff}d`, tone: 'soon' };
  return { text: `em ${diff}d`, tone: 'normal' };
}

function closeLabel(date: string | null): string {
  if (!date) return '—';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T12:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `atrasado ${Math.abs(diff)}d`;
  if (diff === 0) return 'hoje';
  if (diff <= 30) return `${diff}d`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(target);
}

export function DealsList({ deals, overdueDepsByDeal, onClearFilters }: Props) {
  const navigate = useNavigate();

  if (!deals.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
        <p className="text-sm font-medium text-foreground">Nenhum deal encontrado com os filtros atuais</p>
        {onClearFilters && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="h-9 w-[110px] px-3 text-[11px] uppercase tracking-wide">Sinais</TableHead>
              <TableHead className="h-9 w-[90px] px-2 text-[11px] uppercase tracking-wide">Código</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wide">Título</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wide">Empresa</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wide">Estágio</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wide">Próx. ação</TableHead>
              <TableHead className="h-9 w-[110px] px-2 text-[11px] uppercase tracking-wide">Quando</TableHead>
              <TableHead className="h-9 w-[110px] px-2 text-right text-[11px] uppercase tracking-wide">Valor</TableHead>
              <TableHead className="h-9 w-[70px] px-2 text-right text-[11px] uppercase tracking-wide">Prob.</TableHead>
              <TableHead className="h-9 w-[100px] px-2 text-right text-[11px] uppercase tracking-wide">Fecha em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => {
              const discovery = isDiscoveryComplete(deal);
              const overdueDeps = overdueDepsByDeal[deal.id] ?? 0;
              const nextStepWhen = whenLabel(deal.next_step_date);
              const isNextLate = nextStepWhen.tone === 'late';
              const hasProposal = !!deal.proposal_url;
              return (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer h-10 hover:bg-muted/40"
                  onClick={() => navigate(`/crm/deals/${deal.code}`)}
                >
                  <TableCell className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {isNextLate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-destructive"><AlertTriangle className="h-3.5 w-3.5" /></span>
                          </TooltipTrigger>
                          <TooltipContent>Próxima ação atrasada</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(discovery.complete ? 'text-success' : 'text-muted-foreground/30')}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {discovery.complete ? 'Descoberta completa' : `Falta: ${discovery.missing.join(', ')}`}
                        </TooltipContent>
                      </Tooltip>
                      {hasProposal && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-accent"><FileText className="h-3.5 w-3.5" /></span>
                          </TooltipTrigger>
                          <TooltipContent>Proposta gerada</TooltipContent>
                        </Tooltip>
                      )}
                      {overdueDeps > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-0.5 text-destructive">
                              <Link2 className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-mono">{overdueDeps}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{overdueDeps} dependência(s) atrasada(s)</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{deal.code}</TableCell>
                  <TableCell className="max-w-[260px] truncate px-2 py-1.5 text-sm font-medium text-foreground">{deal.title}</TableCell>
                  <TableCell className="max-w-[160px] truncate px-2 py-1.5 text-sm text-foreground">
                    {deal.company?.trade_name || deal.company?.legal_name || '—'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <span className={cn('inline-block rounded border-l-[3px] bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground', DEAL_STAGE_TONE[deal.stage])}>
                      {DEAL_STAGE_LABEL[deal.stage]}
                    </span>
                  </TableCell>
                  <TableCell className={cn('max-w-[260px] truncate px-2 py-1.5 text-xs', deal.next_step ? 'text-foreground' : 'text-muted-foreground/60')}>
                    {deal.next_step || '—'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    <span className={cn(
                      nextStepWhen.tone === 'late' && 'text-destructive font-medium',
                      nextStepWhen.tone === 'today' && 'text-warning font-medium',
                      nextStepWhen.tone === 'soon' && 'text-warning',
                      nextStepWhen.tone === 'normal' && 'text-foreground',
                      nextStepWhen.tone === 'none' && 'text-muted-foreground/60',
                    )}>{nextStepWhen.text}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right text-sm font-semibold text-foreground tabular-nums">
                    {(() => {
                      const impl = Number(deal.estimated_implementation_value ?? 0);
                      const mrr = Number(deal.estimated_mrr_value ?? 0);
                      if (impl === 0 && mrr === 0) return '—';
                      return (
                        <span className="inline-flex flex-col items-end leading-tight">
                          <span>{impl > 0 ? formatCurrency(impl) : '—'}</span>
                          {mrr > 0 && (
                            <span className="text-[10px] font-normal text-muted-foreground">
                              + {formatCurrency(mrr)}/mês
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right text-xs text-muted-foreground tabular-nums">{deal.probability_pct}%</TableCell>
                  <TableCell className="px-2 py-1.5 text-right text-xs text-muted-foreground tabular-nums">{closeLabel(deal.expected_close_date)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

export function sortDeals(deals: Deal[], sort: DealsListSort): Deal[] {
  const arr = [...deals];
  // Valor = implementação one-time (alinhado com a coluna "Valor" exibida).
  const valueOf = (d: Deal) => Number(d.estimated_implementation_value ?? 0);
  if (sort === 'value') {
    return arr.sort((a, b) => valueOf(b) - valueOf(a));
  }
  if (sort === 'value_asc') {
    return arr.sort((a, b) => valueOf(a) - valueOf(b));
  }
  if (sort === 'probability') {
    return arr.sort((a, b) => b.probability_pct - a.probability_pct);
  }
  if (sort === 'close') {
    return arr.sort((a, b) => {
      if (!a.expected_close_date && !b.expected_close_date) return 0;
      if (!a.expected_close_date) return 1;
      if (!b.expected_close_date) return -1;
      return a.expected_close_date.localeCompare(b.expected_close_date);
    });
  }
  if (sort === 'recent') {
    return arr.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }
  // next_step (default): atrasados topo, depois mais antigo→novo, sem data no fim
  const today = new Date().toISOString().slice(0, 10);
  return arr.sort((a, b) => {
    const aHas = !!a.next_step_date;
    const bHas = !!b.next_step_date;
    if (!aHas && !bHas) return 0;
    if (!aHas) return 1;
    if (!bHas) return -1;
    const aLate = a.next_step_date! < today;
    const bLate = b.next_step_date! < today;
    if (aLate && !bLate) return -1;
    if (!aLate && bLate) return 1;
    return a.next_step_date!.localeCompare(b.next_step_date!);
  });
}

// re-export hook helper for memoization
export function useSortedDeals(deals: Deal[], sort: DealsListSort) {
  return useMemo(() => sortDeals(deals, sort), [deals, sort]);
}
