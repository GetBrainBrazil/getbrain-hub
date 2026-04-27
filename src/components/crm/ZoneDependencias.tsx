import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  DEPENDENCY_TYPE_LABEL, DEPENDENCY_TYPE_OPTIONS, DEPENDENCY_TYPE_COLOR,
  DEPENDENCY_STATUS_LABEL, DEPENDENCY_STATUS_OPTIONS, DEPENDENCY_STATUS_COLOR,
} from '@/constants/dealEnumLabels';
import {
  useDealDependencies, useCreateDealDependency,
  useUpdateDealDependency, useDeleteDealDependency,
} from '@/hooks/crm/useDealDependencies';
import type { DealDependency, DealDependencyStatus, DealDependencyType } from '@/types/crm';

interface Props {
  dealId: string;
}

function formatDeadline(deadline: string | null, displayStatus: DealDependencyStatus): string {
  if (!deadline) return '—';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const fmt = d.toLocaleDateString('pt-BR');
  if (displayStatus === 'liberado') return fmt;
  if (diff < 0) return `${fmt} · ${Math.abs(diff)}d atraso`;
  if (diff === 0) return `${fmt} · hoje`;
  return `${fmt} · em ${diff}d`;
}

function computeDisplayStatus(dep: DealDependency): DealDependencyStatus {
  if (dep.status === 'liberado') return 'liberado';
  if (!dep.agreed_deadline) return dep.status;
  const today = new Date().toISOString().slice(0, 10);
  if (dep.agreed_deadline < today) return 'atrasado';
  return dep.status;
}

