import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderKanban, Sparkles, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ACTIVITY_ICON } from '@/constants/dealStages';
import {
  useActivitiesForEntity, useEntityAudit, useUpdateDealField,
} from '@/hooks/crm/useCrmDetails';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Deal, DealActivity } from '@/types/crm';

const sb = supabase as any;

interface Props {
  deal: Deal;
}

const ZONES = [
  { id: 'zona-cliente', n: 1, label: 'Cliente', hint: 'Dados da empresa, contatos e tipo de cliente (B2B/B2C).' },
  { id: 'zona-dor', n: 2, label: 'Dor', hint: 'Dor identificada, categoria, custo mensal e solução atual.' },
  { id: 'zona-solucao', n: 3, label: 'Solução', hint: 'Escopo, entregáveis, critérios de aceite, premissas e estimativa.' },
  { id: 'zona-dependencias', n: 4, label: 'Dependências', loop: '2C' as const, hint: 'Acessos, dados, pessoas e autorizações necessárias para iniciar.' },
  { id: 'zona-comercial', n: 5, label: 'Comercial', hint: 'Valores, orçamento, decisores, concorrentes e próximos passos.' },
];

function useLeadOrigin(leadId: string | null) {
  return useQuery({
    queryKey: ['crm-deal-lead-origin', leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<{ id: string; code: string; title: string } | null> => {
      const { data, error } = await sb.from('leads').select('id, code, title').eq('id', leadId).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

function useGeneratedProject(projectId: string | null) {
  return useQuery({
    queryKey: ['crm-deal-generated-project', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<{ id: string; code: string; name: string; status: string } | null> => {
      const { data, error } = await sb.from('projects').select('id, code, name, status').eq('id', projectId).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

function ActivityRow({ a }: { a: DealActivity }) {
  const dt = a.happened_at ?? a.scheduled_at;
  const dtLabel = dt ? new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const isPast = !!a.happened_at;
  return (
    <li className="flex items-start gap-2 border-b border-border/40 py-2 last:border-b-0">
      <span className="mt-0.5 text-base leading-none">{ACTIVITY_ICON[a.type]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{a.title}</p>
        <p className="text-[10px] text-muted-foreground">
          <span className={cn(isPast ? 'text-success' : 'text-warning')}>{isPast ? 'feita' : 'agendada'}</span>
          {' · '}
          <span className="font-mono">{dtLabel}</span>
        </p>
      </div>
    </li>
  );
}

function StageHistoryRow({ row }: { row: { created_at: string; changes: any } }) {
  const stageChange = row.changes?.stage as { from?: string; to?: string } | undefined;
  if (!stageChange?.to) return null;
  return (
    <li className="flex items-start gap-2 border-b border-border/40 py-1.5 last:border-b-0">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-foreground">
          <span className="text-muted-foreground">{stageChange.from ?? '—'}</span>
          {' → '}
          <span className="font-medium">{stageChange.to}</span>
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </li>
  );
}

export function DealSidebarRich({ deal }: Props) {
  const { data: actors } = useCrmActors();
  const { data: activities, isLoading: actLoading } = useActivitiesForEntity('deal', deal.id);
  const { data: audit } = useEntityAudit('deal', deal.id);
  const { data: leadOrigin } = useLeadOrigin(deal.origin_lead_id);
  const { data: project } = useGeneratedProject(deal.generated_project_id);
  const updateDeal = useUpdateDealField(deal.code);

  const recentActivities = useMemo(() => (activities ?? []).slice(0, 5), [activities]);
  const stageHistory = useMemo(() => {
    return (audit ?? [])
      .filter((r: any) => r.changes?.stage?.to)
      .slice(0, 5);
  }, [audit]);

  const setOwner = (actorId: string) => {
    updateDeal.mutate(
      { id: deal.id, updates: { owner_actor_id: actorId === '__none' ? null : actorId } },
      { onError: (e: any) => toast.error(`Erro: ${e?.message ?? 'falhou'}`) },
    );
  };

  return (
    <aside className="space-y-4">
      {/* Navegação por zonas */}
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navegação</h3>
        <nav className="space-y-1">
          {ZONES.map((z) => (
            <a
              key={z.id}
              href={`#${z.id}`}
              className={cn(
                'flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors',
                z.loop ? 'text-muted-foreground hover:bg-muted/20' : 'text-foreground hover:bg-muted/40',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">0{z.n}</span>
                {z.label}
              </span>
              {z.loop && (
                <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {z.loop}
                </span>
              )}
            </a>
          ))}
        </nav>
      </div>

      {/* Owner editável */}
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <UserCircle2 className="h-3.5 w-3.5" /> Owner
        </h3>
        <Select value={deal.owner_actor_id ?? '__none'} onValueChange={setOwner}>
          <SelectTrigger className="bg-background/60">
            <SelectValue placeholder="Sem owner">
              {deal.owner ? (
                <span className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    {deal.owner.avatar_url && <AvatarImage src={deal.owner.avatar_url} />}
                    <AvatarFallback className="text-[9px]">
                      {deal.owner.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{deal.owner.display_name}</span>
                </span>
              ) : '—'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— sem owner —</SelectItem>
            {(actors ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Atividades recentes */}
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atividades recentes</h3>
          {(activities ?? []).length > 5 && (
            <span className="font-mono text-[10px] text-muted-foreground">
              5 de {activities!.length}
            </span>
          )}
        </div>
        {actLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : recentActivities.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
        ) : (
          <ul>{recentActivities.map((a) => <ActivityRow key={a.id} a={a} />)}</ul>
        )}
      </div>

      {/* Histórico de stage */}
      {stageHistory.length > 0 && (
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico de stage</h3>
          <ul>{stageHistory.map((r: any) => <StageHistoryRow key={r.id} row={r} />)}</ul>
        </div>
      )}

      {/* Origem (lead) */}
      {leadOrigin && (
        <Link
          to={`/crm/leads/${leadOrigin.code}`}
          className="flex items-start gap-3 rounded-lg border border-border bg-card/30 p-4 transition-colors hover:border-accent/40 hover:bg-card/50"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Veio do lead</p>
            <p className="font-mono text-xs text-foreground">{leadOrigin.code}</p>
            <p className="truncate text-xs text-muted-foreground">{leadOrigin.title}</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      )}

      {/* Projeto gerado */}
      {project && (
        <Link
          to={`/projetos/${project.code}`}
          className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/5 p-4 transition-colors hover:bg-success/10"
        >
          <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-success">Projeto gerado</p>
            <p className="font-mono text-xs text-foreground">{project.code}</p>
            <p className="truncate text-xs text-muted-foreground">{project.name}</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
        </Link>
      )}
    </aside>
  );
}
