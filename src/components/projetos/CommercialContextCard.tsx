import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Briefcase,
  AlertCircle,
  Lightbulb,
  Users,
  DollarSign,
  Repeat,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { useCrmPainCategories } from '@/hooks/crm/useCrmPainCategories';
import { useCrmProjectTypes } from '@/hooks/crm/useCrmProjectTypes';
import { chipStyleFromHex, resolveHex } from '@/lib/crm/colorUtils';
import { cn } from '@/lib/utils';

interface Props {
  sourceDealId?: string | null;
  commercialContext?: Record<string, any> | null;
  originLeadSourceId?: string | null;
  /** Slugs vindos de projects.project_type_v2 — chips coloridos */
  projectTypeSlugs?: string[];
}

const sb = supabase as any;

const fmtBRL = (v: any) =>
  v == null || v === '' ? null : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));

const fmtDate = (v: any) => {
  if (!v) return null;
  try {
    return new Date(v).toLocaleDateString('pt-BR');
  } catch {
    return String(v);
  }
};

const CONFIDENCE_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

const MRR_TRIGGER_LABEL: Record<string, string> = {
  on_delivery: 'Inicia na entrega',
  before_delivery: 'Inicia antes da entrega',
};

/** Linha "label: valor" dentro de um sub-bloco. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-foreground whitespace-pre-wrap sm:text-right">{value}</dd>
    </div>
  );
}

function SubBlock({
  icon: Icon,
  title,
  tone = 'default',
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: 'default' | 'warning' | 'success' | 'info';
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-md border bg-background/40 p-3',
        tone === 'warning' && 'border-warning/30 bg-warning/[0.04]',
        tone === 'success' && 'border-success/30 bg-success/[0.04]',
        tone === 'info' && 'border-accent/30 bg-accent/[0.04]',
        tone === 'default' && 'border-border',
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            tone === 'warning' && 'text-warning',
            tone === 'success' && 'text-success',
            tone === 'info' && 'text-accent',
            tone === 'default' && 'text-muted-foreground',
          )}
        />
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      </div>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

export function CommercialContextCard({
  sourceDealId,
  commercialContext,
  originLeadSourceId,
  projectTypeSlugs = [],
}: Props) {
  const [dealCode, setDealCode] = useState<string | null>(null);
  const [leadSource, setLeadSource] = useState<string | null>(null);

  const { data: allPainCats = [] } = useCrmPainCategories();
  const { data: allProjectTypes = [] } = useCrmProjectTypes();

  const ctx = commercialContext ?? {};

  const painSlugs: string[] = useMemo(() => {
    const arr = (ctx.pain_categories ?? []) as string[];
    if (Array.isArray(arr) && arr.length) return arr;
    const single = ctx.pain_category;
    return single ? [single] : [];
  }, [ctx]);

  const painChips = useMemo(
    () => painSlugs.map((s) => allPainCats.find((c) => c.slug === s)).filter(Boolean) as typeof allPainCats,
    [painSlugs, allPainCats],
  );

  const typeChips = useMemo(
    () => projectTypeSlugs.map((s) => allProjectTypes.find((t) => t.slug === s)).filter(Boolean) as typeof allProjectTypes,
    [projectTypeSlugs, allProjectTypes],
  );

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
    return () => {
      cancelled = true;
    };
  }, [sourceDealId, originLeadSourceId]);

  // Valores derivados, normalizados por sub-bloco
  const dor = {
    description: (ctx.pain_description as string) || null,
    cost: fmtBRL(ctx.pain_cost_brl_monthly),
    hours:
      ctx.pain_hours_monthly != null && ctx.pain_hours_monthly !== ''
        ? `${ctx.pain_hours_monthly}h/mês`
        : null,
  };
  const solucao = {
    current: (ctx.current_solution as string) || null,
    competitors: (ctx.competitors as string) || null,
  };
  const decisao = {
    decision_makers: (ctx.decision_makers as string) || null,
    next_step: (ctx.next_step as string) || null,
    next_step_date: fmtDate(ctx.next_step_date),
  };
  const orcamento = {
    min: fmtBRL(ctx.budget_range_min),
    max: fmtBRL(ctx.budget_range_max),
    confidence: ctx.estimation_confidence
      ? CONFIDENCE_LABEL[ctx.estimation_confidence] ?? ctx.estimation_confidence
      : null,
    rationale: (ctx.pricing_rationale as string) || null,
  };
  const mrr = {
    trigger: ctx.mrr_start_trigger
      ? MRR_TRIGGER_LABEL[ctx.mrr_start_trigger] ?? ctx.mrr_start_trigger
      : null,
    discount_kind: (ctx.mrr_discount_kind as string) || null,
    discount_until_date: fmtDate(ctx.mrr_discount_until_date),
    discount_until_stage: (ctx.mrr_discount_until_stage as string) || null,
  };

  const hasDor = !!(dor.description || dor.cost || dor.hours || painChips.length);
  const hasSolucao = !!(solucao.current || solucao.competitors);
  const hasDecisao = !!(decisao.decision_makers || decisao.next_step || decisao.next_step_date);
  const hasOrcamento = !!(orcamento.min || orcamento.max || orcamento.confidence || orcamento.rationale);
  const hasMrr = !!(mrr.trigger || mrr.discount_kind || mrr.discount_until_date || mrr.discount_until_stage);
  const hasAny = hasDor || hasSolucao || hasDecisao || hasOrcamento || hasMrr || typeChips.length > 0;

  if (!sourceDealId && !hasAny) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-primary" />
              Contexto comercial
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {leadSource && (
                <Badge variant="secondary" className="text-[11px]">
                  Origem: {leadSource}
                </Badge>
              )}
              {sourceDealId && dealCode && (
                <Link
                  to={`/crm/deals/${dealCode}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] hover:bg-accent"
                >
                  {dealCode} <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Tipos do projeto */}
          {typeChips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tipos do projeto
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {typeChips.map((pt) => (
                  <span
                    key={pt.slug}
                    className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                    style={chipStyleFromHex(pt.color)}
                  >
                    {pt.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sub-blocos comerciais */}
          {hasAny && (
            <div className="grid gap-3 sm:grid-cols-2">
              {hasDor && (
                <SubBlock icon={AlertCircle} title="Dor identificada" tone="warning">
                  {painChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      {painChips.map((cat) => (
                        <Tooltip key={cat.slug}>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                              style={chipStyleFromHex(cat.color)}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: resolveHex(cat.color) }}
                              />
                              {cat.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Categoria da dor: {cat.name}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                  <Row label="Descrição" value={dor.description} />
                  <Row label="Custo mensal" value={dor.cost} />
                  <Row label="Tempo perdido" value={dor.hours} />
                </SubBlock>
              )}

              {hasSolucao && (
                <SubBlock icon={Lightbulb} title="Solução & concorrência" tone="info">
                  <Row label="Solução atual" value={solucao.current} />
                  <Row label="Concorrentes" value={solucao.competitors} />
                </SubBlock>
              )}

              {hasDecisao && (
                <SubBlock icon={Users} title="Decisão & próximos passos">
                  <Row label="Decisores" value={decisao.decision_makers} />
                  <Row label="Próximo passo" value={decisao.next_step} />
                  <Row label="Data prevista" value={decisao.next_step_date} />
                </SubBlock>
              )}

              {hasOrcamento && (
                <SubBlock icon={DollarSign} title="Orçamento & estimativa">
                  <Row
                    label="Faixa de orçamento"
                    value={
                      orcamento.min || orcamento.max
                        ? `${orcamento.min ?? '—'} – ${orcamento.max ?? '—'}`
                        : null
                    }
                  />
                  <Row label="Confiança" value={orcamento.confidence} />
                  <Row label="Racional de precificação" value={orcamento.rationale} />
                </SubBlock>
              )}

              {hasMrr && (
                <SubBlock icon={Repeat} title="MRR (recorrência)" tone="success">
                  <Row label="Início do MRR" value={mrr.trigger} />
                  <Row label="Desconto" value={mrr.discount_kind} />
                  <Row label="Desconto até" value={mrr.discount_until_date} />
                  <Row label="Desconto até estágio" value={mrr.discount_until_stage} />
                </SubBlock>
              )}
            </div>
          )}

          {!hasAny && (
            <p className="text-xs text-muted-foreground">
              Projeto originado de um deal do CRM. Nenhum dado adicional de descoberta foi registrado.
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
