import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Power, RotateCcw, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/components/ConfirmDialog';
import { HelpTooltip } from '@/components/HelpTooltip';
import { cn } from '@/lib/utils';
import {
  useSectors,
  useCreateSector,
  useUpdateSector,
  useDeactivateSector,
  useReactivateSector,
} from '@/hooks/crm/useSectors';
import type { Sector, SectorWithChildren } from '@/types/sectors';

type EditState = { mode: 'create-root' } | { mode: 'create-sub'; parent: Sector } | { mode: 'edit'; sector: Sector } | null;

export default function Setores() {
  const [showInactive, setShowInactive] = useState(false);
  const { data: tree = [], isLoading } = useSectors({ includeInactive: showInactive });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<EditState>(null);
  const { confirm, dialog } = useConfirm();

  const create = useCreateSector();
  const update = useUpdateSector();
  const deactivate = useDeactivateSector();
  const reactivate = useReactivateSector();

  const totalRoots = tree.length;
  const totalSubs = tree.reduce((acc, t) => acc + t.children.length, 0);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(tree.map((t) => t.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  async function handleDeactivate(s: Sector) {
    const ok = await confirm({
      title: `Desativar "${s.name}"?`,
      description: 'Setores desativados deixam de aparecer em filtros e formulários, mas as empresas vinculadas continuam intactas. Você pode reativar a qualquer momento.',
      confirmText: 'Desativar',
      variant: 'destructive',
    });
    if (!ok) return;
    deactivate.mutate(s.id, {
      onSuccess: () => toast.success('Setor desativado'),
      onError: (e: Error) => toast.error('Erro ao desativar: ' + e.message),
    });
  }

  function handleReactivate(s: Sector) {
    reactivate.mutate(s.id, {
      onSuccess: () => toast.success('Setor reativado'),
      onError: (e: Error) => toast.error('Erro ao reativar: ' + e.message),
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {dialog}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            Setores
            <HelpTooltip content="Hierarquia de 2 níveis usada para classificar empresas no CRM. Aparece em filtros, métricas e ficha da empresa." />
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Organize as empresas por área de atuação. Máximo 2 níveis (setor + sub-setor).
          </p>
        </div>
        <Button onClick={() => setEdit({ mode: 'create-root' })} className="gap-2 min-h-10 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo setor
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card/30 px-3 py-2.5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-mono">{totalRoots} setores</Badge>
          <Badge variant="outline" className="font-mono">{totalSubs} sub-setores</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-8">Expandir tudo</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-8">Recolher tudo</Button>
          <div className="flex items-center gap-2 ml-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="text-xs cursor-pointer">Mostrar desativados</Label>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="rounded-lg border border-border bg-card/30 divide-y divide-border/60">
        {isLoading && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        )}
        {!isLoading && tree.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhum setor cadastrado. Clique em "Novo setor" para começar.
          </div>
        )}
        {tree.map((root) => (
          <SectorRow
            key={root.id}
            root={root}
            expanded={expanded.has(root.id)}
            onToggle={() => toggle(root.id)}
            onAddSub={() => setEdit({ mode: 'create-sub', parent: root })}
            onEdit={(s) => setEdit({ mode: 'edit', sector: s })}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
          />
        ))}
      </div>

      {/* Modal de criar/editar */}
      <SectorEditDialog
        state={edit}
        rootSectors={tree}
        onClose={() => setEdit(null)}
        onSubmit={async (payload) => {
          if (!edit) return;
          if (edit.mode === 'edit') {
            update.mutate({ id: edit.sector.id, updates: { name: payload.name } }, {
              onSuccess: () => { toast.success('Setor atualizado'); setEdit(null); },
              onError: (e: Error) => toast.error('Erro: ' + e.message),
            });
          } else {
            const parentId = edit.mode === 'create-sub' ? edit.parent.id : payload.parent_sector_id ?? null;
            create.mutate({ name: payload.name, parent_sector_id: parentId }, {
              onSuccess: (s) => {
                toast.success('Setor criado');
                if (s.parent_sector_id) setExpanded((prev) => new Set([...prev, s.parent_sector_id!]));
                setEdit(null);
              },
              onError: (e: Error) => toast.error('Erro: ' + e.message),
            });
          }
        }}
        isPending={create.isPending || update.isPending}
      />
    </div>
  );
}

function SectorRow({
  root, expanded, onToggle, onAddSub, onEdit, onDeactivate, onReactivate,
}: {
  root: SectorWithChildren;
  expanded: boolean;
  onToggle: () => void;
  onAddSub: () => void;
  onEdit: (s: Sector) => void;
  onDeactivate: (s: Sector) => void;
  onReactivate: (s: Sector) => void;
}) {
  const hasChildren = root.children.length > 0;
  return (
    <div>
      {/* Root row */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors',
        !root.is_active && 'opacity-50',
      )}>
        <button
          type="button"
          onClick={onToggle}
          disabled={!hasChildren}
          className={cn(
            'h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted',
            !hasChildren && 'opacity-30 cursor-default hover:bg-transparent',
          )}
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          {hasChildren ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="font-medium text-sm flex-1 truncate">{root.name}</span>
        {hasChildren && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {root.children.length} sub
          </Badge>
        )}
        {!root.is_active && <Badge variant="secondary" className="text-[10px]">Desativado</Badge>}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Adicionar sub-setor" onClick={onAddSub} disabled={!root.is_active}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => onEdit(root)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {root.is_active ? (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Desativar" onClick={() => onDeactivate(root)}>
              <Power className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Reativar" onClick={() => onReactivate(root)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="pl-9 border-l-2 border-border/40 ml-3 mb-1">
          {root.children.map((sub) => (
            <div
              key={sub.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors text-sm',
                !sub.is_active && 'opacity-50',
              )}
            >
              <span className="text-muted-foreground">└</span>
              <span className="flex-1 truncate">{sub.name}</span>
              {!sub.is_active && <Badge variant="secondary" className="text-[10px]">Desativado</Badge>}
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => onEdit(sub)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {sub.is_active ? (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Desativar" onClick={() => onDeactivate(sub)}>
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Reativar" onClick={() => onReactivate(sub)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectorEditDialog({
  state, rootSectors, onClose, onSubmit, isPending,
}: {
  state: EditState;
  rootSectors: SectorWithChildren[];
  onClose: () => void;
  onSubmit: (p: { name: string; parent_sector_id?: string | null }) => void;
  isPending: boolean;
}) {
  const open = !!state;
  const initialName = state?.mode === 'edit' ? state.sector.name : '';
  const [name, setName] = useState(initialName);
  const [parentId, setParentId] = useState<string>('none');

  // Reset on open
  useState(() => {
    if (state) {
      setName(state.mode === 'edit' ? state.sector.name : '');
      setParentId(state.mode === 'create-sub' ? state.parent.id : 'none');
    }
  });

  if (!state) return null;

  const isCreate = state.mode !== 'edit';
  const lockedParent = state.mode === 'create-sub';
  const isEditingSub = state.mode === 'edit' && state.sector.parent_sector_id !== null;

  const title =
    state.mode === 'create-root' ? 'Novo setor' :
    state.mode === 'create-sub' ? `Novo sub-setor em "${state.parent.name}"` :
    `Editar setor "${state.sector.name}"`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" onOpenAutoFocus={() => {
        setName(state.mode === 'edit' ? state.sector.name : '');
        setParentId(state.mode === 'create-sub' ? state.parent.id : 'none');
      }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sector-name">Nome</Label>
            <Input
              id="sector-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Saúde"
              autoFocus
            />
          </div>

          {isCreate && !lockedParent && (
            <div className="space-y-2">
              <Label>Setor pai (opcional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Setor raiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum (criar setor raiz) —</SelectItem>
                  {rootSectors.filter((r) => r.is_active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Sub-setores não podem ter sub-sub-setores (limite de 2 níveis).
              </p>
            </div>
          )}

          {isEditingSub && state.mode === 'edit' && (
            <p className="text-xs text-muted-foreground">
              Sub-setor de <strong>{rootSectors.find((r) => r.id === state.sector.parent_sector_id)?.name ?? '—'}</strong>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!name.trim() || isPending}
            onClick={() => onSubmit({
              name: name.trim(),
              parent_sector_id: parentId === 'none' ? null : parentId,
            })}
          >
            {isPending ? 'Salvando…' : (isCreate ? 'Criar' : 'Salvar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
