import { AlertTriangle, Calendar, Link as LinkIcon, MoreVertical, Pencil, Trash2, User, CheckCircle2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  DEPENDENCY_TYPE_LABEL, DEPENDENCY_TYPE_COLOR,
  DEPENDENCY_STATUS_LABEL, DEPENDENCY_STATUS_COLOR,
  DEPENDENCY_PRIORITY_LABEL, DEPENDENCY_PRIORITY_COLOR, DEPENDENCY_PRIORITY_BORDER,
} from '@/constants/dealEnumLabels';
import type { DealDependency, DealDependencyStatus } from '@/types/crm';

interface Props {
  dep: DealDependency;
  displayStatus: DealDependencyStatus;
  onEdit: () => void;
  onDelete: () => void;
  onMarkReleased: () => void;
}

function formatDeadline(deadline: string | null, displayStatus: DealDependencyStatus): { text: string; tone: 'normal' | 'warning' | 'overdue' | 'done' } {
  if (!deadline) return { text: 'Sem prazo', tone: 'normal' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const fmt = d.toLocaleDateString('pt-BR');
  if (displayStatus === 'liberado') return { text: fmt, tone: 'done' };
  if (diff < 0) return { text: `${fmt} · ${Math.abs(diff)}d atraso`, tone: 'overdue' };
  if (diff === 0) return { text: `${fmt} · hoje`, tone: 'warning' };
  if (diff <= 3) return { text: `${fmt} · em ${diff}d`, tone: 'warning' };
  return { text: `${fmt} · em ${diff}d`, tone: 'normal' };
}

export function DependencyCard({ dep, displayStatus, onEdit, onDelete, onMarkReleased }: Props) {
  const isOverdue = displayStatus === 'atrasado';
  const isDone = displayStatus === 'liberado';
  const deadlineInfo = formatDeadline(dep.agreed_deadline, displayStatus);

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-lg border border-l-4 bg-card/40 p-4 transition-all hover:bg-card/60 hover:shadow-md',
        DEPENDENCY_PRIORITY_BORDER[dep.priority],
        isOverdue && 'border-destructive/40 bg-destructive/5',
        isDone && 'opacity-70',
      )}
    >
      {/* Top row: tipo + blocker + menu */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(
            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            DEPENDENCY_TYPE_COLOR[dep.dependency_type],
          )}>
            {DEPENDENCY_TYPE_LABEL[dep.dependency_type]}
          </span>
          {dep.is_blocker && (
            <span className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
              <AlertTriangle className="h-2.5 w-2.5" /> Blocker
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </DropdownMenuItem>
            {!isDone && (
              <DropdownMenuItem onClick={onMarkReleased}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Marcar como liberado
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Descrição */}
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          'mb-3 line-clamp-2 text-left text-sm font-medium leading-snug text-foreground transition-colors hover:text-accent',
          isDone && 'line-through decoration-muted-foreground/60',
        )}
      >
        {dep.description}
      </button>

      {/* Meta info */}
      <div className="mb-3 space-y-1.5 text-xs text-muted-foreground">
        {dep.responsible_person_name && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {dep.responsible_person_name}
              {dep.responsible_person_role && <span className="text-muted-foreground/70"> · {dep.responsible_person_role}</span>}
            </span>
          </div>
        )}
        {(dep.responsible_email || dep.responsible_phone) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {dep.responsible_email && (
              <a href={`mailto:${dep.responsible_email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-accent">
                <Mail className="h-3 w-3" /> <span className="truncate">{dep.responsible_email}</span>
              </a>
            )}
            {dep.responsible_phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {dep.responsible_phone}
              </span>
            )}
          </div>
        )}
        <div className={cn(
          'flex items-center gap-1.5 font-mono',
          deadlineInfo.tone === 'overdue' && 'text-destructive font-semibold',
          deadlineInfo.tone === 'warning' && 'text-warning',
          deadlineInfo.tone === 'done' && 'text-success',
        )}>
          {deadlineInfo.tone === 'overdue' ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          {deadlineInfo.text}
        </div>
        {dep.links && dep.links.length > 0 && (
          <div className="flex items-center gap-1.5">
            <LinkIcon className="h-3 w-3 shrink-0" />
            <span>{dep.links.length} {dep.links.length === 1 ? 'link' : 'links'}</span>
          </div>
        )}
      </div>

      {/* Footer: status + prioridade */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
        <span className={cn(
          'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
          DEPENDENCY_STATUS_COLOR[displayStatus],
        )}>
          ● {DEPENDENCY_STATUS_LABEL[displayStatus]}
        </span>
        <span className={cn(
          'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
          DEPENDENCY_PRIORITY_COLOR[dep.priority],
        )}>
          {DEPENDENCY_PRIORITY_LABEL[dep.priority]}
        </span>
      </div>
    </article>
  );
}
