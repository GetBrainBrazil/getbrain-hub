import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput, IntegerInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { DetailBreadcrumb, DetailShell } from '@/components/crm/CrmDetailShared';
import { StringListEditor } from '@/components/shared/StringListEditor';
import { AcceptanceCriteriaEditor } from '@/components/shared/AcceptanceCriteriaEditor';
import { DealHeader } from '@/components/crm/DealHeader';
import { DealSidebarRich } from '@/components/crm/DealSidebarRich';
import { ZoneCliente } from '@/components/crm/ZoneCliente';
import { ZoneComercial } from '@/components/crm/ZoneComercial';
import {
  PAIN_CATEGORY_LABEL, PAIN_CATEGORY_OPTIONS, PAIN_CATEGORY_COLOR,
  PROJECT_TYPE_V2_LABEL, PROJECT_TYPE_V2_OPTIONS, PROJECT_TYPE_V2_COLOR,
  ESTIMATION_CONFIDENCE_LABEL, ESTIMATION_CONFIDENCE_OPTIONS, ESTIMATION_CONFIDENCE_COLOR,
  COMPLEXITY_LABEL,
} from '@/constants/dealEnumLabels';
import { useDealByCode, useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { cn } from '@/lib/utils';
import type {
  AcceptanceCriterion,
  Deal,
  DealPainCategory,
  DealProjectType,
  EstimationConfidence,
} from '@/types/crm';

// ---------- Helpers de UI ----------

function ZoneSection({
  id, number, title, hint, children,
}: { id: string; number: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
      <header className="mb-4 flex items-baseline gap-3 border-b border-border/60 pb-3">
        <span className="font-mono text-xs text-muted-foreground">0{number}</span>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

function ChipGroup<T extends string>({
  options, value, onChange, labels, colors, allowClear = true,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
  labels: Record<T, string>;
  colors?: Record<T, string>;
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active && allowClear ? null : o)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
              active
                ? cn(
                    colors?.[o] ?? 'bg-accent/20 text-accent border-accent',
                    'font-semibold ring-2 ring-accent/40 ring-offset-1 ring-offset-background shadow-sm',
                  )
                : 'border-border bg-muted/20 text-muted-foreground hover:border-accent/40 hover:text-foreground hover:bg-muted/40',
            )}
          >
            {active && <Check className="h-3 w-3" strokeWidth={3} />}
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Auto-save inline com optimistic local ----------

function useDealAutosave(deal: Deal | null | undefined) {
  const update = useUpdateDealField(deal?.code);
  return (updates: Partial<Deal>) => {
    if (!deal) return;
    update.mutate(
      { id: deal.id, updates },
      {
        onError: (err: any) => {
          toast.error(`Erro ao salvar: ${err?.message ?? 'tente novamente'}`);
        },
      },
    );
  };
}

// ---------- Inline editors específicos ----------

function InlineText({
  value, onSave, placeholder, multiline = false, minHeight,
}: { value: string | null; onSave: (v: string | null) => void; placeholder?: string; multiline?: boolean; minHeight?: number }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);
  const commit = () => {
    const trimmed = local.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next !== (value ?? null)) onSave(next);
  };
  if (multiline) {
    return (
      <Textarea
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        style={minHeight ? { minHeight } : undefined}
        className="resize-none bg-background/60"
      />
    );
  }
  return (
    <Input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
      className="bg-background/60"
    />
  );
}

function InlineMoney({
  value, onSave, placeholder,
}: { value: number | null; onSave: (v: number | null) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value === null ? '' : String(value));
  useEffect(() => { setLocal(value === null ? '' : String(value)); }, [value]);
  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === '') {
      if (value !== null) onSave(null);
      return;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n) && n !== value) onSave(n);
  };
  return (
    <CurrencyInput
      value={local}
      onValueChange={setLocal}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      withPrefix
    />
  );
}

