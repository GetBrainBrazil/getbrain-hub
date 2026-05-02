import { Link } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, FileText, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyContracts, useCompanyFinance } from '@/hooks/crm/useCrmDetails';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function CompanyContractsPanel({ companyId }: { companyId: string }) {
  const { data: contracts = [], isLoading: cLoad } = useCompanyContracts(companyId);
  const { data: finance, isLoading: fLoad } = useCompanyFinance(companyId);

  const totalMrr = contracts.filter((c) => c.status === 'active').reduce((s, c) => s + c.effective_fee, 0);

  return (
    <div className="space-y-5">
      {/* Resumo financeiro */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="MRR ativo" value={formatCurrency(totalMrr)} tone="accent" loading={cLoad} />
        <KpiCard icon={<ArrowDownCircle className="h-4 w-4" />} label="A receber" value={formatCurrency(finance?.pendingTotal ?? 0)} tone="warning" loading={fLoad} />
        <KpiCard icon={<ArrowUpCircle className="h-4 w-4" />} label="Já recebido" value={formatCurrency(finance?.receivedTotal ?? 0)} tone="success" loading={fLoad} />
      </div>

      {/* Contratos */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Contratos de manutenção</h3>
          <span className="text-xs text-muted-foreground">{contracts.length}</span>
        </div>
        {cLoad ? (
          <Skeleton className="h-24 w-full" />
        ) : !contracts.length ? (
          <EmptyState text="Nenhum contrato de manutenção." />
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <Link
                key={c.id}
                to={`/projetos/${c.project_id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3 text-sm transition hover:border-accent/50 hover:bg-card/80"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{c.project_name || c.project_code || c.project_id}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Início {new Date(c.start_date).toLocaleDateString('pt-BR')}
                    {c.end_date && ` · Fim ${new Date(c.end_date).toLocaleDateString('pt-BR')}`}
                    {c.hours_budget && ` · ${c.hours_budget}h/mês`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold text-foreground">{formatCurrency(c.effective_fee)}</p>
                  {c.monthly_fee_discount_percent > 0 && (
                    <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(c.monthly_fee)}</p>
                  )}
                </div>
                <span className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  c.status === 'active' && 'border-success/40 bg-success/10 text-success',
                  c.status !== 'active' && 'border-border bg-muted/30 text-muted-foreground',
                )}>{c.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Movimentações financeiras */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Movimentações financeiras</h3>
          <span className="text-xs text-muted-foreground">{finance?.rows.length ?? 0}</span>
        </div>
        {fLoad ? (
          <Skeleton className="h-24 w-full" />
        ) : !finance?.rows.length ? (
          <EmptyState text="Nenhuma movimentação encontrada para esta empresa." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card/30">
            <ul className="max-h-80 divide-y divide-border/50 overflow-y-auto">
              {finance.rows.slice(0, 50).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    r.status === 'pago' || r.status === 'recebido' ? 'bg-success' :
                    r.status === 'pendente' ? 'bg-warning' :
                    r.status === 'agendado' ? 'bg-accent' : 'bg-muted-foreground/50',
                  )} />
                  <p className="min-w-0 flex-1 truncate text-foreground">{r.descricao}</p>
                  <span className="hidden sm:inline text-[11px] text-muted-foreground">
                    {r.data_vencimento ? new Date(r.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                  </span>
                  <span className={cn(
                    'shrink-0 font-mono text-xs',
                    r.tipo === 'receita' ? 'text-success' : 'text-foreground',
                  )}>{formatCurrency(r.valor)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ icon, label, value, tone, loading }: { icon: React.ReactNode; label: string; value: string; tone: 'accent' | 'success' | 'warning'; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className={cn(
          tone === 'accent' && 'text-accent',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
        )}>{icon}</span>
        {label}
      </div>
      <p className={cn(
        'mt-1 font-mono text-lg font-semibold',
        tone === 'accent' && 'text-accent',
        tone === 'success' && 'text-success',
        tone === 'warning' && 'text-warning',
      )}>{loading ? '...' : value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>;
}
