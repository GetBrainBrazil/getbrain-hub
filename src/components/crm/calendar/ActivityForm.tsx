import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { ACTIVITY_TYPE_LABEL } from '@/lib/crm/activityColors';
import type { ActivityType } from '@/types/crm';
import { cn } from '@/lib/utils';
import { LinkToEntityCombobox, type EntityLink } from './LinkToEntityCombobox';

export interface ActivityFormState {
  title: string;
  type: ActivityType;
  date: Date | null;
  time: string; // HH:mm
  duration_minutes: number | null;
  owner_actor_id: string;
  description: string;
  link: EntityLink;
}

export function emptyActivityForm(initialDate?: Date): ActivityFormState {
  const d = initialDate ?? roundToNextHalfHour(new Date());
  return {
    title: '',
    type: 'reuniao_virtual',
    date: d,
    time: format(d, 'HH:mm'),
    duration_minutes: 30,
    owner_actor_id: 'none',
    description: '',
    link: null,
  };
}

function roundToNextHalfHour(d: Date) {
  const next = new Date(d);
  const m = next.getMinutes();
  next.setSeconds(0, 0);
  if (m === 0 || m === 30) return next;
  if (m < 30) next.setMinutes(30);
  else { next.setMinutes(0); next.setHours(next.getHours() + 1); }
  return next;
}

interface Props {
  value: ActivityFormState;
  onChange: (v: ActivityFormState) => void;
}

export function ActivityForm({ value, onChange }: Props) {
  const { data: actors = [] } = useCrmActors();

  const set = <K extends keyof ActivityFormState>(k: K, v: ActivityFormState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Título</Label>
        <Input
          value={value.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex.: Discovery — Acme Corp"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={value.type} onValueChange={(v) => set('type', v as ActivityType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ACTIVITY_TYPE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Duração (min)</Label>
          <Input
            type="number"
            min={5}
            step={5}
            value={value.duration_minutes ?? ''}
            onChange={(e) => set('duration_minutes', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start font-normal', !value.date && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.date ? format(value.date, 'dd/MM/yyyy') : 'Escolher'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.date ?? undefined}
                onSelect={(d) => set('date', d ?? null)}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hora</Label>
          <Input type="time" value={value.time} onChange={(e) => set('time', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Vincular a (Deal ou Lead)</Label>
        <LinkToEntityCombobox value={value.link} onChange={(v) => set('link', v)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Responsável</Label>
        <Select value={value.owner_actor_id} onValueChange={(v) => set('owner_actor_id', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notas</Label>
        <Textarea
          rows={3}
          value={value.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Pauta, links, contexto..."
        />
      </div>
    </div>
  );
}

export function buildScheduledIso(form: ActivityFormState): string | null {
  if (!form.date || !form.time) return null;
  const [h, m] = form.time.split(':').map(Number);
  const d = new Date(form.date);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}
