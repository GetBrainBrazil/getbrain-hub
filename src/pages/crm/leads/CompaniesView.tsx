import { useMemo } from 'react';
import { Activity, Building2, Layers, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MultiFilter } from '@/components/crm/CrmFilters';
import { CompaniesGrid } from '@/components/crm/CompaniesGrid';
import { CompaniesTable } from '@/components/crm/CompaniesTable';
import type { CompanyCardData } from '@/components/crm/CompanyCard';
import { useAllCompanies, useAllCompaniesAggregates } from '@/hooks/crm/useCrmDetails';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CompanyRelationshipStatus } from '@/types/crm';

const COMPANY_STATUS: CompanyRelationshipStatus[] = ['prospect', 'lead', 'active_client', 'former_client', 'lost'];
const COMPANY_STATUS_LABEL: Record<CompanyRelationshipStatus, string> = {
  prospect: 'Prospect',
  lead: 'Lead',
  active_client: 'Cliente ativo',
  former_client: 'Ex-cliente',
  lost: 'Perdida',
};
const ACTIVE_STATUS: CompanyRelationshipStatus[] = ['prospect', 'lead', 'active_client'];

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'default' | 'success' | 'warning' | 'accent' }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2.5">
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 font-mono text-base sm:text-lg font-semibold',
        tone === 'success' && 'text-success',
        tone === 'warning' && 'text-warning',
        tone === 'accent' && 'text-accent',
        (!tone || tone === 'default') && 'text-foreground',
      )}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FilterChip({ prefix, label, onRemove }: { prefix?: string; label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 pl-2 pr-1 text-[11px] text-accent">
      {prefix && <span className="opacity-60">{prefix}:</span>}
      <span className="truncate font-medium max-w-[140px]">{label}</span>
      <button onClick={onRemove} className="hover:bg-accent/20 rounded-full p-0.5" aria-label="Remover">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function CompaniesView() {
  const { data: companies = [] } = useAllCompanies();
  const { data: aggregates = {} } = useAllCompaniesAggregates();

  const [view, setView] = usePersistedState<'cards' | 'table'>('crm-companies-view', 'cards');
  const [scope, setScope] = usePersistedState<'ativos' | 'todos'>('crm-companies-scope', 'ativos');
  const [search, setSearch] = usePersistedState<string>('crm-companies-search', '');
  const [statusFilter, setStatusFilter] = usePersistedState<CompanyRelationshipStatus[]>('crm-companies-status-filter', []);
  const [industryFilter, setIndustryFilter] = usePersistedState<string[]>('crm-companies-industry-filter', []);
  const [sizeFilter, setSizeFilter] = usePersistedState<string[]>('crm-companies-size-filter', []);

  // Distinct industries / sizes from data
  const industries = useMemo(() => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean) as string[])).sort(), [companies]);
  const sizes = useMemo(() => Array.from(new Set(companies.map((c) => (c as CompanyCardData).employee_count_range).filter(Boolean) as string[])).sort(), [companies]);

  const filtered: CompanyCardData[] = useMemo(() => {
    return (companies as CompanyCardData[]).filter((c) => {
      if (statusFilter.length) {
        if (!statusFilter.includes(c.relationship_status)) return false;
      } else if (scope === 'ativos' && !ACTIVE_STATUS.includes(c.relationship_status)) {
        return false;
      }
      if (industryFilter.length && (!c.industry || !industryFilter.includes(c.industry))) return false;
      if (sizeFilter.length && (!c.employee_count_range || !sizeFilter.includes(c.employee_count_range))) return false;
      const q = search.trim().toLowerCase();
      if (q) {
        const haystack = [c.legal_name, c.trade_name ?? '', c.industry ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [companies, statusFilter, industryFilter, sizeFilter, scope, search]);

  // KPIs
  const totalCompanies = companies.length;
  const activeClients = companies.filter((c) => c.relationship_status === 'active_client').length;
  const totalMrr = filtered.reduce((s, c) => s + (aggregates[c.id]?.mrrActive ?? 0), 0);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const revenueYtd = filtered.reduce((s, c) => s + (aggregates[c.id]?.revenueWon ?? 0), 0); // YTD approximation (won deals)
  const stale = useMemo(() => {
    const cutoff = Date.now() - 60 * 86400000;
    return filtered.filter((c) => {
      const last = aggregates[c.id]?.lastActivityAt;
      return !last || new Date(last).getTime() < cutoff;
    }).length;
  }, [filtered, aggregates]);

  const hasFilters = search.trim() || statusFilter.length || industryFilter.length || sizeFilter.length;

  const clearAll = () => {
    setSearch('');
    setStatusFilter([]);
    setIndustryFilter([]);
    setSizeFilter([]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
        <Kpi label="Empresas" value={String(totalCompanies)} hint={`${filtered.length} visível(eis)`} />
        <Kpi label="Clientes ativos" value={String(activeClients)} tone="success" />
        <Kpi label="MRR ativo" value={formatCurrency(totalMrr)} tone="accent" hint="Filtro atual" />
        <Kpi label="Receita ganha" value={formatCurrency(revenueYtd)} tone="success" hint="Filtro atual" />
        <Kpi label="Sem atividade >60d" value={String(stale)} tone={stale > 0 ? 'warning' : 'default'} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-2 sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa, CNPJ, indústria..."
              className="h-9 pl-8 text-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted" aria-label="Limpar">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex h-9 rounded-full border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setScope('ativos')}
                className={cn('inline-flex items-center gap-1 rounded-full px-3 text-xs font-medium transition', scope === 'ativos' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Activity className="h-3 w-3" /> Ativas
              </button>
              <button
                type="button"
                onClick={() => setScope('todos')}
                className={cn('inline-flex items-center gap-1 rounded-full px-3 text-xs font-medium transition', scope === 'todos' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Layers className="h-3 w-3" /> Tudo
              </button>
            </div>
            <MultiFilter label="Status" icon={<Building2 className="h-3 w-3" />} selected={statusFilter} onChange={(v) => setStatusFilter(v as CompanyRelationshipStatus[])} options={COMPANY_STATUS.map((s) => ({ value: s, label: COMPANY_STATUS_LABEL[s] }))} />
            {industries.length > 0 && (
              <MultiFilter label="Indústria" selected={industryFilter} onChange={setIndustryFilter} options={industries.map((i) => ({ value: i, label: i }))} />
            )}
            {sizes.length > 0 && (
              <MultiFilter label="Porte" selected={sizeFilter} onChange={setSizeFilter} options={sizes.map((s) => ({ value: s, label: s }))} />
            )}
            <div className="ml-auto">
              <Tabs value={view} onValueChange={(v) => setView(v as 'cards' | 'table')}>
                <TabsList className="h-9">
                  <TabsTrigger value="cards" className="text-xs">Cards</TabsTrigger>
                  <TabsTrigger value="table" className="text-xs">Tabela</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Filtros:</span>
            {statusFilter.map((s) => <FilterChip key={s} prefix="Status" label={COMPANY_STATUS_LABEL[s]} onRemove={() => setStatusFilter(statusFilter.filter((x) => x !== s))} />)}
            {industryFilter.map((s) => <FilterChip key={s} prefix="Indústria" label={s} onRemove={() => setIndustryFilter(industryFilter.filter((x) => x !== s))} />)}
            {sizeFilter.map((s) => <FilterChip key={s} prefix="Porte" label={s} onRemove={() => setSizeFilter(sizeFilter.filter((x) => x !== s))} />)}
            {search.trim() && <FilterChip prefix="Busca" label={search} onRemove={() => setSearch('')} />}
            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-[11px] text-destructive hover:bg-destructive/10" onClick={clearAll}>
              <X className="h-3 w-3" /> Limpar tudo
            </Button>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de {totalCompanies} empresa(s)
        </div>
      </div>

      {view === 'cards' ? (
        <CompaniesGrid companies={filtered} aggregates={aggregates} />
      ) : (
        <CompaniesTable companies={filtered} aggregates={aggregates} />
      )}
    </div>
  );
}
