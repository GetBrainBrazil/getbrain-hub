import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CrmKpiStrip } from '@/components/crm/CrmKpiStrip';
import { DealCard } from '@/components/crm/DealCard';
import { DealWonDialog } from '@/components/crm/DealWonDialog';
import { NewDealDialog } from '@/components/crm/NewDealDialog';
import { DEAL_STAGE_LABEL, DEAL_STAGES } from '@/constants/dealStages';
import { useCrmMetrics } from '@/hooks/crm/useCrmMetrics';
import { useDeals, useUpdateDealStage } from '@/hooks/crm/useDeals';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Deal, DealStage } from '@/types/crm';

function DraggableDeal({ deal, onOpen, onCompanyOpen }: { deal: Deal; onOpen: () => void; onCompanyOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: deal.id });
  return <div ref={setNodeRef} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined} {...attributes} {...listeners}><DealCard deal={deal} dragging={isDragging} onClick={() => !isDragging && onOpen()} onCompanyClick={onCompanyOpen} /></div>;
}

function Column({ stage, deals, onOpen, onCompanyOpen, onAdd }: { stage: DealStage; deals: Deal[]; onOpen: (deal: Deal) => void; onCompanyOpen: (deal: Deal) => void; onAdd: (stage: DealStage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, d) => sum + Number(d.estimated_value ?? 0), 0);
  return <div className="flex w-[85vw] sm:w-80 shrink-0 flex-col rounded-lg bg-muted/20 p-3 snap-start sm:snap-align-none"><div className="mb-3 space-y-2 px-1"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-foreground">{DEAL_STAGE_LABEL[stage]}</h3><p className="text-xs text-muted-foreground">{formatCurrency(total)} · {deals.length} deals</p></div>{!stage.startsWith('fechado') && <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => onAdd(stage)}><Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></Button>}</div></div><div ref={setNodeRef} className={cn('flex max-h-[calc(100vh-360px)] min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-md pr-1 transition-colors', isOver && 'bg-accent/10 ring-2 ring-accent/40')}>{deals.map((deal) => <DraggableDeal key={deal.id} deal={deal} onOpen={() => onOpen(deal)} onCompanyOpen={() => onCompanyOpen(deal)} />)}{deals.length === 0 && <button type="button" onClick={() => onAdd(stage)} className="rounded-md border border-dashed border-border/60 px-3 py-6 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground">+ Novo deal</button>}</div></div>;
}

export default function CrmPipeline() {
  const navigate = useNavigate();
  const ownerFilter = useCrmHubStore((s) => s.ownerFilter);
  const sourceFilter = useCrmHubStore((s) => s.sourceFilter);
  const valueRange = useCrmHubStore((s) => s.valueRange);
  const search = useCrmHubStore((s) => s.search);
  const filters = useMemo(
    () => ({ ownerIds: ownerFilter, sourceIds: sourceFilter, valueRange, search }),
    [ownerFilter, sourceFilter, valueRange, search],
  );
  const { data: metrics, isLoading: metricsLoading } = useCrmMetrics();
  const { data: deals = [], isLoading } = useDeals(filters);
  const updateStage = useUpdateDealStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createStage, setCreateStage] = useState<DealStage>('presencial_agendada');
  const [createOpen, setCreateOpen] = useState(false);
  const [lost, setLost] = useState<{ deal: Deal; stage: DealStage } | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [valueRequired, setValueRequired] = useState<{ deal: Deal; stage: DealStage } | null>(null);
  const [requiredValue, setRequiredValue] = useState('');
  const [won, setWon] = useState<{ deal: Deal; stage: DealStage } | null>(null);

  const grouped = useMemo(() => new Map(DEAL_STAGES.map((s) => [s, deals.filter((d) => d.stage === s)])), [deals]);
  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;
  const commitStage = (deal: Deal, stage: DealStage, extra?: { lost_reason?: string; estimated_value?: number }) => updateStage.mutate({ id: deal.id, stage, ...extra });
  const handleDragEnd = (e: DragEndEvent) => { setActiveId(null); const deal = deals.find((d) => d.id === String(e.active.id)); const stage = e.over?.id as DealStage | undefined; if (!deal || !stage || deal.stage === stage || !DEAL_STAGES.includes(stage)) return; if (stage === 'fechado_perdido') { setLost({ deal, stage }); return; } if (stage === 'orcamento_enviado' && !deal.estimated_value) { setValueRequired({ deal, stage }); return; } if (stage === 'fechado_ganho') { setWon({ deal, stage }); return; } commitStage(deal, stage); };
  if (isLoading || metricsLoading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><div className="flex gap-4 overflow-x-auto">{DEAL_STAGES.map((s) => <Skeleton key={s} className="h-96 w-80 shrink-0" />)}</div></div>;
   return <div className="space-y-4 sm:space-y-5"><CrmKpiStrip metrics={metrics} />{deals.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center"><p className="text-sm font-medium text-foreground">Nenhum deal no pipeline</p><p className="mt-1 text-xs text-muted-foreground">Crie um novo deal ou ajuste os filtros para visualizar.</p></div> : <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}><div className="-mx-1 px-1 flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">{DEAL_STAGES.map((stage) => <Column key={stage} stage={stage} deals={grouped.get(stage) ?? []} onOpen={(deal) => navigate(`/crm/deals/${deal.code}`)} onCompanyOpen={(deal) => navigate(`/crm/empresas/${deal.company_id}`)} onAdd={(s) => { setCreateStage(s); setCreateOpen(true); }} />)}</div><DragOverlay>{activeDeal && <DealCard deal={activeDeal} dragging />}</DragOverlay></DndContext>}<NewDealDialog open={createOpen} onOpenChange={setCreateOpen} defaultStage={createStage} /><Dialog open={!!lost} onOpenChange={(v) => !v && setLost(null)}><DialogContent><DialogHeader><DialogTitle>Motivo da perda</DialogTitle></DialogHeader><div className="space-y-2"><Label>Informe o motivo para mover para perdido</Label><Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setLost(null)}>Cancelar</Button><Button disabled={!lostReason.trim()} onClick={() => { if (lost) commitStage(lost.deal, lost.stage, { lost_reason: lostReason }); setLost(null); setLostReason(''); }}>Confirmar</Button></DialogFooter></DialogContent></Dialog><Dialog open={!!valueRequired} onOpenChange={(v) => !v && setValueRequired(null)}><DialogContent><DialogHeader><DialogTitle>Valor obrigatório</DialogTitle></DialogHeader><div className="space-y-2"><Label>Valor estimado do orçamento</Label><Input type="number" value={requiredValue} onChange={(e) => setRequiredValue(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setValueRequired(null)}>Cancelar</Button><Button disabled={!requiredValue} onClick={() => { if (valueRequired) commitStage(valueRequired.deal, valueRequired.stage, { estimated_value: Number(requiredValue) }); setValueRequired(null); setRequiredValue(''); }}>Confirmar</Button></DialogFooter></DialogContent></Dialog><DealWonDialog deal={won?.deal ?? null} open={!!won} onOpenChange={(v) => !v && setWon(null)} onSuccess={(projectId) => navigate(`/projetos/${projectId}`)} /></div>;
}
