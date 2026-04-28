import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, Clock, Pencil, Percent, Repeat, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { InfoBadge, StageStepper } from '@/components/crm/CrmDetailShared';
import { DEAL_STAGE_PROBABILITY } from '@/constants/dealStages';
import {
  PROJECT_TYPE_V2_LABEL, PROJECT_TYPE_V2_COLOR,
} from '@/constants/dealEnumLabels';
import { useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { formatCurrency, maskCurrencyBRL, parseCurrencyBRL } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Deal, DealStage } from '@/types/crm';

interface Props {
  deal: Deal;
  completenessPct: number;
  painOk: boolean;
  solucaoOk: boolean;
  onCloseRequest: (kind: 'won' | 'lost') => void;
}

/* ------------------------------------------------------------------ */
/* Editable KPI                                                        */
/* ------------------------------------------------------------------ */

interface EditableKPIProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  display: React.ReactNode;
  accent?: boolean;
  /** Render the editor; receives a `done` callback to close. */
  renderEditor: (done: () => void) => React.ReactNode;
}

function EditableKPI({ icon: Icon, label, display, accent, renderEditor }: EditableKPIProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div
      className={cn(
        'group relative flex min-w-[140px] flex-1 items-center gap-3 rounded-md border bg-background/40 px-3 py-2.5 transition-colors',
        accent ? 'border-accent/40' : 'border-border',
        !editing && 'cursor-pointer hover:border-accent/60 hover:bg-background/60',
      )}
      onClick={() => { if (!editing) setEditing(true); }}
    >
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        accent ? 'bg-accent/15 text-accent' : 'bg-muted/40 text-muted-foreground',
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {editing ? (
          <div onClick={(e) => e.stopPropagation()}>
            {renderEditor(() => setEditing(false))}
          </div>
        ) : (
          <p className="truncate text-sm font-semibold text-foreground">{display}</p>
        )}
      </div>
      {!editing && (
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic editors                                                     */
/* ------------------------------------------------------------------ */

type NumberKind = 'number' | 'currency' | 'percent' | 'hours';

function NumberEditor({
  initial, onSave, done, min, max, step = '1', suffix, kind = 'number',
}: {
  initial: number | null;
  onSave: (v: number | null) => void;
  done: () => void;
  min?: number;
  max?: number;
  step?: string;
  suffix?: string;
  kind?: NumberKind;
}) {
  const formatInitial = (v: number | null): string => {
    if (v == null) return '';
    if (kind === 'currency') return maskCurrencyBRL(String(Math.round(v * 100)));
    return String(v);
  };
  const [val, setVal] = useState(formatInitial(initial));

  const handleChange = (raw: string) => {
    if (kind === 'currency') {
      setVal(maskCurrencyBRL(raw));
    } else {
      // permite só dígitos + vírgula/ponto
      setVal(raw.replace(/[^\d.,]/g, ''));
    }
  };

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed === '') { onSave(null); done(); return; }
    let n: number | null;
    if (kind === 'currency') {
      n = parseCurrencyBRL(trimmed);
    } else {
      const parsed = Number(trimmed.replace(/\./g, '').replace(',', '.'));
      n = Number.isNaN(parsed) ? null : parsed;
    }
    if (n == null) { done(); return; }
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    onSave(n);
    done();
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        inputMode={kind === 'currency' || kind === 'percent' ? 'numeric' : 'decimal'}
        value={val}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') done();
        }}
        className="h-7 bg-background/80 px-2 text-sm font-semibold"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function DateEditor({
  initial, onSave, done,
}: {
  initial: string | null;
  onSave: (v: string | null) => void;
  done: () => void;
}) {
  const [val, setVal] = useState(initial ?? '');
  const commit = () => {
    onSave(val ? val : null);
    done();
  };
  return (
    <Input
      autoFocus
      type="date"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') done();
      }}
      className="h-7 bg-background/80 px-2 text-sm font-semibold"
    />
  );
}

