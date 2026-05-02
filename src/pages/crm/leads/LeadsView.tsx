import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Activity, Building2, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiFilter, ValueRangeFilter } from '@/components/crm/CrmFilters';
import { useConfirm } from '@/components/ConfirmDialog';
import { useCrmMetrics } from '@/hooks/crm/useCrmMetrics';
import { useAllCompaniesAggregates, useAllLeads, useUpdateLeadField } from '@/hooks/crm/useCrmDetails';
import { useBulkDeleteLeads } from '@/hooks/crm/useLeads';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { useCrmLeadSources } from '@/hooks/crm/useCrmLeadSources';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CompanyRelationshipStatus, Lead, LeadStatus } from '@/types/crm';

const COMPANY_STATUS: CompanyRelationshipStatus[] = ['prospect', 'lead', 'active_client', 'former_client', 'lost'];
const COMPANY_STATUS_LABEL: Record<CompanyRelationshipStatus, string> = {
  prospect: 'Prospect',
  lead: 'Lead',
  active_client: 'Cliente ativo',
  former_client: 'Ex-cliente',
  lost: 'Perdida',
};

const LEAD_STATUS: LeadStatus[] = ['novo', 'triagem_agendada', 'triagem_feita', 'descartado', 'convertido'];
const LEAD_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo',
  triagem_agendada: 'Triagem agendada',
  triagem_feita: 'Triagem feita',
  descartado: 'Descartado',
  convertido: 'Convertido',
};

const ACTIVE_LEAD_STATUS: LeadStatus[] = ['novo', 'triagem_agendada', 'triagem_feita'];

function statusClass(status: LeadStatus) {
  return cn(
    'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
    status === 'convertido' && 'border-success/40 bg-success/10 text-success',
    status === 'descartado' && 'border-destructive/40 bg-destructive/10 text-destructive',
    status === 'triagem_feita' && 'border-accent/40 bg-accent/10 text-accent',
    status === 'triagem_agendada' && 'border-warning/40 bg-warning/10 text-warning',
    status === 'novo' && 'border-border bg-muted/40 text-muted-foreground',
  );
}

function Kpi({ label, value, hint, highlight, tone }: { label: string; value: string; hint?: string; highlight?: boolean; tone?: 'default' | 'warning' | 'success' }) {
  return (
    <div className={cn(
      'rounded-lg border bg-card/40 px-3 py-2.5 transition-colors',
      highlight ? 'border-accent/60 bg-accent/5' : 'border-border',
    )}>
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 font-mono text-base sm:text-lg font-semibold',
        highlight && 'text-accent',
        tone === 'warning' && 'text-warning',
        tone === 'success' && 'text-success',
        !highlight && !tone && 'text-foreground',
      )}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
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
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{lead.code}</span>
        <span className="font-mono text-[11px] text-foreground">{formatCurrency(Number(lead.estimated_value ?? 0))}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground">{lead.title}</p>
      <p className="mt-1 truncate text-xs text-accent">{lead.company?.trade_name || lead.company?.legal_name}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{lead.owner?.display_name ?? 'sem dono'}</span>
        <span className="truncate ml-2">{lead.source ?? '—'}</span>
      </div>
    </button>
  );
}

function LeadColumn({ status, leads, total }: { status: LeadStatus; leads: Lead[]; total: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-[85vw] sm:w-72 shrink-0 flex-col rounded-lg bg-muted/20 p-3">
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{LEAD_LABEL[status]}</h3>
          <span className="text-[11px] text-muted-foreground">{leads.length}</span>
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatCurrency(total)}</p>
      </div>
      <div ref={setNodeRef} className={cn('flex min-h-[180px] flex-1 flex-col gap-2 rounded-md pr-1 transition-colors', isOver && 'bg-accent/10 ring-2 ring-accent/40')}>
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
      </div>
    </div>
  );
}

