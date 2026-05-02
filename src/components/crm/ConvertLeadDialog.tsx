import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMonths, format } from 'date-fns';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConvertLeadToDealFull } from '@/hooks/crm/useCrmDetails';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { DEAL_STAGE_LABEL, DEAL_STAGES, PROJECT_TYPE_LABEL, PROJECT_TYPE_OPTIONS } from '@/constants/dealStages';
import { formatCurrency } from '@/lib/formatters';
import type { DealStage, Lead } from '@/types/crm';

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Diálogo enxuto: o Lead já foi triado, agora só precisamos definir
 * os 4 dados mínimos do Deal recém-nascido. Toda a qualificação rica
 * (dor, custo, fit, etc.) acontece DENTRO do Deal — não aqui.
 */
export function ConvertLeadDialog({ lead, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const convert = useConvertLeadToDealFull();
  const { data: actors = [] } = useCrmActors();
  const [form, setForm] = useState({
    title: '',
    stage: 'descoberta_marcada' as DealStage,
    estimated_value: '',
    project_type: 'sistema_personalizado',
    expected_close_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    owner_actor_id: 'none',
  });

  useEffect(() => {
    if (lead && open) {
      setForm({
        title: lead.title,
        stage: 'descoberta_marcada',
        estimated_value: String(lead.estimated_value ?? ''),
        project_type: 'sistema_personalizado',
        expected_close_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        owner_actor_id: lead.owner_actor_id ?? 'none',
      });
    }
  }, [lead, open]);

  if (!lead) return null;

  const carriedOver = [
    { ok: !!lead.company_id, label: 'Empresa' },
    { ok: !!lead.contact_person_id, label: 'Contato principal' },
    { ok: !!lead.owner_actor_id, label: 'Dono' },
    { ok: !!lead.source, label: 'Origem' },
    { ok: !!lead.triagem_summary || !!lead.pain_description, label: 'Resumo da triagem → Contexto do Deal' },
    { ok: !!lead.notes, label: 'Notas' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Converter {lead.code} em Deal</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Título do deal</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Estágio inicial</Label>
            <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as DealStage }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.filter((s) => s !== 'ganho' && s !== 'perdido' && s !== 'gelado').map((s) => (
                  <SelectItem key={s} value={s}>{DEAL_STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor estimado</Label>
            <Input
              type="number"
              value={form.estimated_value}
              onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de projeto</Label>
            <Select value={form.project_type} onValueChange={(v) => setForm((f) => ({ ...f, project_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPE_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{PROJECT_TYPE_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fechamento previsto</Label>
            <Input
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Owner</Label>
            <Select value={form.owner_actor_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_actor_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem owner</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Levado para o novo deal
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {carriedOver.map((m) => (
              <li key={m.label} className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className={m.ok ? 'h-3.5 w-3.5 text-success' : 'h-3.5 w-3.5 text-muted-foreground/40'} />
                <span className={m.ok ? 'text-foreground' : 'text-muted-foreground/60 line-through'}>
                  {m.label}
                </span>
              </li>
            ))}
          </ul>
          {lead.estimated_value !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Valor inicial do deal: <span className="font-mono font-semibold text-foreground">{formatCurrency(Number(lead.estimated_value))}</span>
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            A qualificação detalhada (dor, custo, fit, escopo, valores) é feita dentro do Deal, depois da conversão.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!form.title.trim() || convert.isPending}
            onClick={() =>
              convert.mutate(
                {
                  leadId: lead.id,
                  dealData: {
                    ...form,
                    owner_actor_id: form.owner_actor_id === 'none' ? null : form.owner_actor_id,
                    estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
                  },
                },
                {
                  onSuccess: (dealCode) => {
                    toast.success(`Deal ${dealCode} criado a partir de ${lead.code}`);
                    onOpenChange(false);
                    navigate(`/crm/deals/${dealCode}`);
                  },
                  onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falha ao converter'}`),
                },
              )
            }
          >
            Converter <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
