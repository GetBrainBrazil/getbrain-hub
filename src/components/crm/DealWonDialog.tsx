import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, Trash2, ArrowRight, ChevronDown, Settings2,
  Repeat, Percent, Wallet,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ComboboxCreate, type ComboOption } from '@/components/crm/ComboboxCreate';
import { supabase } from '@/integrations/supabase/client';
import { calculateScopeTotal, formatBRL, type ScopeItem } from '@/lib/orcamentos/calculateTotal';
import { PROJECT_TYPE_OPTIONS, PROJECT_TYPE_LABEL } from '@/constants/dealStages';
import type { Deal } from '@/types/crm';

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

type Option = { id: string; nome: string };

const FIN_DEFAULTS_KEY = 'crm.lastWonFinancialDefaults';

function loadFinDefaults(): {
  categoria_id?: string;
  centro_custo_id?: string;
  conta_bancaria_id?: string;
  meio_pagamento_id?: string;
} {
  try {
    return JSON.parse(localStorage.getItem(FIN_DEFAULTS_KEY) || '{}');
  } catch {
    return {};
  }
}

const RECURRENCE_LABEL: Record<ExtraCostDraft['recurrence'], string> = {
  once: 'Uma vez',
  monthly: 'Mensal',
  yearly: 'Anual',
};

function toComboOptions(list: Option[]): ComboOption[] {
  return list.map((o) => ({ value: o.id, label: o.nome }));
}

