import { useMemo, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PROJECT_TYPE_LABEL, PROJECT_TYPE_OPTIONS } from '@/constants/dealStages';
import { useCloseDealAsWon } from '@/hooks/crm/useCrmDetails';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { formatCurrency } from '@/lib/formatters';
import type { Deal } from '@/types/crm';

type Installment = { amount: number; due_date: string };

function buildInstallments(total: number, count: number, firstDate: string): Installment[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => ({ amount: (base + (i === count - 1 ? remainder : 0)) / 100, due_date: format(addMonths(new Date(`${firstDate}T12:00:00`), i), 'yyyy-MM-dd') }));
}

export function DealWonDialog({ deal, open, onOpenChange, onSuccess }: { deal: Deal | null; open: boolean; onOpenChange: (v: boolean) => void; onSuccess: (projectId: string) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstDue = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
  const [name, setName] = useState(deal?.title ?? '');
  const [projectType, setProjectType] = useState(deal?.project_type || 'sistema_personalizado');
  const [startDate, setStartDate] = useState(today);
  const [owner, setOwner] = useState(deal?.owner_actor_id || 'none');
  const [scope, setScope] = useState(deal?.scope_summary ?? '');
  const [total, setTotal] = useState(String(deal?.estimated_value ?? 0));
  const [count, setCount] = useState('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(firstDue);
  const [custom, setCustom] = useState(false);
  const [customRows, setCustomRows] = useState<Installment[]>([]);
  const { data: actors = [] } = useCrmActors();
  const closeWon = useCloseDealAsWon();
  const defaultRows = useMemo(() => buildInstallments(Number(total || 0), Math.max(1, Number(count || 1)), firstInstallmentDate), [total, count, firstInstallmentDate]);
  const rows = custom ? customRows.length ? customRows : defaultRows : defaultRows;
  const rowsTotal = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const valid = !!deal && name.trim().length > 2 && Number(total) > 0 && Math.abs(rowsTotal - Number(total)) < 0.01;
  const submit = () => {
    if (!deal) return;
    closeWon.mutate({ dealId: deal.id, projectData: { name, project_type: projectType, start_date: startDate, owner_actor_id: owner === 'none' ? null : owner, scope }, installments: rows }, { onSuccess: (res) => { toast.success(`Projeto ${res.project_code} criado com ${res.installments_created} parcela(s) em Contas a Receber.`); onOpenChange(false); onSuccess(res.project_id); }, onError: (e) => toast.error(e.message) });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Criar projeto a partir de {deal?.code}</DialogTitle></DialogHeader><div className="space-y-5"><div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground"><p>Ao confirmar, o deal será marcado como ganho, um projeto será criado, parcelas financeiras serão geradas e a empresa será marcada como cliente ativa.</p></div><section className="grid gap-3 sm:grid-cols-2"><h3 className="sm:col-span-2 text-sm font-semibold text-foreground">Projeto</h3><div className="space-y-2 sm:col-span-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div><div className="space-y-2"><Label>Tipo</Label><Select value={projectType} onValueChange={setProjectType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_TYPE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{PROJECT_TYPE_LABEL[p]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Data início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div><div className="space-y-2"><Label>Gerente</Label><Select value={owner} onValueChange={setOwner}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem gerente</SelectItem>{actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label>Escopo</Label><Textarea rows={5} value={scope} onChange={(e) => setScope(e.target.value)} /></div></section><section className="grid gap-3 sm:grid-cols-3"><h3 className="sm:col-span-3 text-sm font-semibold text-foreground">Parcelas</h3><div className="space-y-2"><Label>Valor total</Label><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} /></div><div className="space-y-2"><Label>Nº parcelas</Label><Input type="number" min={1} max={12} value={count} onChange={(e) => { setCount(e.target.value); setCustomRows([]); }} /></div><div className="space-y-2"><Label>Data 1ª parcela</Label><Input type="date" value={firstInstallmentDate} onChange={(e) => { setFirstInstallmentDate(e.target.value); setCustomRows([]); }} /></div><div className="sm:col-span-3 rounded-lg border border-border"><div className="border-b border-border px-3 py-2 text-sm font-medium">Prévia das parcelas</div>{rows.map((r, i) => <div key={i} className="grid grid-cols-[48px_1fr_1fr] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-0"><span>#{i + 1}</span>{custom ? <Input type="number" value={r.amount} onChange={(e) => { const next = [...rows]; next[i] = { ...next[i], amount: Number(e.target.value) }; setCustomRows(next); }} /> : <span>{formatCurrency(r.amount)}</span>}{custom ? <Input type="date" value={r.due_date} onChange={(e) => { const next = [...rows]; next[i] = { ...next[i], due_date: e.target.value }; setCustomRows(next); }} /> : <span>{new Date(`${r.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</span>}</div>)}<div className="px-3 py-2 text-right text-xs text-muted-foreground">Soma: {formatCurrency(rowsTotal)}</div></div><label className="sm:col-span-3 flex items-center gap-2 text-sm"><Checkbox checked={custom} onCheckedChange={(v) => { setCustom(Boolean(v)); setCustomRows(defaultRows); }} /> Customizar parcelas individualmente</label></section></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!valid || closeWon.isPending} onClick={submit}>Criar projeto</Button></DialogFooter></DialogContent></Dialog>;
}
