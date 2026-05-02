import { CompanyCard, type CompanyCardData } from './CompanyCard';
import type { CompanyAggregate } from '@/hooks/crm/useCrmDetails';

export function CompaniesGrid({ companies, aggregates }: { companies: CompanyCardData[]; aggregates: Record<string, CompanyAggregate> }) {
  if (!companies.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/20 p-12 text-center text-sm text-muted-foreground">
        Nenhuma empresa encontrada com os filtros atuais.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {companies.map((c) => (
        <CompanyCard key={c.id} company={c} agg={aggregates[c.id]} />
      ))}
    </div>
  );
}
