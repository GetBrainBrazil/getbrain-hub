import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput, IntegerInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DetailBreadcrumb, DetailShell } from '@/components/crm/CrmDetailShared';
import { StringListEditor } from '@/components/shared/StringListEditor';
import { AcceptanceCriteriaEditor } from '@/components/shared/AcceptanceCriteriaEditor';
import { DealHeader } from '@/components/crm/DealHeader';
import { DealSidebarRich } from '@/components/crm/DealSidebarRich';
import { ZoneCliente } from '@/components/crm/ZoneCliente';
import { ZoneComercial } from '@/components/crm/ZoneComercial';
import { ZoneDependencias } from '@/components/crm/ZoneDependencias';
import { PropostaTabContent } from '@/components/crm/proposta/PropostaTabContent';
import { DealWonDialog } from '@/components/crm/DealWonDialog';
import { PainCategoriesMultiSelect } from '@/components/crm/PainCategoriesMultiSelect';
import { ProjectTypeSelect } from '@/components/crm/ProjectTypeSelect';
import { usePersistedState } from '@/hooks/use-persisted-state';
import {
  ESTIMATION_CONFIDENCE_LABEL, ESTIMATION_CONFIDENCE_OPTIONS, ESTIMATION_CONFIDENCE_COLOR,
  COMPLEXITY_LABEL,
} from '@/constants/dealEnumLabels';
import { useDealByCode, useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { useDeleteDeal, DealDeleteBlockedError } from '@/hooks/crm/useDeals';
import { DeleteDealDialog, DealDangerZoneTrigger } from '@/components/crm/DeleteDealDialog';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCrmCaches } from '@/lib/cacheInvalidation';
import { cn } from '@/lib/utils';
import type {
  AcceptanceCriterion,
  Deal,
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
        <FieldLabel hint="selecione uma ou mais — gerenciadas em Configurações → Pessoas & Empresas">Categorias da dor</FieldLabel>
        <PainCategoriesMultiSelect
          value={deal.pain_categories ?? []}
          onChange={(v) => save({ pain_categories: v } as Partial<Deal>)}
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
  return (
    <ZoneSection id="zona-solucao" number={3} title="Solução & Escopo" hint="O que vamos entregar">
      <div className="space-y-2">
        <FieldLabel hint="tipos gerenciados em Configurações → Pessoas & Empresas">Tipo de projeto</FieldLabel>
        <ProjectTypeSelect
          value={deal.project_type_v2}
          onChange={(v) => save({ project_type_v2: v })}
        />
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

// ---------- Indicador de descoberta completa ----------

function computeCompleteness(deal: Deal): { pct: number; painOk: boolean; solucaoOk: boolean } {
  const hasCategory = (deal.pain_categories?.length ?? 0) > 0 || !!deal.pain_category;
  const painOk = hasCategory && (deal.pain_description?.trim().length ?? 0) >= 40;
  const solucaoOk =
    !!deal.project_type_v2 &&
    (deal.scope_summary?.trim().length ?? 0) >= 40 &&
    ((deal.deliverables?.length ?? 0) >= 3 || (deal.acceptance_criteria?.length ?? 0) >= 3);
  // 2A só conta Dor + Solução (50% cada). Cliente/Comercial entram pelo refinamento posterior.
  const pct = (painOk ? 50 : 0) + (solucaoOk ? 50 : 0);
  return { pct, painOk, solucaoOk };
}

// ---------- Página ----------

export default function CrmDealDetail() {
  const { code } = useParams<{ code: string }>();
  const { data: deal, isLoading } = useDealByCode(code);
  const save = useDealAutosave(deal);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [persistedTab, setPersistedTab] = usePersistedState<string>('crm-deal-active-tab', 'descoberta');
  const activeTab = tabFromUrl ?? persistedTab;
  const [wonDialogOpen, setWonDialogOpen] = useState(false);

  const handleTabChange = (next: string) => {
    setPersistedTab(next);
    const sp = new URLSearchParams(searchParams);
    if (next === 'descoberta') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  const handleCloseRequest = (kind: 'won' | 'lost') => {
    if (kind === 'won') {
      setWonDialogOpen(true);
    } else {
      toast.info('Fechamento como perdido (com motivo) chega no próximo loop.');
    }
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

  const { pct, painOk, solucaoOk } = computeCompleteness(deal);

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

      <DealHeader
        deal={deal}
        completenessPct={pct}
        painOk={painOk}
        solucaoOk={solucaoOk}
        onCloseRequest={handleCloseRequest}
      />

      {/* Layout 70/30 com tabs */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
              <TabsTrigger value="descoberta">Descoberta</TabsTrigger>
              <TabsTrigger value="proposta">Proposta &amp; Anexos</TabsTrigger>
            </TabsList>

            <TabsContent value="descoberta" className="space-y-6 mt-0">
              <ZoneCliente deal={deal} />
              <ZoneDor deal={deal} save={save} />
              <ZoneSolucao deal={deal} save={save} />
              <ZoneDependencias dealId={deal.id} />
              <ZoneComercial deal={deal} />
            </TabsContent>

            <TabsContent value="proposta" className="mt-0">
              <PropostaTabContent deal={deal} onRequestClose={() => setWonDialogOpen(true)} />
            </TabsContent>
          </Tabs>
        </main>

        <DealSidebarRich deal={deal} />
      </div>

      <DealWonDialog
        open={wonDialogOpen}
        onOpenChange={setWonDialogOpen}
        deal={deal}
      />

      <DangerZoneDeal deal={deal} />
    </DetailShell>
  );
}

function DangerZoneDeal({ deal }: { deal: Deal }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteDeal = useDeleteDeal();
  const [open, setOpen] = useState(false);

  const handleConfirm = async (mode: 'safe' | 'cascade') => {
    try {
      const result = await deleteDeal.mutateAsync({ id: deal.id, mode });
      invalidateCrmCaches(qc, { dealId: deal.id, companyId: deal.company_id });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['recorrencias'] });
      if (mode === 'cascade' && result?.project_deleted) {
        toast.success(
          `Deal ${deal.code} e projeto vinculado excluídos. ` +
          `(${result.movimentacoes_deleted} contas, ${result.contracts_deleted} contratos, ${result.recurrences_deleted} recorrências removidos)`,
        );
      } else {
        toast.success(`Deal ${deal.code} excluído.`);
      }
      setOpen(false);
      navigate('/crm/pipeline', { replace: true });
    } catch (err: any) {
      if (err instanceof DealDeleteBlockedError) {
        toast.error(err.message);
      } else {
        toast.error(`Erro ao excluir deal: ${err?.message ?? 'tente novamente'}`);
      }
    }
  };

  return (
    <>
      <DealDangerZoneTrigger onOpen={() => setOpen(true)} loading={deleteDeal.isPending} />
      <DeleteDealDialog
        open={open}
        onOpenChange={setOpen}
        dealId={deal.id}
        dealCode={deal.code}
        dealTitle={deal.title}
        onConfirm={handleConfirm}
      />
    </>
  );
}



