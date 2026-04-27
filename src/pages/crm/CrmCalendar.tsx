import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MultiFilter } from '@/components/crm/CrmFilters';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { useCalendarEvents } from '@/hooks/crm/useCalendar';
import { useCreateCalendarActivity, useUpdateCalendarActivity } from '@/hooks/crm/useCrmDashboard';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { ActivityType, DealActivity } from '@/types/crm';

const TYPE_LABEL: Record<ActivityType, string> = {
  reuniao_presencial: 'Reunião presencial',
  reuniao_virtual: 'Reunião virtual',
  ligacao: 'Ligação',
  email: 'Email',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
};

const STATUS_STYLES = {
  realizadas: 'border-success/30 bg-success/10 text-success',
  atrasadas: 'border-destructive/30 bg-destructive/10 text-destructive',
  agendadas: 'border-accent/30 bg-accent/10 text-accent',
};

function getStatus(activity: DealActivity) {
  if (activity.happened_at) return 'realizadas' as const;
  if (activity.scheduled_at && new Date(activity.scheduled_at).getTime() < Date.now()) return 'atrasadas' as const;
  return 'agendadas' as const;
}

function getHref(activity: DealActivity) {
  if (activity.deal_code) return `/crm/deals/${activity.deal_code}`;
  if (activity.lead_code) return `/crm/leads/${activity.lead_code}`;
  return null;
}

