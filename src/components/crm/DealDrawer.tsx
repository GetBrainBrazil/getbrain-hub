import { useEffect, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DEAL_STAGE_LABEL, DEAL_STAGES, PROJECT_TYPE_LABEL, PROJECT_TYPE_OPTIONS } from '@/constants/dealStages';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { useDeleteDeal, useUpdateDeal } from '@/hooks/crm/useDeals';
import type { Deal, DealStage } from '@/types/crm';

export function DealDrawer({ deal, open, onOpenChange }: { deal: Deal | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<Partial<Deal>>({});
  const { data: actors = [] } = useCrmActors();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  useEffect(() => { setForm(deal ?? {}); }, [deal]);
  if (!deal) return null;

  const save = () => updateDeal.mutate({ id: deal.id, updates: form }, { onSuccess: () => onOpenChange(false) });
  const remove = () => deleteDeal.mutate(deal.id, { onSuccess: () => onOpenChange(false) });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[640px]">
        <SheetHeader className="pr-8">
          <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{deal.code}</span><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" disabled><ExternalLink className="h-3.5 w-3.5" /> Tela cheia</Button></TooltipTrigger><TooltipContent>Disponível em breve no 04B</TooltipContent></Tooltip></div>
          <SheetTitle>Editar Deal</SheetTitle>
          <SheetDescription>{deal.company?.legal_name}{deal.contact ? ` · ${deal.contact.full_name}` : ''}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label>Título</Label><Input value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Estágio</Label><Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as DealStage }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{DEAL_STAGE_LABEL[s]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Valor estimado</Label><Input type="number" value={form.estimated_value ?? ''} onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value ? Number(e.target.value) : null }))} /></div>
          </div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label>Probabilidade</Label><span className="text-sm text-muted-foreground">{form.probability_pct ?? 0}%</span></div><Slider value={[form.probability_pct ?? 0]} min={0} max={100} step={5} onValueChange={([v]) => setForm((f) => ({ ...f, probability_pct: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tipo de projeto</Label><Select value={form.project_type ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, project_type: v === 'none' ? null : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem tipo</SelectItem>{PROJECT_TYPE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{PROJECT_TYPE_LABEL[p]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Fechamento esperado</Label><Input type="date" value={form.expected_close_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value || null }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Responsável</Label><Select value={form.owner_actor_id ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, owner_actor_id: v === 'none' ? null : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem responsável</SelectItem>{actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Resumo do escopo</Label><Textarea rows={4} value={form.scope_summary ?? ''} onChange={(e) => setForm((f) => ({ ...f, scope_summary: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Notas</Label><Textarea rows={3} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          {form.stage === 'fechado_perdido' && <div className="space-y-1.5"><Label>Motivo da perda</Label><Textarea rows={3} value={form.lost_reason ?? ''} onChange={(e) => setForm((f) => ({ ...f, lost_reason: e.target.value }))} /></div>}
        </div>
        <SheetFooter className="mt-6 gap-2 sm:justify-between"><Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4" /> Excluir deal</Button><Button onClick={save} disabled={updateDeal.isPending}>Salvar alterações</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
