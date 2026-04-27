import { useEffect, useMemo, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_TYPE_LABEL, PROJECT_TYPE_OPTIONS } from '@/constants/dealStages';
import { PROJECT_TYPE_V2_LABEL, PAIN_CATEGORY_LABEL, ESTIMATION_CONFIDENCE_LABEL, COMPLEXITY_LABEL, DEPENDENCY_TYPE_LABEL } from '@/constants/dealEnumLabels';
import { CLIENT_TYPE_LABEL } from '@/constants/companyEnumLabels';
import { useCloseDealAsWon, useCompanyDetail } from '@/hooks/crm/useCrmDetails';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { useCompanyContactsWithRoles } from '@/hooks/crm/useCompanyContacts';
import { useDealDependencies } from '@/hooks/crm/useDealDependencies';
import { useSectorsFlat } from '@/hooks/crm/useSectors';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Deal, DealProjectType } from '@/types/crm';

type Installment = { amount: number; due_date: string };

function buildInstallments(total: number, count: number, firstDate: string): Installment[] {
  const cents = Math.round(total * 100);
  const safeCount = Math.max(1, count);
  const base = Math.floor(cents / safeCount);
  const remainder = cents - base * safeCount;
  return Array.from({ length: safeCount }, (_, i) => ({
    amount: (base + (i === safeCount - 1 ? remainder : 0)) / 100,
    due_date: format(addMonths(new Date(`${firstDate}T12:00:00`), i), 'yyyy-MM-dd'),
  }));
}

// Mapeia project_type_v2 (deals) → enum legacy project_type (projects)
const PROJECT_TYPE_V2_TO_LEGACY: Record<DealProjectType, string> = {
  whatsapp_chatbot: 'chatbot',
  ai_sdr: 'chatbot',
  sistema_gestao: 'sistema_personalizado',
  automacao_processo: 'sistema_personalizado',
  integracao_sistemas: 'sistema_personalizado',
  outro: 'outro',
};

function truncate(s: string | null | undefined, max = 80): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function SectionRow({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right font-medium', ok === false ? 'text-muted-foreground/70 italic' : 'text-foreground')}>{value}</span>
    </div>
  );
}

function CountValue({ n, label = 'itens', subtext }: { n: number; label?: string; subtext?: string }) {
  if (n === 0) return <span className="text-muted-foreground/70 italic">vazio</span>;
  return <span>{n} {label}{subtext ? ` ${subtext}` : ''}</span>;
}