function FilterChip({ prefix, label, onRemove }: { prefix?: string; label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 pl-2 pr-1 text-[11px] text-accent">
      {prefix && <span className="opacity-60">{prefix}:</span>}
      <span className="truncate font-medium max-w-[140px]">{label}</span>
      <button onClick={onRemove} className="hover:bg-accent/20 hover:text-accent rounded-full p-0.5" aria-label="Remover filtro">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function LeadsView() {
  const navigate = useNavigate();
  const { data: leads = [] } = useAllLeads();
  const { data: metrics } = useCrmMetrics();
  const { data: companyAggregates = {} } = useAllCompaniesAggregates();
  const { data: actors = [] } = useCrmActors();
  const { data: leadSources = [] } = useCrmLeadSources({ onlyActive: true });
  const updateLead = useUpdateLeadField();
  const bulkDelete = useBulkDeleteLeads();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [view, setView] = usePersistedState<'table' | 'kanban'>('crm-leads-view', 'table');
  const [scope, setScope] = usePersistedState<'trilha' | 'todos'>('crm-leads-scope', 'trilha');
  const [search, setSearch] = usePersistedState<string>('crm-leads-search', '');
  const [statusFilter, setStatusFilter] = usePersistedState<LeadStatus[]>('crm-leads-status-filter', []);
  const [companyStatusFilter, setCompanyStatusFilter] = usePersistedState<CompanyRelationshipStatus[]>('crm-leads-company-status-filter', []);
  const [sourceFilter, setSourceFilter] = usePersistedState<string[]>('crm-leads-source-filter', []);
  const [ownerFilter, setOwnerFilter] = usePersistedState<string[]>('crm-leads-owner-filter', []);
  const [valueRange, setValueRange] = usePersistedState<[number, number] | null>('crm-leads-value-range', null);
  const [discardLead, setDiscardLead] = useState<Lead | null>(null);
  const [discardReason, setDiscardReason] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => leads.filter((lead) => {
    if (statusFilter.length) {
      if (!statusFilter.includes(lead.status)) return false;
    } else if (scope === 'trilha' && !ACTIVE_LEAD_STATUS.includes(lead.status)) {
      return false;
    }
    if (companyStatusFilter.length) {
      const cs = lead.company?.relationship_status;
      if (!cs || !companyStatusFilter.includes(cs)) return false;
    }
    if (ownerFilter.length && (!lead.owner_actor_id || !ownerFilter.includes(lead.owner_actor_id))) return false;
    if (sourceFilter.length && !sourceFilter.includes(lead.source || 'direto')) return false;
    if (valueRange) {
      const v = Number(lead.estimated_value ?? 0);
      if (v < valueRange[0] || v > valueRange[1]) return false;
    }
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [lead.code, lead.title, lead.source ?? '', lead.company?.legal_name ?? '', lead.company?.trade_name ?? '', lead.owner?.display_name ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }), [leads, statusFilter, companyStatusFilter, ownerFilter, sourceFilter, valueRange, scope, search]);

  const grouped = useMemo(() => new Map(LEAD_STATUS.map((s) => [s, filtered.filter((lead) => lead.status === s)])), [filtered]);

  // KPIs
  const openLeads = (metrics?.leads_novos ?? 0) + (metrics?.leads_triagem_agendada ?? 0) + (metrics?.leads_triagem_feita ?? 0);
  const pipelineValue = filtered.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0);
  const triagensSemana = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return filtered.filter((l) => {
      if (!l.triagem_scheduled_at) return false;
      const d = new Date(l.triagem_scheduled_at);
      return d >= start && d < end;
    }).length;
  }, [filtered]);
  const stale = useMemo(() => {
    const cutoff = Date.now() - 14 * 86400000;
    return filtered.filter((l) => ACTIVE_LEAD_STATUS.includes(l.status) && l.created_at && new Date(l.created_at).getTime() < cutoff).length;
  }, [filtered]);

  // Selection
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

  const toggleOne = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelected((prev) => filtered.every((l) => prev.has(l.id)) ? new Set() : new Set(filtered.map((l) => l.id)));
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
      if (res.deleted && res.skipped) toast.success(`${res.deleted} lead(s) excluído(s). ${res.skipped} ignorado(s).`);
      else if (res.deleted) toast.success(`${res.deleted} lead(s) excluído(s).`);
      else toast.warning('Nenhum lead pôde ser excluído (todos já convertidos).');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir leads.');
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

  const totalActiveCount = leads.filter((l) => ACTIVE_LEAD_STATUS.includes(l.status)).length;
  const hasFilters = search.trim() || statusFilter.length || companyStatusFilter.length || sourceFilter.length || ownerFilter.length || valueRange;

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setCompanyStatusFilter([]);
    setSourceFilter([]);
    setOwnerFilter([]);
    setValueRange(null);
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
        {hasSelection ? (
          <>
            <Kpi highlight label={`Selecionados (${selected.size})`} value={String(selectedLeads.length)} />
            <Kpi highlight label="Conversão da seleção" value={`${selectedConversionPct.toFixed(0)}%`} />
            <Kpi highlight label="Valor selecionado" value={formatCurrency(selectedValueSum)} />
            <Kpi highlight label="Origens distintas" value={String(new Set(selectedLeads.map((l) => l.source ?? 'direto')).size)} />
            <Kpi highlight label="Empresas distintas" value={String(new Set(selectedLeads.map((l) => l.company_id)).size)} />
          </>
        ) : (
          <>
            <Kpi label="Leads abertos" value={String(openLeads)} hint="Novo + agendada + feita" />
            <Kpi label="Triagens da semana" value={String(triagensSemana)} hint="Próximos 7 dias" />
            <Kpi label="Conversão" value={`${Number(metrics?.conversion_rate_pct ?? 0).toFixed(0)}%`} hint="Lead → deal" />
            <Kpi label="Valor pipeline" value={formatCurrency(pipelineValue)} hint={`${filtered.length} lead(s)`} />
            <Kpi label="Parados >14 dias" value={String(stale)} tone={stale > 0 ? 'warning' : 'default'} hint="Sem movimentação" />
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-2 sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead, empresa, contato..."
              className="h-9 pl-8 text-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Limpar">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Scope toggle */}
            <div className="inline-flex h-9 rounded-full border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setScope('trilha')}
                className={cn('inline-flex items-center gap-1 rounded-full px-3 text-xs font-medium transition', scope === 'trilha' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Activity className="h-3 w-3" /> Em trilha
              </button>
              <button
                type="button"
                onClick={() => setScope('todos')}
                className={cn('inline-flex items-center gap-1 rounded-full px-3 text-xs font-medium transition', scope === 'todos' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Layers className="h-3 w-3" /> Tudo
              </button>
            </div>

            <MultiFilter label="Status" selected={statusFilter} onChange={(v) => setStatusFilter(v as LeadStatus[])} options={LEAD_STATUS.map((s) => ({ value: s, label: LEAD_LABEL[s] }))} />
            <MultiFilter label="Empresa" icon={<Building2 className="h-3 w-3" />} selected={companyStatusFilter} onChange={(v) => setCompanyStatusFilter(v as CompanyRelationshipStatus[])} options={COMPANY_STATUS.map((s) => ({ value: s, label: COMPANY_STATUS_LABEL[s] }))} />
            <MultiFilter label="Origem" selected={sourceFilter} onChange={setSourceFilter} options={leadSources.map((s) => ({ value: s.slug, label: s.name }))} />
            <MultiFilter label="Dono" selected={ownerFilter} onChange={setOwnerFilter} options={actors.map((a) => ({ value: a.id, label: a.display_name }))} />
            <ValueRangeFilter value={valueRange} onChange={setValueRange} />

            <div className="ml-auto flex items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'kanban')}>
                <TabsList className="h-9">
                  <TabsTrigger value="table" className="text-xs">Tabela</TabsTrigger>
                  <TabsTrigger value="kanban" className="text-xs">Kanban</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Filtros:</span>
            {statusFilter.map((s) => <FilterChip key={s} prefix="Status" label={LEAD_LABEL[s]} onRemove={() => setStatusFilter(statusFilter.filter((x) => x !== s))} />)}
            {companyStatusFilter.map((s) => <FilterChip key={s} prefix="Empresa" label={COMPANY_STATUS_LABEL[s]} onRemove={() => setCompanyStatusFilter(companyStatusFilter.filter((x) => x !== s))} />)}
            {sourceFilter.map((s) => <FilterChip key={s} prefix="Origem" label={leadSources.find((x) => x.slug === s)?.name ?? s} onRemove={() => setSourceFilter(sourceFilter.filter((x) => x !== s))} />)}
            {ownerFilter.map((s) => <FilterChip key={s} prefix="Dono" label={actors.find((a) => a.id === s)?.display_name ?? s} onRemove={() => setOwnerFilter(ownerFilter.filter((x) => x !== s))} />)}
            {valueRange && <FilterChip prefix="Valor" label={`${formatCurrency(valueRange[0])} – ${formatCurrency(valueRange[1])}`} onRemove={() => setValueRange(null)} />}
            {search.trim() && <FilterChip prefix="Busca" label={search} onRemove={() => setSearch('')} />}
            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-[11px] text-destructive hover:bg-destructive/10" onClick={clearAllFilters}>
              <X className="h-3 w-3" /> Limpar tudo
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de {leads.length} lead(s)</span>
          {scope === 'trilha' && !statusFilter.length && (
            <span>Em trilha: {totalActiveCount} ativo(s)</span>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {hasSelection && view === 'table' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 sticky top-0 z-10 backdrop-blur">
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

      {/* Content */}
      {view === 'table' ? (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-lg border border-border bg-card/30 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allFilteredSelected ? true : someSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="min-w-[260px]">Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Próx. ação</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead className="text-right">Idade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const isSel = selected.has(lead.id);
                  const created = lead.created_at ? new Date(lead.created_at) : null;
                  const days = created ? Math.floor((Date.now() - created.getTime()) / 86400000) : null;
                  const triagem = lead.triagem_scheduled_at ? new Date(lead.triagem_scheduled_at) : null;
                  const triagemOverdue = triagem ? triagem.getTime() < Date.now() && !lead.triagem_happened_at : false;
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
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{lead.code}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground line-clamp-1">{lead.title}</p>
                        {lead.company && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate(`/crm/empresas/${lead.company_id}`); }}
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                          >
                            <Building2 className="h-3 w-3" />
                            {lead.company.trade_name || lead.company.legal_name}
                          </button>
                        )}
                      </TableCell>
                      <TableCell><span className={statusClass(lead.status)}>{LEAD_LABEL[lead.status]}</span></TableCell>
                      <TableCell className="text-xs">{lead.source ?? <span className="text-muted-foreground/60">—</span>}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Number(lead.estimated_value ?? 0))}</TableCell>
                      <TableCell className="text-xs">
                        {triagem ? (
                          <span className={cn(triagemOverdue && 'text-destructive font-medium')}>
                            {triagem.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{lead.owner?.display_name ?? <span className="text-muted-foreground/60">—</span>}</TableCell>
                      <TableCell className="text-right text-xs">
                        {days !== null ? (
                          <span className={cn(days > 30 ? 'text-destructive' : days > 14 ? 'text-warning' : 'text-muted-foreground')}>{days}d</span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Nenhum lead encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <button type="button" onClick={toggleAll} className="text-xs text-accent font-medium">
                  {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                {hasSelection && <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>}
              </div>
            )}
            {filtered.map((lead) => {
              const isSel = selected.has(lead.id);
              const triagem = lead.triagem_scheduled_at ? new Date(lead.triagem_scheduled_at) : null;
              const triagemOverdue = triagem ? triagem.getTime() < Date.now() && !lead.triagem_happened_at : false;
              return (
                <div
                  key={lead.id}
                  className={cn('w-full rounded-lg border bg-card p-3 shadow-sm transition', isSel ? 'border-accent/60 bg-accent/5' : 'border-border')}
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
                        <span className="font-mono text-[10px] text-muted-foreground">{lead.code}</span>
                        <span className={statusClass(lead.status)}>{LEAD_LABEL[lead.status]}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{lead.title}</p>
                      {lead.company && (
                        <p className="mt-0.5 text-xs text-accent truncate">{lead.company.trade_name || lead.company.legal_name}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{formatCurrency(Number(lead.estimated_value ?? 0))}</span>
                        <span className="truncate">{lead.owner?.display_name ?? '—'}</span>
                        {triagem && (
                          <span className={cn(triagemOverdue && 'text-destructive font-medium')}>
                            {triagem.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
            {!filtered.length && <p className="text-center text-sm text-muted-foreground py-8">Nenhum lead encontrado</p>}
          </div>
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="-mx-1 px-1 flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
            {LEAD_STATUS.map((status) => {
              const list = grouped.get(status) ?? [];
              const total = list.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0);
              return (
                <div key={status} className="snap-start sm:snap-align-none">
                  <LeadColumn status={status} leads={list} total={total} />
                </div>
              );
            })}
          </div>
        </DndContext>
      )}

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
            >Descartar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