export function ZoneDependencias({ dealId }: Props) {
  const { data: deps = [], isLoading } = useDealDependencies(dealId);
  const createDep = useCreateDealDependency();
  const updateDep = useUpdateDealDependency();
  const deleteDep = useDeleteDealDependency();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [editing, setEditing] = useState<DealDependency | null>(null);
  const [creating, setCreating] = useState(false);

  const overdueCount = useMemo(
    () => deps.filter((d) => computeDisplayStatus(d) === 'atrasado').length,
    [deps],
  );

  const headerCount =
    deps.length === 0
      ? 'Nenhuma dependência registrada'
      : `${deps.length} ${deps.length === 1 ? 'dependência' : 'dependências'}${
          overdueCount > 0 ? ` · ${overdueCount} atrasada${overdueCount > 1 ? 's' : ''}` : ''
        }`;

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

  return (
    <section id="zona-dependencias" className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">04</span>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Dependências externas</h2>
          <span className={cn(
            "text-xs",
            overdueCount > 0 ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {headerCount}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="h-7 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : deps.length === 0 ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full rounded-md border border-dashed border-border/60 bg-background/30 p-6 text-center text-sm text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors"
        >
          <Plus className="mx-auto mb-1.5 h-4 w-4" />
          Nenhuma dependência registrada. Clique para adicionar a primeira.
        </button>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                <th className="px-3 py-2 text-left font-semibold">Responsável</th>
                <th className="px-3 py-2 text-left font-semibold">Prazo</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {deps.map((dep) => {
                const displayStatus = computeDisplayStatus(dep);
                const isOverdue = displayStatus === 'atrasado';
                return (
                  <tr key={dep.id} className="border-t border-border/40 hover:bg-background/40">
                    <td className="px-3 py-2 align-top">
                      <span className={cn(
                        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                        DEPENDENCY_TYPE_COLOR[dep.dependency_type]
                      )}>
                        {DEPENDENCY_TYPE_LABEL[dep.dependency_type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => setEditing(dep)}
                        className="text-left text-foreground hover:text-accent transition-colors"
                      >
                        {dep.description}
                      </button>
                      {dep.notes && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{dep.notes}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-foreground">
                      {dep.responsible_person_name ? (
                        <>
                          {dep.responsible_person_name}
                          {dep.responsible_person_role && (
                            <span className="text-muted-foreground"> — {dep.responsible_person_role}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(
                      "px-3 py-2 align-top font-mono text-xs",
                      isOverdue ? "text-destructive font-semibold" : "text-foreground"
                    )}>
                      {isOverdue && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                      {formatDeadline(dep.agreed_deadline, displayStatus)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={cn(
                        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                        DEPENDENCY_STATUS_COLOR[displayStatus]
                      )}>
                        {DEPENDENCY_STATUS_LABEL[displayStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(dep)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(dep)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-border/40">
                <td colSpan={6} className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground hover:bg-background/40 hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar dependência
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <DependencyDialog
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        onSubmit={async (payload) => {
          await createDep.mutateAsync({ deal_id: dealId, ...payload });
          toast.success('Dependência adicionada');
        }}
      />

      <DependencyDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        mode="edit"
        initial={editing ?? undefined}
        onSubmit={async (payload) => {
          if (!editing) return;
          await updateDep.mutateAsync({
            id: editing.id,
            deal_id: dealId,
            updates: payload,
          });
          toast.success('Dependência atualizada');
        }}
      />

      {confirmDialog}
    </section>
  );
}

// ---------- Dialog de criar/editar ----------

interface DialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: 'create' | 'edit';
  initial?: DealDependency;
  onSubmit: (payload: {
    dependency_type: DealDependencyType;
    description: string;
    responsible_person_name?: string | null;
    responsible_person_role?: string | null;
    agreed_deadline?: string | null;
    status: DealDependencyStatus;
    notes?: string | null;
  }) => Promise<void>;
}

function DependencyDialog({ open, onOpenChange, mode, initial, onSubmit }: DialogProps) {
  const [type, setType] = useState<DealDependencyType>(initial?.dependency_type ?? 'acesso_sistema');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [respName, setRespName] = useState(initial?.responsible_person_name ?? '');
  const [respRole, setRespRole] = useState(initial?.responsible_person_role ?? '');
  const [deadline, setDeadline] = useState(initial?.agreed_deadline ?? '');
  const [status, setStatus] = useState<DealDependencyStatus>(initial?.status ?? 'aguardando_combinar');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  // Reset quando reabre com novo initial
  useMemo(() => {
    if (open) {
      setType(initial?.dependency_type ?? 'acesso_sistema');
      setDescription(initial?.description ?? '');
      setRespName(initial?.responsible_person_name ?? '');
      setRespRole(initial?.responsible_person_role ?? '');
      setDeadline(initial?.agreed_deadline ?? '');
      setStatus(initial?.status ?? 'aguardando_combinar');
      setNotes(initial?.notes ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        dependency_type: type,
        description: description.trim(),
        responsible_person_name: respName.trim() || null,
        responsible_person_role: respRole.trim() || null,
        agreed_deadline: deadline || null,
        status,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova dependência' : 'Editar dependência'}
          </DialogTitle>
          <DialogDescription>
            O que precisa ser combinado/recebido do cliente para o projeto rodar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</Label>
            <div className="flex flex-wrap gap-1.5">
              {DEPENDENCY_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all',
                    type === t
                      ? cn(DEPENDENCY_TYPE_COLOR[t], 'ring-2 ring-accent/40')
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  {DEPENDENCY_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Acesso ao CRM atual via API. Liberar usuário com permissão read."
              className="min-h-[60px] text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsável (nome)</Label>
              <Input value={respName} onChange={(e) => setRespName(e.target.value)} placeholder="Ex: João Silva" className="h-8 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Função / cargo</Label>
              <Input value={respRole} onChange={(e) => setRespRole(e.target.value)} placeholder="Ex: CTO" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prazo combinado</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DealDependencyStatus)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                {DEPENDENCY_STATUS_OPTIONS.filter((s) => s !== 'atrasado').map((s) => (
                  <option key={s} value={s}>{DEPENDENCY_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto adicional, conversas, links..."
              className="min-h-[50px] text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : mode === 'create' ? 'Adicionar' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
