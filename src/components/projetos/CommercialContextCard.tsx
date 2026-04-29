import { Link } from 'react-router-dom';
import { ExternalLink, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { useCrmPainCategories } from '@/hooks/crm/useCrmPainCategories';
import { useCrmProjectTypes } from '@/hooks/crm/useCrmProjectTypes';
import { chipStyleFromHex, resolveHex } from '@/lib/crm/colorUtils';

interface Props {
  sourceDealId?: string | null;
  commercialContext?: Record<string, any> | null;
  originLeadSourceId?: string | null;
  /** Slugs vindos de projects.project_type_v2 — renderizados como chips coloridos */
  projectTypeSlugs?: string[];
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

// pain_categories tem renderização dedicada (chips), então não entra no grid genérico
const SPECIAL_KEYS = new Set(['pain_categories']);

function formatValue(key: string, val: any): string {
  if (val == null || val === '') return '—';
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  if (key.includes('cost') || key.includes('budget')) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  }
  if (key === 'pain_hours_monthly') return `${val}h`;
  return String(val);
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

  const painSlugs: string[] = useMemo(() => {
    const arr = (commercialContext?.pain_categories ?? []) as string[];
    if (Array.isArray(arr) && arr.length) return arr;
    const single = commercialContext?.pain_category;
    return single ? [single] : [];
  }, [commercialContext]);

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
    return () => { cancelled = true; };
  }, [sourceDealId, originLeadSourceId]);

  const hasContext = commercialContext && Object.keys(commercialContext).length > 0;
  if (!sourceDealId && !hasContext && typeChips.length === 0) return null;

  const entries = hasContext
    ? Object.entries(commercialContext!)
        .filter(([k, v]) => v != null && v !== '' && !SPECIAL_KEYS.has(k))
    : [];

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
        <CardContent className="space-y-4 pt-0">
          {/* Tipos do projeto — chips coloridos (mesmo visual do card do CRM) */}
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

          {/* Dores — chips coloridos */}
          {painChips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Categorias da dor
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {painChips.map((cat) => (
                  <Tooltip key={cat.slug}>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                        style={chipStyleFromHex(cat.color)}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: resolveHex(cat.color) }} />
                        {cat.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Categoria da dor: {cat.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {/* Demais campos textuais */}
          {entries.length === 0 && typeChips.length === 0 && painChips.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Projeto originado de um deal do CRM. Nenhum dado adicional de descoberta foi registrado.
            </p>
          ) : entries.length > 0 ? (
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
          ) : null}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
