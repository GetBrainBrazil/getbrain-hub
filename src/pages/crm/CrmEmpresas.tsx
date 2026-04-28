import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiFilter, SearchBox } from '@/components/crm/CrmFilters';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAllCompanies, useCompanyDeals, useCompanyLeads } from '@/hooks/crm/useCrmDetails';
import { useBulkDeleteCompanies, useCreateCompany } from '@/hooks/crm/useCrmReference';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CompanyRelationshipStatus, DealStage, LeadStatus } from '@/types/crm';

const STATUS: CompanyRelationshipStatus[] = ['prospect', 'lead', 'active_client', 'former_client', 'lost'];
const STATUS_LABEL: Record<CompanyRelationshipStatus, string> = { prospect: 'Prospect', lead: 'Lead', active_client: 'Cliente ativo', former_client: 'Ex-cliente', lost: 'Perdida' };

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
function statusClass(status: CompanyRelationshipStatus) { return cn('rounded border px-2 py-0.5 text-[11px] font-medium', status === 'active_client' && 'border-success/30 bg-success/10 text-success', status === 'lead' && 'border-warning/30 bg-warning/10 text-warning', status === 'lost' && 'border-destructive/30 bg-destructive/10 text-destructive', status === 'former_client' && 'border-accent/30 bg-accent/10 text-accent', status === 'prospect' && 'border-border bg-muted/40 text-muted-foreground'); }
type CompanyRow = NonNullable<ReturnType<typeof useAllCompanies>['data']>[number];
type Stats = { leadsOpen: number; dealsOpen: number; revenueWon: number };

function NewCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateCompany();
  const [form, setForm] = useState({ legal_name: '', trade_name: '', cnpj: '', industry: '', employee_count_range: '', website: '', linkedin_url: '' });
  const submit = () => create.mutate({ ...form, relationship_status: 'prospect' }, { onSuccess: () => { toast.success('Empresa criada'); onOpenChange(false); setForm({ legal_name: '', trade_name: '', cnpj: '', industry: '', employee_count_range: '', website: '', linkedin_url: '' }); }, onError: (e) => toast.error(e.message) });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Razão social</Label><Input value={form.legal_name} onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))} /></div><div className="space-y-2"><Label>Nome fantasia</Label><Input value={form.trade_name} onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))} /></div><div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} /></div><div className="space-y-2"><Label>Indústria</Label><Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} /></div><div className="space-y-2"><Label>Porte</Label><Input value={form.employee_count_range} onChange={(e) => setForm((f) => ({ ...f, employee_count_range: e.target.value }))} /></div><div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></div><div className="space-y-2 sm:col-span-2"><Label>LinkedIn</Label><Input value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!form.legal_name.trim() || create.isPending} onClick={submit}>Criar empresa</Button></DialogFooter></DialogContent></Dialog>;
}

function useCompanyRowStats(companyId: string): Stats {
  const { data: leads = [] } = useCompanyLeads(companyId);
  const { data: deals = [] } = useCompanyDeals(companyId);
  return { leadsOpen: leads.filter((lead) => !(['descartado', 'convertido'] as LeadStatus[]).includes(lead.status)).length, dealsOpen: deals.filter((deal) => !(['fechado_ganho', 'fechado_perdido'] as DealStage[]).includes(deal.stage)).length, revenueWon: deals.filter((deal) => deal.stage === 'fechado_ganho').reduce((sum, deal) => sum + Number(deal.estimated_value ?? 0), 0) };
}

