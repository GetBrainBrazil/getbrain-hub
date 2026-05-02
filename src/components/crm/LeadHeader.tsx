import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarClock, CheckCircle2, AlertCircle, ArrowRight,
  Pencil, Wallet, User, Target, Sparkles, Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InfoBadge } from '@/components/crm/CrmDetailShared';
import { useUpdateLeadField } from '@/hooks/crm/useCrmDetails';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types/crm';

const STATUS_TONE: Record<LeadStatus, string> = {
  novo: 'border-accent/40 bg-accent/10 text-accent',
  triagem_agendada: 'border-warning/40 bg-warning/10 text-warning',
  triagem_feita: 'border-success/40 bg-success/10 text-success',
  descartado: 'border-destructive/40 bg-destructive/10 text-destructive',
  convertido: 'border-primary/40 bg-primary/10 text-primary',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo',
  triagem_agendada: 'Triagem agendada',
  triagem_feita: 'Triagem feita',
  descartado: 'Descartado',
  convertido: 'Convertido',
};

interface Props {
  lead: Lead;
  onConvert: () => void;
  onScheduleTriagem: () => void;
  onMarkTriagemDone: () => void;
  onDiscard: () => void;
  onReopen: () => void;
}

function relativeDays(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoje';
  if (days === 1) return '1 dia';
  return `${days} dias`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function NextStepBanner({ lead, onConvert, onScheduleTriagem, onMarkTriagemDone }: {
  lead: Lead;
  onConvert: () => void;
  onScheduleTriagem: () => void;
  onMarkTriagemDone: () => void;
}) {
  if (lead.status === 'convertido' && lead.converted_deal_code) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>Lead convertido em deal</span>
        <Button asChild variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-primary hover:text-primary">
          <Link to={`/crm/deals/${lead.converted_deal_code}`}>
            Abrir {lead.converted_deal_code} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  if (lead.status === 'descartado') {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-destructive">Descartado</p>
          {lead.lost_reason && <p className="mt-0.5 text-xs text-muted-foreground">{lead.lost_reason}</p>}
        </div>
      </div>
    );
  }

  if (lead.status === 'novo') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm">
        <Target className="h-4 w-4 text-accent" />
        <span><span className="font-medium text-foreground">Próximo passo:</span> agendar a triagem com {lead.company?.trade_name || lead.company?.legal_name}.</span>
        <Button size="sm" className="ml-auto h-7" onClick={onScheduleTriagem}>
          Agendar triagem
        </Button>
      </div>
    );
  }

  if (lead.status === 'triagem_agendada') {
    const when = lead.triagem_scheduled_at ? formatDateTime(lead.triagem_scheduled_at) : 'em breve';
    const overdue = lead.triagem_scheduled_at ? new Date(lead.triagem_scheduled_at).getTime() < Date.now() : false;
    return (
      <div className={cn(
        'flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5 text-sm',
        overdue ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5',
      )}>
        <CalendarClock className={cn('h-4 w-4', overdue ? 'text-destructive' : 'text-warning')} />
        <span>
          <span className="font-medium text-foreground">Triagem {overdue ? 'atrasada' : 'agendada'}:</span> {when}
        </span>
        <Button size="sm" variant="outline" className="ml-auto h-7" onClick={onMarkTriagemDone}>
          Marcar como feita
        </Button>
      </div>
    );
  }

  // triagem_feita
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-2.5 text-sm">
      <Sparkles className="h-4 w-4 text-success" />
      <span><span className="font-medium text-foreground">Pronto para virar Deal.</span> Confirme qualificação e converta.</span>
      <Button size="sm" className="ml-auto h-7" onClick={onConvert}>
        Converter em Deal <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function LeadHeader({ lead, onConvert, onScheduleTriagem, onMarkTriagemDone, onDiscard, onReopen }: Props) {
  const update = useUpdateLeadField(lead.code);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lead.title);

  useEffect(() => { setTitle(lead.title); }, [lead.id, lead.title]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== lead.title) {
      update.mutate({ id: lead.id, updates: { title: trimmed } });
    } else {
      setTitle(lead.title);
    }
    setEditing(false);
  };

  return (
    <header className="mb-6 space-y-4 rounded-lg border border-border bg-card/30 p-5">
      {/* Linha 1: meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono font-semibold text-muted-foreground">{lead.code}</span>
        {lead.company && (
          <InfoBadge>
            <Link to={`/crm/empresas/${lead.company_id}`} className="flex items-center gap-1.5 hover:text-foreground">
              <Building2 className="h-3 w-3" />
              {lead.company.trade_name || lead.company.legal_name}
            </Link>
          </InfoBadge>
        )}
        <Badge variant="outline" className={cn('font-medium', STATUS_TONE[lead.status])}>
          {STATUS_LABEL[lead.status]}
        </Badge>
        {lead.created_at && (
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> criado há {relativeDays(lead.created_at)}
          </span>
        )}
      </div>

      {/* Linha 2: título inline */}
      {editing ? (
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveTitle();
            if (e.key === 'Escape') { setTitle(lead.title); setEditing(false); }
          }}
          className="h-auto bg-background/60 text-2xl font-semibold"
        />
      ) : (
        <div className="group flex items-center gap-2">
          <h1
            onClick={() => setEditing(true)}
            className="cursor-text text-2xl font-semibold text-foreground transition-colors hover:text-accent"
          >
            {lead.title}
          </h1>
          <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity text-muted-foreground group-hover:opacity-100" />
        </div>
      )}

      {/* Linha 3: meta financeira */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(Number(lead.estimated_value ?? 0))}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {lead.owner?.display_name ?? 'sem dono'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          {lead.source ?? 'sem origem'}
        </span>
      </div>

      {/* Linha 4: banner de próximo passo */}
      <NextStepBanner
        lead={lead}
        onConvert={onConvert}
        onScheduleTriagem={onScheduleTriagem}
        onMarkTriagemDone={onMarkTriagemDone}
      />

      {/* Linha 5: ações secundárias */}
      <div className="flex flex-wrap gap-2">
        {lead.status !== 'descartado' && lead.status !== 'convertido' && (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDiscard}>
            Descartar lead
          </Button>
        )}
        {lead.status === 'descartado' && (
          <Button variant="outline" size="sm" onClick={onReopen}>
            Reabrir lead
          </Button>
        )}
      </div>
    </header>
  );
}
