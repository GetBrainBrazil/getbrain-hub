import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiFilter } from '@/components/crm/CrmFilters';
import { NewLeadDialog } from '@/components/crm/NewLeadDialog';
import { useConfirm } from '@/components/ConfirmDialog';
import { useCrmMetrics } from '@/hooks/crm/useCrmMetrics';
import { useAllCompaniesAggregates, useAllLeads, useUpdateLeadField } from '@/hooks/crm/useCrmDetails';
import { useBulkDeleteLeads } from '@/hooks/crm/useLeads';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CompanyRelationshipStatus, Lead, LeadStatus } from '@/types/crm';

const COMPANY_STATUS: CompanyRelationshipStatus[] = ['prospect', 'lead', 'active_client', 'former_client', 'lost'];
const COMPANY_STATUS_LABEL: Record<CompanyRelationshipStatus, string> = { prospect: 'Prospect', lead: 'Lead', active_client: 'Cliente ativo', former_client: 'Ex-cliente', lost: 'Perdida' };
function companyStatusClass(status: CompanyRelationshipStatus) {
  return cn('rounded border px-2 py-0.5 text-[11px] font-medium',
    status === 'active_client' && 'border-success/30 bg-success/10 text-success',
    status === 'lead' && 'border-warning/30 bg-warning/10 text-warning',
    status === 'lost' && 'border-destructive/30 bg-destructive/10 text-destructive',
    status === 'former_client' && 'border-accent/30 bg-accent/10 text-accent',
    status === 'prospect' && 'border-border bg-muted/40 text-muted-foreground',
  );
}

