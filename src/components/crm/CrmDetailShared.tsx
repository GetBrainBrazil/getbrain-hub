import { Link } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEAL_STAGE_LABEL, DEAL_STAGES } from '@/constants/dealStages';
import { cn } from '@/lib/utils';
import type { DealStage } from '@/types/crm';

export function DetailShell({ children }: { children: React.ReactNode }) { return <div className="mx-auto max-w-[1600px] px-1 pb-12 animate-fade-in">{children}</div>; }
export function DetailBreadcrumb({ items, closeTo }: { items: { label: string; to?: string }[]; closeTo: string }) { return <div className="mb-3 flex items-center justify-between"><nav className="flex items-center gap-1.5 text-xs text-muted-foreground">{items.map((item, i) => <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">{i > 0 && <ChevronRight className="h-3 w-3" />}{item.to ? <Link to={item.to} className="hover:text-foreground">{item.label}</Link> : <span className="font-mono text-foreground">{item.label}</span>}</span>)}</nav><Button asChild variant="ghost" size="icon" className="h-8 w-8"><Link to={closeTo}><X className="h-4 w-4" /></Link></Button></div>; }
export function StageStepper({ stage, onChange }: { stage: DealStage; onChange?: (stage: DealStage) => void }) { const index = DEAL_STAGES.indexOf(stage); return <div className="flex items-center gap-1.5">{DEAL_STAGES.map((s, i) => <button key={s} type="button" onClick={() => onChange?.(s)} className="group flex flex-1 items-center gap-1 disabled:pointer-events-none" disabled={!onChange}><span className={cn('h-3 w-3 shrink-0 rounded-full border transition', i <= index ? 'border-accent bg-accent' : 'border-border bg-background', s === stage && 'ring-2 ring-accent/30')} /><span className={cn('h-0.5 flex-1 rounded bg-border group-last:hidden', i < index && 'bg-accent')} /><span className="sr-only">{DEAL_STAGE_LABEL[s]}</span></button>)}</div>; }
export function InfoBadge({ children, className }: { children: React.ReactNode; className?: string }) { return <Badge variant="outline" className={cn('rounded-md border-border bg-muted/40 font-normal', className)}>{children}</Badge>; }
