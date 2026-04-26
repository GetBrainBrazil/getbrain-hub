import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, ExternalLink, MoreVertical, Trash2, Trophy, XCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ActivityPanel } from '@/components/crm/ActivityPanel';
import { DetailBreadcrumb, DetailShell, InfoBadge, StageStepper } from '@/components/crm/CrmDetailShared';
import { DealWonDialog } from '@/components/crm/DealWonDialog';
import { MarkdownSplitEditor, MarkdownView } from '@/components/dev/MarkdownComposer';
import { DEAL_STAGE_LABEL, DEAL_STAGE_PROBABILITY, DEAL_STAGES, PROJECT_TYPE_LABEL, PROJECT_TYPE_OPTIONS } from '@/constants/dealStages';
import { useActivitiesForEntity, useDealByCode, useEntityAudit, useSoftDeleteDeal, useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { useCrmActors, usePeopleByCompany } from '@/hooks/crm/useCrmReference';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Deal, DealStage } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton as UISkeleton } from '@/components/ui/skeleton';
import { DealProposalsSection } from '@/components/orcamentos/DealProposalsSection';

function daysUntil(date: string | null) {
  if (!date) return 'sem previsão';
  const diff = Math.ceil((new Date(`${date}T12:00:00`).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `atrasado há ${Math.abs(diff)} dias`;
  if (diff === 0) return 'fecha hoje';
  return `fecha em ${diff} dias`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function Timeline({ rows }: { rows: { id: string; created_at: string; action: string; changes: Record<string, unknown> | null; actor?: { display_name: string } | null }[] }) {
  return <div className="space-y-3">{rows.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum evento registrado.</div> : rows.map((r) => <article key={r.id} className="rounded-lg border border-border bg-card/40 p-4 text-sm"><p className="font-medium text-foreground">{r.actor?.display_name ?? 'Sistema'} registrou {r.action}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</p>{r.changes && <pre className="mt-3 max-h-36 overflow-auto rounded bg-muted/30 p-2 text-[11px] text-muted-foreground">{JSON.stringify(r.changes, null, 2)}</pre>}</article>)}</div>;
}

function LostDialog({ deal, open, onOpenChange }: { deal: Deal | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [reason, setReason] = useState('');
  const update = useUpdateDealField(deal?.code);
  useEffect(() => { if (open) setReason(''); }, [open]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Marcar {deal?.code} como perdido</DialogTitle></DialogHeader><div className="space-y-2"><Label>Por que o deal foi perdido?</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cliente escolheu concorrente, orçamento não aprovado..." /></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="destructive" disabled={!reason.trim() || update.isPending || !deal} onClick={() => deal && update.mutate({ id: deal.id, updates: { stage: 'fechado_perdido', probability_pct: 0, closed_at: new Date().toISOString(), lost_reason: reason } }, { onSuccess: () => { toast.success('Deal marcado como perdido'); onOpenChange(false); } })}>Marcar como perdido</Button></DialogFooter></DialogContent></Dialog>;
}

function DealSidebar({ deal, onWon, onLost }: { deal: Deal; onWon: () => void; onLost: () => void }) {
  const update = useUpdateDealField(deal.code);
  const { data: actors = [] } = useCrmActors();
  const { data: contacts = [] } = usePeopleByCompany(deal.company_id);
  const save = (updates: Partial<Deal>) => update.mutate({ id: deal.id, updates });
  const changeStage = (stage: DealStage) => {
    if (stage === 'fechado_ganho') return onWon();
    if (stage === 'fechado_perdido') return onLost();
    save({ stage, probability_pct: DEAL_STAGE_PROBABILITY[stage], closed_at: null });
  };
  return <aside className="space-y-5 rounded-lg border border-border bg-card/30 p-4"><Field label="Stage"><Select value={deal.stage} onValueChange={(v) => changeStage(v as DealStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{DEAL_STAGE_LABEL[s]}</SelectItem>)}</SelectContent></Select></Field><Field label="Probabilidade"><div className="flex items-center gap-3"><Slider value={[deal.probability_pct]} min={0} max={100} step={5} onValueChange={([v]) => save({ probability_pct: v })} /><span className="w-10 text-right text-sm text-foreground">{deal.probability_pct}%</span></div></Field><Field label="Valor"><Input type="number" defaultValue={deal.estimated_value ?? ''} onBlur={(e) => save({ estimated_value: e.target.value ? Number(e.target.value) : null })} /></Field><Field label="Fecha em"><Input type="date" value={deal.expected_close_date ?? ''} onChange={(e) => save({ expected_close_date: e.target.value || null })} /><p className="text-xs text-muted-foreground">{daysUntil(deal.expected_close_date)}</p></Field><Field label="Tipo de projeto"><Select value={deal.project_type ?? 'none'} onValueChange={(v) => save({ project_type: v === 'none' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem tipo</SelectItem>{PROJECT_TYPE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{PROJECT_TYPE_LABEL[p]}</SelectItem>)}</SelectContent></Select></Field><Field label="Empresa"><Button asChild variant="outline" className="w-full justify-start"><Link to={`/crm/empresas/${deal.company_id}`}>{deal.company?.trade_name || deal.company?.legal_name}</Link></Button></Field><Field label="Contato"><Select value={deal.contact_person_id ?? 'none'} onValueChange={(v) => save({ contact_person_id: v === 'none' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem contato</SelectItem>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Owner"><Select value={deal.owner_actor_id ?? 'none'} onValueChange={(v) => save({ owner_actor_id: v === 'none' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem owner</SelectItem>{actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Origem">{deal.origin_lead_id ? <Link className="text-sm text-accent hover:underline" to={`/crm/leads/${deal.origin_source ?? ''}`}>Lead original</Link> : <p className="text-sm text-muted-foreground">Criado direto</p>}</Field><Field label="Metadata"><div className="space-y-1 text-xs text-muted-foreground"><p>Stage alterado: {new Date(deal.stage_changed_at).toLocaleString('pt-BR')}</p>{deal.closed_at && <p>Fechado: {new Date(deal.closed_at).toLocaleString('pt-BR')}</p>}</div></Field></aside>;
}

export default function CrmDealDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDealByCode(code);
  const { data: activities = [] } = useActivitiesForEntity('deal', deal?.id);
  const { data: audit = [] } = useEntityAudit('deal', deal?.id);
  const update = useUpdateDealField(code);
  const remove = useSoftDeleteDeal();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [scopeEditing, setScopeEditing] = useState(false);
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');
  const [wonOpen, setWonOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const closed = deal?.stage === 'fechado_ganho' || deal?.stage === 'fechado_perdido';
  useEffect(() => { if (deal) { setTitle(deal.title); setScope(deal.scope_summary ?? ''); setNotes(deal.notes ?? ''); } }, [deal?.id, deal?.title, deal?.scope_summary, deal?.notes]);
  const saveTitle = () => { if (deal && title.trim() && title !== deal.title) update.mutate({ id: deal.id, updates: { title: title.trim() } }); setEditingTitle(false); };
  const stageChange = (s: DealStage) => { if (!deal) return; if (s === 'fechado_ganho') return setWonOpen(true); if (s === 'fechado_perdido') return setLostOpen(true); update.mutate({ id: deal.id, updates: { stage: s, probability_pct: DEAL_STAGE_PROBABILITY[s], closed_at: null } }); };
  const reopen = () => deal && update.mutate({ id: deal.id, updates: { stage: 'em_negociacao', probability_pct: 75, closed_at: null } }, { onSuccess: () => toast.success('Deal reaberto') });
  const copyLink = async () => { await navigator.clipboard.writeText(window.location.href); toast.success('Link copiado'); };
  if (isLoading) return <DetailShell><Skeleton className="h-8 w-64" /><Skeleton className="mt-4 h-40 w-full" /></DetailShell>;
  if (!deal) return <DetailShell><div className="py-20 text-center"><h1 className="text-2xl font-semibold">Deal não encontrado</h1><Button asChild className="mt-4"><Link to="/crm/pipeline">Voltar</Link></Button></div></DetailShell>;
  return <DetailShell><DetailBreadcrumb closeTo="/crm/pipeline" items={[{ label: 'CRM', to: '/crm/pipeline' }, { label: 'Pipeline', to: '/crm/pipeline' }, { label: deal.code }]} /><header className="mb-6 space-y-4 rounded-lg border border-border bg-card/30 p-5"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-mono font-semibold text-muted-foreground">{deal.code}</span><InfoBadge><Link to={`/crm/empresas/${deal.company_id}`}>{deal.company?.trade_name || deal.company?.legal_name}</Link></InfoBadge>{deal.project_type && <InfoBadge>{PROJECT_TYPE_LABEL[deal.project_type] ?? deal.project_type}</InfoBadge>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-auto h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={copyLink}><Copy className="h-4 w-4" /> Copiar link</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(deal.id, { onSuccess: () => navigate('/crm/pipeline') })}><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>{editingTitle ? <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }} className="h-auto text-2xl font-semibold" /> : <h1 onClick={() => setEditingTitle(true)} className="cursor-text text-2xl font-semibold text-foreground">{deal.title}</h1>}<div className="flex flex-wrap gap-4 text-sm"><span>{formatCurrency(Number(deal.estimated_value ?? 0))}</span><span>{deal.probability_pct}% probabilidade</span><span className={cn(daysUntil(deal.expected_close_date).includes('atrasado') && 'text-destructive')}>{daysUntil(deal.expected_close_date)}</span></div><StageStepper stage={deal.stage} onChange={stageChange} /><div className="flex flex-wrap gap-2">{closed ? <Button onClick={reopen}>Reabrir deal</Button> : <><Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setWonOpen(true)}><Trophy className="h-4 w-4" /> Fechar como Ganho</Button><Button variant="outline" className="text-destructive" onClick={() => setLostOpen(true)}><XCircle className="h-4 w-4" /> Marcar como Perdido</Button></>}</div></header><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><main className="min-w-0"><Tabs defaultValue="scope"><TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"><TabsTrigger value="scope">Escopo</TabsTrigger><TabsTrigger value="activities">Atividades</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger></TabsList><TabsContent value="scope" className="mt-5 space-y-6"><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Escopo detalhado</h2><Button size="sm" variant="outline" onClick={() => scopeEditing ? update.mutate({ id: deal.id, updates: { scope_summary: scope } }, { onSuccess: () => setScopeEditing(false) }) : setScopeEditing(true)}>{scopeEditing ? 'Salvar escopo' : 'Editar escopo'}</Button></div>{scopeEditing ? <MarkdownSplitEditor value={scope} onChange={setScope} /> : scope ? <MarkdownView source={scope} /> : <div className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">Nenhum escopo detalhado ainda.</div>}</section><section className="space-y-3"><h2 className="text-lg font-semibold">Proposta</h2><Input placeholder="URL da proposta" defaultValue={deal.proposal_url ?? ''} onBlur={(e) => update.mutate({ id: deal.id, updates: { proposal_url: e.target.value || null } })} />{deal.proposal_url && <Button asChild variant="outline" size="sm"><a href={deal.proposal_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir proposta</a></Button>}</section><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Notas</h2><Button size="sm" variant="outline" onClick={() => update.mutate({ id: deal.id, updates: { notes } })}>Salvar notas</Button></div><MarkdownSplitEditor value={notes} onChange={setNotes} minHeight={180} /></section></TabsContent><TabsContent value="activities" className="mt-5"><ActivityPanel entity={{ type: 'deal', id: deal.id }} activities={activities} /></TabsContent><TabsContent value="timeline" className="mt-5"><Timeline rows={audit} /></TabsContent></Tabs></main><DealSidebar deal={deal} onWon={() => setWonOpen(true)} onLost={() => setLostOpen(true)} /></div><DealWonDialog deal={deal} open={wonOpen} onOpenChange={setWonOpen} onSuccess={(projectId) => navigate(`/projetos/${projectId}`)} /><LostDialog deal={deal} open={lostOpen} onOpenChange={setLostOpen} /></DetailShell>;
}