export function DealWonDialog({ open, onOpenChange, deal, onSuccess }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [acceptedProposal, setAcceptedProposal] = useState<ProposalLite | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  // Projeto
  const [projectName, setProjectName] = useState(deal?.title ?? '');
  const [projectType, setProjectType] = useState<string>(deal?.project_type ?? '');
  const [startDate, setStartDate] = useState<string>(
    deal?.desired_start_date ?? fmtDateInput(new Date()),
  );
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    deal?.desired_delivery_date ?? '',
  );

  // Parcelas + input livre de N
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { id: newId(), amount: '', due_date: fmtDateInput(addMonths(new Date(), 1)) },
  ]);
  const [customN, setCustomN] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Configuração financeira
  const [categorias, setCategorias] = useState<Option[]>([]);
  const [centros, setCentros] = useState<Option[]>([]);
  const [contas, setContas] = useState<Option[]>([]);
  const [meios, setMeios] = useState<Option[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [centroId, setCentroId] = useState<string>('');
  const [contaId, setContaId] = useState<string>('');
  const [meioId, setMeioId] = useState<string>('');
  const [finOpen, setFinOpen] = useState(true);

  // MRR / Manutenção
  const [mrrEnabled, setMrrEnabled] = useState(false);
  const [mrrValue, setMrrValue] = useState<string>('');
  const [mrrStartDate, setMrrStartDate] = useState<string>('');
  const [mrrIndefinite, setMrrIndefinite] = useState(true);
  const [mrrDuration, setMrrDuration] = useState<string>('12');
  const [mrrDiscountEnabled, setMrrDiscountEnabled] = useState(false);
  const [mrrDiscountMonths, setMrrDiscountMonths] = useState<string>('3');
  const [mrrDiscountValue, setMrrDiscountValue] = useState<string>('');

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
      const { data } = await sb
        .from('proposals')
        .select('id, code, status, scope_items, maintenance_monthly_value')
        .eq('deal_id', deal.id)
        .is('deleted_at', null)
        .in('status', ['convertida', 'enviada'])
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      const row = (data ?? [])[0] ?? null;
      setAcceptedProposal(row as ProposalLite | null);
      setLoadingProposal(false);
    })();
    return () => { cancelled = true; };
  }, [open, deal?.id]);

  async function reloadFinanceLists(selectAfterCreate?: { kind: 'categoria' | 'centro' | 'conta' | 'meio'; id: string }) {
    const [cats, ccs, cbs, mps] = await Promise.all([
      // tipo no banco é "receitas" (plural) — antes estava "receita" e por isso vinha vazio
      sb.from('categorias').select('id, nome').eq('ativo', true).eq('tipo', 'receitas').order('nome'),
      sb.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
      sb.from('contas_bancarias').select('id, nome').eq('ativo', true).order('nome'),
      sb.from('meios_pagamento').select('id, nome').eq('ativo', true).order('nome'),
    ]);
    const cList = (cats.data ?? []) as Option[];
    const ccList = (ccs.data ?? []) as Option[];
    const cbList = (cbs.data ?? []) as Option[];
    const mpList = (mps.data ?? []) as Option[];
    setCategorias(cList);
    setCentros(ccList);
    setContas(cbList);
    setMeios(mpList);

    if (selectAfterCreate) {
      if (selectAfterCreate.kind === 'categoria') setCategoriaId(selectAfterCreate.id);
      if (selectAfterCreate.kind === 'centro') setCentroId(selectAfterCreate.id);
      if (selectAfterCreate.kind === 'conta') setContaId(selectAfterCreate.id);
      if (selectAfterCreate.kind === 'meio') setMeioId(selectAfterCreate.id);
    } else {
      const def = loadFinDefaults();
      setCategoriaId(def.categoria_id && cList.find((x) => x.id === def.categoria_id) ? def.categoria_id : '');
      setCentroId(def.centro_custo_id && ccList.find((x) => x.id === def.centro_custo_id) ? def.centro_custo_id : '');
      setContaId(def.conta_bancaria_id && cbList.find((x) => x.id === def.conta_bancaria_id) ? def.conta_bancaria_id : '');
      setMeioId(def.meio_pagamento_id && mpList.find((x) => x.id === def.meio_pagamento_id) ? def.meio_pagamento_id : '');
    }
  }

  useEffect(() => {
    if (!open) return;
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
    setProjectType(deal.project_type ?? '');
    setStartDate(deal.desired_start_date ?? fmtDateInput(new Date()));
    setEstimatedDelivery(deal.desired_delivery_date ?? '');

    setInstallments([
      {
        id: newId(),
        amount: baseImplementation > 0 ? String(baseImplementation) : '',
        due_date: fmtDateInput(addMonths(new Date(), 1)),
      },
    ]);
    setCustomN('');

    const dealMrr = Number(deal.estimated_mrr_value ?? 0);
    setMrrEnabled(dealMrr > 0);
    setMrrValue(dealMrr > 0 ? String(dealMrr) : '');
    setMrrStartDate((deal as any).mrr_start_date ?? '');
    const dur = (deal as any).mrr_duration_months;
    setMrrIndefinite(dur == null);
    setMrrDuration(dur != null ? String(dur) : '12');
    const dMonths = (deal as any).mrr_discount_months;
    const dValue = (deal as any).mrr_discount_value;
    setMrrDiscountEnabled(dMonths != null && dMonths > 0);
    setMrrDiscountMonths(dMonths != null ? String(dMonths) : '3');
    setMrrDiscountValue(dValue != null ? String(dValue) : '');

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

  function splitEvenly(n: number) {
    const base = expectedTotal > 0 ? expectedTotal : (baseImplementation > 0 ? baseImplementation : 0);
    if (base <= 0) {
      toast.error('Defina um valor de proposta ou estimativa do deal antes de dividir');
      return;
    }
    if (n < 1 || n > 60) {
      toast.error('Número de parcelas deve ficar entre 1 e 60');
      return;
    }
    const per = Math.round((base / n) * 100) / 100;
    const remainder = Math.round((base - per * n) * 100) / 100;
    const list: InstallmentDraft[] = [];
    let baseDate = new Date();
    for (let i = 0; i < n; i++) {
      const amount = i === 0 ? per + remainder : per;
      baseDate = addMonths(baseDate, 1);
      list.push({ id: newId(), amount: String(amount), due_date: fmtDateInput(baseDate) });
    }
    setInstallments(list);
  }

  function applyCustomN() {
    const n = parseInt(customN, 10);
    if (Number.isNaN(n)) {
      toast.error('Digite um número de parcelas válido');
      return;
    }
    splitEvenly(n);
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
  async function createCategoria(name: string) {
    const { data, error } = await sb
      .from('categorias')
      .insert({ nome: name, tipo: 'receitas', ativo: true })
      .select('id').single();
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    await reloadFinanceLists({ kind: 'categoria', id: data.id });
    toast.success(`Categoria "${name}" criada`);
  }
  async function createCentro(name: string) {
    const { data, error } = await sb
      .from('centros_custo')
      .insert({ nome: name, ativo: true })
      .select('id').single();
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    await reloadFinanceLists({ kind: 'centro', id: data.id });
    toast.success(`Centro "${name}" criado`);
  }
  async function createConta(name: string) {
    const { data, error } = await sb
      .from('contas_bancarias')
      .insert({ nome: name, ativo: true, moeda: 'BRL', tipo: 'corrente' })
      .select('id').single();
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    await reloadFinanceLists({ kind: 'conta', id: data.id });
    toast.success(`Conta "${name}" criada`);
  }
  async function createMeio(name: string) {
    const { data, error } = await sb
      .from('meios_pagamento')
      .insert({ nome: name, ativo: true })
      .select('id').single();
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    await reloadFinanceLists({ kind: 'meio', id: data.id });
    toast.success(`Meio "${name}" criado`);
  }

  // ============== Confirmar ==============
  async function handleConfirm() {
    if (!deal) return;
    if (!projectName.trim()) { toast.error('Informe o nome do projeto'); return; }
    if (!projectType) { toast.error('Selecione o tipo de projeto'); return; }

    const cleaned = installments
      .map((i) => ({ amount: Number(i.amount) || 0, due_date: i.due_date }))
      .filter((i) => i.amount > 0 && i.due_date);
    if (cleaned.length === 0) { toast.error('Adicione ao menos uma parcela válida'); return; }

    if (mrrEnabled) {
      if (!Number(mrrValue) || Number(mrrValue) <= 0) {
        toast.error('Valor mensal do MRR deve ser maior que zero'); return;
      }
      if (!mrrStartDate) { toast.error('Informe a data de início da manutenção (MRR)'); return; }
    }

    for (const e of extraCosts) {
      if (e.description.trim() && (!Number(e.amount) || Number(e.amount) <= 0)) {
        toast.error(`Valor inválido no custo extra "${e.description}"`); return;
      }
      if (Number(e.amount) > 0 && !e.description.trim()) {
        toast.error('Custo extra precisa de descrição'); return;
      }
    }

    setSubmitting(true);
    try {
      const dealPatch: Record<string, any> = {
        discount_amount: discountEnabled ? Number(discountAmount) || null : null,
        discount_kind: discountEnabled ? discountKind : null,
        discount_valid_until: discountEnabled && discountValidUntil ? discountValidUntil : null,
        discount_notes: discountEnabled ? (discountNotes || null) : null,
        extra_costs: extraCosts
          .filter((e) => e.description.trim() && Number(e.amount) > 0)
          .map((e) => ({
            description: e.description.trim(),
            amount: Number(e.amount),
            recurrence: e.recurrence,
            notes: e.notes || null,
          })),
        estimated_mrr_value: mrrEnabled ? Number(mrrValue) || null : null,
        mrr_start_date: mrrEnabled && mrrStartDate ? mrrStartDate : null,
        mrr_duration_months: mrrEnabled && !mrrIndefinite ? (parseInt(mrrDuration, 10) || null) : null,
        mrr_discount_months: mrrEnabled && mrrDiscountEnabled ? (parseInt(mrrDiscountMonths, 10) || null) : null,
        mrr_discount_value: mrrEnabled && mrrDiscountEnabled ? (Number(mrrDiscountValue) || null) : null,
      };
      await sb.from('deals').update(dealPatch).eq('id', deal.id);

      if (acceptedProposal && acceptedProposal.status === 'enviada') {
        await sb
          .from('proposals')
          .update({ status: 'convertida', accepted_at: new Date().toISOString() })
          .eq('id', acceptedProposal.id);
      }

      const projectData: Record<string, any> = {
        name: projectName.trim(),
        project_type: projectType,
        start_date: startDate || null,
        estimated_delivery_date: estimatedDelivery || null,
        categoria_id: categoriaId || null,
        centro_custo_id: centroId || null,
        conta_bancaria_id: contaId || null,
        meio_pagamento_id: meioId || null,
        extra_costs: dealPatch.extra_costs,
      };
      if (mrrEnabled) {
        projectData.mrr_value = Number(mrrValue);
        projectData.mrr_start_date = mrrStartDate;
        if (!mrrIndefinite) projectData.mrr_duration_months = parseInt(mrrDuration, 10);
        if (mrrDiscountEnabled) {
          projectData.mrr_discount_months = parseInt(mrrDiscountMonths, 10);
          projectData.mrr_discount_value = Number(mrrDiscountValue) || Number(mrrValue);
        }
      }

      const { data, error } = await sb.rpc('close_deal_as_won', {
        p_deal_id: deal.id,
        p_project_data: projectData,
        p_installments: cleaned,
      });
      if (error) throw error;

      try {
        localStorage.setItem(FIN_DEFAULTS_KEY, JSON.stringify({
          categoria_id: categoriaId || undefined,
          centro_custo_id: centroId || undefined,
          conta_bancaria_id: contaId || undefined,
          meio_pagamento_id: meioId || undefined,
        }));
      } catch {}

      const parts: string[] = [
        `Deal fechado · projeto ${data?.project_code ?? ''}`,
        `${data?.installments_created ?? cleaned.length} parcela(s)`,
      ];
      if (data?.mrr_installments_created > 0) parts.push(`MRR: ${data.mrr_installments_created}x`);
      if (data?.extras_recurring > 0 || data?.extras_once > 0) {
        parts.push(`extras: ${(data.extras_recurring ?? 0) + (data.extras_once ?? 0)}`);
      }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar deal como ganho</DialogTitle>
          <DialogDescription>
            Vai criar o projeto, parcelas, contrato de manutenção (se houver MRR), custos extras e
            vincular descoberta + anexos comerciais.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1.5">
          <div className="font-semibold text-foreground">O que será transferido:</div>
          <ul className="space-y-0.5 text-muted-foreground">
            <li>• Descoberta, contato principal, origem, contexto comercial</li>
            <li>• Anotações livres, escopo estruturado, tipos múltiplos do projeto</li>
            <li>• Anexos do deal (organograma, mockup, documentos) e dependências</li>
            <li>• Cliente financeiro: busca por CNPJ, cria automático se não existir</li>
            <li>
              • Implementação: <span className="font-mono text-foreground">{formatBRL(expectedTotal)}</span> em{' '}
              <span className="font-mono text-foreground">{installments.length}</span> parcela(s)
              {discountEnabled && discountValue > 0 && (
                <span className="text-warning"> (desc. {formatBRL(discountValue)})</span>
              )}
            </li>
            {mrrEnabled && Number(mrrValue) > 0 && (
              <li>
                • Manutenção (MRR): <span className="font-mono text-foreground">{formatBRL(Number(mrrValue))}/mês</span>
                {mrrStartDate ? ` a partir de ${mrrStartDate}` : ''}
                {mrrIndefinite ? ' · indefinido' : ` por ${mrrDuration} meses`}
                {mrrDiscountEnabled && Number(mrrDiscountValue) > 0 && (
                  <span className="text-warning"> · desconto {formatBRL(Number(mrrDiscountValue))} nos primeiros {mrrDiscountMonths} meses</span>
                )}
              </li>
            )}
            {extraCosts.length > 0 && (
              <li>
                • Custos extras: <span className="font-mono text-foreground">{extraCosts.length}</span> item(s)
                {monthlyExtras > 0 && <> ({formatBRL(monthlyExtras)}/mês)</>}
              </li>
            )}
            <li>
              • {loadingProposal
                ? 'Verificando propostas…'
                : acceptedProposal
                  ? `Proposta ${acceptedProposal.code} (${acceptedProposal.status}) ${acceptedProposal.status === 'enviada' ? '→ será marcada como aceita e' : ''} vinculada ao projeto`
                  : 'Nenhuma proposta enviada/aceita encontrada'}
            </li>
          </ul>
          {expectedTotal > 0 && !installmentsMatchExpected && (
            <div className="mt-2 rounded border border-warning/40 bg-warning/10 p-2 text-warning-foreground">
              ⚠️ Total das parcelas ({formatBRL(totalInstallments)}) ≠ valor esperado ({formatBRL(expectedTotal)})
            </div>
          )}
        </div>

        {/* Dados do projeto */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nome do projeto
            </Label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPE_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{PROJECT_TYPE_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrega estimada (opcional)
            </Label>
            <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
          </div>
        </div>

        {/* Configuração financeira (subiu para cima e usa ComboboxCreate) */}
        <Collapsible open={finOpen} onOpenChange={setFinOpen} className="rounded-lg border border-border bg-muted/10">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between p-3 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" />
                Configuração financeira
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${finOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Categoria de receita</Label>
                <ComboboxCreate
                  value={categoriaId}
                  options={toComboOptions(categorias)}
                  onChange={setCategoriaId}
                  onCreate={createCategoria}
                  placeholder="Selecionar ou digitar para criar…"
                  searchPlaceholder="Buscar ou digitar para criar…"
                  createLabel={(t) => `+ Criar categoria "${t}"`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Centro de custo</Label>
                <ComboboxCreate
                  value={centroId}
                  options={toComboOptions(centros)}
                  onChange={setCentroId}
                  onCreate={createCentro}
                  placeholder="Selecionar ou digitar para criar…"
                  searchPlaceholder="Buscar ou digitar para criar…"
                  createLabel={(t) => `+ Criar centro "${t}"`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Conta bancária</Label>
                <ComboboxCreate
                  value={contaId}
                  options={toComboOptions(contas)}
                  onChange={setContaId}
                  onCreate={createConta}
                  placeholder="Selecionar ou digitar para criar…"
                  searchPlaceholder="Buscar ou digitar para criar…"
                  createLabel={(t) => `+ Criar conta "${t}"`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Meio de pagamento</Label>
                <ComboboxCreate
                  value={meioId}
                  options={toComboOptions(meios)}
                  onChange={setMeioId}
                  onCreate={createMeio}
                  placeholder="Selecionar ou digitar para criar…"
                  searchPlaceholder="Buscar ou digitar para criar…"
                  createLabel={(t) => `+ Criar meio "${t}"`}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Aplicado a todas as parcelas geradas. Sua escolha fica salva pra próxima conversão. Pode digitar no campo
              um nome novo e selecionar "Criar" — vira um registro real em Configurações → Financeiro.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Parcelas */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parcelas de implementação
            </Label>
            <div className="flex flex-wrap items-center gap-1">
              {[1, 2, 3, 6, 12].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => splitEvenly(n)}
                >
                  {n}x
                </Button>
              ))}
              <div className="ml-1 flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  placeholder="N"
                  value={customN}
                  onChange={(e) => setCustomN(e.target.value)}
                  className="h-7 w-14 px-2 text-[11px]"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={applyCustomN}
                >
                  Aplicar
                </Button>
              </div>
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
                  className="w-40"
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
        </div>

        {/* MRR */}
        <Collapsible
          open={mrrEnabled || Number(deal.estimated_mrr_value ?? 0) > 0}
          className="rounded-lg border border-border bg-muted/10"
        >
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Repeat className="h-3.5 w-3.5" />
              Manutenção mensal (MRR)
            </div>
            <Switch checked={mrrEnabled} onCheckedChange={setMrrEnabled} />
          </div>
          {mrrEnabled && (
            <CollapsibleContent forceMount className="px-3 pb-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Valor mensal</Label>
                  <CurrencyInput value={mrrValue} onValueChange={setMrrValue} withPrefix placeholder="R$ 0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Início</Label>
                  <Input type="date" value={mrrStartDate} onChange={(e) => setMrrStartDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Duração</Label>
                <RadioGroup
                  value={mrrIndefinite ? 'indefinite' : 'fixed'}
                  onValueChange={(v) => setMrrIndefinite(v === 'indefinite')}
                  className="flex flex-wrap items-center gap-3"
                >
                  <label className="flex items-center gap-1.5 text-xs">
                    <RadioGroupItem value="indefinite" id="mrr-indef" />
                    Indefinido
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <RadioGroupItem value="fixed" id="mrr-fixed" />
                    Por
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={mrrDuration}
                      onChange={(e) => setMrrDuration(e.target.value)}
                      disabled={mrrIndefinite}
                      className="h-7 w-16 px-2 text-xs"
                    />
                    meses
                  </label>
                </RadioGroup>
              </div>

              <div className="rounded border border-border/60 bg-background/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground">Desconto promocional no MRR</Label>
                  <Switch checked={mrrDiscountEnabled} onCheckedChange={setMrrDiscountEnabled} />
                </div>
                {mrrDiscountEnabled && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Primeiros (meses)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={mrrDiscountMonths}
                        onChange={(e) => setMrrDiscountMonths(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Valor mensal com desconto</Label>
                      <CurrencyInput
                        value={mrrDiscountValue}
                        onValueChange={setMrrDiscountValue}
                        withPrefix
                        placeholder="R$ 0,00"
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>

        {/* Desconto */}
        <Collapsible open={discountEnabled} className="rounded-lg border border-border bg-muted/10">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              Desconto promocional na implementação
            </div>
            <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
          </div>
          {discountEnabled && (
            <CollapsibleContent forceMount className="px-3 pb-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                  <RadioGroup
                    value={discountKind}
                    onValueChange={(v) => setDiscountKind(v as 'percent' | 'fixed')}
                    className="flex items-center gap-3"
                  >
                    <label className="flex items-center gap-1.5 text-xs">
                      <RadioGroupItem value="percent" id="disc-pct" /> Porcentagem (%)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <RadioGroupItem value="fixed" id="disc-fix" /> Valor (R$)
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">
                    Valor {discountKind === 'percent' ? '(%)' : '(R$)'}
                  </Label>
                  {discountKind === 'percent' ? (
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="10"
                    />
                  ) : (
                    <CurrencyInput value={discountAmount} onValueChange={setDiscountAmount} withPrefix placeholder="R$ 0,00" />
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Válido até</Label>
                  <Input type="date" value={discountValidUntil} onChange={(e) => setDiscountValidUntil(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Observação</Label>
                  <Input value={discountNotes} onChange={(e) => setDiscountNotes(e.target.value)} placeholder="Ex: campanha Q2" />
                </div>
              </div>
              {discountValue > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Aplicado: <span className="font-mono text-foreground">−{formatBRL(discountValue)}</span> sobre{' '}
                  {formatBRL(baseImplementation)} → <span className="font-mono text-foreground">{formatBRL(expectedTotal)}</span>
                </p>
              )}
            </CollapsibleContent>
          )}
        </Collapsible>

        {/* Custos extras */}
        <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Custos extras (APIs externas, infra, licenças)
            </div>
            <Button type="button" size="sm" variant="outline" className="h-7" onClick={addExtraCost}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
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
                      placeholder="Ex: API OpenAI"
                      value={e.description}
                      onChange={(ev) => updateExtraCost(e.id, { description: ev.target.value })}
                      className="h-8"
                    />
                    <CurrencyInput
                      value={e.amount}
                      onValueChange={(v) => updateExtraCost(e.id, { amount: v })}
                      withPrefix
                      placeholder="R$ 0,00"
                      className="h-8"
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
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeExtraCost(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Fechar deal e criar projeto <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