function CompanyTableRow({ company, selected, onToggle }: { company: CompanyRow; selected: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const stats = useCompanyRowStats(company.id);
  return (
    <TableRow data-state={selected ? 'selected' : undefined} className="cursor-pointer" onClick={() => navigate(`/crm/empresas/${company.id}`)}>
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Selecionar ${company.trade_name || company.legal_name}`} />
      </TableCell>
      <TableCell className="font-medium">{company.trade_name || company.legal_name}</TableCell>
      <TableCell><span className={statusClass(company.relationship_status)}>{STATUS_LABEL[company.relationship_status]}</span></TableCell>
      <TableCell>{company.industry ?? '-'}</TableCell>
      <TableCell>{company.employee_count_range ?? '-'}</TableCell>
      <TableCell>{stats.leadsOpen}</TableCell>
      <TableCell>{stats.dealsOpen}</TableCell>
      <TableCell>{formatCurrency(stats.revenueWon)}</TableCell>
      <TableCell>{new Date(company.created_at).toLocaleDateString('pt-BR')}</TableCell>
      <TableCell>{company.website ? <a href={company.website} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-accent hover:underline"><ExternalLink className="h-4 w-4" /></a> : '-'}</TableCell>
    </TableRow>
  );
}

function CompanyMobileCard({ company, selected, onToggle }: { company: CompanyRow; selected: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const stats = useCompanyRowStats(company.id);
  return (
    <div className={cn('w-full rounded-lg border bg-card p-3 shadow-sm transition', selected ? 'border-accent/60 bg-accent/5' : 'border-border')}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="Selecionar empresa" />
        </div>
        <button
          type="button"
          onClick={() => navigate(`/crm/empresas/${company.id}`)}
          className="flex-1 text-left active:scale-[0.99] transition"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground line-clamp-2">{company.trade_name || company.legal_name}</p>
            <span className={statusClass(company.relationship_status)}>{STATUS_LABEL[company.relationship_status]}</span>
          </div>
          {company.industry && <p className="text-xs text-muted-foreground mt-1">{company.industry}{company.employee_count_range ? ` · ${company.employee_count_range}` : ''}</p>}
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-[10px] text-muted-foreground uppercase">Leads</p><p className="font-semibold">{stats.leadsOpen}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Deals</p><p className="font-semibold">{stats.dealsOpen}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Receita</p><p className="font-semibold">{formatCurrency(stats.revenueWon)}</p></div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function CrmEmpresas() {
  const { data: companies = [] } = useAllCompanies();
  const bulkDelete = useBulkDeleteCompanies();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [statusFilter, setStatusFilter] = usePersistedState<CompanyRelationshipStatus[]>('crm-companies-status-filter', []);
  const [industryFilter, setIndustryFilter] = usePersistedState<string[]>('crm-companies-industry-filter', []);
  const [sizeFilter, setSizeFilter] = usePersistedState<string[]>('crm-companies-size-filter', []);
  const [search, setSearch] = usePersistedState('crm-companies-search', '');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const industries = useMemo(() => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[], [companies]);
  const sizes = useMemo(() => Array.from(new Set(companies.map((c) => c.employee_count_range).filter(Boolean))) as string[], [companies]);
  const filtered = useMemo(() => companies.filter((company) => {
    if (statusFilter.length && !statusFilter.includes(company.relationship_status)) return false;
    if (industryFilter.length && (!company.industry || !industryFilter.includes(company.industry))) return false;
    if (sizeFilter.length && (!company.employee_count_range || !sizeFilter.includes(company.employee_count_range))) return false;
    const q = search.trim().toLowerCase();
    return !q || [company.trade_name ?? '', company.legal_name, company.industry ?? '', company.cnpj ?? ''].join(' ').toLowerCase().includes(q);
  }), [companies, statusFilter, industryFilter, sizeFilter, search]);

  // Poda seleção quando filtros removem itens
  useEffect(() => {
    const visible = new Set(filtered.map((c) => c.id));
    let changed = false;
    const next = new Set<string>();
    selected.forEach((id) => { if (visible.has(id)) next.add(id); else changed = true; });
    if (changed) setSelected(next);
  }, [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCompanies = useMemo(() => filtered.filter((c) => selected.has(c.id)), [filtered, selected]);
  const hasSelection = selected.size > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = hasSelection && !allFilteredSelected;

  const toggleOne = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => filtered.every((c) => prev.has(c.id)) ? new Set() : new Set(filtered.map((c) => c.id)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirm({
      title: `Arquivar ${ids.length} empresa${ids.length > 1 ? 's' : ''}?`,
      description: 'Empresas com leads, deals ou projetos vinculados serão ignoradas para preservar o histórico. As demais serão arquivadas (soft delete) e podem ser restauradas no banco.',
      confirmLabel: 'Arquivar',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await bulkDelete.mutateAsync(ids);
      clearSelection();
      if (res.deleted && res.skipped) {
        toast.success(`${res.deleted} empresa(s) arquivada(s). ${res.skipped} ignorada(s) por possuírem leads/deals/projetos vinculados.`);
      } else if (res.deleted) {
        toast.success(`${res.deleted} empresa(s) arquivada(s).`);
      } else {
        toast.warning('Nenhuma empresa pôde ser arquivada — todas possuem vínculos ativos.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao arquivar empresas.');
    }
  };

  const activeClients = companies.filter((company) => company.relationship_status === 'active_client').length;
  const lost = companies.filter((company) => company.relationship_status === 'lost').length;

  // KPIs dinâmicos com base na seleção
  const selActive = selectedCompanies.filter((c) => c.relationship_status === 'active_client').length;
  const selLeads = selectedCompanies.filter((c) => c.relationship_status === 'lead').length;
  const selLost = selectedCompanies.filter((c) => c.relationship_status === 'lost').length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {hasSelection ? (
          <>
            <Kpi highlight label={`Selecionadas (${selected.size})`} value={String(selectedCompanies.length)} />
            <Kpi highlight label="Clientes ativos / sel." value={String(selActive)} />
            <Kpi highlight label="Leads / sel." value={String(selLeads)} />
            <Kpi highlight label="Perdidas / sel." value={String(selLost)} />
          </>
        ) : (
          <>
            <Kpi label="Total empresas" value={String(companies.length)} />
            <Kpi label="Active clients" value={String(activeClients)} />
            <Kpi label="Leads em aberto" value={String(companies.filter((company) => company.relationship_status === 'lead').length)} />
            <Kpi label="Perdidas" value={String(lost)} />
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-lg border border-border bg-card/50 p-2 sm:p-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <MultiFilter label="Status" selected={statusFilter} onChange={(v) => setStatusFilter(v as CompanyRelationshipStatus[])} options={STATUS.map((status) => ({ value: status, label: STATUS_LABEL[status] }))} />
          <MultiFilter label="Indústria" selected={industryFilter} onChange={setIndustryFilter} options={industries.map((industry) => ({ value: industry, label: industry }))} />
          <MultiFilter label="Porte" selected={sizeFilter} onChange={setSizeFilter} options={sizes.map((size) => ({ value: size, label: size }))} />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none"><SearchBox value={search} onChange={setSearch} placeholder="Buscar empresas..." /></div>
          <Button size="sm" onClick={() => setOpen(true)} className="min-h-10 sm:min-h-9 shrink-0">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova Empresa</span>
          </Button>
        </div>
      </div>

      {hasSelection && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 sticky top-0 z-10 backdrop-blur">
          <p className="text-sm">
            <span className="font-semibold text-foreground">{selected.size}</span>
            <span className="text-muted-foreground"> empresa{selected.size > 1 ? 's' : ''} selecionada{selected.size > 1 ? 's' : ''}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}><X className="h-4 w-4" /> Limpar</Button>
            <Button variant="destructive" size="sm" disabled={bulkDelete.isPending} onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" /> Arquivar selecionadas
            </Button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border bg-card/30 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todas"
                />
              </TableHead>
              <TableHead>Trade name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Indústria</TableHead>
              <TableHead>Porte</TableHead>
              <TableHead>Leads ativos</TableHead>
              <TableHead>Deals ativos</TableHead>
              <TableHead>Receita total</TableHead>
              <TableHead>Criação</TableHead>
              <TableHead>Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{filtered.map((company) => <CompanyTableRow key={company.id} company={company} selected={selected.has(company.id)} onToggle={() => toggleOne(company.id)} />)}</TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <button type="button" onClick={toggleAll} className="text-xs text-accent font-medium">
              {allFilteredSelected ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
            {hasSelection && <span className="text-xs text-muted-foreground">{selected.size} selecionada(s)</span>}
          </div>
        )}
        {filtered.map((company) => <CompanyMobileCard key={company.id} company={company} selected={selected.has(company.id)} onToggle={() => toggleOne(company.id)} />)}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma empresa encontrada</p>}
      </div>

      <NewCompanyDialog open={open} onOpenChange={setOpen} />
      {confirmDialog}
    </div>
  );
}
