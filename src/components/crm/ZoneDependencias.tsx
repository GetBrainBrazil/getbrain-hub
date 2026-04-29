import { useMemo, useState } from 'react';
import { Plus, Filter as FilterIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  useDealDependencies, useCreateDealDependency,
  useUpdateDealDependency, useDeleteDealDependency,
} from '@/hooks/crm/useDealDependencies';
import type { DealDependency, DealDependencyStatus } from '@/types/crm';
import { DependencyCard } from './DependencyCard';
import { DependencyFullScreenForm, type DependencyFormPayload } from './DependencyFullScreenForm';

interface Props {
  dealId: string;
  dealCode?: string;
  dealTitle?: string;
}

type FilterKey = 'todas' | 'pendentes' | 'atrasadas' | 'blockers' | 'liberadas';

function computeDisplayStatus(dep: DealDependency): DealDependencyStatus {
  if (dep.status === 'liberado') return 'liberado';
  if (!dep.agreed_deadline) return dep.status;
  const today = new Date().toISOString().slice(0, 10);
  if (dep.agreed_deadline < today) return 'atrasado';
  return dep.status;
}

export function ZoneDependencias({ dealId, dealCode, dealTitle }: Props) {
  const { data: deps = [], isLoading } = useDealDependencies(dealId);
  const createDep = useCreateDealDependency();
  const updateDep = useUpdateDealDependency();
  const deleteDep = useDeleteDealDependency();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [editing, setEditing] = useState<DealDependency | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('todas');

  const enriched = useMemo(
    () => deps.map((d) => ({ dep: d, displayStatus: computeDisplayStatus(d) })),
    [deps],
  );

  const counts = useMemo(() => {
    const total = enriched.length;
    const overdue = enriched.filter((e) => e.displayStatus === 'atrasado').length;
    const blockers = enriched.filter((e) => e.dep.is_blocker && e.displayStatus !== 'liberado').length;
    const released = enriched.filter((e) => e.displayStatus === 'liberado').length;
    const pending = total - released;
    return { total, overdue, blockers, released, pending };
  }, [enriched]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'pendentes': return enriched.filter((e) => e.displayStatus !== 'liberado');
      case 'atrasadas': return enriched.filter((e) => e.displayStatus === 'atrasado');
      case 'blockers': return enriched.filter((e) => e.dep.is_blocker && e.displayStatus !== 'liberado');
      case 'liberadas': return enriched.filter((e) => e.displayStatus === 'liberado');
      default: return enriched;
    }
  }, [enriched, filter]);

  const handleDelete = async (dep: DealDependency) => {
    const ok = await confirm({
      title: 'Remover dependência?',
      description: `"${dep.description}" será removida. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteDep.mutateAsync({ id: dep.id, deal_id: dealId });
      toast.success('Dependência removida');
    } catch (e: any) {
      toast.error('Erro ao remover', { description: e?.message });
    }
  };

  const handleMarkReleased = async (dep: DealDependency) => {
    try {
      await updateDep.mutateAsync({
        id: dep.id,
        deal_id: dealId,
        updates: { status: 'liberado' },
      });
      toast.success('Marcada como liberada');
    } catch (e: any) {
      toast.error('Erro ao atualizar', { description: e?.message });
    }
  };

  const handleSubmit = async (mode: 'create' | 'edit', payload: DependencyFormPayload) => {
    if (mode === 'create') {
      await createDep.mutateAsync({ deal_id: dealId, ...payload });
      toast.success('Dependência adicionada');
    } else if (editing) {
      await updateDep.mutateAsync({
        id: editing.id,
        deal_id: dealId,
        updates: payload,
      });
      toast.success('Dependência atualizada');
    }
  };

  const filterChips: { key: FilterKey; label: string; count?: number; tone?: 'destructive' | 'warning' | 'success' }[] = [
    { key: 'todas', label: 'Todas', count: counts.total },
    { key: 'pendentes', label: 'Pendentes', count: counts.pending },
    { key: 'atrasadas', label: 'Atrasadas', count: counts.overdue, tone: 'destructive' },
    { key: 'blockers', label: 'Blockers', count: counts.blockers, tone: 'destructive' },
    { key: 'liberadas', label: 'Liberadas', count: counts.released, tone: 'success' },
  ];

  return (
    <section id="zona-dependencias" className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
      <header className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">04</span>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Dependências externas</h2>
          {counts.total > 0 ? (
            <span className="text-xs text-muted-foreground">
              {counts.total} {counts.total === 1 ? 'total' : 'totais'}
              {counts.overdue > 0 && (
                <> · <span className="font-medium text-destructive">{counts.overdue} atrasada{counts.overdue > 1 ? 's' : ''}</span></>
              )}
              {counts.blockers > 0 && (
                <> · <span className="font-medium text-destructive">{counts.blockers} blocker{counts.blockers > 1 ? 's' : ''}</span></>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Nenhuma dependência registrada</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="h-8 gap-1.5 self-start sm:self-auto">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </header>

      {/* Filter chips */}
      {counts.total > 0 && (
        <div className="mb-4 -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          <FilterIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                filter === chip.key
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {chip.label}
              {typeof chip.count === 'number' && (
                <span className={cn(
                  'rounded-full px-1.5 text-[10px] font-mono',
                  filter === chip.key ? 'bg-accent/25' : 'bg-muted',
                  chip.tone === 'destructive' && chip.count > 0 && filter !== chip.key && 'bg-destructive/15 text-destructive',
                )}>
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : counts.total === 0 ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="group flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/30 px-6 py-10 text-center transition-colors hover:border-accent/40 hover:bg-background/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/50 text-muted-foreground transition-colors group-hover:border-accent/40 group-hover:text-accent">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Nenhuma dependência registrada</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Liste o que precisa ser combinado/recebido do cliente para o projeto rodar.
            </div>
          </div>
        </button>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma dependência neste filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ dep, displayStatus }) => (
            <DependencyCard
              key={dep.id}
              dep={dep}
              displayStatus={displayStatus}
              onEdit={() => setEditing(dep)}
              onDelete={() => handleDelete(dep)}
              onMarkReleased={() => handleMarkReleased(dep)}
            />
          ))}
        </div>
      )}

      <DependencyFullScreenForm
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        dealCode={dealCode}
        dealTitle={dealTitle}
        onSubmit={(payload) => handleSubmit('create', payload)}
      />

      <DependencyFullScreenForm
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        mode="edit"
        dealCode={dealCode}
        dealTitle={dealTitle}
        initial={editing ?? undefined}
        onSubmit={(payload) => handleSubmit('edit', payload)}
      />

      {confirmDialog}
    </section>
  );
}
