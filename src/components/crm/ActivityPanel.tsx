import { useState } from 'react';
import { MoreVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ACTIVITY_ICON } from '@/constants/dealStages';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { useCreateActivityFull, useDeleteActivity, useUpdateActivity } from '@/hooks/crm/useCrmDetails';
import { cn } from '@/lib/utils';
import type { ActivityType, DealActivity } from '@/types/crm';

const ACTIVITY_LABEL: Record<ActivityType, string> = { reuniao_presencial: 'Reunião presencial', reuniao_virtual: 'Reunião virtual', ligacao: 'Ligação', email: 'Email', whatsapp: 'WhatsApp', outro: 'Outro' };
const TYPES = Object.keys(ACTIVITY_LABEL) as ActivityType[];

function relativeDate(value: string | null) {
  if (!value) return 'sem data';
  const days = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

export function ActivityPanel({ entity, activities }: { entity: { type: 'deal' | 'lead'; id: string }; activities: DealActivity[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'email' as ActivityType, title: '', description: '', scheduled_at: '', happened_at: '', duration_minutes: '', outcome: '', owner_actor_id: 'none', participants: '' });
  const { data: actors = [] } = useCrmActors();
  const create = useCreateActivityFull(entity);
  const update = useUpdateActivity();
  const remove = useDeleteActivity();
  const save = () => {
    create.mutate({ type: form.type, title: form.title, description: form.description || null, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null, happened_at: form.happened_at ? new Date(form.happened_at).toISOString() : null, duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null, outcome: form.outcome || null, owner_actor_id: form.owner_actor_id === 'none' ? null : form.owner_actor_id, participants: form.participants.split(',').map((p) => p.trim()).filter(Boolean) }, { onSuccess: () => { toast.success('Atividade criada'); setOpen(false); setForm({ type: 'email', title: '', description: '', scheduled_at: '', happened_at: '', duration_minutes: '', outcome: '', owner_actor_id: 'none', participants: '' }); }, onError: (e) => toast.error(e.message) });
  };
  return <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-foreground">Atividades</h2><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova atividade</Button></div>{activities.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada.</div> : <div className="space-y-3">{activities.map((a) => <article key={a.id} className="rounded-lg border border-border bg-card/40 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground"><span>{ACTIVITY_ICON[a.type]}</span><span>{ACTIVITY_LABEL[a.type]}</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{a.happened_at ? relativeDate(a.happened_at) : 'AGENDADA'}</span></div><p className="mt-1 text-base font-medium text-foreground">{a.title}</p>{a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}</div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!!a.happened_at} onClick={() => update.mutate({ id: a.id, updates: { happened_at: new Date().toISOString() } })}>Marcar como realizada</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(a.id)}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">{a.duration_minutes && <span>{a.duration_minutes} min</span>}{a.scheduled_at && <span>{new Date(a.scheduled_at).toLocaleString('pt-BR')}</span>}</div>{a.outcome && <div className={cn('prose prose-sm prose-invert mt-3 max-w-none text-sm')}><ReactMarkdown remarkPlugins={[remarkGfm]}>{a.outcome}</ReactMarkdown></div>}</article>)}</div>}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Nova atividade</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ActivityType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{ACTIVITY_LABEL[t]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Owner</Label><Select value={form.owner_actor_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_actor_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem owner</SelectItem>{actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div><div className="space-y-2 sm:col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div><div className="space-y-2"><Label>Agendar para</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} /></div><div className="space-y-2"><Label>Aconteceu em</Label><Input type="datetime-local" value={form.happened_at} onChange={(e) => setForm((f) => ({ ...f, happened_at: e.target.value }))} /></div><div className="space-y-2"><Label>Duração</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} /></div><div className="space-y-2"><Label>Participantes</Label><Input value={form.participants} onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))} placeholder="Nomes separados por vírgula" /></div><div className="space-y-2 sm:col-span-2"><Label>Outcome</Label><Textarea value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!form.title.trim()} onClick={save}>Criar atividade</Button></DialogFooter></DialogContent></Dialog></div>;
}
