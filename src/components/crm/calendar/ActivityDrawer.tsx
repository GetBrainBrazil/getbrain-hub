import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock3, ExternalLink, PhoneOff, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConfirm } from '@/components/ConfirmDialog';
import { useCreateCalendarActivity, useDeleteCalendarActivity, useUpdateCalendarActivity } from '@/hooks/crm/useCrmDashboard';
import { ACTIVITY_TYPE_LABEL, ACTIVITY_TYPE_STYLES, STATUS_BADGE_STYLES, STATUS_LABEL } from '@/lib/crm/activityColors';
import type { DealActivity } from '@/types/crm';
import { cn } from '@/lib/utils';
import { ActivityForm, buildScheduledIso, emptyActivityForm, type ActivityFormState } from './ActivityForm';
import { getActivityStatus } from './ActivityBlock';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activity: DealActivity | null;
  /** Quando aberto sem activity (modo criação), pode receber data inicial. */
  initialDate?: Date;
}

function activityToForm(a: DealActivity): ActivityFormState {
  const dt = a.scheduled_at ?? a.happened_at;
  const date = dt ? new Date(dt) : null;
  return {
    title: a.title,
    type: a.type,
    date,
    time: date ? format(date, 'HH:mm') : '09:00',
    duration_minutes: a.duration_minutes ?? 30,
    owner_actor_id: a.owner_actor_id ?? 'none',
    description: a.description ?? '',
    link: a.deal_id && a.deal_code
      ? { kind: 'deal', id: a.deal_id, code: a.deal_code, title: a.title }
      : a.lead_id && a.lead_code
      ? { kind: 'lead', id: a.lead_id, code: a.lead_code, title: a.title }
      : null,
  };
}

export function ActivityDrawer({ open, onOpenChange, activity, initialDate }: Props) {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const createMut = useCreateCalendarActivity();
  const updateMut = useUpdateCalendarActivity();
  const deleteMut = useDeleteCalendarActivity();

  const [form, setForm] = useState<ActivityFormState>(() => emptyActivityForm(initialDate));

  useEffect(() => {
    if (!open) return;
    setForm(activity ? activityToForm(activity) : emptyActivityForm(initialDate));
  }, [open, activity, initialDate]);

  const isCreating = !activity;
  const status = activity ? getActivityStatus(activity) : null;
  const styles = activity ? ACTIVITY_TYPE_STYLES[activity.type] : null;

  const handleSave = async () => {
    const iso = buildScheduledIso(form);
    if (!form.title.trim() || !iso) {
      toast.error('Preencha título e data/hora.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      type: form.type,
      scheduled_at: iso,
      duration_minutes: form.duration_minutes,
      owner_actor_id: form.owner_actor_id === 'none' ? null : form.owner_actor_id,
      description: form.description || null,
      deal_id: form.link?.kind === 'deal' ? form.link.id : null,
      lead_id: form.link?.kind === 'lead' ? form.link.id : null,
    };
    try {
      if (isCreating) {
        await createMut.mutateAsync(payload);
        toast.success('Atividade criada');
      } else {
        await updateMut.mutateAsync({ id: activity!.id, updates: payload });
        toast.success('Atividade atualizada');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    }
  };

  const handleDone = async () => {
    if (!activity) return;
    await updateMut.mutateAsync({ id: activity.id, updates: { happened_at: new Date().toISOString() } });
    toast.success('Atividade marcada como feita');
    onOpenChange(false);
  };

  const handleReschedule = async (deltaDays: number) => {
    if (!activity?.scheduled_at) return;
    const next = new Date(activity.scheduled_at);
    next.setDate(next.getDate() + deltaDays);
    await updateMut.mutateAsync({ id: activity.id, updates: { scheduled_at: next.toISOString() } });
    toast.success(`Reagendada para ${format(next, "dd/MM 'às' HH:mm", { locale: ptBR })}`);
  };

  const handleNoShow = async () => {
    if (!activity) return;
    const base = activity.scheduled_at ? new Date(activity.scheduled_at) : new Date();
    base.setDate(base.getDate() + 1);
    await Promise.all([
      updateMut.mutateAsync({ id: activity.id, updates: { happened_at: new Date().toISOString(), outcome: 'Não atendeu' } }),
      createMut.mutateAsync({
        title: `[Retentar] ${activity.title}`,
        type: activity.type,
        scheduled_at: base.toISOString(),
        duration_minutes: activity.duration_minutes,
        owner_actor_id: activity.owner_actor_id,
        description: activity.description,
        deal_id: activity.deal_id,
        lead_id: activity.lead_id,
      }),
    ]);
    toast.success('Marcada como “não atendeu” e replicada para amanhã');
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!activity) return;
    const ok = await confirm({
      title: 'Excluir atividade?',
      description: `“${activity.title}” será removida do calendário.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteMut.mutateAsync(activity.id);
    toast.success('Atividade excluída');
    onOpenChange(false);
  };

  const openEntity = () => {
    if (!activity) return;
    if (activity.deal_code) navigate(`/crm/deals/${activity.deal_code}`);
    else if (activity.lead_code) navigate(`/crm/leads/${activity.lead_code}`);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-5">
            <div className="flex items-center gap-2">
              {styles && <span className={cn('h-2 w-2 rounded-full', styles.dot)} />}
              <SheetTitle className="text-base">
                {isCreating ? 'Nova atividade' : ACTIVITY_TYPE_LABEL[activity!.type]}
              </SheetTitle>
              {status && (
                <Badge variant="outline" className={cn('ml-auto', STATUS_BADGE_STYLES[status])}>
                  {STATUS_LABEL[status]}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Ações rápidas (modo edição) */}
            {!isCreating && status !== 'realizadas' && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <Button size="sm" onClick={handleDone} className="col-span-2">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marcar como feita
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReschedule(1)}>
                  <Clock3 className="mr-1.5 h-4 w-4" /> +1 dia
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReschedule(7)}>
                  <Clock3 className="mr-1.5 h-4 w-4" /> +1 semana
                </Button>
                {(activity!.type === 'ligacao' || activity!.type === 'reuniao_virtual' || activity!.type === 'reuniao_presencial') && (
                  <Button size="sm" variant="outline" onClick={handleNoShow} className="col-span-2">
                    <PhoneOff className="mr-1.5 h-4 w-4" /> Não atendeu (replicar p/ amanhã)
                  </Button>
                )}
              </div>
            )}

            {!isCreating && (activity!.deal_code || activity!.lead_code) && (
              <Button size="sm" variant="ghost" onClick={openEntity} className="mb-4 h-auto px-2 py-1.5 text-xs">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Abrir {activity!.deal_code ?? activity!.lead_code}
              </Button>
            )}

            <ActivityForm value={form} onChange={setForm} />
          </div>

          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              {!isCreating && (
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">Cancelar</Button>
              <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {isCreating ? 'Criar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {dialog}
    </>
  );
}