export function DealWonDialog({ deal, open, onOpenChange, onSuccess }: { deal: Deal | null; open: boolean; onOpenChange: (v: boolean) => void; onSuccess: (projectId: string) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstDueDefault = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<string>('sistema_personalizado');
  const [startDate, setStartDate] = useState(today);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');
  const [owner, setOwner] = useState<string>('none');
  const [total, setTotal] = useState('0');
  const [count, setCount] = useState('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(firstDueDefault);
  const [custom, setCustom] = useState(false);
  const [customRows, setCustomRows] = useState<Installment[]>([]);

  const { data: actors = [] } = useCrmActors();
  const { data: company } = useCompanyDetail(deal?.company_id);
  const { data: contacts = [] } = useCompanyContactsWithRoles(deal?.company_id);
  const { data: dependencies = [] } = useDealDependencies(deal?.id);
  const { data: sectors = [] } = useSectorsFlat();
  const closeWon = useCloseDealAsWon();

  // Reset form sempre que abrir um novo deal
  useEffect(() => {
    if (!deal || !open) return;
    setExpanded(false);
    setName(deal.title ?? '');
    const mappedLegacy = deal.project_type_v2 ? PROJECT_TYPE_V2_TO_LEGACY[deal.project_type_v2] : (deal.project_type || 'sistema_personalizado');
    setProjectType(mappedLegacy);
    setStartDate(deal.desired_start_date || today);
    setEstimatedDelivery(deal.desired_delivery_date || '');
    setOwner(deal.owner_actor_id || 'none');
    setTotal(String(deal.estimated_value ?? 0));
    setCount('1');
    setFirstInstallmentDate(firstDueDefault);
    setCustom(false);
    setCustomRows([]);
  }, [deal?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectorPath = useMemo(() => {
    if (!company?.sector_id) return null;
    const sector = sectors.find((s) => s.id === company.sector_id);
    if (!sector) return null;
    if (!sector.parent_sector_id) return sector.name;
    const parent = sectors.find((s) => s.id === sector.parent_sector_id);
    return parent ? `${parent.name} › ${sector.name}` : sector.name;
  }, [company?.sector_id, sectors]);

  const defaultRows = useMemo(
    () => buildInstallments(Number(total || 0), Math.max(1, Number(count || 1)), firstInstallmentDate),
    [total, count, firstInstallmentDate],
  );
  const rows = custom ? (customRows.length ? customRows : defaultRows) : defaultRows;
  const rowsTotal = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const validParcelas = rows.length > 0 && rows.every((r) => Number(r.amount) > 0);
  const validForm = !!deal && name.trim().length > 0 && owner !== 'none' && validParcelas;

  // Diagnóstico de descoberta
  const discoveryMissing: string[] = useMemo(() => {
    if (!deal) return [];
    const m: string[] = [];
    if (!deal.pain_category) m.push('categoria de dor');
    if (!deal.pain_description || deal.pain_description.length < 40) m.push('descrição da dor');
    if (!deal.project_type_v2) m.push('tipo de projeto');
    if (!deal.scope_summary || deal.scope_summary.length < 40) m.push('resumo do escopo');
    if ((deal.deliverables?.length ?? 0) < 3 && (deal.acceptance_criteria?.length ?? 0) < 3) m.push('entregáveis/critérios');
    return m;
  }, [deal]);

  const submit = () => {
    if (!deal || !validForm) return;
    closeWon.mutate(
      {
        dealId: deal.id,
        projectData: {
          name: name.trim(),
          project_type: projectType,
          start_date: startDate,
          estimated_delivery_date: estimatedDelivery || null,
          owner_actor_id: owner === 'none' ? null : owner,
        },
        installments: rows,
      },
      {
        onSuccess: (res) => {
          toast.success(`Projeto ${res.project_code} criado com ${res.installments_created} parcela(s) no Financeiro.`);
          onOpenChange(false);
          onSuccess(res.project_id);
        },
        onError: (e: Error) => toast.error(e.message || 'Falha ao fechar deal'),
      },
    );
  };

  if (!deal) return null;

  const acceptanceCount = deal.acceptance_criteria?.length ?? 0;
  const acceptanceChecked = (deal.acceptance_criteria ?? []).filter((a: { checked?: boolean }) => a.checked).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!closeWon.isPending) onOpenChange(v); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar {deal.code} como Ganho</DialogTitle>
          <DialogDescription>
            Vai criar projeto novo com escopo herdado, parcelas no Financeiro, e marcar empresa como cliente ativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Seção colapsável: Dados que serão transferidos */}
          <div className="rounded-lg border border-border bg-muted/10">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/20"
            >
              <span className="flex items-center gap-2">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                📋 Dados que serão transferidos do deal para o projeto
              </span>
              <span className="text-xs text-muted-foreground">{expanded ? 'recolher' : 'expandir'}</span>
            </button>

            {expanded && (
              <div className="space-y-4 border-t border-border px-4 py-4">
                {/* A — Cliente & Contatos */}
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">✅ Cliente & Contatos</h4>
                  <SectionRow label="Empresa" value={company?.legal_name ?? deal.company?.legal_name ?? '—'} />
                  <SectionRow label="Setor" value={sectorPath ?? <span className="text-muted-foreground/70 italic">não definido</span>} ok={!!sectorPath} />
                  <SectionRow
                    label="Tipo de cliente"
                    value={company?.client_type ? CLIENT_TYPE_LABEL[company.client_type] : <span className="text-muted-foreground/70 italic">não definido</span>}
                    ok={!!company?.client_type}
                  />
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-muted-foreground">Contatos vinculados ({contacts.length}):</p>
                    {contacts.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground/70">Nenhum contato vinculado</p>
                    ) : (
                      <ul className="space-y-1">
                        {contacts.map((c) => (
                          <li key={c.link_id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium text-foreground">{c.person.full_name}</span>
                            {c.is_primary_contact && <Badge variant="outline" className="h-4 px-1 text-[9px]">primário</Badge>}
                            {c.roles.map((r) => (
                              <Badge key={r.id} variant="secondary" className="h-4 px-1 text-[9px]">{r.role}</Badge>
                            ))}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* B — Escopo proposto */}
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">✅ Escopo proposto</h4>
                  <SectionRow label="Contexto de negócio" value={deal.business_context ? `${deal.business_context.length} caracteres` : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.business_context} />
                  <SectionRow label="Resumo do escopo" value={deal.scope_summary ? `${deal.scope_summary.length} caracteres` : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.scope_summary} />
                  <SectionRow label="Escopo IN" value={deal.scope_in ? `${deal.scope_in.length} caracteres` : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.scope_in} />
                  <SectionRow label="Escopo OUT" value={deal.scope_out ? `${deal.scope_out.length} caracteres` : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.scope_out} />
                  <SectionRow label="Critérios de aceite" value={acceptanceCount > 0 ? `${acceptanceCount} itens (${acceptanceChecked} marcados)` : <span className="text-muted-foreground/70 italic">vazio</span>} ok={acceptanceCount > 0} />
                  <SectionRow label="Entregáveis" value={<CountValue n={deal.deliverables?.length ?? 0} />} />
                  <SectionRow label="Premissas" value={<CountValue n={deal.premises?.length ?? 0} />} />
                  <SectionRow label="Riscos identificados" value={<CountValue n={deal.identified_risks?.length ?? 0} />} />
                  <SectionRow label="Stack técnica" value={<CountValue n={deal.technical_stack?.length ?? 0} />} />
                </div>

                {/* C — Dependências externas */}
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">✅ Dependências externas</h4>
                  {dependencies.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground/70">Nenhuma dependência registrada</p>
                  ) : (
                    <>
                      <p className="mb-1 text-xs text-muted-foreground">{dependencies.length} dependência(s) serão copiadas para o projeto:</p>
                      <ul className="space-y-1">
                        {dependencies.map((d) => (
                          <li key={d.id} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">{DEPENDENCY_TYPE_LABEL[d.dependency_type]}</Badge>
                            <span className="text-foreground">{truncate(d.description, 80)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {/* D — Estimativa baseline */}
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">✅ Estimativa baseline</h4>
                  {(deal.estimated_hours_total || deal.estimated_complexity || deal.estimation_confidence) ? (
                    <p className="text-xs text-foreground">
                      {deal.estimated_hours_total ? `${deal.estimated_hours_total}h estimadas` : '— horas'}
                      {' · '}
                      {deal.estimated_complexity ? `complexidade ${deal.estimated_complexity}/5 (${COMPLEXITY_LABEL[deal.estimated_complexity] ?? '—'})` : '— complexidade'}
                      {' · '}
                      {deal.estimation_confidence ? `confiança ${ESTIMATION_CONFIDENCE_LABEL[deal.estimation_confidence]}` : '— confiança'}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground/70">— não preenchido —</p>
                  )}
                </div>

                {/* E — Histórico comercial (NÃO copiado) */}
                <div className="rounded-md border border-border/60 bg-background/40 p-3">
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">❌ Histórico comercial (fica no deal, não vai pro projeto)</h4>
                  <SectionRow
                    label="Dor"
                    value={
                      deal.pain_category ? (
                        <span>
                          {PAIN_CATEGORY_LABEL[deal.pain_category]}
                          {deal.pain_cost_brl_monthly ? ` · ${formatCurrency(deal.pain_cost_brl_monthly)}/mês` : ''}
                          {deal.pain_hours_monthly ? ` · ${deal.pain_hours_monthly}h/mês` : ''}
                        </span>
                      ) : <span className="text-muted-foreground/70 italic">não definido</span>
                    }
                    ok={!!deal.pain_category}
                  />
                  {deal.pain_description && (
                    <p className="ml-0 text-[11px] text-muted-foreground">↳ "{truncate(deal.pain_description, 100)}"</p>
                  )}
                  <SectionRow label="Justificativa de preço" value={deal.pricing_rationale ? truncate(deal.pricing_rationale, 60) : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.pricing_rationale} />
                  <SectionRow
                    label="Faixa de orçamento"
                    value={
                      deal.budget_range_min || deal.budget_range_max
                        ? `${formatCurrency(deal.budget_range_min ?? 0)} – ${formatCurrency(deal.budget_range_max ?? 0)}`
                        : <span className="text-muted-foreground/70 italic">não definido</span>
                    }
                    ok={!!(deal.budget_range_min || deal.budget_range_max)}
                  />
                  <SectionRow label="Concorrentes" value={deal.competitors ? truncate(deal.competitors, 50) : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.competitors} />
                  <SectionRow label="Próxima ação atual" value={deal.next_step ? truncate(deal.next_step, 60) : <span className="text-muted-foreground/70 italic">vazio</span>} ok={!!deal.next_step} />
                  <p className="mt-2 text-[11px] italic text-muted-foreground">
                    Esses dados ficam preservados no deal. Você pode acessá-los depois pelo link "Deal de origem" na ficha do projeto.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Campos editáveis */}
          <section className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-foreground sm:col-span-2">Projeto</h3>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome do projeto</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do projeto" />
            </div>
            <div className="space-y-1.5">
              <Label>
                Tipo de projeto
                {deal.project_type_v2 && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    (deal: {PROJECT_TYPE_V2_LABEL[deal.project_type_v2]})
                  </span>
                )}
              </Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{PROJECT_TYPE_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger><SelectValue placeholder="Selecionar owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Selecione —</SelectItem>
                  {actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Entrega estimada</Label>
              <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <h3 className="text-sm font-semibold text-foreground sm:col-span-3">Parcelas</h3>
            <div className="space-y-1.5">
              <Label>Valor total</Label>
              <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nº parcelas</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={count}
                onChange={(e) => { setCount(e.target.value); setCustomRows([]); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data 1ª parcela</Label>
              <Input
                type="date"
                value={firstInstallmentDate}
                onChange={(e) => { setFirstInstallmentDate(e.target.value); setCustomRows([]); }}
              />
            </div>
            <div className="rounded-lg border border-border sm:col-span-3">
              <div className="border-b border-border px-3 py-2 text-sm font-medium">Prévia das parcelas</div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[48px_1fr_1fr] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-0">
                  <span>#{i + 1}</span>
                  {custom ? (
                    <Input
                      type="number"
                      value={r.amount}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], amount: Number(e.target.value) };
                        setCustomRows(next);
                      }}
                    />
                  ) : (
                    <span>{formatCurrency(r.amount)}</span>
                  )}
                  {custom ? (
                    <Input
                      type="date"
                      value={r.due_date}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], due_date: e.target.value };
                        setCustomRows(next);
                      }}
                    />
                  ) : (
                    <span>{new Date(`${r.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              ))}
              <div className="px-3 py-2 text-right text-xs text-muted-foreground">
                Soma: {formatCurrency(rowsTotal)}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <Checkbox
                checked={custom}
                onCheckedChange={(v) => { setCustom(Boolean(v)); setCustomRows(defaultRows); }}
              />
              Customizar parcelas individualmente
            </label>
          </section>

          {discoveryMissing.length > 0 && (
            <p className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span>
                <strong className="text-foreground">Descoberta incompleta</strong> — você pode fechar mesmo assim, mas o projeto vai herdar campos vazios ({discoveryMissing.join(', ')}).
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={closeWon.isPending}>
            Cancelar
          </Button>
          <Button disabled={!validForm || closeWon.isPending} onClick={submit}>
            {closeWon.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fechando…</>
            ) : (
              'Confirmar fechamento e criar projeto'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
