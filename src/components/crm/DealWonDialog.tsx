import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, ArrowRight, ChevronDown, Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type Option = { id: string; nome: string; tipo?: string | null };

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

export function DealWonDialog({ open, onOpenChange, deal, onSuccess }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [acceptedProposal, setAcceptedProposal] = useState<ProposalLite | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  const [projectName, setProjectName] = useState(deal?.title ?? '');
  const [projectType, setProjectType] = useState<string>(deal?.project_type ?? '');
  const [startDate, setStartDate] = useState<string>(
    deal?.desired_start_date ?? fmtDateInput(new Date()),
  );
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    deal?.desired_delivery_date ?? '',
  );
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { id: newId(), amount: '', due_date: fmtDateInput(addMonths(new Date(), 1)) },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Configuração financeira (opcional, com defaults via localStorage)
  const [categorias, setCategorias] = useState<Option[]>([]);
  const [centros, setCentros] = useState<Option[]>([]);
  const [contas, setContas] = useState<Option[]>([]);
  const [meios, setMeios] = useState<Option[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [centroId, setCentroId] = useState<string>('');
  const [contaId, setContaId] = useState<string>('');
  const [meioId, setMeioId] = useState<string>('');
  const [finOpen, setFinOpen] = useState(true);

  // Carrega proposta aceita (ou enviada mais recente) ao abrir
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
        .in('status', ['aceito', 'enviado'])
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

  // Carrega listas financeiras + aplica defaults do localStorage
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [cats, ccs, cbs, mps] = await Promise.all([
        sb.from('categorias').select('id, nome, tipo').eq('ativo', true).eq('tipo', 'receita').order('nome'),
        sb.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
        sb.from('contas_bancarias').select('id, nome').eq('ativo', true).order('nome'),
        sb.from('meios_pagamento').select('id, nome').eq('ativo', true).order('nome'),
      ]);
      if (cancelled) return;
      const cList = (cats.data ?? []) as Option[];
      const ccList = (ccs.data ?? []) as Option[];
      const cbList = (cbs.data ?? []) as Option[];
      const mpList = (mps.data ?? []) as Option[];
      setCategorias(cList);
      setCentros(ccList);
      setContas(cbList);
      setMeios(mpList);

      const def = loadFinDefaults();
      setCategoriaId(def.categoria_id && cList.find((x) => x.id === def.categoria_id) ? def.categoria_id : '');
      setCentroId(def.centro_custo_id && ccList.find((x) => x.id === def.centro_custo_id) ? def.centro_custo_id : '');
      setContaId(def.conta_bancaria_id && cbList.find((x) => x.id === def.conta_bancaria_id) ? def.conta_bancaria_id : '');
      setMeioId(def.meio_pagamento_id && mpList.find((x) => x.id === def.meio_pagamento_id) ? def.meio_pagamento_id : '');
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Pré-preenche valor total das parcelas com valor da proposta (se houver)
  const proposalTotal = useMemo(
    () => (acceptedProposal ? calculateScopeTotal(acceptedProposal.scope_items ?? []) : 0),
    [acceptedProposal],
  );

  useEffect(() => {
    if (!open || !deal) return;
    setProjectName(deal.title);
    setProjectType(deal.project_type ?? '');
    setStartDate(deal.desired_start_date ?? fmtDateInput(new Date()));
    setEstimatedDelivery(deal.desired_delivery_date ?? '');
    const baseAmount = proposalTotal > 0 ? proposalTotal : Number(deal.estimated_value ?? 0);
    setInstallments([
      {
        id: newId(),
        amount: baseAmount > 0 ? String(baseAmount) : '',
        due_date: fmtDateInput(addMonths(new Date(), 1)),
      },
    ]);
  }, [open, deal?.id, proposalTotal]);

  const totalInstallments = installments.reduce(
    (sum, i) => sum + (Number(i.amount) || 0),
    0,
  );
  const installmentsMatchProposal =
    proposalTotal > 0 ? Math.abs(totalInstallments - proposalTotal) < 0.01 : true;

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
    const base = proposalTotal > 0 ? proposalTotal : Number(deal?.estimated_value ?? 0);
    if (base <= 0) {
      toast.error('Defina um valor de proposta ou estimativa do deal antes de dividir');
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

  async function handleConfirm() {
    if (!deal) return;
    if (!projectName.trim()) {
      toast.error('Informe o nome do projeto');
      return;
    }
    if (!projectType) {
      toast.error('Selecione o tipo de projeto');
      return;
    }
    const cleaned = installments
      .map((i) => ({ amount: Number(i.amount) || 0, due_date: i.due_date }))
      .filter((i) => i.amount > 0 && i.due_date);
    if (cleaned.length === 0) {
      toast.error('Adicione ao menos uma parcela válida');
      return;
    }

    setSubmitting(true);
    try {
      // Se há proposta enviada e ainda não aceita, marca como aceita
      if (acceptedProposal && acceptedProposal.status === 'enviado') {
        await sb
          .from('proposals')
          .update({ status: 'aceito', accepted_at: new Date().toISOString() })
          .eq('id', acceptedProposal.id);
      }

      const { data, error } = await sb.rpc('close_deal_as_won', {
        p_deal_id: deal.id,
        p_project_data: {
          name: projectName.trim(),
          project_type: projectType,
          start_date: startDate || null,
          estimated_delivery_date: estimatedDelivery || null,
          categoria_id: categoriaId || null,
          centro_custo_id: centroId || null,
          conta_bancaria_id: contaId || null,
          meio_pagamento_id: meioId || null,
        },
        p_installments: cleaned,
      });
      if (error) throw error;

      // Salva defaults financeiros pra próxima conversão
      try {
        localStorage.setItem(FIN_DEFAULTS_KEY, JSON.stringify({
          categoria_id: categoriaId || undefined,
          centro_custo_id: centroId || undefined,
          conta_bancaria_id: contaId || undefined,
          meio_pagamento_id: meioId || undefined,
        }));
      } catch {}

      toast.success(
        `Deal fechado · projeto ${data?.project_code ?? ''} criado · ${data?.installments_created ?? cleaned.length} parcela(s)`,
      );
      qc.invalidateQueries({ queryKey: ['deal', deal.code] });
      qc.invalidateQueries({ queryKey: ['crm', 'deals'] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      // Cross-module: financeiro, projetos e clientes (pode ter sido auto-criado)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar deal como ganho</DialogTitle>
          <DialogDescription>
            Vai criar um projeto, copiar a descoberta + anexos comerciais, gerar parcelas financeiras
            e vincular a proposta aceita.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do que vai ser transferido */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1.5">
          <div className="font-semibold text-foreground">O que será transferido pro projeto:</div>
          <ul className="space-y-0.5 text-muted-foreground">
            <li>• Descoberta (escopo, entregáveis, premissas, riscos, stack, critérios de aceite)</li>
            <li>• Anexos comerciais (organograma, mockup, prints) — se houver</li>
            <li>• Dependências do deal viram dependências do projeto</li>
            <li>
              • {loadingProposal
                ? 'Verificando propostas…'
                : acceptedProposal
                  ? `Proposta ${acceptedProposal.code} (${acceptedProposal.status}) ${acceptedProposal.status === 'enviado' ? '→ será marcada como aceita e' : ''} vinculada ao projeto`
                  : 'Nenhuma proposta enviada/aceita encontrada (deal será fechado mesmo assim)'}
            </li>
          </ul>
          {proposalTotal > 0 && !installmentsMatchProposal && (
            <div className="mt-2 rounded border border-warning/40 bg-warning/10 p-2 text-warning-foreground">
              ⚠️ Total das parcelas ({formatBRL(totalInstallments)}) ≠ valor da proposta ({formatBRL(proposalTotal)})
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tipo
            </Label>
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Início
            </Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrega estimada (opcional)
            </Label>
            <Input
              type="date"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
            />
          </div>
        </div>

        {/* Parcelas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parcelas financeiras
            </Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 6, 12].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => splitEvenly(n)}
                >
                  {n}x
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {installments.map((inst, idx) => (
              <div key={inst.id} className="flex items-center gap-2">
                <span className="w-6 text-center font-mono text-xs text-muted-foreground">
                  {idx + 1}
                </span>
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