function InlineInteger({
  value, onSave, placeholder, suffix,
}: { value: number | null; onSave: (v: number | null) => void; placeholder?: string; suffix?: string }) {
  const [local, setLocal] = useState(value === null ? '' : String(value));
  useEffect(() => { setLocal(value === null ? '' : String(value)); }, [value]);
  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === '') {
      if (value !== null) onSave(null);
      return;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n) && n !== value) onSave(n);
  };
  return (
    <div className="flex items-center rounded-md border border-input bg-background/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      <IntegerInput
        value={local}
        onValueChange={setLocal}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
        placeholder={placeholder}
        withSeparator
        className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {suffix && <span className="pr-2.5 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

// ---------- Zona 2 — Dor ----------

function ZoneDor({ deal, save }: { deal: Deal; save: (u: Partial<Deal>) => void }) {
  const painPlaceholder = `Descreva a dor com profundidade. Tente cobrir:
1. O que acontece hoje (o problema concreto)?
2. Quem sente — qual área/pessoa?
3. Qual o impacto (dinheiro, tempo, churn, retrabalho)?
4. O que já tentaram fazer pra resolver?`;

  return (
    <ZoneSection id="zona-dor" number={2} title="Dor & Contexto" hint="O problema que justifica o projeto">
      <div className="space-y-2">
        <FieldLabel>Categoria da dor</FieldLabel>
        <ChipGroup<DealPainCategory>
          options={PAIN_CATEGORY_OPTIONS}
          value={deal.pain_category}
          onChange={(v) => save({ pain_category: v })}
          labels={PAIN_CATEGORY_LABEL}
          colors={PAIN_CATEGORY_COLOR}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel hint="seja específico — vagueza vira escopo ruim">Descrição da dor</FieldLabel>
        <InlineText
          value={deal.pain_description}
          onSave={(v) => save({ pain_description: v })}
          placeholder={painPlaceholder}
          multiline
          minHeight={140}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel hint="estimativa do cliente, ok ser aproximado">Custo da dor (R$/mês)</FieldLabel>
          <InlineMoney
            value={deal.pain_cost_brl_monthly}
            onSave={(v) => save({ pain_cost_brl_monthly: v })}
            placeholder="R$ 0,00"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Horas perdidas (h/mês)</FieldLabel>
          <InlineInteger
            value={deal.pain_hours_monthly}
            onSave={(v) => save({ pain_hours_monthly: v })}
            placeholder="0"
            suffix="h"
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel hint="planilha, sistema legado, processo manual...">Solução atual / workaround</FieldLabel>
        <InlineText
          value={deal.current_solution}
          onSave={(v) => save({ current_solution: v })}
          placeholder="O que usam hoje pra mitigar essa dor?"
          multiline
          minHeight={80}
        />
      </div>
    </ZoneSection>
  );
}

// ---------- Zona 3 — Solução ----------

function ZoneSolucao({ deal, save }: { deal: Deal; save: (u: Partial<Deal>) => void }) {
  const isOutro = deal.project_type_v2 === 'outro';

  return (
    <ZoneSection id="zona-solucao" number={3} title="Solução & Escopo" hint="O que vamos entregar">
      <div className="space-y-2">
        <FieldLabel>Tipo de projeto</FieldLabel>
        <ChipGroup<DealProjectType>
          options={PROJECT_TYPE_V2_OPTIONS}
          value={deal.project_type_v2}
          onChange={(v) => save({ project_type_v2: v, project_type_custom: v === 'outro' ? deal.project_type_custom : null })}
          labels={PROJECT_TYPE_V2_LABEL}
          colors={PROJECT_TYPE_V2_COLOR}
        />
        {isOutro && (
          <div className="pt-2">
            <InlineText
              value={deal.project_type_custom}
              onSave={(v) => save({ project_type_custom: v })}
              placeholder="Descreva o tipo de projeto..."
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel hint="contexto de negócio que ajuda a entender o porquê">Contexto de negócio</FieldLabel>
        <InlineText
          value={deal.business_context}
          onSave={(v) => save({ business_context: v })}
          placeholder="Qual o momento da empresa, prioridade estratégica, o que muda quando isso for entregue..."
          multiline
          minHeight={100}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel hint="resumo curto, 1-3 parágrafos">Resumo do escopo</FieldLabel>
        <InlineText
          value={deal.scope_summary}
          onSave={(v) => save({ scope_summary: v })}
          placeholder="Em poucas linhas: o que o sistema/automação vai fazer."
          multiline
          minHeight={100}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>Escopo IN</FieldLabel>
          <InlineText
            value={deal.scope_in}
            onSave={(v) => save({ scope_in: v })}
            placeholder="O que está dentro do escopo, item por item ou em parágrafo."
            multiline
            minHeight={120}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel hint="protege contra escopo creep">Escopo OUT</FieldLabel>
          <InlineText
            value={deal.scope_out}
            onSave={(v) => save({ scope_out: v })}
            placeholder="O que NÃO está incluso. Seja explícito."
            multiline
            minHeight={120}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Entregáveis</FieldLabel>
        <StringListEditor
          value={deal.deliverables ?? []}
          onChange={(next) => save({ deliverables: next })}
          placeholder="Ex: API REST documentada, dashboard de métricas..."
          emptyHint="Nenhum entregável listado. Clique pra adicionar o primeiro."
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Premissas</FieldLabel>
        <StringListEditor
          value={deal.premises ?? []}
          onChange={(next) => save({ premises: next })}
          placeholder="Ex: Cliente fornece acesso ao sistema X até a kickoff..."
          emptyHint="Nenhuma premissa. Liste o que assumimos ser verdade pro projeto rodar."
        />
      </div>

      <div className="space-y-2">
        <FieldLabel hint="quando o cliente vai poder dizer 'tá pronto'">Critérios de aceite</FieldLabel>
        <AcceptanceCriteriaEditor
          value={(deal.acceptance_criteria ?? []) as AcceptanceCriterion[]}
          onChange={(next) => save({ acceptance_criteria: next })}
          emptyHint="Nenhum critério definido. Cada item descreve um teste de pronto."
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Riscos identificados</FieldLabel>
        <StringListEditor
          value={deal.identified_risks ?? []}
          onChange={(next) => save({ identified_risks: next })}
          placeholder="Ex: Dependência de API externa instável, time pequeno..."
          emptyHint="Nenhum risco listado. Listar agora ajuda a precificar com mais segurança."
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Stack técnico previsto</FieldLabel>
        <StringListEditor
          value={deal.technical_stack ?? []}
          onChange={(next) => save({ technical_stack: next })}
          placeholder="Ex: Next.js, Supabase, n8n..."
          emptyHint="Nenhuma tecnologia listada."
        />
      </div>

      <div className="rounded-md border border-border/60 bg-background/40 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimativa grossa</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel>Horas totais</FieldLabel>
            <InlineInteger
              value={deal.estimated_hours_total}
              onSave={(v) => save({ estimated_hours_total: v })}
              placeholder="0"
              suffix="h"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Complexidade</FieldLabel>
            <ComplexitySlider
              value={deal.estimated_complexity}
              onSave={(v) => save({ estimated_complexity: v })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Confiança</FieldLabel>
            <ChipGroup<EstimationConfidence>
              options={ESTIMATION_CONFIDENCE_OPTIONS}
              value={deal.estimation_confidence}
              onChange={(v) => save({ estimation_confidence: v })}
              labels={ESTIMATION_CONFIDENCE_LABEL}
              colors={ESTIMATION_CONFIDENCE_COLOR}
            />
          </div>
        </div>
      </div>
    </ZoneSection>
  );
}

function ComplexitySlider({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [local, setLocal] = useState<number>(value ?? 3);
  useEffect(() => { setLocal(value ?? 3); }, [value]);
  return (
    <div className="rounded-md border border-input bg-background/60 px-3 py-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-lg font-semibold text-accent">{local}</span>
        <span className="text-[11px] text-muted-foreground">{COMPLEXITY_LABEL[local]}</span>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[local]}
        onValueChange={([v]) => setLocal(v)}
        onValueCommit={([v]) => onSave(v)}
      />
    </div>
  );
}

// ---------- Placeholder das zonas que vêm no 2B/2C ----------

function ZonePlaceholder({
  id, number, title, loop,
}: { id: string; number: number; title: string; loop: '2B' | '2C' }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-dashed border-border/60 bg-card/10 p-5">
      <header className="mb-2 flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground">0{number}</span>
        <h2 className="text-base font-semibold tracking-tight text-muted-foreground">{title}</h2>
      </header>
      <div className="flex items-center gap-3 rounded-md bg-background/30 p-4 text-sm text-muted-foreground">
        <Construction className="h-4 w-4 shrink-0" />
        <span>Em construção — chega no Loop {loop}.</span>
      </div>
    </section>
  );
}

// ---------- Sidebar mínima 30% ----------

function DealSidebarBasic({ deal }: { deal: Deal }) {
  const zones = [
    { id: 'zona-cliente', n: 1, label: 'Cliente', loop: '2B' as const, ready: false },
    { id: 'zona-dor', n: 2, label: 'Dor', loop: '2A' as const, ready: true },
    { id: 'zona-solucao', n: 3, label: 'Solução', loop: '2A' as const, ready: true },
    { id: 'zona-dependencias', n: 4, label: 'Dependências', loop: '2C' as const, ready: false },
    { id: 'zona-comercial', n: 5, label: 'Comercial', loop: '2B' as const, ready: false },
  ];
  return (
    <aside className="space-y-4">
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navegação</h3>
        <nav className="space-y-1">
          {zones.map((z) => (
            <a
              key={z.id}
              href={`#${z.id}`}
              className={cn(
                'flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors',
                z.ready ? 'text-foreground hover:bg-muted/40' : 'text-muted-foreground hover:bg-muted/20',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">0{z.n}</span>
                {z.label}
              </span>
              {!z.ready && <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{z.loop}</span>}
            </a>
          ))}
        </nav>
      </div>

      <div className="rounded-lg border border-border bg-card/30 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo rápido</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Empresa</dt>
            <dd className="text-right font-medium">{deal.company?.trade_name || deal.company?.legal_name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="text-right">{deal.owner?.display_name ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="text-right font-mono">{formatCurrency(Number(deal.estimated_value ?? 0))}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Probabilidade</dt>
            <dd className="text-right font-mono">{deal.probability_pct}%</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
          Sidebar rica (atividades, owner editável, lead origem) chega no Loop 2B.
        </p>
      </div>
    </aside>
  );
}

// ---------- Indicador de descoberta completa ----------

function computeCompleteness(deal: Deal): { pct: number; painOk: boolean; solucaoOk: boolean } {
  // Dor "ok" = categoria + descrição com ≥40 chars
  const painOk = !!deal.pain_category && (deal.pain_description?.trim().length ?? 0) >= 40;
  // Solução "ok" = project_type_v2 + scope_summary ≥40 chars + ≥3 deliverables OU ≥3 acceptance_criteria
  const solucaoOk =
    !!deal.project_type_v2 &&
    (deal.scope_summary?.trim().length ?? 0) >= 40 &&
    ((deal.deliverables?.length ?? 0) >= 3 || (deal.acceptance_criteria?.length ?? 0) >= 3);
  // 2A só conta Dor + Solução (50% cada). Outras zonas entram no 2B/2C.
  const pct = (painOk ? 50 : 0) + (solucaoOk ? 50 : 0);
  return { pct, painOk, solucaoOk };
}

function CompletenessBadge({ deal }: { deal: Deal }) {
  const { pct, painOk, solucaoOk } = useMemo(() => computeCompleteness(deal), [deal]);
  const tone = pct === 100 ? 'border-success/40 bg-success/10 text-success'
    : pct >= 50 ? 'border-warning/40 bg-warning/10 text-warning'
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

// ---------- Página ----------

export default function CrmDealDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDealByCode(code);
  const update = useUpdateDealField(code);
  const save = useDealAutosave(deal);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (deal) setTitle(deal.title);
  }, [deal?.id, deal?.title]);

  const saveTitle = () => {
    if (!deal) return;
    const trimmed = title.trim();
    if (trimmed && trimmed !== deal.title) {
      update.mutate(
        { id: deal.id, updates: { title: trimmed } },
        { onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falhou'}`) },
      );
    } else {
      setTitle(deal.title);
    }
    setEditingTitle(false);
  };

  const stageChange = (s: DealStage) => {
    if (!deal) return;
    if (s === 'fechado_ganho' || s === 'fechado_perdido') {
      toast.info('Fechamento de deal chega no Loop 2B (cabeçalho denso com botões dedicados).');
      return;
    }
    update.mutate({
      id: deal.id,
      updates: { stage: s, probability_pct: DEAL_STAGE_PROBABILITY[s], closed_at: null },
    });
  };

  if (isLoading) {
    return (
      <DetailShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </DetailShell>
    );
  }

  if (!deal) {
    return (
      <DetailShell>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-semibold">Deal não encontrado</h1>
          <Button asChild className="mt-4">
            <Link to="/crm/pipeline">Voltar</Link>
          </Button>
        </div>
      </DetailShell>
    );
  }

  return (
    <DetailShell>
      <DetailBreadcrumb
        closeTo="/crm/pipeline"
        items={[
          { label: 'CRM', to: '/crm/pipeline' },
          { label: 'Pipeline', to: '/crm/pipeline' },
          { label: deal.code },
        ]}
      />

      {/* Cabeçalho rudimentar — denso vem no 2B */}
      <header className="mb-6 space-y-4 rounded-lg border border-border bg-card/30 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono font-semibold text-muted-foreground">{deal.code}</span>
          <InfoBadge>
            <Link to={`/crm/empresas/${deal.company_id}`}>
              {deal.company?.trade_name || deal.company?.legal_name}
            </Link>
          </InfoBadge>
          {deal.project_type_v2 && (
            <InfoBadge className={PROJECT_TYPE_V2_COLOR[deal.project_type_v2]}>
              {PROJECT_TYPE_V2_LABEL[deal.project_type_v2]}
            </InfoBadge>
          )}
          <div className="ml-auto">
            <CompletenessBadge deal={deal} />
          </div>
        </div>

        {editingTitle ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') { setTitle(deal.title); setEditingTitle(false); }
            }}
            className="h-auto bg-background/60 text-2xl font-semibold"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="cursor-text text-2xl font-semibold text-foreground hover:text-accent transition-colors"
          >
            {deal.title}
          </h1>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span><span className="text-foreground font-mono">{formatCurrency(Number(deal.estimated_value ?? 0))}</span> estimado</span>
          <span><span className="text-foreground font-mono">{deal.probability_pct}%</span> probabilidade</span>
          {deal.expected_close_date && (
            <span>fecha em <span className="text-foreground">{new Date(`${deal.expected_close_date}T12:00:00`).toLocaleDateString('pt-BR')}</span></span>
          )}
        </div>

        <StageStepper stage={deal.stage} onChange={stageChange} />
      </header>

      {/* Layout 70/30 com âncoras */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-6">
          <ZonePlaceholder id="zona-cliente" number={1} title="Cliente & Empresa" loop="2B" />
          <ZoneDor deal={deal} save={save} />
          <ZoneSolucao deal={deal} save={save} />
          <ZonePlaceholder id="zona-dependencias" number={4} title="Dependências" loop="2C" />
          <ZonePlaceholder id="zona-comercial" number={5} title="Comercial & Decisão" loop="2B" />
        </main>

        <DealSidebarBasic deal={deal} />
      </div>
    </DetailShell>
  );
}
