import { useMemo, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiFilter, SearchBox } from '@/components/crm/CrmFilters';
import { useAllCompanies, useCompanyDeals, useCompanyLeads } from '@/hooks/crm/useCrmDetails';
import { useCreateCompany } from '@/hooks/crm/useCrmReference';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CompanyRelationshipStatus, DealStage, LeadStatus } from '@/types/crm';

const STATUS: CompanyRelationshipStatus[] = ['prospect', 'lead', 'active_client', 'former_client', 'lost'];
const STATUS_LABEL: Record<CompanyRelationshipStatus, string> = { prospect: 'Prospect', lead: 'Lead', active_client: 'Cliente ativo', former_client: 'Ex-cliente', lost: 'Perdida' };

function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card/60 px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p></div>; }
function statusClass(status: CompanyRelationshipStatus) { return cn('rounded border px-2 py-0.5 text-[11px] font-medium', status === 'active_client' && 'border-success/30 bg-success/10 text-success', status === 'lead' && 'border-warning/30 bg-warning/10 text-warning', status === 'lost' && 'border-destructive/30 bg-destructive/10 text-destructive', status === 'former_client' && 'border-accent/30 bg-accent/10 text-accent', status === 'prospect' && 'border-border bg-muted/40 text-muted-foreground'); }
type CompanyRow = Awaited<ReturnType<typeof useAllCompanies>>['data'] extends Array<infer T> ? T : never;
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

function CompanyTableRow({ company }: { company: CompanyRow }) {
  const navigate = useNavigate();
  const stats = useCompanyRowStats(company.id);
  return <TableRow className="cursor-pointer" onClick={() => navigate(`/crm/empresas/${company.id}`)}><TableCell className="font-medium">{company.trade_name || company.legal_name}</TableCell><TableCell><span className={statusClass(company.relationship_status)}>{STATUS_LABEL[company.relationship_status]}</span></TableCell><TableCell>{company.industry ?? '-'}</TableCell><TableCell>{company.employee_count_range ?? '-'}</TableCell><TableCell>{stats.leadsOpen}</TableCell><TableCell>{stats.dealsOpen}</TableCell><TableCell>{formatCurrency(stats.revenueWon)}</TableCell><TableCell>{new Date(company.created_at).toLocaleDateString('pt-BR')}</TableCell><TableCell>{company.website ? <a href={company.website} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-accent hover:underline"><ExternalLink className="h-4 w-4" /></a> : '-'}</TableCell></TableRow>;
}

function CompanyMobileCard({ company }: { company: CompanyRow }) {
  const navigate = useNavigate();
  const stats = useCompanyRowStats(company.id);
  return (
    <button
      type="button"
      onClick={() => navigate(`/crm/empresas/${company.id}`)}
      className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm active:scale-[0.99] transition"
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
  );
}

export default function CrmEmpresas() {
  const { data: companies = [] } = useAllCompanies();
  const [statusFilter, setStatusFilter] = usePersistedState<CompanyRelationshipStatus[]>('crm-companies-status-filter', []);
  const [industryFilter, setIndustryFilter] = usePersistedState<string[]>('crm-companies-industry-filter', []);
  const [sizeFilter, setSizeFilter] = usePersistedState<string[]>('crm-companies-size-filter', []);
  const [search, setSearch] = usePersistedState('crm-companies-search', '');
  const [open, setOpen] = useState(false);
  const industries = useMemo(() => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[], [companies]);
  const sizes = useMemo(() => Array.from(new Set(companies.map((c) => c.employee_count_range).filter(Boolean))) as string[], [companies]);
  const filtered = useMemo(() => companies.filter((company) => {
    if (statusFilter.length && !statusFilter.includes(company.relationship_status)) return false;
    if (industryFilter.length && (!company.industry || !industryFilter.includes(company.industry))) return false;
    if (sizeFilter.length && (!company.employee_count_range || !sizeFilter.includes(company.employee_count_range))) return false;
    const q = search.trim().toLowerCase();
    return !q || [company.trade_name ?? '', company.legal_name, company.industry ?? '', company.cnpj ?? ''].join(' ').toLowerCase().includes(q);
  }), [companies, statusFilter, industryFilter, sizeFilter, search]);
  const activeClients = companies.filter((company) => company.relationship_status === 'active_client').length;
  const lost = companies.filter((company) => company.relationship_status === 'lost').length;
  return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-4"><Kpi label="Total empresas" value={String(companies.length)} /><Kpi label="Active clients" value={String(activeClients)} /><Kpi label="Leads em aberto" value={String(companies.filter((company) => company.relationship_status === 'lead').length)} /><Kpi label="Perdidas" value={String(lost)} /></div><div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-3"><MultiFilter label="Status" selected={statusFilter} onChange={(v) => setStatusFilter(v as CompanyRelationshipStatus[])} options={STATUS.map((status) => ({ value: status, label: STATUS_LABEL[status] }))} /><MultiFilter label="Indústria" selected={industryFilter} onChange={setIndustryFilter} options={industries.map((industry) => ({ value: industry, label: industry }))} /><MultiFilter label="Porte" selected={sizeFilter} onChange={setSizeFilter} options={sizes.map((size) => ({ value: size, label: size }))} /><SearchBox value={search} onChange={setSearch} placeholder="Buscar empresas..." /><Button className="ml-auto" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova Empresa</Button></div><div className="rounded-lg border border-border bg-card/30"><Table><TableHeader><TableRow><TableHead>Trade name</TableHead><TableHead>Status</TableHead><TableHead>Indústria</TableHead><TableHead>Porte</TableHead><TableHead>Leads ativos</TableHead><TableHead>Deals ativos</TableHead><TableHead>Receita total</TableHead><TableHead>Criação</TableHead><TableHead>Website</TableHead></TableRow></TableHeader><TableBody>{filtered.map((company) => <CompanyTableRow key={company.id} company={company} />)}</TableBody></Table></div><NewCompanyDialog open={open} onOpenChange={setOpen} /></div>;
}