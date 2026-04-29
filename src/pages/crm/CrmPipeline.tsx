import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { ChevronsLeft, ChevronsRight, LayoutGrid, List, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DealCard } from '@/components/crm/DealCard';
import { DealWonDialog } from '@/components/crm/DealWonDialog';
import { DealsList, useSortedDeals, type DealsListSort } from '@/components/crm/DealsList';
import { NewDealQuickDialog } from '@/components/crm/NewDealQuickDialog';
import { CreateProposalForStageDialog } from '@/components/crm/CreateProposalForStageDialog';
import { MultiFilter } from '@/components/crm/CrmFilters';
import {
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

const ACTIVE_STAGES: DealStage[] = ['descoberta_marcada', 'descobrindo', 'proposta_na_mesa', 'ajustando'];

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

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex w-12 shrink-0 flex-col items-center gap-2 rounded-lg bg-muted/20 p-2 transition-colors',
          isOver && 'bg-accent/10 ring-2 ring-accent/40',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleCollapsed}
          aria-label={`Expandir ${DEAL_STAGE_LABEL[stage]}`}
          title="Expandir coluna"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
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
      <div className="mb-3 space-y-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{DEAL_STAGE_LABEL[stage]}</h3>
            <p className="text-xs text-muted-foreground">{formatCurrency(total)} · {deals.length} deals</p>
          </div>
          <div className="flex items-center gap-1">
            {!stage.startsWith('fechado') && (
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => onAdd(stage)} aria-label="Adicionar deal">
                <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-7 sm:w-7"
              onClick={onToggleCollapsed}
              aria-label={`Recolher ${DEAL_STAGE_LABEL[stage]}`}
              title="Recolher coluna"
            >
              <ChevronsLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Button>
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

function HomeKpi({ label, value, tone }: { label: string; value: string; tone?: 'destructive' | 'success' | 'accent' }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 text-base sm:text-lg font-semibold tabular-nums',
        tone === 'destructive' && 'text-destructive',
        tone === 'success' && 'text-success',
        tone === 'accent' && 'text-accent',
        !tone && 'text-foreground',
      )}>{value}</p>
    </div>
  );
}

export default function CrmPipeline() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ownerFilter = useCrmHubStore((s) => s.ownerFilter);
  const sourceFilter = useCrmHubStore((s) => s.sourceFilter);
  const valueRange = useCrmHubStore((s) => s.valueRange);
  const search = useCrmHubStore((s) => s.search);

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

  // KPIs específicos da home (calculados a partir dos deals ativos brutos, ignorando filtros de página)
  const homeKpis = useMemo(() => {
    const active = rawDeals.filter((d) => ACTIVE_STAGES.includes(d.stage));
    const pipeline = active.reduce((s, d) => s + Number(d.estimated_value ?? 0), 0);
    const forecast = active.reduce((s, d) => s + (Number(d.estimated_value ?? 0) * (d.probability_pct / 100)), 0);
    return {
      pipeline,
      forecast,
      activeCount: active.length,
      overdueDeps: indicators?.totalOverdueDeps ?? 0,
    };
  }, [rawDeals, indicators]);

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
  const hasPageFilters = stageFilter.length > 0 || projectTypeFilter.length > 0;

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
      {/* Header da home: KPIs + toggle + filtros + sort */}
      <div className="space-y-3">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <HomeKpi label="Pipeline total" value={formatCurrency(homeKpis.pipeline)} />
          <HomeKpi label="Forecast ponderado" value={formatCurrency(homeKpis.forecast)} tone="accent" />
          <HomeKpi label="Deals ativos" value={String(homeKpis.activeCount)} />
          <HomeKpi label="Deps atrasadas" value={String(homeKpis.overdueDeps)} tone={homeKpis.overdueDeps > 0 ? 'destructive' : undefined} />
        </div>

        {/* Toolbar: filtros + sort + toggle */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-2 sm:p-2.5">
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
          {hasPageFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={clearPageFilters}>
              Limpar
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={() => openCreateDialog()}
            className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Deal
          </Button>
          {viewMode === 'lista' && (
            <Select value={sort} onValueChange={(v) => setSort(v as DealsListSort)}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_step">Próxima ação</SelectItem>
                <SelectItem value="value">Valor (maior → menor)</SelectItem>
                <SelectItem value="probability">Probabilidade</SelectItem>
                <SelectItem value="close">Fecha em</SelectItem>
                <SelectItem value="recent">Recém-criado</SelectItem>
              </SelectContent>
            </Select>
          )}
          {/* Toggle Lista/Kanban */}
          <div className="flex h-9 overflow-hidden rounded-md border border-border bg-background">
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              className={cn(
                'flex items-center gap-1.5 px-3 text-xs font-medium transition-colors',
                viewMode === 'lista' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={viewMode === 'lista'}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 text-xs font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={viewMode === 'kanban'}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
        </div>
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