function NextStepEditor({
  initialText, initialDate, onSave, done,
}: {
  initialText: string | null;
  initialDate: string | null;
  onSave: (text: string | null, date: string | null) => void;
  done: () => void;
}) {
  const [text, setText] = useState(initialText ?? '');
  const [date, setDate] = useState(initialDate ?? '');
  const containerRef = useRef<HTMLDivElement>(null);

  const commit = () => {
    const t = text.trim();
    onSave(t ? t : null, date ? date : null);
    done();
  };

  // close when focus leaves the container
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) commit();
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1" onBlur={handleBlur}>
      <Input
        autoFocus
        value={text}
        placeholder="Próxima ação…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') done();
        }}
        className="h-7 bg-background/80 px-2 text-sm font-semibold"
      />
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') done();
        }}
        className="h-7 bg-background/80 px-2 text-xs"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Completeness                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function DealHeader({ deal, completenessPct, painOk, solucaoOk, onCloseRequest }: Props) {
  const update = useUpdateDealField(deal.code);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(deal.title);

  useEffect(() => { setTitle(deal.title); }, [deal.id, deal.title]);

  const saveField = (updates: Partial<Deal>, label: string) => {
    update.mutate(
      { id: deal.id, updates: updates as any },
      {
        onSuccess: () => toast.success(`${label} atualizado`),
        onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falhou'}`),
      },
    );
  };

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

      {/* Linha 4: mini-KPIs editáveis */}
      <div className="flex flex-wrap gap-2">
        <EditableKPI
          icon={Wallet}
          label="Implementação"
          accent
          display={<span className="font-mono">{formatCurrency(Number(deal.estimated_implementation_value ?? 0))}</span>}
          renderEditor={(done) => (
            <NumberEditor
              kind="currency"
              initial={deal.estimated_implementation_value}
              min={0}
              onSave={(v) => saveField({ estimated_implementation_value: v }, 'Valor de implementação')}
              done={done}
            />
          )}
        />
        <EditableKPI
          icon={Repeat}
          label="MRR (mensal)"
          accent
          display={<span className="font-mono">{formatCurrency(Number(deal.estimated_mrr_value ?? 0))}</span>}
          renderEditor={(done) => (
            <NumberEditor
              kind="currency"
              initial={deal.estimated_mrr_value}
              min={0}
              onSave={(v) => saveField({ estimated_mrr_value: v }, 'MRR estimado')}
              done={done}
            />
          )}
        />
        <EditableKPI
          icon={Percent}
          label="Probabilidade"
          display={<span className="font-mono">{deal.probability_pct}%</span>}
          renderEditor={(done) => (
            <NumberEditor
              kind="percent"
              initial={deal.probability_pct}
              min={0}
              max={100}
              suffix="%"
              onSave={(v) => saveField({ probability_pct: v ?? 0 }, 'Probabilidade')}
              done={done}
            />
          )}
        />
        <EditableKPI
          icon={CalendarDays}
          label="Fecha em"
          display={fmtDate(deal.expected_close_date)}
          renderEditor={(done) => (
            <DateEditor
              initial={deal.expected_close_date}
              onSave={(v) => saveField({ expected_close_date: v }, 'Data de fechamento')}
              done={done}
            />
          )}
        />
        <EditableKPI
          icon={Clock}
          label="Estimativa"
          display={deal.estimated_hours_total ? `${deal.estimated_hours_total} h` : '—'}
          renderEditor={(done) => (
            <NumberEditor
              kind="hours"
              initial={deal.estimated_hours_total}
              min={0}
              suffix="h"
              onSave={(v) => saveField({ estimated_hours_total: v }, 'Estimativa')}
              done={done}
            />
          )}
        />
        <EditableKPI
          icon={TrendingUp}
          label="Próxima ação"
          display={
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
          renderEditor={(done) => (
            <NextStepEditor
              initialText={deal.next_step}
              initialDate={deal.next_step_date}
              onSave={(text, date) => saveField({ next_step: text, next_step_date: date }, 'Próxima ação')}
              done={done}
            />
          )}
        />
      </div>
    </header>
  );
}
