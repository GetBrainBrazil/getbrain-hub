import { Link } from 'react-router-dom';
import { ExternalLink, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface Props {
  sourceDealId?: string | null;
  commercialContext?: Record<string, any> | null;
  originLeadSourceId?: string | null;
}

const sb = supabase as any;

const FIELD_LABELS: Record<string, string> = {
  pain_description: 'Dor identificada',
  pain_category: 'Categoria da dor',
  pain_cost_brl_monthly: 'Custo mensal da dor (R$)',
  pain_hours_monthly: 'Horas/mês perdidas',
  current_solution: 'Solução atual',
  competitors: 'Concorrentes avaliados',
  decision_makers: 'Decisores',
  pricing_rationale: 'Racional de precificação',
  budget_range_min: 'Orçamento mínimo (R$)',
  budget_range_max: 'Orçamento máximo (R$)',
  estimation_confidence: 'Confiança da estimativa',
  next_step: 'Próximo passo (ao fechar)',
  next_step_date: 'Data do próximo passo',
};

function formatValue(key: string, val: any): string {
  if (val == null || val === '') return '—';
  if (key.includes('cost') || key.includes('budget')) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  }
  if (key === 'pain_hours_monthly') return `${val}h`;
  return String(val);
}

export function CommercialContextCard({ sourceDealId, commercialContext, originLeadSourceId }: Props) {
  const [dealCode, setDealCode] = useState<string | null>(null);
  const [leadSource, setLeadSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sourceDealId) {
        const { data } = await sb.from('deals').select('code').eq('id', sourceDealId).maybeSingle();
        if (!cancelled) setDealCode(data?.code ?? null);
      }
      if (originLeadSourceId) {
        const { data } = await sb.from('crm_lead_sources').select('name').eq('id', originLeadSourceId).maybeSingle();
        if (!cancelled) setLeadSource(data?.name ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [sourceDealId, originLeadSourceId]);

  const hasContext = commercialContext && Object.keys(commercialContext).length > 0;
  if (!sourceDealId && !hasContext) return null;

  const entries = hasContext
    ? Object.entries(commercialContext!).filter(([, v]) => v != null && v !== '')
    : [];

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-primary" />
            Contexto comercial
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {leadSource && (
              <Badge variant="secondary" className="text-[11px]">Origem: {leadSource}</Badge>
            )}
            {sourceDealId && dealCode && (
              <Link
                to={`/crm/deals/${dealCode}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono hover:bg-accent"
              >
                {dealCode} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Projeto originado de um deal do CRM. Nenhum dado adicional de descoberta foi registrado.
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            {entries.map(([key, val]) => (
              <div key={key} className="space-y-0.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {FIELD_LABELS[key] ?? key}
                </dt>
                <dd className="text-sm text-foreground whitespace-pre-wrap">
                  {formatValue(key, val)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
