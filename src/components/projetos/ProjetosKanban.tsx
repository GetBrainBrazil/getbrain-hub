import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ActorAvatar, ActorAvatarStack } from "@/components/projetos/ActorAvatar";
import { TypeBadge } from "@/components/projetos/ProjetoBadges";
import {
  PROJECT_STATUS_OPTIONS,
  ProjectStatus,
  ProjectType,
  getStatusBadgeClass,
  getStatusLabel,
} from "@/lib/projetos-helpers";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useConfirm } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface KanbanProjectRow {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  project_type: ProjectType;
  contract_value: number | null;
  estimated_delivery_date: string | null;
  start_date: string | null;
  company_id: string;
  company_name: string;
  actors: { id: string; name: string; avatar_url?: string | null }[];
}

interface Props {
  rows: KanbanProjectRow[];
  visibleStatuses: ProjectStatus[];
  onCardClick: (id: string) => void;
  onChanged: () => void;
}

function progress(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e <= s) return null;
  const now = Date.now();
  return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
}

export function ProjetosKanban({ rows, visibleStatuses, onCardClick, onChanged }: Props) {
  const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [activeRow, setActiveRow] = useState<KanbanProjectRow | null>(null);

  function handleDragStart(e: DragStartEvent) {
    const r = e.active.data.current?.row as KanbanProjectRow | undefined;
    setActiveRow(r ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveRow(null);
    const target = e.over?.id as ProjectStatus | undefined;
    const row = e.active.data.current?.row as KanbanProjectRow | undefined;
    if (!target || !row) return;
    if (row.status === target) return;

    const ok = await confirmDialog({
      title: `Mover ${row.code} para "${getStatusLabel(target)}"?`,
      description: `O status do projeto "${row.name}" será atualizado para "${getStatusLabel(target)}".`,
      confirmLabel: "Mover",
    });
    if (!ok) return;

    const { error } = await supabase
      .from("projects")
      .update({ status: target as any })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Projeto movido para ${getStatusLabel(target)}`);
    onChanged();
  }

  const visibleOptions = PROJECT_STATUS_OPTIONS.filter((o) =>
    visibleStatuses.includes(o.value),
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveRow(null)}
      >
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="flex gap-4 min-w-max items-start">
            {visibleOptions.map((o) => {
              const items = rows.filter((r) => r.status === o.value);
              return (
                <KanbanColumn
                  key={o.value}
                  status={o.value}
                  items={items}
                  onCardClick={onCardClick}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeRow ? (
            <div className="w-72 rotate-2">
              <ProjectCardBody row={activeRow} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {confirmDialogEl}
    </>
  );
}

function KanbanColumn({
  status,
  items,
  onCardClick,
}: {
  status: ProjectStatus;
  items: KanbanProjectRow[];
  onCardClick: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const badgeCls = getStatusBadgeClass(status);

  return (
    <div className="w-80 shrink-0 flex flex-col">
      <div
        className={cn(
          "rounded-t-lg border border-b-0 px-3 py-2 flex items-center justify-between sticky top-0 z-[1] backdrop-blur bg-card/90",
          badgeCls,
        )}
      >
        <span className="text-sm font-semibold">{getStatusLabel(status)}</span>
        <span className="text-xs font-mono opacity-80">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-b-lg border bg-muted/20 p-2 flex flex-col gap-2 min-h-[140px] transition-colors",
          isOver && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
        )}
      >
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 italic">
            Solte um card aqui
          </p>
        ) : (
          items.map((r) => (
            <DraggableProjectCard key={r.id} row={r} onClick={() => onCardClick(r.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableProjectCard({
  row,
  onClick,
}: {
  row: KanbanProjectRow;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.id,
    data: { row },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <ProjectCardBody row={row} />
    </div>
  );
}

function ProjectCardBody({
  row,
  overlay,
}: {
  row: KanbanProjectRow;
  overlay?: boolean;
}) {
  const prog = progress(row.start_date, row.estimated_delivery_date);
  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow select-none",
        overlay && "shadow-lg border-primary/40 bg-card",
        !overlay && "animate-fade-slide",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-accent font-mono text-xs font-semibold">{row.code}</span>
          <TypeBadge type={row.project_type} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{row.name}</h3>
        <div className="flex items-center gap-2">
          <ActorAvatar name={row.company_name} size="sm" />
          <span className="text-xs text-muted-foreground truncate">{row.company_name}</span>
        </div>
        {row.contract_value != null && row.contract_value > 0 && (
          <p className="text-sm font-bold">{formatCurrency(row.contract_value)}</p>
        )}
        {prog !== null && (
          <div>
            <Progress value={prog} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {Math.round(prog)}% do prazo
            </p>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          {row.actors.length > 0 ? <ActorAvatarStack actors={row.actors} /> : <span />}
          <span className="text-[10px] text-muted-foreground">
            {row.estimated_delivery_date ? formatDate(row.estimated_delivery_date) : "Sem prazo"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
