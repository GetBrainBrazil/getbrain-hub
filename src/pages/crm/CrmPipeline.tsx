import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { ArrowUpDown, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DealCard } from '@/components/crm/DealCard';
import { DealWonDialog } from '@/components/crm/DealWonDialog';
import { DealsList, useSortedDeals, type DealsListSort } from '@/components/crm/DealsList';
import { NewDealQuickDialog } from '@/components/crm/NewDealQuickDialog';
import { CreateProposalForStageDialog } from '@/components/crm/CreateProposalForStageDialog';
import { MultiFilter, ValueRangeFilter } from '@/components/crm/CrmFilters';
import { useCrmActors, useDistinctLeadSources } from '@/hooks/crm/useCrmReference';
import {
  DEAL_STAGE_DOT,
  DEAL_STAGE_LABEL,
  DEAL_STAGE_PROBABILITY,
  DEAL_STAGES,
} from '@/constants/dealStages';
import { useCrmProjectTypes } from '@/hooks/crm/useCrmProjectTypes';
import { useDeals, useUpdateDealStage } from '@/hooks/crm/useDeals';
import { useDealsIndicators } from '@/hooks/crm/useDealsIndicators';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { createDraftProposal } from '@/components/orcamentos/createDraftProposal';
import { invalidateProposalCaches } from '@/lib/cacheInvalidation';
import type { Deal, DealStage } from '@/types/crm';

const ACTIVE_STAGES: DealStage[] = ['descoberta_marcada', 'descobrindo', 'proposta_na_mesa', 'ajustando', 'gelado'];

function DraggableDeal({ deal, onOpen, onCompanyOpen }: { deal: Deal; onOpen: () => void; onCompanyOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('transition-opacity duration-150', isDragging && 'pointer-events-none opacity-0')}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      aria-hidden={isDragging}
    >
      <DealCard deal={deal} onClick={onOpen} onCompanyClick={onCompanyOpen} />
    </div>
  );
}

function Column({ stage, deals, collapsed, onToggleCollapsed, onOpen, onCompanyOpen, onAdd }: { stage: DealStage; deals: Deal[]; collapsed: boolean; onToggleCollapsed: () => void; onOpen: (deal: Deal) => void; onCompanyOpen: (deal: Deal) => void; onAdd: (stage: DealStage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, d) => sum + Number(d.estimated_value ?? 0), 0);
  const dotClass = DEAL_STAGE_DOT[stage];

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        onClick={onToggleCollapsed}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapsed(); } }}
        aria-label={`Expandir ${DEAL_STAGE_LABEL[stage]}`}
        title="Clique para expandir"
        className={cn(
          'group flex w-12 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-lg bg-muted/20 p-2 transition-colors hover:bg-muted/40',
          isOver && 'bg-accent/10 ring-2 ring-accent/40',
        )}
      >
        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', dotClass)} aria-hidden />
        <div
          className="flex flex-1 items-center justify-center"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          <span className="whitespace-nowrap text-xs font-semibold text-foreground">
            {DEAL_STAGE_LABEL[stage]}
          </span>
        </div>
        <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {deals.length}
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-[85vw] sm:w-80 shrink-0 flex-col rounded-lg bg-muted/20 p-3 snap-start sm:snap-align-none">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleCollapsed}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapsed(); } }}
        aria-label={`Recolher ${DEAL_STAGE_LABEL[stage]}`}
        title="Clique para recolher"
        className="mb-3 -mx-1 cursor-pointer rounded-md px-1 py-1 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotClass)} aria-hidden />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{DEAL_STAGE_LABEL[stage]}</h3>
              <p className="text-xs text-muted-foreground">{formatCurrency(total)} · {deals.length} deals</p>
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {deals.length}
            </span>
            {!stage.startsWith('fechado') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-7 sm:w-7"
                onClick={(e) => { e.stopPropagation(); onAdd(stage); }}
                aria-label="Adicionar deal"
              >
                <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div ref={setNodeRef} className={cn('flex max-h-[calc(100vh-360px)] min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-md pr-1 transition-colors', isOver && 'bg-accent/10 ring-2 ring-accent/40')}>
        {deals.map((deal) => <DraggableDeal key={deal.id} deal={deal} onOpen={() => onOpen(deal)} onCompanyOpen={() => onCompanyOpen(deal)} />)}
        {deals.length === 0 && (
          <button type="button" onClick={() => onAdd(stage)} className="rounded-md border border-dashed border-border/60 px-3 py-6 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground">
            + Novo deal
          </button>
        )}
      </div>
    </div>
  );
}

