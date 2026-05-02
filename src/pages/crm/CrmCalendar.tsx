import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, addMonths, endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MultiFilter } from '@/components/crm/CrmFilters';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { useCalendarEvents, useCalendarKpis } from '@/hooks/crm/useCalendar';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useIsMobile } from '@/hooks/use-mobile';
import { ACTIVITY_TYPE_LABEL } from '@/lib/crm/activityColors';
import type { ActivityType, DealActivity } from '@/types/crm';
import { TodayView } from '@/components/crm/calendar/TodayView';
import { WeekView } from '@/components/crm/calendar/WeekView';
import { MonthView } from '@/components/crm/calendar/MonthView';
import { AgendaView } from '@/components/crm/calendar/AgendaView';
import { CalendarKpis } from '@/components/crm/calendar/CalendarKpis';
import { ActivityDrawer } from '@/components/crm/calendar/ActivityDrawer';

type ViewMode = 'today' | 'week' | 'month' | 'agenda';

export default function CrmCalendar() {
  const isMobile = useIsMobile();
  const { data: actors = [] } = useCrmActors();

  // anchor = data de referência da view atual
  const [anchorIso, setAnchorIso] = usePersistedState('crm-calendar-anchor-v2', new Date().toISOString());
  const [view, setView] = usePersistedState<ViewMode>('crm-calendar-view-v2', isMobile ? 'today' : 'week');

  // Filtros (compartilhados via store)
  const calendarTypes = useCrmHubStore((s) => s.calendarTypes);
  const calendarOwners = useCrmHubStore((s) => s.calendarOwners);
  const calendarStatuses = useCrmHubStore((s) => s.calendarStatuses);
  const setCalendarTypes = useCrmHubStore((s) => s.setCalendarTypes);
  const setCalendarOwners = useCrmHubStore((s) => s.setCalendarOwners);
  const setCalendarStatuses = useCrmHubStore((s) => s.setCalendarStatuses);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerActivity, setDrawerActivity] = useState<DealActivity | null>(null);
  const [drawerInitialDate, setDrawerInitialDate] = useState<Date | undefined>(undefined);

  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);

  // Calcula range conforme view
  const { start, end, rangeLabel } = useMemo(() => {
    if (view === 'today') {
      const s = startOfDay(anchor);
      const e = endOfDay(anchor);
      return { start: s, end: e, rangeLabel: format(s, "EEE, dd 'de' MMM", { locale: ptBR }) };
    }
    if (view === 'week') {
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      const e = endOfWeek(anchor, { weekStartsOn: 1 });
      return { start: s, end: e, rangeLabel: `${format(s, 'dd MMM', { locale: ptBR })} – ${format(e, "dd MMM yyyy", { locale: ptBR })}` };
    }
    if (view === 'month') {
      const s = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
      const e = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
      return { start: s, end: e, rangeLabel: format(anchor, "MMMM 'de' yyyy", { locale: ptBR }) };
    }
    // agenda: ±30 dias
    const s = subDays(startOfDay(anchor), 7);
    const e = addDays(endOfDay(anchor), 30);
    return { start: s, end: e, rangeLabel: 'Próximos 30 dias' };
  }, [view, anchor]);

  const { data: events = [] } = useCalendarEvents({
    start,
    end: addDays(end, 1),
    types: calendarTypes.length ? (calendarTypes as ActivityType[]) : undefined,
    owners: calendarOwners.length ? calendarOwners : undefined,
    statuses: calendarStatuses.length ? calendarStatuses : undefined,
  });

  const { data: kpis } = useCalendarKpis({
    types: calendarTypes.length ? (calendarTypes as ActivityType[]) : undefined,
    owners: calendarOwners.length ? calendarOwners : undefined,
  });

  const goPrev = () => {
    const d =
      view === 'today' ? subDays(anchor, 1) :
      view === 'week' ? subDays(anchor, 7) :
      view === 'month' ? subMonths(anchor, 1) :
      subDays(anchor, 7);
    setAnchorIso(d.toISOString());
  };
  const goNext = () => {
    const d =
      view === 'today' ? addDays(anchor, 1) :
      view === 'week' ? addDays(anchor, 7) :
      view === 'month' ? addMonths(anchor, 1) :
      addDays(anchor, 7);
    setAnchorIso(d.toISOString());
  };
  const goToday = () => setAnchorIso(new Date().toISOString());

  const openCreate = (slot?: Date) => {
    setDrawerActivity(null);
    setDrawerInitialDate(slot);
    setDrawerOpen(true);
  };
  const openEdit = (a: DealActivity) => {
    setDrawerActivity(a);
    setDrawerInitialDate(undefined);
    setDrawerOpen(true);
  };

  const handleKpiPick = (k: 'hoje' | 'atrasadas' | 'semana' | 'feitas7d') => {
    if (k === 'feitas7d') {
      setCalendarStatuses(['realizadas']);
      setView('agenda');
      goToday();
      return;
    }
    if (k === 'atrasadas') {
      setCalendarStatuses(['atrasadas']);
      setView('agenda');
      return;
    }
    if (k === 'hoje') {
      setCalendarStatuses([]);
      setView('today');
      goToday();
      return;
    }
    if (k === 'semana') {
      setCalendarStatuses([]);
      setView('week');
      goToday();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">Calendário comercial</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Sua central operacional: o que precisa ser feito hoje, esta semana e o que está atrasado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} className="hidden sm:flex">
            <ToggleGroupItem value="today" className="px-3 text-xs">Hoje</ToggleGroupItem>
            <ToggleGroupItem value="week" className="px-3 text-xs">Semana</ToggleGroupItem>
            <ToggleGroupItem value="month" className="px-3 text-xs">Mês</ToggleGroupItem>
            <ToggleGroupItem value="agenda" className="px-3 text-xs">Agenda</ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => openCreate()} size="sm" className="min-h-9 shrink-0">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nova atividade</span>
          </Button>
        </div>
      </div>

      {/* Mobile view switcher */}
      <div className="sm:hidden">
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} className="w-full">
          <ToggleGroupItem value="today" className="flex-1 text-xs">Hoje</ToggleGroupItem>
          <ToggleGroupItem value="week" className="flex-1 text-xs">Semana</ToggleGroupItem>
          <ToggleGroupItem value="month" className="flex-1 text-xs">Mês</ToggleGroupItem>
          <ToggleGroupItem value="agenda" className="flex-1 text-xs">Agenda</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* KPIs */}
      <CalendarKpis
        hoje={kpis?.hoje ?? 0}
        atrasadas={kpis?.atrasadas ?? 0}
        semana={kpis?.semana ?? 0}
        feitas7d={kpis?.feitas7d ?? 0}
        loading={!kpis}
        onPick={handleKpiPick}
      />

      {/* Toolbar: filtros + navegação */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/30 p-2 sm:flex-row sm:flex-wrap sm:items-center sm:p-3">
        <div className="flex flex-wrap gap-2">
          <MultiFilter
            label="Tipo"
            selected={calendarTypes}
            onChange={setCalendarTypes}
            options={Object.entries(ACTIVITY_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <MultiFilter
            label="Owner"
            selected={calendarOwners}
            onChange={setCalendarOwners}
            options={actors.map((a) => ({ value: a.id, label: a.display_name }))}
          />
          <MultiFilter
            label="Status"
            selected={calendarStatuses}
            onChange={setCalendarStatuses}
            options={[
              { value: 'agendadas', label: 'Agendadas' },
              { value: 'realizadas', label: 'Realizadas' },
              { value: 'atrasadas', label: 'Atrasadas' },
            ]}
          />
        </div>
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={goPrev} className="h-9 w-9 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center text-xs font-medium capitalize text-foreground sm:text-sm">
            {rangeLabel}
          </div>
          <Button variant="outline" size="sm" onClick={goNext} className="h-9 w-9 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="h-9">Hoje</Button>
        </div>
      </div>

      {/* View atual */}
      <div>
        {view === 'today' && (
          <TodayView
            date={anchor}
            events={events}
            onPick={openEdit}
            onCreateAt={(slot) => openCreate(slot)}
          />
        )}
        {view === 'week' && (
          <WeekView
            weekAnchor={anchor}
            events={events}
            onPick={openEdit}
            onCreateAt={(slot) => openCreate(slot)}
          />
        )}
        {view === 'month' && (
          <MonthView
            monthAnchor={anchor}
            events={events}
            onPickDay={(d) => { setAnchorIso(d.toISOString()); setView('week'); }}
          />
        )}
        {view === 'agenda' && (
          <AgendaView events={events} onPick={openEdit} />
        )}
      </div>

      <ActivityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activity={drawerActivity}
        initialDate={drawerInitialDate}
      />
    </div>
  );
}