const LEAD_STATUS: LeadStatus[] = ['novo', 'triagem_agendada', 'triagem_feita', 'descartado', 'convertido'];
const LEAD_LABEL: Record<LeadStatus, string> = { novo: 'Novo', triagem_agendada: 'Triagem Agendada', triagem_feita: 'Triagem Feita', descartado: 'Descartado', convertido: 'Convertido' };

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg border bg-card/60 px-3 py-2.5 sm:px-4 sm:py-3 transition-colors',
      highlight ? 'border-accent/60 bg-accent/5' : 'border-border',
    )}>
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-base sm:text-lg font-semibold', highlight ? 'text-accent' : 'text-foreground')}>{value}</p>
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
  const { data: companyAggregates = {} } = useAllCompaniesAggregates();
  const updateLead = useUpdateLeadField();
  const bulkDelete = useBulkDeleteLeads();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const store = useCrmHubStore();
  const [view, setView] = usePersistedState<'table' | 'kanban'>('crm-leads-view', 'table');
  const [statusFilter, setStatusFilter] = usePersistedState<LeadStatus[]>('crm-leads-status-filter', []);
  const [companyStatusFilter, setCompanyStatusFilter] = usePersistedState<CompanyRelationshipStatus[]>('crm-leads-company-status-filter', []);
  const [industryFilter, setIndustryFilter] = usePersistedState<string[]>('crm-leads-industry-filter', []);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [discardLead, setDiscardLead] = useState<Lead | null>(null);
  const [discardReason, setDiscardReason] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Lista de indústrias derivada (precisamos puxar de companies, mas leads.company só traz nome/status).
  // Para evitar query extra, mostramos filtro sem indústria por ora — pode ser estendido depois.
  // Reaproveitamos store apenas para owner/source/value/search globais.

  const filtered = useMemo(() => leads.filter((lead) => {
    if (statusFilter.length && !statusFilter.includes(lead.status)) return false;
    if (companyStatusFilter.length) {
      const cs = lead.company?.relationship_status;
      if (!cs || !companyStatusFilter.includes(cs)) return false;
    }
    if (store.ownerFilter.length && (!lead.owner_actor_id || !store.ownerFilter.includes(lead.owner_actor_id))) return false;
    if (store.sourceFilter.length && !store.sourceFilter.includes(lead.source || 'direto')) return false;
    if (store.valueRange && ((lead.estimated_value ?? 0) < store.valueRange[0] || (lead.estimated_value ?? 0) > store.valueRange[1])) return false;
    const q = store.search.trim().toLowerCase();
    return !q || [lead.code, lead.title, lead.source ?? '', lead.company?.legal_name ?? '', lead.company?.trade_name ?? '', lead.owner?.display_name ?? ''].join(' ').toLowerCase().includes(q);
  }), [leads, statusFilter, companyStatusFilter, store.ownerFilter, store.sourceFilter, store.valueRange, store.search]);

  const grouped = useMemo(() => new Map(LEAD_STATUS.map((s) => [s, filtered.filter((lead) => lead.status === s)])), [filtered]);
  const openLeads = (metrics?.leads_novos ?? 0) + (metrics?.leads_triagem_agendada ?? 0) + (metrics?.leads_triagem_feita ?? 0);

  // KPIs adicionais vindos da agregação de empresas (filtrados pelas empresas presentes em filtered)
  const visibleCompanyIds = useMemo(() => Array.from(new Set(filtered.map((l) => l.company_id).filter(Boolean))), [filtered]);
  const activeClientsVisible = useMemo(() => filtered.filter((l) => l.company?.relationship_status === 'active_client').length, [filtered]);
  const revenueWonVisible = useMemo(() => visibleCompanyIds.reduce((s, id) => s + (companyAggregates[id]?.revenueWon ?? 0), 0), [visibleCompanyIds, companyAggregates]);

  // Poda seleção quando filtros removem itens, ou quando muda para kanban
  useEffect(() => {
    if (view !== 'table') { if (selected.size) setSelected(new Set()); return; }
    const visibleIds = new Set(filtered.map((l) => l.id));
    let changed = false;
    const next = new Set<string>();
    selected.forEach((id) => { if (visibleIds.has(id)) next.add(id); else changed = true; });
    if (changed) setSelected(next);
  }, [filtered, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedLeads = useMemo(() => filtered.filter((l) => selected.has(l.id)), [filtered, selected]);
  const hasSelection = selected.size > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = hasSelection && !allFilteredSelected;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => {
      if (filtered.every((l) => prev.has(l.id))) return new Set();
      return new Set(filtered.map((l) => l.id));
    });
  };
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirm({
      title: `Excluir ${ids.length} lead${ids.length > 1 ? 's' : ''}?`,
      description: 'Esta ação não pode ser desfeita. Leads já convertidos em deals serão ignorados para preservar o histórico.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await bulkDelete.mutateAsync(ids);
      clearSelection();
      if (res.deleted && res.skipped) {
        toast.success(`${res.deleted} lead(s) excluído(s). ${res.skipped} ignorado(s) por já estarem convertidos.`);
      } else if (res.deleted) {
        toast.success(`${res.deleted} lead(s) excluído(s).`);
      } else {
        toast.warning('Nenhum lead pôde ser excluído (todos já convertidos).');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir leads.';
      toast.error(msg);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const lead = leads.find((item) => item.id === String(event.active.id));
    const status = event.over?.id as LeadStatus | undefined;
    if (!lead || !status || lead.status === status || !LEAD_STATUS.includes(status)) return;
    if (status === 'convertido') return;
    if (status === 'descartado') { setDiscardLead(lead); return; }
    updateLead.mutate({ id: lead.id, updates: { status } });
  };

  const selectedValueSum = selectedLeads.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0);
  const selectedConverted = selectedLeads.filter((l) => l.status === 'convertido').length;
  const selectedConversionPct = selectedLeads.length ? (selectedConverted / selectedLeads.length) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        {hasSelection ? (
          <>
            <Kpi highlight label={`Leads selecionados (${selected.size})`} value={String(selectedLeads.length)} />
            <Kpi highlight label="Conversão da seleção" value={`${selectedConversionPct.toFixed(0)}%`} />
            <Kpi highlight label="Valor selecionado" value={formatCurrency(selectedValueSum)} />
          </>
        ) : (
          <>
            <Kpi label="Leads abertos" value={String(openLeads)} />
            <Kpi label="Taxa conversão" value={`${Number(metrics?.conversion_rate_pct ?? 0).toFixed(0)}%`} />
            <Kpi label="Valor" value={formatCurrency(filtered.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0))} />
          </>
        )}
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

      {hasSelection && view === 'table' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 sticky top-0 z-10 backdrop-blur">
          <p className="text-sm">
            <span className="font-semibold text-foreground">{selected.size}</span>
            <span className="text-muted-foreground"> lead{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}><X className="h-4 w-4" /> Limpar</Button>
            <Button variant="destructive" size="sm" disabled={bulkDelete.isPending} onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" /> Excluir selecionados
            </Button>
          </div>
        </div>
      )}

      {view === 'table' ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border bg-card/30 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
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
                {filtered.map((lead) => {
                  const isSel = selected.has(lead.id);
                  return (
                    <TableRow
                      key={lead.id}
                      data-state={isSel ? 'selected' : undefined}
                      className="cursor-pointer"
                      onClick={() => navigate(`/crm/leads/${lead.code}`)}
                    >
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSel} onCheckedChange={() => toggleOne(lead.id)} aria-label={`Selecionar ${lead.code}`} />
                      </TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <button type="button" onClick={toggleAll} className="text-xs text-accent font-medium">
                  {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                {hasSelection && (
                  <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
                )}
              </div>
            )}
            {filtered.map((lead) => {
              const isSel = selected.has(lead.id);
              return (
                <div
                  key={lead.id}
                  className={cn(
                    'w-full rounded-lg border bg-card p-3 shadow-sm transition',
                    isSel ? 'border-accent/60 bg-accent/5' : 'border-border',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onCheckedChange={() => toggleOne(lead.id)} aria-label={`Selecionar ${lead.code}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/leads/${lead.code}`)}
                      className="flex-1 text-left active:scale-[0.99] transition"
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
                  </div>
                </div>
              );
            })}
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
      {confirmDialog}
    </div>
  );
}
