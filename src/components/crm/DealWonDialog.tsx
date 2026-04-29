import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, Trash2, ArrowRight, ArrowLeft,
  Repeat, Percent, Wallet, FolderOpen, Banknote,
  ClipboardCheck, AlertTriangle, CheckCircle2, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ComboboxCreate, type ComboOption } from '@/components/crm/ComboboxCreate';
import { ProjectTypeSelect } from '@/components/crm/ProjectTypeSelect';
import { PainCategoriesMultiSelect } from '@/components/crm/PainCategoriesMultiSelect';
import { supabase } from '@/integrations/supabase/client';
import { calculateScopeTotal, formatBRL, type ScopeItem } from '@/lib/orcamentos/calculateTotal';
import type { Deal } from '@/types/crm';
import { cn } from '@/lib/utils';

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  onSuccess?: (projectId: string) => void;
}

interface ProposalLite {
  id: string;
  code: string;
  status: string;
  scope_items: ScopeItem[];
  maintenance_monthly_value: number | null;
}

interface InstallmentDraft {
  id: string;
  amount: string;
  due_date: string;
}

interface ExtraCostDraft {
  id: string;
  description: string;
  amount: string;
  recurrence: 'once' | 'monthly' | 'yearly';
  notes: string;
  // categorização opcional por item
  categoria_id?: string;
  centro_custo_id?: string;
  conta_bancaria_id?: string;
  meio_pagamento_id?: string;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmtDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildInstallments(n: number, firstDueDate: string, baseAmount: number): InstallmentDraft[] {
  const safeN = Math.min(60, Math.max(1, Math.floor(n) || 1));
  const base = baseAmount > 0 ? baseAmount : 0;
  const per = base > 0 ? Math.round((base / safeN) * 100) / 100 : 0;
  const remainder = base > 0 ? Math.round((base - per * safeN) * 100) / 100 : 0;
  const start = firstDueDate ? new Date(`${firstDueDate}T12:00:00`) : addMonths(new Date(), 1);
  const list: InstallmentDraft[] = [];
  for (let i = 0; i < safeN; i++) {
    const amount = i === 0 ? per + remainder : per;
    const date = i === 0 ? start : addMonths(start, i);
    list.push({
      id: newId(),
      amount: amount > 0 ? String(amount) : '',
      due_date: fmtDateInput(date),
    });
  }
  return list;
}

type Option = { id: string; nome: string };

const FIN_DEFAULTS_KEY_IMPL = 'crm.lastWonFinancialDefaults.implementation';
const FIN_DEFAULTS_KEY_MRR = 'crm.lastWonFinancialDefaults.mrr';
const FIN_DEFAULTS_KEY_LEGACY = 'crm.lastWonFinancialDefaults';

interface FinDefaults {
  categoria_id?: string;
  centro_custo_id?: string;
  conta_bancaria_id?: string;
  meio_pagamento_id?: string;
}

function loadDefaults(key: string): FinDefaults {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function saveDefaults(key: string, def: FinDefaults) {
  try { localStorage.setItem(key, JSON.stringify(def)); } catch {}
}

const RECURRENCE_LABEL: Record<ExtraCostDraft['recurrence'], string> = {
  once: 'Uma vez',
  monthly: 'Mensal',
  yearly: 'Anual',
};

function toComboOptions(list: Option[]): ComboOption[] {
  return list.map((o) => ({ value: o.id, label: o.nome }));
}

function findByName(list: Option[], regex: RegExp): string | undefined {
  return list.find((o) => regex.test(o.nome))?.id;
}

// ============================================================
// Card reutilizável de categorização financeira
// ============================================================
interface FinCardProps {
  title: string;
  subtitle?: string;
  hint?: string;
  tone?: 'income' | 'expense';
  categoriaId: string; setCategoriaId: (v: string) => void;
  centroId: string; setCentroId: (v: string) => void;
  contaId: string; setContaId: (v: string) => void;
  meioId: string; setMeioId: (v: string) => void;
  categorias: Option[];
  centros: Option[];
  contas: Option[];
  meios: Option[];
  onCreateCategoria: (name: string) => Promise<void>;
  onCreateCentro: (name: string) => Promise<void>;
  onCreateConta: (name: string) => Promise<void>;
  onCreateMeio: (name: string) => Promise<void>;
}

function FinanceCategorizationCard(p: FinCardProps) {
  const accent = p.tone === 'expense' ? 'border-destructive/30' : 'border-primary/30';
  return (
    <div className={cn('rounded-lg border bg-muted/10 p-3 space-y-2', accent)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            {p.title}
          </div>
          {p.subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{p.subtitle}</p>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Categoria {p.tone === 'expense' ? 'de despesa' : 'de receita'}
          </Label>
          <ComboboxCreate
            value={p.categoriaId}
            options={toComboOptions(p.categorias)}
            onChange={p.setCategoriaId}
            onCreate={p.onCreateCategoria}
            placeholder="Selecionar ou digitar para criar…"
            searchPlaceholder="Buscar ou digitar para criar…"
            createLabel={(t) => `+ Criar categoria "${t}"`}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Centro de custo</Label>
          <ComboboxCreate
            value={p.centroId}
            options={toComboOptions(p.centros)}
            onChange={p.setCentroId}
            onCreate={p.onCreateCentro}
            placeholder="Selecionar ou digitar para criar…"
            searchPlaceholder="Buscar ou digitar para criar…"
            createLabel={(t) => `+ Criar centro "${t}"`}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Conta bancária</Label>
          <ComboboxCreate
            value={p.contaId}
            options={toComboOptions(p.contas)}
            onChange={p.setContaId}
            onCreate={p.onCreateConta}
            placeholder="Selecionar ou digitar para criar…"
            searchPlaceholder="Buscar ou digitar para criar…"
            createLabel={(t) => `+ Criar conta "${t}"`}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Meio de pagamento</Label>
          <ComboboxCreate
            value={p.meioId}
            options={toComboOptions(p.meios)}
            onChange={p.setMeioId}
            onCreate={p.onCreateMeio}
            placeholder="Selecionar ou digitar para criar…"
            searchPlaceholder="Buscar ou digitar para criar…"
            createLabel={(t) => `+ Criar meio "${t}"`}
          />
        </div>
      </div>
      {p.hint && <p className="text-[11px] text-muted-foreground">{p.hint}</p>}
    </div>
  );
}

// ============================================================
// Componente principal
// ============================================================
export function DealWonDialog({ open, onOpenChange, deal, onSuccess }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [acceptedProposal, setAcceptedProposal] = useState<ProposalLite | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  // Wizard
  const [step, setStep] = useState<'projeto' | 'receita' | 'custos' | 'revisao'>('projeto');

  // Projeto
  const [projectName, setProjectName] = useState(deal?.title ?? '');
  const [projectTypeSlugs, setProjectTypeSlugs] = useState<string[]>(deal?.project_type_v2 ?? []);
  const [painCategorySlugs, setPainCategorySlugs] = useState<string[]>(
    deal?.pain_categories ?? (deal?.pain_category ? [deal.pain_category] : []),
  );
  const [startDate, setStartDate] = useState<string>(
    deal?.desired_start_date ?? fmtDateInput(new Date()),
  );
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    deal?.desired_delivery_date ?? '',
  );

  // Parcelas
  const [installmentsN, setInstallmentsN] = useState<string>('1');
  const [firstDueDate, setFirstDueDate] = useState<string>(fmtDateInput(addMonths(new Date(), 1)));
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { id: newId(), amount: '', due_date: fmtDateInput(addMonths(new Date(), 1)) },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Listas financeiras
  const [categoriasReceita, setCategoriasReceita] = useState<Option[]>([]);
  const [categoriasDespesa, setCategoriasDespesa] = useState<Option[]>([]);
  const [centros, setCentros] = useState<Option[]>([]);
  const [contas, setContas] = useState<Option[]>([]);
  const [meios, setMeios] = useState<Option[]>([]);

  // Categorização — implementação
  const [implCategoriaId, setImplCategoriaId] = useState<string>('');
  const [implCentroId, setImplCentroId] = useState<string>('');
  const [implContaId, setImplContaId] = useState<string>('');
  const [implMeioId, setImplMeioId] = useState<string>('');

  // Categorização — MRR (separada da implementação)
  const [mrrCategoriaId, setMrrCategoriaId] = useState<string>('');
  const [mrrCentroId, setMrrCentroId] = useState<string>('');
  const [mrrContaId, setMrrContaId] = useState<string>('');
  const [mrrMeioId, setMrrMeioId] = useState<string>('');

  // Categorização — padrão para custos extras
  const [extraCategoriaId, setExtraCategoriaId] = useState<string>('');
  const [extraCentroId, setExtraCentroId] = useState<string>('');
  const [extraContaId, setExtraContaId] = useState<string>('');
  const [extraMeioId, setExtraMeioId] = useState<string>('');

  // MRR / Manutenção
  const [mrrEnabled, setMrrEnabled] = useState(false);
  const [mrrValue, setMrrValue] = useState<string>('');
  const [mrrStartDate, setMrrStartDate] = useState<string>('');
  const [mrrIndefinite, setMrrIndefinite] = useState(true);
  const [mrrDuration, setMrrDuration] = useState<string>('12');
  const [mrrDiscountEnabled, setMrrDiscountEnabled] = useState(false);
  const [mrrDiscountMonths, setMrrDiscountMonths] = useState<string>('3');
  const [mrrDiscountValue, setMrrDiscountValue] = useState<string>('');
  const [mrrDiscountKind, setMrrDiscountKind] = useState<'months' | 'until_date' | 'until_stage'>('months');
  const [mrrDiscountUntilDate, setMrrDiscountUntilDate] = useState<string>('');
  const [mrrDiscountUntilStage, setMrrDiscountUntilStage] = useState<string>('');
  const [mrrStartTrigger, setMrrStartTrigger] = useState<'on_delivery' | 'before_delivery' | ''>('');

  // Desconto promocional (sobre implementação)
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountKind, setDiscountKind] = useState<'percent' | 'fixed'>('percent');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [discountValidUntil, setDiscountValidUntil] = useState<string>('');
  const [discountNotes, setDiscountNotes] = useState<string>('');

  // Custos extras
  const [extraCosts, setExtraCosts] = useState<ExtraCostDraft[]>([]);

  // ============== Loaders ==============
  useEffect(() => {
    if (!open || !deal) return;
    let cancelled = false;
    (async () => {
      setLoadingProposal(true);
      // Aceita qualquer proposta vinculada (rascunho/enviada/convertida).
      // A promoção para 'convertida' acontece no fechamento.
      // Prioriza convertida > enviada > rascunho, depois mais recente.
      const { data } = await sb
        .from('proposals')
        .select('id, code, status, scope_items, maintenance_monthly_value')
        .eq('deal_id', deal.id)
        .is('deleted_at', null)
        .in('status', ['convertida', 'enviada', 'rascunho'])
        .order('created_at', { ascending: false });
      const rows = (data ?? []) as ProposalLite[];
      const pick =
        rows.find((r) => r.status === 'convertida') ??
        rows.find((r) => r.status === 'enviada') ??
        rows.find((r) => r.status === 'rascunho') ??
        null;
      if (cancelled) return;
      setAcceptedProposal(pick);
      setLoadingProposal(false);
    })();
    return () => { cancelled = true; };
  }, [open, deal?.id]);

  async function reloadFinanceLists(selectAfterCreate?: { kind: 'cat-receita' | 'cat-despesa' | 'centro' | 'conta' | 'meio'; id: string; group?: 'impl' | 'mrr' | 'extra' }) {
    const [catsRec, catsDesp, ccs, cbs, mps] = await Promise.all([
      sb.from('categorias').select('id, nome').eq('ativo', true).eq('tipo', 'receitas').order('nome'),
      sb.from('categorias').select('id, nome').eq('ativo', true).eq('tipo', 'despesas').order('nome'),
      sb.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
      sb.from('contas_bancarias').select('id, nome').eq('ativo', true).order('nome'),
      sb.from('meios_pagamento').select('id, nome').eq('ativo', true).order('nome'),
    ]);
    const recList = (catsRec.data ?? []) as Option[];
    const despList = (catsDesp.data ?? []) as Option[];
    const ccList = (ccs.data ?? []) as Option[];
    const cbList = (cbs.data ?? []) as Option[];
    const mpList = (mps.data ?? []) as Option[];
    setCategoriasReceita(recList);
    setCategoriasDespesa(despList);
    setCentros(ccList);
    setContas(cbList);
    setMeios(mpList);

    if (selectAfterCreate) {
      const grp = selectAfterCreate.group ?? 'impl';
      if (selectAfterCreate.kind === 'cat-receita') {
        if (grp === 'impl') setImplCategoriaId(selectAfterCreate.id);
        if (grp === 'mrr') setMrrCategoriaId(selectAfterCreate.id);
      }
      if (selectAfterCreate.kind === 'cat-despesa') setExtraCategoriaId(selectAfterCreate.id);
      if (selectAfterCreate.kind === 'centro') {
        if (grp === 'impl') setImplCentroId(selectAfterCreate.id);
        if (grp === 'mrr') setMrrCentroId(selectAfterCreate.id);
        if (grp === 'extra') setExtraCentroId(selectAfterCreate.id);
      }
      if (selectAfterCreate.kind === 'conta') {
        if (grp === 'impl') setImplContaId(selectAfterCreate.id);
        if (grp === 'mrr') setMrrContaId(selectAfterCreate.id);
        if (grp === 'extra') setExtraContaId(selectAfterCreate.id);
      }
      if (selectAfterCreate.kind === 'meio') {
        if (grp === 'impl') setImplMeioId(selectAfterCreate.id);
        if (grp === 'mrr') setMrrMeioId(selectAfterCreate.id);
        if (grp === 'extra') setExtraMeioId(selectAfterCreate.id);
      }
      return;
    }

    // Defaults — implementação (com migração do legado)
    const implDef = loadDefaults(FIN_DEFAULTS_KEY_IMPL);
    const legacyDef = loadDefaults(FIN_DEFAULTS_KEY_LEGACY);
    const implSource: FinDefaults = Object.keys(implDef).length ? implDef : legacyDef;
    setImplCategoriaId(implSource.categoria_id && recList.find((x) => x.id === implSource.categoria_id) ? implSource.categoria_id : '');
    setImplCentroId(implSource.centro_custo_id && ccList.find((x) => x.id === implSource.centro_custo_id) ? implSource.centro_custo_id : '');
    setImplContaId(implSource.conta_bancaria_id && cbList.find((x) => x.id === implSource.conta_bancaria_id) ? implSource.conta_bancaria_id : '');
    setImplMeioId(implSource.meio_pagamento_id && mpList.find((x) => x.id === implSource.meio_pagamento_id) ? implSource.meio_pagamento_id : '');

    // Defaults — MRR (sugere categoria com "MRR"/"Manutenção"/"Recorrente" se não houver default salvo)
    const mrrDef = loadDefaults(FIN_DEFAULTS_KEY_MRR);
    const mrrCatSuggest = findByName(recList, /\b(mrr|manuten[çc][aã]o|recorrente)\b/i);
    setMrrCategoriaId(mrrDef.categoria_id && recList.find((x) => x.id === mrrDef.categoria_id) ? mrrDef.categoria_id : (mrrCatSuggest ?? ''));
    setMrrCentroId(mrrDef.centro_custo_id && ccList.find((x) => x.id === mrrDef.centro_custo_id) ? mrrDef.centro_custo_id : '');
    setMrrContaId(mrrDef.conta_bancaria_id && cbList.find((x) => x.id === mrrDef.conta_bancaria_id) ? mrrDef.conta_bancaria_id : '');
    setMrrMeioId(mrrDef.meio_pagamento_id && mpList.find((x) => x.id === mrrDef.meio_pagamento_id) ? mrrDef.meio_pagamento_id : '');

    // Defaults — extras: vazios (usuário escolhe). Conta/meio podem ser sugeridos da implementação.
    setExtraCategoriaId('');
    setExtraCentroId('');
    setExtraContaId('');
    setExtraMeioId('');
  }

  useEffect(() => {
    if (!open) return;
    setStep('projeto');
    reloadFinanceLists();
  }, [open]);

  // ============== Pré-preencher do deal ==============
  const proposalTotal = useMemo(
    () => (acceptedProposal ? calculateScopeTotal(acceptedProposal.scope_items ?? []) : 0),
    [acceptedProposal],
  );

  const baseImplementation = useMemo(() => {
    if (proposalTotal > 0) return proposalTotal;
    return Number(deal?.estimated_implementation_value ?? deal?.estimated_value ?? 0);
  }, [proposalTotal, deal]);

  useEffect(() => {
    if (!open || !deal) return;

    setProjectName(deal.title);
    setProjectTypeSlugs(deal.project_type_v2 ?? []);
    setPainCategorySlugs(deal.pain_categories ?? (deal.pain_category ? [deal.pain_category] : []));
    setStartDate(deal.desired_start_date ?? fmtDateInput(new Date()));
    setEstimatedDelivery(deal.desired_delivery_date ?? '');

    const dealN = (deal as any).installments_count as number | null;
    const dealFirst = (deal as any).first_installment_date as string | null;
    const initialN = dealN && dealN > 0 ? dealN : 1;
    const initialFirst = dealFirst || fmtDateInput(addMonths(new Date(), 1));
    setInstallmentsN(String(initialN));
    setFirstDueDate(initialFirst);
    setInstallments(buildInstallments(initialN, initialFirst, baseImplementation));

    const dealMrr = Number(deal.estimated_mrr_value ?? 0);
    setMrrEnabled(dealMrr > 0);
    setMrrValue(dealMrr > 0 ? String(dealMrr) : '');
    setMrrStartDate((deal as any).mrr_start_date ?? '');
    const dur = (deal as any).mrr_duration_months;
    setMrrIndefinite(dur == null);
    setMrrDuration(dur != null ? String(dur) : '12');
    const dMonths = (deal as any).mrr_discount_months;
    const dValue = (deal as any).mrr_discount_value;
    const dKind = (deal as any).mrr_discount_kind as 'months' | 'until_date' | 'until_stage' | null;
    const dUntilDate = (deal as any).mrr_discount_until_date as string | null;
    const dUntilStage = (deal as any).mrr_discount_until_stage as string | null;
    setMrrDiscountEnabled(
      (dMonths != null && dMonths > 0) ||
      Boolean(dUntilDate) || Boolean(dUntilStage) || (dValue != null && dValue > 0),
    );
    setMrrDiscountKind(dKind ?? 'months');
    setMrrDiscountMonths(dMonths != null ? String(dMonths) : '3');
    setMrrDiscountValue(dValue != null ? String(dValue) : '');
    setMrrDiscountUntilDate(dUntilDate ?? '');
    setMrrDiscountUntilStage(dUntilStage ?? '');
    setMrrStartTrigger(((deal as any).mrr_start_trigger as 'on_delivery' | 'before_delivery' | null) ?? '');

    const dAmount = (deal as any).discount_amount;
    setDiscountEnabled(dAmount != null && dAmount > 0);
    setDiscountKind(((deal as any).discount_kind as 'percent' | 'fixed') ?? 'percent');
    setDiscountAmount(dAmount != null ? String(dAmount) : '');
    setDiscountValidUntil((deal as any).discount_valid_until ?? '');
    setDiscountNotes((deal as any).discount_notes ?? '');

    const ec = ((deal as any).extra_costs ?? []) as Array<any>;
    setExtraCosts(
      Array.isArray(ec)
        ? ec.map((e) => ({
            id: newId(),
            description: e.description ?? '',
            amount: e.amount != null ? String(e.amount) : '',
            recurrence: (e.recurrence as ExtraCostDraft['recurrence']) ?? 'once',
            notes: e.notes ?? '',
            categoria_id: e.categoria_id ?? undefined,
            centro_custo_id: e.centro_custo_id ?? undefined,
            conta_bancaria_id: e.conta_bancaria_id ?? undefined,
            meio_pagamento_id: e.meio_pagamento_id ?? undefined,
          }))
        : [],
    );
  }, [open, deal?.id, baseImplementation]);

  // ============== Cálculos ==============
  const totalInstallments = installments.reduce(
    (sum, i) => sum + (Number(i.amount) || 0),
    0,
  );

  const discountValue = useMemo(() => {
    if (!discountEnabled) return 0;
    const v = Number(discountAmount) || 0;
    if (discountKind === 'percent') return (baseImplementation * v) / 100;
    return v;
  }, [discountEnabled, discountAmount, discountKind, baseImplementation]);

  const expectedTotal = Math.max(baseImplementation - discountValue, 0);
  const installmentsMatchExpected =
    expectedTotal > 0 ? Math.abs(totalInstallments - expectedTotal) < 0.01 : true;

  const monthlyExtras = extraCosts
    .filter((e) => e.recurrence === 'monthly')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const mrrDiscountInvalid =
    mrrEnabled && mrrDiscountEnabled &&
    Number(mrrDiscountValue) > 0 && Number(mrrDiscountValue) >= Number(mrrValue);

  // ============== Ações de parcelas ==============
  function addInstallment() {
    const last = installments[installments.length - 1];
    const lastDate = last?.due_date ? new Date(last.due_date) : new Date();
    setInstallments((prev) => [
      ...prev,
      { id: newId(), amount: '', due_date: fmtDateInput(addMonths(lastDate, 1)) },
    ]);
  }

  function removeInstallment(id: string) {
    if (installments.length === 1) return;
    setInstallments((prev) => prev.filter((i) => i.id !== id));
  }

  function regenerateInstallments(n: number, firstDate: string) {
    const base = expectedTotal > 0 ? expectedTotal : (baseImplementation > 0 ? baseImplementation : 0);
    setInstallments(buildInstallments(n, firstDate, base));
  }

  // ============== Custos extras ==============
  function addExtraCost() {
    setExtraCosts((prev) => [
      ...prev,
      { id: newId(), description: '', amount: '', recurrence: 'monthly', notes: '' },
    ]);
  }

  function removeExtraCost(id: string) {
    setExtraCosts((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExtraCost(id: string, patch: Partial<ExtraCostDraft>) {
    setExtraCosts((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  // ============== Criar inline (combobox) ==============
  function makeCreateCategoria(tipo: 'receitas' | 'despesas', group: 'impl' | 'mrr' | 'extra') {
    return async (name: string) => {
      const { data, error } = await sb
        .from('categorias')
        .insert({ nome: name, tipo, ativo: true })
        .select('id').single();
      if (error) { toast.error(`Erro: ${error.message}`); return; }
      await reloadFinanceLists({ kind: tipo === 'receitas' ? 'cat-receita' : 'cat-despesa', id: data.id, group });
      toast.success(`Categoria "${name}" criada`);
    };
  }
  function makeCreateCentro(group: 'impl' | 'mrr' | 'extra') {
    return async (name: string) => {
      const { data, error } = await sb
        .from('centros_custo').insert({ nome: name, ativo: true }).select('id').single();
      if (error) { toast.error(`Erro: ${error.message}`); return; }
      await reloadFinanceLists({ kind: 'centro', id: data.id, group });
      toast.success(`Centro "${name}" criado`);
    };
  }
  function makeCreateConta(group: 'impl' | 'mrr' | 'extra') {
    return async (name: string) => {
      const { data, error } = await sb
        .from('contas_bancarias').insert({ nome: name, ativo: true, moeda: 'BRL', tipo: 'corrente' }).select('id').single();
      if (error) { toast.error(`Erro: ${error.message}`); return; }
      await reloadFinanceLists({ kind: 'conta', id: data.id, group });
      toast.success(`Conta "${name}" criada`);
    };
  }
  function makeCreateMeio(group: 'impl' | 'mrr' | 'extra') {
    return async (name: string) => {
      const { data, error } = await sb
        .from('meios_pagamento').insert({ nome: name, ativo: true }).select('id').single();
      if (error) { toast.error(`Erro: ${error.message}`); return; }
      await reloadFinanceLists({ kind: 'meio', id: data.id, group });
      toast.success(`Meio "${name}" criado`);
    };
  }

  // ============== Helpers de exibição ==============
  function nameById(list: Option[], id?: string) {
    if (!id) return '—';
    return list.find((o) => o.id === id)?.nome ?? '—';
  }

  // ============== Validação por passo ==============
  function validateProjeto(): string | null {
    if (!projectName.trim()) return 'Informe o nome do projeto';
    if (projectTypeSlugs.length === 0) return 'Selecione ao menos um tipo de projeto';
    return null;
  }

  function validateReceita(): string | null {
    const cleaned = installments.filter((i) => Number(i.amount) > 0 && i.due_date);
    if (cleaned.length === 0) return 'Adicione ao menos uma parcela com valor e data';
    if (mrrEnabled) {
      if (!Number(mrrValue) || Number(mrrValue) <= 0) return 'Valor mensal do MRR deve ser maior que zero';
      if (!mrrStartDate) return 'Informe a data de início da manutenção (MRR)';
      if (mrrDiscountInvalid) return 'Desconto do MRR não pode ser ≥ valor cheio';
    }
    return null;
  }

  function validateCustos(): string | null {
    for (const e of extraCosts) {
      if (e.description.trim() && (!Number(e.amount) || Number(e.amount) <= 0)) {
        return `Valor inválido no custo extra "${e.description}"`;
      }
      if (Number(e.amount) > 0 && !e.description.trim()) {
        return 'Custo extra precisa de descrição';
      }
    }
    return null;
  }

  function goNext() {
    if (step === 'projeto') {
      const err = validateProjeto(); if (err) { toast.error(err); return; }
      setStep('receita');
    } else if (step === 'receita') {
      const err = validateReceita(); if (err) { toast.error(err); return; }
      setStep('custos');
    } else if (step === 'custos') {
      const err = validateCustos(); if (err) { toast.error(err); return; }
      setStep('revisao');
    }
  }

  function goBack() {
    if (step === 'receita') setStep('projeto');
    else if (step === 'custos') setStep('receita');
    else if (step === 'revisao') setStep('custos');
  }

  // ============== Confirmar ==============
  async function handleConfirm() {
    if (!deal) return;
    const errors = [validateProjeto(), validateReceita(), validateCustos()].filter(Boolean) as string[];
    if (errors.length) { toast.error(errors[0]); return; }

    const cleaned = installments
      .map((i) => ({
        amount: Number(i.amount) || 0,
        due_date: i.due_date,
        // por enquanto a UI usa categorização global da implementação para todas as parcelas;
        // a RPC já aceita override por parcela — basta preencher esses campos quando expusermos UI.
      }))
      .filter((i) => i.amount > 0 && i.due_date);

    setSubmitting(true);
    try {
      const cleanedExtras = extraCosts
        .filter((e) => e.description.trim() && Number(e.amount) > 0)
        .map((e) => ({
          description: e.description.trim(),
          amount: Number(e.amount),
          recurrence: e.recurrence,
          notes: e.notes || null,
          categoria_id: e.categoria_id || extraCategoriaId || null,
          centro_custo_id: e.centro_custo_id || extraCentroId || null,
          conta_bancaria_id: e.conta_bancaria_id || extraContaId || null,
          meio_pagamento_id: e.meio_pagamento_id || extraMeioId || null,
        }));

      const dealPatch: Record<string, any> = {
        discount_amount: discountEnabled ? Number(discountAmount) || null : null,
        discount_kind: discountEnabled ? discountKind : null,
        discount_valid_until: discountEnabled && discountValidUntil ? discountValidUntil : null,
        discount_notes: discountEnabled ? (discountNotes || null) : null,
        extra_costs: cleanedExtras,
        estimated_mrr_value: mrrEnabled ? Number(mrrValue) || null : null,
        mrr_start_date: mrrEnabled && mrrStartDate ? mrrStartDate : null,
        mrr_duration_months: mrrEnabled && !mrrIndefinite ? (parseInt(mrrDuration, 10) || null) : null,
        mrr_discount_months:
          mrrEnabled && mrrDiscountEnabled && mrrDiscountKind === 'months'
            ? (parseInt(mrrDiscountMonths, 10) || null) : null,
        mrr_discount_value: mrrEnabled && mrrDiscountEnabled ? (Number(mrrDiscountValue) || null) : null,
        mrr_discount_kind: mrrEnabled && mrrDiscountEnabled ? mrrDiscountKind : null,
        mrr_discount_until_date:
          mrrEnabled && mrrDiscountEnabled && mrrDiscountKind === 'until_date'
            ? (mrrDiscountUntilDate || null) : null,
        mrr_discount_until_stage:
          mrrEnabled && mrrDiscountEnabled && mrrDiscountKind === 'until_stage'
            ? (mrrDiscountUntilStage || null) : null,
        mrr_start_trigger: mrrEnabled && mrrStartTrigger ? mrrStartTrigger : null,
        installments_count: parseInt(installmentsN, 10) || null,
        first_installment_date: firstDueDate || null,
        project_type_v2: projectTypeSlugs,
        pain_categories: painCategorySlugs,
      };
      await sb.from('deals').update(dealPatch).eq('id', deal.id);

      let proposalMarked = false;
      if (acceptedProposal && acceptedProposal.status !== 'convertida') {
        await sb
          .from('proposals')
          .update({ status: 'convertida', accepted_at: new Date().toISOString() })
          .eq('id', acceptedProposal.id);
        proposalMarked = true;
      }

      const projectData: Record<string, any> = {
        name: projectName.trim(),
        project_type: deal.project_type ?? null,
        start_date: startDate || null,
        estimated_delivery_date: estimatedDelivery || null,
        // Defaults globais (implementação) — fallback para parcelas/MRR/extras na RPC
        categoria_id: implCategoriaId || null,
        centro_custo_id: implCentroId || null,
        conta_bancaria_id: implContaId || null,
        meio_pagamento_id: implMeioId || null,
        // Específicos do MRR
        mrr_categoria_id: mrrCategoriaId || null,
        mrr_centro_custo_id: mrrCentroId || null,
        mrr_conta_bancaria_id: mrrContaId || null,
        mrr_meio_pagamento_id: mrrMeioId || null,
        extra_costs: cleanedExtras,
        mrr_start_trigger: dealPatch.mrr_start_trigger,
      };
      if (mrrEnabled) {
        projectData.mrr_value = Number(mrrValue);
        projectData.mrr_start_date = mrrStartDate;
        if (!mrrIndefinite) projectData.mrr_duration_months = parseInt(mrrDuration, 10);
        if (mrrDiscountEnabled) {
          if (mrrDiscountKind === 'months') {
            projectData.mrr_discount_months = parseInt(mrrDiscountMonths, 10);
          }
          if (mrrDiscountKind === 'until_date' && mrrDiscountUntilDate) {
            projectData.mrr_discount_until_date = mrrDiscountUntilDate;
          }
          if (mrrDiscountKind === 'until_stage' && mrrDiscountUntilStage) {
            projectData.mrr_discount_until_stage = mrrDiscountUntilStage;
          }
          projectData.mrr_discount_kind = mrrDiscountKind;
          projectData.mrr_discount_value = Number(mrrDiscountValue) || Number(mrrValue);
        }
      }

      const { data, error } = await sb.rpc('close_deal_as_won', {
        p_deal_id: deal.id,
        p_project_data: projectData,
        p_installments: cleaned,
      });
      if (error) throw error;

      saveDefaults(FIN_DEFAULTS_KEY_IMPL, {
        categoria_id: implCategoriaId || undefined,
        centro_custo_id: implCentroId || undefined,
        conta_bancaria_id: implContaId || undefined,
        meio_pagamento_id: implMeioId || undefined,
      });
      saveDefaults(FIN_DEFAULTS_KEY_MRR, {
        categoria_id: mrrCategoriaId || undefined,
        centro_custo_id: mrrCentroId || undefined,
        conta_bancaria_id: mrrContaId || undefined,
        meio_pagamento_id: mrrMeioId || undefined,
      });

      const parts: string[] = [`Projeto ${data?.project_code ?? ''} criado`];
      if (typeof data?.installments_created === 'number') parts.push(`${data.installments_created} parcela(s)`);
      if (data?.mrr_installments_created) parts.push('MRR ativo');
      const ex = (data?.extras_recurring ?? 0) + (data?.extras_once ?? 0);
      if (ex > 0) parts.push(`${ex} custo(s) extra(s)`);
      if (data?.tasks_created > 0) parts.push(`${data.tasks_created} tarefa(s)`);
      if (proposalMarked) parts.push('proposta marcada como aceita');
      toast.success(parts.join(' · '));

      qc.invalidateQueries({ queryKey: ['deal', deal.code] });
      qc.invalidateQueries({ queryKey: ['crm', 'deals'] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      const { invalidateFinanceCaches, invalidateProjectCaches, invalidateCrmCaches } =
        await import('@/lib/cacheInvalidation');
      invalidateFinanceCaches(qc, { projectId: data?.project_id, clientId: data?.cliente_id });
      if (data?.project_id) invalidateProjectCaches(qc, data.project_id);
      invalidateCrmCaches(qc, { dealId: deal.id });
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['projects'] });

      onOpenChange(false);
      if (data?.project_id) {
        if (onSuccess) onSuccess(data.project_id);
        else setTimeout(() => navigate(`/projetos/${data.project_id}`), 400);
      }
    } catch (e: any) {
      toast.error(`Erro ao fechar deal: ${e?.message ?? 'tente novamente'}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!deal) return null;

  // ============== Render ==============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar deal como ganho — {deal.code}</DialogTitle>
          <DialogDescription>
            Revisão em 4 passos. Configure projeto, receita (implementação + MRR), custos extras e confira tudo antes de criar.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} onValueChange={(v) => setStep(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projeto" className="gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Projeto</span>
            </TabsTrigger>
            <TabsTrigger value="receita" className="gap-1.5">
              <Banknote className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Receita</span>
            </TabsTrigger>
            <TabsTrigger value="custos" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Custos</span>
            </TabsTrigger>
            <TabsTrigger value="revisao" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Revisão</span>
            </TabsTrigger>
          </TabsList>

          {/* ============== PASSO 1 — PROJETO ============== */}
          <TabsContent value="projeto" className="space-y-4 mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome do projeto
                </Label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de projeto</Label>
                <ProjectTypeSelect value={projectTypeSlugs} onChange={setProjectTypeSlugs} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dores</Label>
                <PainCategoriesMultiSelect value={painCategorySlugs} onChange={setPainCategorySlugs} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Entrega estimada (opcional)
                </Label>
                <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
              <div className="font-semibold text-foreground">Origem</div>
              <div className="text-muted-foreground">
                Deal {deal.code} · {loadingProposal
                  ? 'verificando propostas…'
                  : acceptedProposal
                    ? `Proposta ${acceptedProposal.code} (${acceptedProposal.status}) será vinculada`
                    : 'Nenhuma proposta enviada/aceita encontrada'}
              </div>
            </div>
          </TabsContent>

          {/* ============== PASSO 2 — RECEITA ============== */}
          <TabsContent value="receita" className="space-y-4 mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Coluna A — Implementação */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                  <Banknote className="h-3.5 w-3.5 text-primary" />
                  Implementação (one-shot)
                </div>

                <div className="rounded border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                  Total esperado: <span className="font-mono text-foreground">{formatBRL(expectedTotal)}</span>
                  {discountEnabled && discountValue > 0 && (
                    <> · desconto <span className="text-warning">−{formatBRL(discountValue)}</span></>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Nº de parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={installmentsN}
                      onChange={(e) => {
                        setInstallmentsN(e.target.value);
                        const n = parseInt(e.target.value, 10);
                        if (!Number.isNaN(n) && n > 0) regenerateInstallments(n, firstDueDate);
                      }}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Data da 1ª parcela</Label>
                    <Input
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => {
                        setFirstDueDate(e.target.value);
                        const n = parseInt(installmentsN, 10) || 1;
                        regenerateInstallments(n, e.target.value);
                      }}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {installments.map((inst, idx) => (
                    <div key={inst.id} className="flex items-center gap-2">
                      <span className="w-6 text-center font-mono text-xs text-muted-foreground">{idx + 1}</span>
                      <CurrencyInput
                        value={inst.amount}
                        onValueChange={(v) =>
                          setInstallments((prev) => prev.map((i) => (i.id === inst.id ? { ...i, amount: v } : i)))
                        }
                        withPrefix
                        placeholder="R$ 0,00"
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={inst.due_date}
                        onChange={(e) =>
                          setInstallments((prev) => prev.map((i) => (i.id === inst.id ? { ...i, due_date: e.target.value } : i)))
                        }
                        className="w-36"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={installments.length === 1}
                        onClick={() => removeInstallment(inst.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={addInstallment}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar parcela
                  </Button>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    Total: {formatBRL(totalInstallments)}
                  </span>
                </div>

                {expectedTotal > 0 && !installmentsMatchExpected && (
                  <div className="rounded border border-warning/40 bg-warning/10 p-2 text-[11px] text-warning-foreground">
                    ⚠️ Total das parcelas ({formatBRL(totalInstallments)}) ≠ valor esperado ({formatBRL(expectedTotal)})
                  </div>
                )}

                {/* Desconto promocional sobre implementação */}
                <div className="rounded border border-border/60 bg-background/40 p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Percent className="h-3 w-3" /> Desconto promocional
                    </Label>
                    <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
                  </div>
                  {discountEnabled && (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <RadioGroup
                          value={discountKind}
                          onValueChange={(v) => setDiscountKind(v as 'percent' | 'fixed')}
                          className="flex items-center gap-3"
                        >
                          <label className="flex items-center gap-1.5 text-xs">
                            <RadioGroupItem value="percent" id="disc-pct" /> %
                          </label>
                          <label className="flex items-center gap-1.5 text-xs">
                            <RadioGroupItem value="fixed" id="disc-fix" /> R$
                          </label>
                        </RadioGroup>
                        {discountKind === 'percent' ? (
                          <Input
                            type="number" step="0.01" min={0} max={100}
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            placeholder="10"
                            className="h-8"
                          />
                        ) : (
                          <CurrencyInput
                            value={discountAmount} onValueChange={setDiscountAmount}
                            withPrefix placeholder="R$ 0,00" className="h-8"
                          />
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="date" value={discountValidUntil}
                          onChange={(e) => setDiscountValidUntil(e.target.value)}
                          className="h-8"
                          placeholder="Válido até"
                        />
                        <Input
                          value={discountNotes}
                          onChange={(e) => setDiscountNotes(e.target.value)}
                          placeholder="Observação"
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <FinanceCategorizationCard
                  title="Categorização — implementação"
                  subtitle="Aplicada a todas as parcelas geradas"
                  tone="income"
                  categoriaId={implCategoriaId} setCategoriaId={setImplCategoriaId}
                  centroId={implCentroId} setCentroId={setImplCentroId}
                  contaId={implContaId} setContaId={setImplContaId}
                  meioId={implMeioId} setMeioId={setImplMeioId}
                  categorias={categoriasReceita}
                  centros={centros} contas={contas} meios={meios}
                  onCreateCategoria={makeCreateCategoria('receitas', 'impl')}
                  onCreateCentro={makeCreateCentro('impl')}
                  onCreateConta={makeCreateConta('impl')}
                  onCreateMeio={makeCreateMeio('impl')}
                />
              </div>

              {/* Coluna B — MRR */}
              <div className={cn('space-y-3 rounded-lg border p-3', mrrEnabled ? 'border-border' : 'border-border/40')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                    <Repeat className="h-3.5 w-3.5 text-primary" />
                    Manutenção mensal (MRR)
                  </div>
                  <Switch checked={mrrEnabled} onCheckedChange={setMrrEnabled} />
                </div>

                {!mrrEnabled && (
                  <p className="text-[11px] text-muted-foreground">
                    Ative para criar contrato de manutenção mensal recorrente em paralelo à implementação.
                  </p>
                )}

                {mrrEnabled && (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor mensal</Label>
                        <CurrencyInput value={mrrValue} onValueChange={setMrrValue} withPrefix placeholder="R$ 0,00" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Início</Label>
                        <Input type="date" value={mrrStartDate} onChange={(e) => setMrrStartDate(e.target.value)} className="h-9" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Duração</Label>
                      <RadioGroup
                        value={mrrIndefinite ? 'indefinite' : 'fixed'}
                        onValueChange={(v) => setMrrIndefinite(v === 'indefinite')}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <label className="flex items-center gap-1.5 text-xs">
                          <RadioGroupItem value="indefinite" id="mrr-indef" /> Indefinido
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <RadioGroupItem value="fixed" id="mrr-fixed" /> Por
                          <Input
                            type="number" min={1} max={120}
                            value={mrrDuration} onChange={(e) => setMrrDuration(e.target.value)}
                            disabled={mrrIndefinite}
                            className="h-7 w-16 px-2 text-xs"
                          /> meses
                        </label>
                      </RadioGroup>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Início da cobrança</Label>
                      <Select
                        value={mrrStartTrigger || ''}
                        onValueChange={(v) => setMrrStartTrigger((v as 'on_delivery' | 'before_delivery') || '')}
                      >
                        <SelectTrigger className="h-8"><SelectValue placeholder="(usar Início acima)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_delivery">Na entrega da implementação</SelectItem>
                          <SelectItem value="before_delivery">Antes da entrega</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded border border-border/60 bg-background/40 p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Percent className="h-3 w-3" /> Desconto promocional no MRR
                        </Label>
                        <Switch checked={mrrDiscountEnabled} onCheckedChange={setMrrDiscountEnabled} />
                      </div>
                      {mrrDiscountEnabled && (
                        <div className="space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Select
                              value={mrrDiscountKind}
                              onValueChange={(v) => setMrrDiscountKind(v as 'months' | 'until_date' | 'until_stage')}
                            >
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="months">Por X meses</SelectItem>
                                <SelectItem value="until_date">Até uma data</SelectItem>
                                <SelectItem value="until_stage">Até estágio do projeto</SelectItem>
                              </SelectContent>
                            </Select>
                            <CurrencyInput
                              value={mrrDiscountValue} onValueChange={setMrrDiscountValue}
                              withPrefix placeholder="Valor c/ desc" className="h-8"
                            />
                          </div>
                          {mrrDiscountKind === 'months' && (
                            <Input
                              type="number" min={1} max={60}
                              value={mrrDiscountMonths} onChange={(e) => setMrrDiscountMonths(e.target.value)}
                              className="h-8" placeholder="Primeiros (meses)"
                            />
                          )}
                          {mrrDiscountKind === 'until_date' && (
                            <Input
                              type="date" value={mrrDiscountUntilDate}
                              onChange={(e) => setMrrDiscountUntilDate(e.target.value)} className="h-8"
                            />
                          )}
                          {mrrDiscountKind === 'until_stage' && (
                            <Select value={mrrDiscountUntilStage} onValueChange={setMrrDiscountUntilStage}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione um estágio…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planning">Planejamento</SelectItem>
                                <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                                <SelectItem value="em_homologacao">Em homologação</SelectItem>
                                <SelectItem value="entregue">Entregue</SelectItem>
                                <SelectItem value="em_manutencao">Em manutenção</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {mrrDiscountInvalid && (
                            <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                              Desconto inválido — valor com desconto deve ser MENOR que o valor cheio.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <FinanceCategorizationCard
                      title="Categorização — MRR"
                      subtitle="Pode ser diferente da implementação (ex: categoria 'MRR / Manutenção')"
                      tone="income"
                      categoriaId={mrrCategoriaId} setCategoriaId={setMrrCategoriaId}
                      centroId={mrrCentroId} setCentroId={setMrrCentroId}
                      contaId={mrrContaId} setContaId={setMrrContaId}
                      meioId={mrrMeioId} setMeioId={setMrrMeioId}
                      categorias={categoriasReceita}
                      centros={centros} contas={contas} meios={meios}
                      onCreateCategoria={makeCreateCategoria('receitas', 'mrr')}
                      onCreateCentro={makeCreateCentro('mrr')}
                      onCreateConta={makeCreateConta('mrr')}
                      onCreateMeio={makeCreateMeio('mrr')}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ============== PASSO 3 — CUSTOS EXTRAS ============== */}
          <TabsContent value="custos" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                  <Wallet className="h-3.5 w-3.5 text-destructive" />
                  Custos extras (APIs, infra, licenças)
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addExtraCost}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>

              <FinanceCategorizationCard
                title="Padrão para custos extras"
                subtitle="Aplicado quando o item não tiver categorização própria"
                tone="expense"
                categoriaId={extraCategoriaId} setCategoriaId={setExtraCategoriaId}
                centroId={extraCentroId} setCentroId={setExtraCentroId}
                contaId={extraContaId} setContaId={setExtraContaId}
                meioId={extraMeioId} setMeioId={setExtraMeioId}
                categorias={categoriasDespesa}
                centros={centros} contas={contas} meios={meios}
                onCreateCategoria={makeCreateCategoria('despesas', 'extra')}
                onCreateCentro={makeCreateCentro('extra')}
                onCreateConta={makeCreateConta('extra')}
                onCreateMeio={makeCreateMeio('extra')}
              />

              {extraCosts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Sem custos extras. Use pra registrar despesas recorrentes (OpenAI, AWS, licenças) ou setup único.
                </p>
              ) : (
                <div className="space-y-2">
                  {extraCosts.map((e) => (
                    <div key={e.id} className="rounded border border-border/60 bg-background/40 p-2 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_140px_120px_36px]">
                        <Input
                          placeholder="Ex: API OpenAI" value={e.description}
                          onChange={(ev) => updateExtraCost(e.id, { description: ev.target.value })}
                          className="h-8"
                        />
                        <CurrencyInput
                          value={e.amount}
                          onValueChange={(v) => updateExtraCost(e.id, { amount: v })}
                          withPrefix placeholder="R$ 0,00" className="h-8"
                        />
                        <Select
                          value={e.recurrence}
                          onValueChange={(v) => updateExtraCost(e.id, { recurrence: v as ExtraCostDraft['recurrence'] })}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">{RECURRENCE_LABEL.once}</SelectItem>
                            <SelectItem value="monthly">{RECURRENCE_LABEL.monthly}</SelectItem>
                            <SelectItem value="yearly">{RECURRENCE_LABEL.yearly}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button" size="icon" variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeExtraCost(e.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ComboboxCreate
                          value={e.categoria_id ?? ''}
                          options={toComboOptions(categoriasDespesa)}
                          onChange={(v) => updateExtraCost(e.id, { categoria_id: v })}
                          onCreate={makeCreateCategoria('despesas', 'extra')}
                          placeholder={extraCategoriaId ? `Padrão: ${nameById(categoriasDespesa, extraCategoriaId)}` : 'Categoria (opcional)'}
                          searchPlaceholder="Buscar ou criar…"
                          createLabel={(t) => `+ Criar categoria "${t}"`}
                        />
                        <ComboboxCreate
                          value={e.centro_custo_id ?? ''}
                          options={toComboOptions(centros)}
                          onChange={(v) => updateExtraCost(e.id, { centro_custo_id: v })}
                          onCreate={makeCreateCentro('extra')}
                          placeholder={extraCentroId ? `Padrão: ${nameById(centros, extraCentroId)}` : 'Centro de custo (opcional)'}
                          searchPlaceholder="Buscar ou criar…"
                          createLabel={(t) => `+ Criar centro "${t}"`}
                        />
                      </div>
                      <Textarea
                        placeholder="Observação (opcional)"
                        value={e.notes}
                        onChange={(ev) => updateExtraCost(e.id, { notes: ev.target.value })}
                        rows={1}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============== PASSO 4 — REVISÃO ============== */}
          <TabsContent value="revisao" className="space-y-3 mt-4">
            <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2 text-xs">
              <ReviewLine ok label="Projeto" value={`${projectName} · status planejamento`} />
              <ReviewLine ok label="Tipos / Dores" value={`${projectTypeSlugs.length} tipo(s) · ${painCategorySlugs.length} dor(es)`} />
              <ReviewLine
                ok
                label="Implementação"
                value={`${installments.length} parcela(s) · total ${formatBRL(totalInstallments)} · cat: ${nameById(categoriasReceita, implCategoriaId)} / cc: ${nameById(centros, implCentroId)}`}
              />
              {discountEnabled && discountValue > 0 && (
                <ReviewLine ok label="Desconto" value={`−${formatBRL(discountValue)} sobre implementação`} />
              )}
              {mrrEnabled && (
                <ReviewLine
                  ok
                  label="MRR"
                  value={`${formatBRL(Number(mrrValue))}/mês · cat: ${nameById(categoriasReceita, mrrCategoriaId)} / cc: ${nameById(centros, mrrCentroId)}${mrrIndefinite ? ' · indefinido' : ` · ${mrrDuration} meses`}${mrrDiscountEnabled && Number(mrrDiscountValue) > 0 ? ` · desc. ${formatBRL(Number(mrrDiscountValue))}` : ''}`}
                />
              )}
              {extraCosts.filter((e) => e.description.trim() && Number(e.amount) > 0).length > 0 && (
                <ReviewLine
                  ok
                  label="Custos extras"
                  value={`${extraCosts.filter((e) => e.description.trim() && Number(e.amount) > 0).length} item(s)${monthlyExtras > 0 ? ` · ${formatBRL(monthlyExtras)}/mês` : ''}`}
                />
              )}
              <ReviewLine ok label="Anexos" value="serão movidos do deal para o projeto" />
              <ReviewLine ok label="Dependências" value="viram tarefas do projeto" />
              <ReviewLine
                ok
                label="Cliente financeiro"
                value="busca por CNPJ; cria automático se não existir"
              />
              {acceptedProposal ? (
                <ReviewLine ok label="Proposta" value={`${acceptedProposal.code} → marcada como aceita e vinculada`} />
              ) : (
                <ReviewLine warn label="Proposta" value="nenhuma proposta enviada/aceita encontrada" />
              )}
              {expectedTotal > 0 && !installmentsMatchExpected && (
                <ReviewLine warn label="Atenção" value={`Total das parcelas (${formatBRL(totalInstallments)}) ≠ valor esperado (${formatBRL(expectedTotal)})`} />
              )}
              {mrrDiscountInvalid && (
                <ReviewLine warn label="Desconto MRR" value="inválido — não será aplicado" />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div>
            {step !== 'projeto' && (
              <Button variant="outline" onClick={goBack} disabled={submitting}>
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            {step !== 'revisao' ? (
              <Button onClick={goNext}>
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Fechar como ganho e criar projeto <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewLine({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {warn ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      ) : (
        <CheckCircle2 className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', ok ? 'text-primary' : 'text-muted-foreground')} />
      )}
      <div>
        <span className="font-semibold text-foreground">{label}:</span>{' '}
        <span className="text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}