export default function CrmCalendar() {
  const navigate = useNavigate();
  const { data: actors = [] } = useCrmActors();
  const [currentMonth, setCurrentMonth] = usePersistedState('crm-calendar-month', format(new Date(), 'yyyy-MM-01'));
  const [view, setView] = usePersistedState<'month' | 'agenda'>('crm-calendar-view', 'month');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'reuniao_virtual' as ActivityType, scheduled_at: '', owner_actor_id: 'none', description: '' });

  const calendarTypes = useCrmHubStore((state) => state.calendarTypes);
  const calendarOwners = useCrmHubStore((state) => state.calendarOwners);
  const calendarStatuses = useCrmHubStore((state) => state.calendarStatuses);
  const setCalendarTypes = useCrmHubStore((state) => state.setCalendarTypes);
  const setCalendarOwners = useCrmHubStore((state) => state.setCalendarOwners);
  const setCalendarStatuses = useCrmHubStore((state) => state.setCalendarStatuses);

  const monthDate = new Date(`${currentMonth}T12:00:00`);
  const rangeStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const { data: events = [] } = useCalendarEvents({
    start: rangeStart,
    end: addDays(rangeEnd, 1),
    types: calendarTypes.length ? (calendarTypes as ActivityType[]) : undefined,
    owners: calendarOwners.length ? calendarOwners : undefined,
    statuses: calendarStatuses.length ? calendarStatuses : undefined,
  });
  const createActivity = useCreateCalendarActivity();
  const updateActivity = useUpdateCalendarActivity();

  const groupedByDay = useMemo(() => {
    const map = new Map<string, DealActivity[]>();
    for (const day of days) map.set(format(day, 'yyyy-MM-dd'), []);
    for (const event of events) {
      const date = event.scheduled_at ?? event.happened_at;
      if (!date) continue;
      const key = format(new Date(date), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [days, events]);

  const upcoming = events
    .slice()
    .sort((a, b) => new Date(a.scheduled_at ?? a.happened_at ?? 0).getTime() - new Date(b.scheduled_at ?? b.happened_at ?? 0).getTime());

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-lg border border-border bg-card/40 p-3 sm:p-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Calendário comercial</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Agenda real de reuniões, ligações, emails e follow-ups do CRM.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mobile: agenda only */}
          <div className="sm:hidden flex-1 text-xs text-muted-foreground text-center">Agenda</div>
          <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as 'month' | 'agenda')} className="hidden sm:flex">
            <ToggleGroupItem value="month">Mês</ToggleGroupItem>
            <ToggleGroupItem value="agenda">Agenda</ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" onClick={() => setOpen(true)} className="min-h-10 sm:min-h-9 shrink-0">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova atividade</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-lg border border-border bg-card/30 p-2 sm:p-3">
        <div className="flex flex-wrap gap-2">
          <MultiFilter label="Tipo" selected={calendarTypes} onChange={setCalendarTypes} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          <MultiFilter label="Owner" selected={calendarOwners} onChange={setCalendarOwners} options={actors.map((actor) => ({ value: actor.id, label: actor.display_name }))} />
          <MultiFilter label="Status" selected={calendarStatuses} onChange={setCalendarStatuses} options={[{ value: 'agendadas', label: 'Agendadas' }, { value: 'realizadas', label: 'Realizadas' }, { value: 'atrasadas', label: 'Atrasadas' }]} />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none min-h-10 sm:min-h-9" onClick={() => setCurrentMonth(format(subMonths(monthDate, 1), 'yyyy-MM-01'))}>Ant.</Button>
          <div className="flex-1 sm:min-w-[170px] text-center text-xs sm:text-sm font-medium text-foreground">{format(monthDate, "MMM 'de' yyyy", { locale: ptBR })}</div>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none min-h-10 sm:min-h-9" onClick={() => setCurrentMonth(format(addMonths(monthDate, 1), 'yyyy-MM-01'))}>Próx.</Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{view === 'month' ? 'Visão mensal' : 'Agenda do período'}</CardTitle>
            <CardDescription>{events.length} atividade(s) encontradas no recorte atual.</CardDescription>
          </CardHeader>
          <CardContent>
            {view === 'month' ? (
              <div className="hidden sm:grid grid-cols-7 gap-2">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
                ))}
                {days.map((day) => {
                  const items = groupedByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
                  return (
                    <div key={day.toISOString()} className="min-h-[148px] rounded-lg border border-border bg-background/40 p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className={isSameDay(day, new Date()) ? 'rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground' : 'text-xs font-semibold text-foreground'}>{format(day, 'dd')}</span>
                        <span className="text-[11px] text-muted-foreground">{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.slice(0, 3).map((item) => {
                          const status = getStatus(item);
                          const href = getHref(item);
                          return (
                            <button key={item.id} type="button" onClick={() => href && navigate(href)} className="w-full rounded-md border border-border bg-card/70 p-2 text-left transition hover:border-accent/50">
                              <p className="line-clamp-2 text-xs font-medium text-foreground">{item.title}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(item.scheduled_at ?? item.happened_at ?? new Date()), 'HH:mm')} · {TYPE_LABEL[item.type]}</p>
                              <Badge variant="outline" className={STATUS_STYLES[status]}>{status}</Badge>
                            </button>
                          );
                        })}
                        {items.length > 3 && <p className="text-[11px] text-muted-foreground">+ {items.length - 3} restante(s)</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade encontrada para os filtros atuais.</p>
                ) : (
                  upcoming.map((item) => {
                    const status = getStatus(item);
                    const href = getHref(item);
                    return (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3">
                        <div>
                          <button type="button" onClick={() => href && navigate(href)} className="text-left text-sm font-medium text-foreground hover:text-accent">{item.title}</button>
                          <p className="text-xs text-muted-foreground">{format(new Date(item.scheduled_at ?? item.happened_at ?? new Date()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · {TYPE_LABEL[item.type]}</p>
                          <p className="text-xs text-muted-foreground">{item.owner?.display_name ?? 'Sem responsável'} {item.deal_code ? `· ${item.deal_code}` : item.lead_code ? `· ${item.lead_code}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={STATUS_STYLES[status]}>{status}</Badge>
                          {!item.happened_at && (
                            <Button size="sm" variant="outline" onClick={() => updateActivity.mutate({ id: item.id, updates: { happened_at: new Date().toISOString() } })}>
                              <CheckCircle2 className="h-4 w-4" /> Marcar feita
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas e atrasadas</CardTitle>
            <CardDescription>Prioridade operacional do comercial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atividades no momento.</p>
            ) : (
              upcoming.slice(0, 10).map((item) => {
                const status = getStatus(item);
                const href = getHref(item);
                return (
                  <button key={item.id} type="button" onClick={() => href && navigate(href)} className="w-full rounded-lg border border-border bg-background/40 p-3 text-left transition hover:border-accent/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.scheduled_at ?? item.happened_at ?? new Date()), "dd/MM HH:mm", { locale: ptBR })}</p>
                      </div>
                      <Badge variant="outline" className={STATUS_STYLES[status]}>{status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{TYPE_LABEL[item.type]} · {item.owner?.display_name ?? 'Sem responsável'}</p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova atividade do calendário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as ActivityType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.owner_actor_id} onValueChange={(value) => setForm((current) => ({ ...current, owner_actor_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {actors.map((actor) => <SelectItem key={actor.id} value={actor.id}>{actor.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.title.trim() || !form.scheduled_at}
              onClick={() => {
                createActivity.mutate({
                  title: form.title,
                  type: form.type,
                  scheduled_at: new Date(form.scheduled_at).toISOString(),
                  owner_actor_id: form.owner_actor_id === 'none' ? null : form.owner_actor_id,
                  description: form.description || null,
                }, {
                  onSuccess: () => {
                    setOpen(false);
                    setForm({ title: '', type: 'reuniao_virtual', scheduled_at: '', owner_actor_id: 'none', description: '' });
                  },
                });
              }}
            >
              Criar atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
