import { Link } from 'react-router-dom';
import { Building2, ExternalLink, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { CompanyRelationshipStatus } from '@/types/crm';
import type { CompanyAggregate } from '@/hooks/crm/useCrmDetails';

const STATUS_LABEL: Record<CompanyRelationshipStatus, string> = {
  prospect: 'Prospect',
  lead: 'Lead',
  active_client: 'Cliente ativo',
  former_client: 'Ex-cliente',
  lost: 'Perdida',
};

export function statusClass(status: CompanyRelationshipStatus) {
  return cn(
    'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
    status === 'active_client' && 'border-success/40 bg-success/10 text-success',
    status === 'lead' && 'border-warning/40 bg-warning/10 text-warning',
    status === 'lost' && 'border-destructive/40 bg-destructive/10 text-destructive',
    status === 'former_client' && 'border-accent/40 bg-accent/10 text-accent',
    status === 'prospect' && 'border-border bg-muted/40 text-muted-foreground',
  );
}

export type CompanyCardData = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  relationship_status: CompanyRelationshipStatus;
  industry?: string | null;
  employee_count_range?: string | null;
  website?: string | null;
  logo_url?: string | null;
};

export function CompanyCard({ company, agg }: { company: CompanyCardData; agg?: CompanyAggregate }) {
  const name = company.trade_name || company.legal_name;
  const lastActivity = agg?.lastActivityAt ? new Date(agg.lastActivityAt) : null;
  return (
    <Link
      to={`/crm/empresas/${company.id}`}
      className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card/40 p-4 transition hover:border-accent/60 hover:bg-card/80 hover:shadow-md"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 overflow-hidden">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-accent">{name}</p>
          {company.trade_name && company.legal_name !== company.trade_name && (
            <p className="truncate text-[11px] text-muted-foreground">{company.legal_name}</p>
          )}
        </div>
        <span className={statusClass(company.relationship_status)}>{STATUS_LABEL[company.relationship_status]}</span>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Leads" value={agg?.leadsOpen ?? 0} />
        <Stat label="Deals" value={agg?.dealsOpen ?? 0} />
        <Stat label="Projetos" value={agg?.projectsOpen ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-muted/20 p-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">MRR ativo</p>
          <p className="mt-0.5 font-mono font-semibold text-foreground">{formatCurrency(agg?.mrrActive ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Receita ganha</p>
          <p className="mt-0.5 font-mono font-semibold text-success">{formatCurrency(agg?.revenueWon ?? 0)}</p>
        </div>
      </div>

      <footer className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          <Users className="h-3 w-3" />
          <span className="truncate">{company.industry || 'sem indústria'}</span>
          {company.employee_count_range && <span>· {company.employee_count_range}</span>}
        </span>
        {lastActivity ? (
          <span className="flex items-center gap-1 shrink-0">
            <TrendingUp className="h-3 w-3" />
            {lastActivity.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        ) : (
          <span className="shrink-0 text-muted-foreground/60">sem atividade</span>
        )}
      </footer>

      {company.website && (
        <a
          href={company.website}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
        >
          {company.website.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 px-1.5 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
