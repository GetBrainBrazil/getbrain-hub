import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiFilter } from '@/components/crm/CrmFilters';
import { NewLeadDialog } from '@/components/crm/NewLeadDialog';
import { useCrmMetrics } from '@/hooks/crm/useCrmMetrics';
import { useAllLeads, useUpdateLeadField } from '@/hooks/crm/useCrmDetails';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types/crm';

const LEAD_STATUS: LeadStatus[] = ['novo', 'triagem_agendada', 'triagem_feita', 'descartado', 'convertido'];
const LEAD_LABEL: Record<LeadStatus, string> = { novo: 'Novo', triagem_agendada: 'Triagem Agendada', triagem_feita: 'Triagem Feita', descartado: 'Descartado', convertido: 'Convertido' };

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base sm:text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
function statusClass(status: LeadStatus) {
  return cn(
    'rounded border px-2 py-0.5 text-[11px] font-medium',
    status === 'convertido' && 'border-success/30 bg-success/10 text-success',
    status === 'descartado' && 'border-destructive/30 bg-destructive/10 text-destructive',
    status === 'triagem_feita' && 'border-accent/30 bg-accent/10 text-accent',
    status === 'triagem_agendada' && 'border-warning/30 bg-warning/10 text-warning',
    status === 'novo' && 'border-border bg-muted/40 text-muted-foreground',
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  return (
    <button
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...attributes}
      {...listeners}
      type="button"
      onClick={() => !isDragging && navigate(`/crm/leads/${lead.code}`)}
      className={cn('w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-accent/50', isDragging && 'opacity-60')}
    >
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-mono text-muted-foreground">{lead.code}</span>
        <span className={statusClass(lead.status)}>{LEAD_LABEL[lead.status]}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{lead.title}</p>
      <p className="mt-2 truncate text-xs text-accent">{lead.company?.trade_name || lead.company?.legal_name}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(Number(lead.estimated_value ?? 0))}</span>
        <span className="truncate ml-2">{lead.owner?.display_name ?? 'sem dono'}</span>
      </div>
    </button>
  );
}

function LeadColumn({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-[85vw] sm:w-72 shrink-0 flex-col rounded-lg bg-muted/20 p-3">
      <div className="mb-3 px-1">
        <h3 className="text-sm font-semibold text-foreground">{LEAD_LABEL[status]}</h3>
        <p className="text-xs text-muted-foreground">{leads.length} leads</p>
      </div>
      <div ref={setNodeRef} className={cn('flex min-h-[180px] flex-1 flex-col gap-2 rounded-md pr-1 transition-colors', isOver && 'bg-accent/10 ring-2 ring-accent/40')}>
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
      </div>
    </div>
  );
}