function HomeKpi({ label, value, hint, tone, tooltip }: { label: string; value: string; hint?: string; tone?: 'destructive' | 'success' | 'accent'; tooltip?: string }) {
  const card = (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2.5 sm:px-4 sm:py-3 cursor-help transition-colors hover:border-accent/40 hover:bg-card">
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 text-base sm:text-lg font-semibold tabular-nums',
        tone === 'destructive' && 'text-destructive',
        tone === 'success' && 'text-success',
        tone === 'accent' && 'text-accent',
        !tone && 'text-foreground',
      )}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
  if (!tooltip) return card;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function CrmPipeline() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ownerFilter = useCrmHubStore((s) => s.ownerFilter);
  const sourceFilter = useCrmHubStore((s) => s.sourceFilter);
  const valueRange = useCrmHubStore((s) => s.valueRange);
  const search = useCrmHubStore((s) => s.search);
  const setOwnerFilter = useCrmHubStore((s) => s.setOwnerFilter);
  const setSourceFilter = useCrmHubStore((s) => s.setSourceFilter);
  const setValueRange = useCrmHubStore((s) => s.setValueRange);
  const setSearch = useCrmHubStore((s) => s.setSearch);
  const resetGlobalFilters = useCrmHubStore((s) => s.resetFilters);

  const { data: actors = [] } = useCrmActors();
  const { data: leadSources = [] } = useDistinctLeadSources();

  // Persisted view mode
  const [viewMode, setViewMode] = usePersistedState<'lista' | 'kanban'>('crm_view_mode', 'lista');
  const [collapsedStages, setCollapsedStages] = usePersistedState<DealStage[]>('crm_kanban_collapsed_stages', []);
  const toggleCollapsedStage = (stage: DealStage) => {
    setCollapsedStages((prev) => (prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]));
  };

  // Page-local filters (não persistidos — resetam a cada visita)
  const [stageFilter, setStageFilter] = useState<DealStage[]>([]);
  const [projectTypeFilter, setProjectTypeFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<DealsListSort>('next_step');

  const filters = useMemo(
    () => ({ ownerIds: ownerFilter, sourceIds: sourceFilter, valueRange, search }),
    [ownerFilter, sourceFilter, valueRange, search],
  );
  const { data: indicators } = useDealsIndicators();
  const { data: rawDeals = [], isLoading } = useDeals(filters);
  const { data: activeProjectTypes = [] } = useCrmProjectTypes({ onlyActive: true });
  const updateStage = useUpdateDealStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStage, setCreateStage] = useState<DealStage>('descoberta_marcada');
  const [lost, setLost] = useState<{ deal: Deal; stage: DealStage } | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [won, setWon] = useState<{ deal: Deal; stage: DealStage } | null>(null);
  const [needsProposal, setNeedsProposal] = useState<{ deal: Deal; stage: DealStage } | null>(null);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [visualStageOverrides, setVisualStageOverrides] = useState<Record<string, DealStage>>({});

  const openCreateDialog = (stage: DealStage = 'descoberta_marcada') => {
    setCreateStage(stage);
    setCreateOpen(true);
  };

  // Deals filtrados (estágio + tipo)
  const filteredDeals = useMemo(() => {
    return rawDeals.map((d) => {
      const overrideStage = visualStageOverrides[d.id];
      return overrideStage ? { ...d, stage: overrideStage, probability_pct: DEAL_STAGE_PROBABILITY[overrideStage] } : d;
    }).filter((d) => {
      if (stageFilter.length && !stageFilter.includes(d.stage)) return false;
      if (projectTypeFilter.length && !(d.project_type_v2 ?? []).some((s) => projectTypeFilter.includes(s))) return false;
      return true;
    });
  }, [rawDeals, visualStageOverrides, stageFilter, projectTypeFilter]);

  // Lista mostra apenas ativos por padrão (sem filtro de estágio aplicado)
  const listDeals = useMemo(() => {
    if (stageFilter.length) return filteredDeals;
    return filteredDeals.filter((d) => ACTIVE_STAGES.includes(d.stage));
  }, [filteredDeals, stageFilter]);

  const sortedListDeals = useSortedDeals(listDeals, sort);

  // KPIs reagem aos filtros aplicados (estágio, tipo, dono, origem, valor, busca).
  // Em modo Lista usa listDeals (já oculta fechados quando não há filtro de estágio);
  // em modo Kanban usa filteredDeals (representa o que está visível nas colunas).
  const homeKpis = useMemo(() => {
    const base = viewMode === 'lista' ? listDeals : filteredDeals;
    const todayIso = new Date().toISOString().slice(0, 10);
    const pipeline = base.reduce((s, d) => s + Number(d.estimated_value ?? 0), 0);
    const forecast = base.reduce(
      (s, d) => s + Number(d.estimated_value ?? 0) * (d.probability_pct / 100),
      0,
    );
    const withValue = base.filter((d) => Number(d.estimated_value ?? 0) > 0).length;
    const ticketMedio = withValue > 0 ? pipeline / withValue : 0;
    const overdueNextStep = base.filter(
      (d) => d.next_step_date && d.next_step_date < todayIso,
    ).length;
    return {
      pipeline,
      forecast,
      ticketMedio,
      dealsCount: base.length,
      overdueNextStep,
    };
  }, [viewMode, listDeals, filteredDeals]);

  const grouped = useMemo(
    () => new Map(DEAL_STAGES.map((s) => [s, filteredDeals.filter((d) => d.stage === s)])),
    [filteredDeals],
  );
  const dealsByVisualStage = useMemo(() => {
    const visualDeals = rawDeals.map((d) => {
      const overrideStage = visualStageOverrides[d.id];
      return overrideStage ? { ...d, stage: overrideStage, probability_pct: DEAL_STAGE_PROBABILITY[overrideStage] } : d;
    });
    return new Map(visualDeals.map((d) => [d.id, d]));
  }, [rawDeals, visualStageOverrides]);
  const activeDeal = activeId ? dealsByVisualStage.get(activeId) ?? null : null;
  const commitStage = (deal: Deal, stage: DealStage, extra?: { lost_reason?: string; estimated_value?: number }) => {
    setVisualStageOverrides((prev) => ({ ...prev, [deal.id]: stage }));
    updateStage.mutate(
      { id: deal.id, stage, ...extra },
      {
        onSuccess: () => setVisualStageOverrides((prev) => {
          const next = { ...prev };
          delete next[deal.id];
          return next;
        }),
        onError: () => setVisualStageOverrides((prev) => {
          const next = { ...prev };
          delete next[deal.id];
          return next;
        }),
      },
    );
  };
  const handleDragEnd = async (e: DragEndEvent) => {
    const deal = rawDeals.find((d) => d.id === String(e.active.id));
    const stage = e.over?.id as DealStage | undefined;
    if (!deal || !stage || deal.stage === stage || !DEAL_STAGES.includes(stage)) { setActiveId(null); return; }
    setVisualStageOverrides((prev) => ({ ...prev, [deal.id]: stage }));
    setActiveId(null);
    if (stage === 'perdido') { setLost({ deal, stage }); return; }
    if (stage === 'ganho') { setWon({ deal, stage }); return; }
    if (stage === 'proposta_na_mesa') {
      const { count, error } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('deal_id', deal.id)
        .is('deleted_at', null);
      if (error) {
        setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[deal.id]; return next; });
        toast.error('Erro ao verificar propostas vinculadas');
        return;
      }
      // Sem proposta vinculada → abre o modal unificado (que também coleta valor se faltar)
      if (!count) { setNeedsProposal({ deal, stage }); return; }
    }
    updateStage.mutate(
      { id: deal.id, stage },
      {
        onSuccess: () => setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[deal.id]; return next; }),
        onError: () => setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[deal.id]; return next; }),
      },
    );
  };

  const handleCreateProposalForDeal = async ({ implementationValue, mrrValue }: { implementationValue: number; mrrValue?: number }) => {
    if (!needsProposal) return;
    const { deal, stage } = needsProposal;
    if (!deal.company_id) {
      toast.error('Deal sem empresa vinculada — não é possível criar proposta.');
      return;
    }
    setCreatingProposal(true);
    let newProposalId: string | null = null;
    try {
      // Persiste implementação + MRR no deal. estimated_value só é setado se ainda estiver vazio,
      // para não sobrescrever uma estimativa anterior do usuário.
      const dealUpdate: {
        estimated_implementation_value: number;
        estimated_mrr_value: number | null;
        estimated_value?: number;
      } = {
        estimated_implementation_value: implementationValue,
        estimated_mrr_value: mrrValue ?? null,
      };
      if (!deal.estimated_value) {
        dealUpdate.estimated_value = implementationValue + (mrrValue ?? 0) * 12;
      }
      const { error: updErr } = await supabase
        .from('deals')
        .update(dealUpdate)
        .eq('id', deal.id);
      if (updErr) throw updErr;

      newProposalId = await createDraftProposal({
        dealId: deal.id,
        companyId: deal.company_id,
        companyName: deal.company?.trade_name || deal.company?.legal_name || '',
        implementationValue,
        mrrValue: mrrValue ?? null,
      });

      // Pós-criação: tudo aqui é "best effort". Se algo falhar, não devemos
      // bloquear a navegação — a proposta já existe e o usuário precisa chegar nela.
      try {
        commitStage(deal, stage);
        invalidateProposalCaches(qc, { dealId: deal.id });
      } catch (postErr: unknown) {
        console.error('[Pipeline] proposta criada mas etapa pós-criação falhou', {
          proposalId: newProposalId,
          dealId: deal.id,
          error: postErr,
        });
        toast.warning('Proposta criada, mas o estágio do deal não avançou. Ajuste manualmente se necessário.');
      }

      setNeedsProposal(null);
      navigate(`/financeiro/orcamentos/${newProposalId}/editar`);
    } catch (err: unknown) {
      console.error('[Pipeline] falha ao criar proposta', { dealId: deal.id, newProposalId, error: err });
      toast.error(err instanceof Error ? err.message : 'Erro ao criar proposta');
      // Se a proposta foi criada mas algo logo depois explodiu, ainda navega
      if (newProposalId) {
        setNeedsProposal(null);
        navigate(`/financeiro/orcamentos/${newProposalId}/editar`);
      }
    } finally {
      setCreatingProposal(false);
    }
  };

  const clearPageFilters = () => { setStageFilter([]); setProjectTypeFilter([]); };
  const clearAllFilters = () => { clearPageFilters(); resetGlobalFilters(); };
  const hasPageFilters = stageFilter.length > 0 || projectTypeFilter.length > 0;
  const hasAnyFilters =
    hasPageFilters ||
    ownerFilter.length > 0 ||
    sourceFilter.length > 0 ||
    !!valueRange ||
    !!search.trim();

  const sortLabels: Record<DealsListSort, string> = {
    value_asc: 'Valor (menor → maior)',
    value: 'Valor (maior → menor)',
    next_step: 'Próxima ação',
    probability: 'Probabilidade',
    close: 'Fecha em',
    recent: 'Recém-criado',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
        {/* Toolbar de comando */}
        <div className="space-y-2 rounded-lg border border-border bg-card/40 p-2 sm:p-2.5">
          {/* Linha 1: busca + ações */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar deals, empresas, contatos..."
                className="h-9 w-full border-border/60 bg-background pl-9 text-sm"
                aria-label="Buscar no CRM"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateDialog()}
                className="h-9 gap-1.5 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
              >
                <Plus className="h-4 w-4" /> Novo Deal
              </Button>

              {/* Toggle Kanban / Lista — segmented control com rótulos */}
              <div className="inline-flex h-9 items-center overflow-hidden rounded-md border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  aria-pressed={viewMode === 'kanban'}
                  className={cn(
                    'flex h-full items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
                    viewMode === 'kanban'
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('lista')}
                  aria-pressed={viewMode === 'lista'}
                  className={cn(
                    'flex h-full items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
                    viewMode === 'lista'
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </button>
              </div>
            </div>
          </div>

          {/* Linha 2: filtros lado a lado */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Filtros:
            </span>
            <MultiFilter
              label="Estágio"
              selected={stageFilter}
              onChange={(v) => setStageFilter(v as DealStage[])}
              options={DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABEL[s] }))}
            />
            <MultiFilter
              label="Tipo"
              selected={projectTypeFilter}
              onChange={setProjectTypeFilter}
              options={activeProjectTypes.map((t) => ({ value: t.slug, label: t.name }))}
            />
            <MultiFilter
              label="Dono"
              selected={ownerFilter}
              onChange={setOwnerFilter}
              options={actors.map((a) => ({ value: a.id, label: a.display_name }))}
            />
            <MultiFilter
              label="Origem"
              selected={sourceFilter}
              onChange={setSourceFilter}
              options={[{ value: 'direto', label: 'Direto' }, ...leadSources.map((s) => ({ value: s, label: s }))]}
            />
            <ValueRangeFilter value={valueRange} onChange={setValueRange} />
            {hasAnyFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                Limpar
              </Button>
            )}

            {viewMode === 'lista' && (
              <>
                <span className="ml-auto h-6 w-px bg-border" aria-hidden />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Ordem:
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs whitespace-nowrap">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span>{sortLabels[sort]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.keys(sortLabels) as DealsListSort[]).map((k) => (
                      <DropdownMenuItem key={k} onSelect={() => setSort(k)}>
                        {sortLabels[k]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* KPIs — recalculados conforme filtros aplicados */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <HomeKpi
            label="Pipeline"
            value={formatCurrency(homeKpis.pipeline)}
            hint={`${homeKpis.dealsCount} ${homeKpis.dealsCount === 1 ? 'deal' : 'deals'}`}
            tooltip="Soma do valor estimado de todos os deals atualmente visíveis (após os filtros aplicados). Representa o tamanho bruto da carteira em negociação — sem ajuste por probabilidade."
          />
          <HomeKpi
            label="Forecast ponderado"
            value={formatCurrency(homeKpis.forecast)}
            tone="accent"
            hint="ajustado pela probabilidade"
            tooltip="Soma de (valor × probabilidade do estágio) dos deals visíveis. É a previsão realista de receita: deals em estágios iniciais entram com peso menor, deals próximos do fechamento pesam mais."
          />
          <HomeKpi
            label="Ticket médio"
            value={formatCurrency(homeKpis.ticketMedio)}
            hint="por deal com valor"
            tooltip="Pipeline ÷ quantidade de deals visíveis com valor preenchido (> 0). Mostra o porte médio dos negócios na seleção atual — útil para comparar segmentos quando você filtra por origem, dono ou tipo."
          />
          <HomeKpi
            label="Próximo passo atrasado"
            value={String(homeKpis.overdueNextStep)}
            tone={homeKpis.overdueNextStep > 0 ? 'destructive' : undefined}
            hint={homeKpis.overdueNextStep === 1 ? 'deal parado' : 'deals parados'}
            tooltip="Deals visíveis cuja data do próximo passo já passou. Sinal de que a negociação está estagnada e precisa de uma ação sua hoje (ligação, follow-up, envio de proposta etc.)."
          />

        </div>

      {/* View body */}
      {viewMode === 'lista' ? (
        <DealsList
          deals={sortedListDeals}
          overdueDepsByDeal={indicators?.overdueDepsByDeal ?? {}}
          onClearFilters={hasPageFilters ? clearPageFilters : undefined}
        />
      ) : filteredDeals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhum deal no pipeline</p>
          <p className="mt-1 text-xs text-muted-foreground">Crie um novo deal ou ajuste os filtros para visualizar.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="-mx-1 px-1 flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
            {DEAL_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                deals={grouped.get(stage) ?? []}
                collapsed={collapsedStages.includes(stage)}
                onToggleCollapsed={() => toggleCollapsedStage(stage)}
                onOpen={(deal) => navigate(`/crm/deals/${deal.code}`)}
                onCompanyOpen={(deal) => navigate(`/crm/empresas/${deal.company_id}`)}
                onAdd={(stage) => openCreateDialog(stage)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDeal && (
              <div className="rotate-2 cursor-grabbing shadow-2xl ring-2 ring-accent/40 rounded-lg">
                <DealCard deal={activeDeal} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <NewDealQuickDialog open={createOpen} onOpenChange={setCreateOpen} initialStage={createStage} />

      <Dialog open={!!lost} onOpenChange={(v) => {
        if (v || !lost) return;
        setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[lost.deal.id]; return next; });
        setLost(null);
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da perda</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Informe o motivo para mover para perdido</Label>
            <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (lost) setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[lost.deal.id]; return next; });
              setLost(null);
            }}>Cancelar</Button>
            <Button disabled={!lostReason.trim()} onClick={() => { if (lost) commitStage(lost.deal, lost.stage, { lost_reason: lostReason }); setLost(null); setLostReason(''); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateProposalForStageDialog
        open={!!needsProposal}
        deal={needsProposal?.deal ?? null}
        onOpenChange={(v) => {
          if (v || !needsProposal) return;
          setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[needsProposal.deal.id]; return next; });
          setNeedsProposal(null);
        }}
        loading={creatingProposal}
        onConfirm={handleCreateProposalForDeal}
      />

      <DealWonDialog
        deal={won?.deal ?? null}
        open={!!won}
        onOpenChange={(v) => {
          if (v || !won) return;
          setVisualStageOverrides((prev) => { const next = { ...prev }; delete next[won.deal.id]; return next; });
          setWon(null);
        }}
        onSuccess={(projectId) => navigate(`/projetos/${projectId}`)}
      />
    </div>
  );
}
