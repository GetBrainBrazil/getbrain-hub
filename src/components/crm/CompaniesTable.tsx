import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { statusClass, type CompanyCardData } from './CompanyCard';
import type { CompanyAggregate } from '@/hooks/crm/useCrmDetails';
import type { CompanyRelationshipStatus } from '@/types/crm';

const STATUS_LABEL: Record<CompanyRelationshipStatus, string> = {
  prospect: 'Prospect',
  lead: 'Lead',
  active_client: 'Cliente ativo',
  former_client: 'Ex-cliente',
  lost: 'Perdida',
};

export function CompaniesTable({ companies, aggregates }: { companies: CompanyCardData[]; aggregates: Record<string, CompanyAggregate> }) {
  if (!companies.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/20 p-12 text-center text-sm text-muted-foreground">
        Nenhuma empresa encontrada com os filtros atuais.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card/30 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Empresa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Indústria / porte</TableHead>
            <TableHead className="text-center">Leads</TableHead>
            <TableHead className="text-center">Deals</TableHead>
            <TableHead className="text-center">Projetos</TableHead>
            <TableHead className="text-right">MRR ativo</TableHead>
            <TableHead className="text-right">Receita ganha</TableHead>
            <TableHead>Última atividade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((c) => {
            const agg = aggregates[c.id];
            const last = agg?.lastActivityAt ? new Date(agg.lastActivityAt) : null;
            const name = c.trade_name || c.legal_name;
            return (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell>
                  <Link to={`/crm/empresas/${c.id}`} className="flex items-center gap-2.5 group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 overflow-hidden">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-accent">{name}</p>
                      {c.trade_name && c.legal_name !== c.trade_name && (
                        <p className="truncate text-[11px] text-muted-foreground">{c.legal_name}</p>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell><span className={statusClass(c.relationship_status)}>{STATUS_LABEL[c.relationship_status]}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <p>{c.industry || '—'}</p>
                  {c.employee_count_range && <p className="text-[10px]">{c.employee_count_range}</p>}
                </TableCell>
                <TableCell className="text-center text-xs">{agg?.leadsOpen ?? 0}</TableCell>
                <TableCell className="text-center text-xs">{agg?.dealsOpen ?? 0}</TableCell>
                <TableCell className="text-center text-xs">{agg?.projectsOpen ?? 0}<span className="text-[10px] text-muted-foreground">/{agg?.projectsTotal ?? 0}</span></TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCurrency(agg?.mrrActive ?? 0)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-success">{formatCurrency(agg?.revenueWon ?? 0)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {last ? last.toLocaleDateString('pt-BR') : <span className="text-muted-foreground/50">—</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
