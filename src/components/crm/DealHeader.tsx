import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, Check, Clock, Pencil, Percent, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { InfoBadge, StageStepper } from '@/components/crm/CrmDetailShared';
import { DEAL_STAGE_PROBABILITY } from '@/constants/dealStages';
import {
  PROJECT_TYPE_V2_LABEL, PROJECT_TYPE_V2_COLOR,
} from '@/constants/dealEnumLabels';
import { useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Deal, DealStage } from '@/types/crm';

interface Props {
  deal: Deal;
  completenessPct: number;
  painOk: boolean;
  solucaoOk: boolean;
  onCloseRequest: (kind: 'won' | 'lost') => void;
}

function MiniKPI({
  icon: Icon, label, value, accent = false,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      'flex min-w-[140px] flex-1 items-center gap-3 rounded-md border bg-background/40 px-3 py-2.5',
      accent ? 'border-accent/40' : 'border-border',
    )}>
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        accent ? 'bg-accent/15 text-accent' : 'bg-muted/40 text-muted-foreground',
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function CompletenessBadge({ pct, painOk, solucaoOk }: { pct: number; painOk: boolean; solucaoOk: boolean }) {
  const tone = pct === 100
    ? 'border-success/40 bg-success/10 text-success'
    : pct >= 50
      ? 'border-warning/40 bg-warning/10 text-warning'
      : 'border-border bg-muted/30 text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', tone)}>
      <span className="font-mono">{pct}%</span>
      <span>descoberta</span>
      <span className="text-[10px] opacity-70">
        ({painOk ? '✓' : '○'}dor · {solucaoOk ? '✓' : '○'}solução)
      </span>
    </Badge>
  );
}

export function DealHeader({ deal, completenessPct, painOk, solucaoOk, onCloseRequest }: Props) {
  const update = useUpdateDealField(deal.code);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(deal.title);

  useEffect(() => { setTitle(deal.title); }, [deal.id, deal.title]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== deal.title) {
      update.mutate(
        { id: deal.id, updates: { title: trimmed } },
        { onError: (err: any) => { toast.error(`Erro: ${err?.message ?? 'falhou'}`); setTitle(deal.title); } },
      );
    } else {
      setTitle(deal.title);
    }
    setEditing(false);
  };

  const stageChange = (s: DealStage) => {
    if (s === 'fechado_ganho') return onCloseRequest('won');
    if (s === 'fechado_perdido') return onCloseRequest('lost');
    update.mutate(
      { id: deal.id, updates: { stage: s, probability_pct: DEAL_STAGE_PROBABILITY[s], closed_at: null } },
      { onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falhou'}`) },
    );
  };

  const fmtDate = (d: string | null) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—';

  return (
    <header className="mb-6 space-y-4 rounded-lg border border-border bg-card/30 p-5">
      {/* Linha 1: código + badges + completeness */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono font-semibold text-muted-foreground">{deal.code}</span>
        {deal.company && (
          <InfoBadge>
            <Link to={`/crm/empresas/${deal.company_id}`} className="flex items-center gap-1.5 hover:text-foreground">
              <Building2 className="h-3 w-3" />
              {deal.company.trade_name || deal.company.legal_name}
            </Link>
          </InfoBadge>
        )}
        {deal.project_type_v2 && (
          <InfoBadge className={PROJECT_TYPE_V2_COLOR[deal.project_type_v2]}>
            {PROJECT_TYPE_V2_LABEL[deal.project_type_v2]}
          </InfoBadge>
        )}
        {deal.estimation_confidence && (
          <InfoBadge className="capitalize">
            confiança {deal.estimation_confidence}
          </InfoBadge>
        )}
        <div className="ml-auto">
          <CompletenessBadge pct={completenessPct} painOk={painOk} solucaoOk={solucaoOk} />
        </div>
      </div>

      {/* Linha 2: título inline editável */}
      {editing ? (
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveTitle();
            if (e.key === 'Escape') { setTitle(deal.title); setEditing(false); }
          }}
          className="h-auto bg-background/60 text-2xl font-semibold"
        />
      ) : (
        <div className="group flex items-center gap-2">
          <h1
            onClick={() => setEditing(true)}
            className="cursor-text text-2xl font-semibold text-foreground transition-colors hover:text-accent"
          >
            {deal.title}
          </h1>
          <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity text-muted-foreground group-hover:opacity-100" />
        </div>
      )}

      {/* Linha 3: pipeline horizontal */}
      <StageStepper stage={deal.stage} onChange={stageChange} />

      {/* Linha 4: mini-KPIs */}
      <div className="flex flex-wrap gap-2">
        <MiniKPI
          icon={Wallet}
          label="Valor estimado"
          value={<span className="font-mono">{formatCurrency(Number(deal.estimated_value ?? 0))}</span>}
          accent
        />
        <MiniKPI
          icon={Percent}
          label="Probabilidade"
          value={<span className="font-mono">{deal.probability_pct}%</span>}
        />
        <MiniKPI
          icon={CalendarDays}
          label="Fecha em"
          value={fmtDate(deal.expected_close_date)}
        />
        <MiniKPI
          icon={Clock}
          label="Estimativa"
          value={deal.estimated_hours_total ? `${deal.estimated_hours_total} h` : '—'}
        />
        <MiniKPI
          icon={TrendingUp}
          label="Próxima ação"
          value={
            <span className="flex items-center gap-1.5">
              {deal.next_step ? (
                <>
                  <span className="truncate" title={deal.next_step}>{deal.next_step}</span>
                  {deal.next_step_date && (
                    <span className="font-mono text-[10px] text-muted-foreground">· {fmtDate(deal.next_step_date)}</span>
                  )}
                </>
              ) : '—'}
            </span>
          }
        />
      </div>
    </header>
  );
}