export default function CrmLeads() {
  const navigate = useNavigate();
  const { data: leads = [] } = useAllLeads();
  const { data: metrics } = useCrmMetrics();
  const updateLead = useUpdateLeadField();
  const store = useCrmHubStore();
  const [view, setView] = usePersistedState<'table' | 'kanban'>('crm-leads-view', 'table');
  const [statusFilter, setStatusFilter] = usePersistedState<LeadStatus[]>('crm-leads-status-filter', []);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [discardLead, setDiscardLead] = useState<Lead | null>(null);
  const [discardReason, setDiscardReason] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => leads.filter((lead) => {
    if (statusFilter.length && !statusFilter.includes(lead.status)) return false;
    if (store.ownerFilter.length && (!lead.owner_actor_id || !store.ownerFilter.includes(lead.owner_actor_id))) return false;
    if (store.sourceFilter.length && !store.sourceFilter.includes(lead.source || 'direto')) return false;
    if (store.valueRange && ((lead.estimated_value ?? 0) < store.valueRange[0] || (lead.estimated_value ?? 0) > store.valueRange[1])) return false;
    const q = store.search.trim().toLowerCase();
    return !q || [lead.code, lead.title, lead.source ?? '', lead.company?.legal_name ?? '', lead.company?.trade_name ?? '', lead.owner?.display_name ?? ''].join(' ').toLowerCase().includes(q);
  }), [leads, statusFilter, store.ownerFilter, store.sourceFilter, store.valueRange, store.search]);

  const grouped = useMemo(() => new Map(LEAD_STATUS.map((s) => [s, filtered.filter((lead) => lead.status === s)])), [filtered]);
  const openLeads = (metrics?.leads_novos ?? 0) + (metrics?.leads_triagem_agendada ?? 0) + (metrics?.leads_triagem_feita ?? 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const lead = leads.find((item) => item.id === String(event.active.id));
    const status = event.over?.id as LeadStatus | undefined;
    if (!lead || !status || lead.status === status || !LEAD_STATUS.includes(status)) return;
    if (status === 'convertido') return;
    if (status === 'descartado') { setDiscardLead(lead); return; }
    updateLead.mutate({ id: lead.id, updates: { status } });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        <Kpi label="Leads abertos" value={String(openLeads)} />
        <Kpi label="Taxa conversão" value={`${Number(metrics?.conversion_rate_pct ?? 0).toFixed(0)}%`} />
        <Kpi label="Valor" value={formatCurrency(filtered.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0))} />
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-lg border border-border bg-card/50 p-2 sm:p-3">
        <MultiFilter label="Status" selected={statusFilter} onChange={(v) => setStatusFilter(v as LeadStatus[])} options={LEAD_STATUS.map((status) => ({ value: status, label: LEAD_LABEL[status] }))} />
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'kanban')} className="flex-1 sm:flex-none">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="table" className="flex-1 sm:flex-none">Tabela</TabsTrigger>
              <TabsTrigger value="kanban" className="flex-1 sm:flex-none">Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setNewLeadOpen(true)} className="min-h-10 sm:min-h-9 shrink-0">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo Lead</span>
          </Button>
        </div>
      </div>

      {view === 'table' ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border bg-card/30 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead>Criação</TableHead>
                  <TableHead>Triagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate(`/crm/leads/${lead.code}`)}>
                    <TableCell className="font-mono text-xs">{lead.code}</TableCell>
                    <TableCell className="font-medium">{lead.title}</TableCell>
                    <TableCell>{lead.company?.trade_name || lead.company?.legal_name}</TableCell>
                    <TableCell><span className={statusClass(lead.status)}>{LEAD_LABEL[lead.status]}</span></TableCell>
                    <TableCell>{lead.source ?? '-'}</TableCell>
                    <TableCell>{formatCurrency(Number(lead.estimated_value ?? 0))}</TableCell>
                    <TableCell>{lead.owner?.display_name ?? '-'}</TableCell>
                    <TableCell>{lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>{lead.triagem_scheduled_at ? new Date(lead.triagem_scheduled_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => navigate(`/crm/leads/${lead.code}`)}
                className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] text-muted-foreground">{lead.code}</span>
                  <span className={statusClass(lead.status)}>{LEAD_LABEL[lead.status]}</span>
                </div>
                <p className="text-sm font-semibold text-foreground line-clamp-2">{lead.title}</p>
                {(lead.company?.trade_name || lead.company?.legal_name) && (
                  <p className="text-xs text-accent truncate mt-1">{lead.company?.trade_name || lead.company?.legal_name}</p>
                )}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(Number(lead.estimated_value ?? 0))}</span>
                  <span className="truncate ml-2">{lead.owner?.display_name ?? '-'}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum lead encontrado</p>
            )}
          </div>
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="-mx-1 px-1 flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
            {LEAD_STATUS.map((status) => (
              <div key={status} className="snap-start sm:snap-align-none">
                <LeadColumn status={status} leads={grouped.get(status) ?? []} />
              </div>
            ))}
          </div>
        </DndContext>
      )}

      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
      <Dialog open={!!discardLead} onOpenChange={(open) => { if (!open) setDiscardLead(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Descartar {discardLead?.code}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo obrigatório</Label>
            <Textarea value={discardReason} onChange={(e) => setDiscardReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardLead(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!discardReason.trim()}
              onClick={() => {
                if (discardLead) updateLead.mutate({ id: discardLead.id, updates: { status: 'descartado', lost_reason: discardReason } });
                setDiscardLead(null);
                setDiscardReason('');
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
