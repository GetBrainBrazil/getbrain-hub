import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, type ScopeItem } from "@/lib/orcamentos/calculateTotal";
import { cn } from "@/lib/utils";

interface Props {
  items: ScopeItem[];
  onChange: (items: ScopeItem[]) => void;
  onOpenDetails?: (index: number) => void;
  /**
   * Controla a visibilidade da coluna de valor por item.
   * Default: false — itens são descrições do escopo, o valor cheio fica no
   * card "Investimento" da proposta. Mantemos `true` apenas para legados.
   */
  showItemValue?: boolean;
}

/**
 * Editor de itens estilo Notion: cada item é um bloco fluido com handle de drag,
 * título inline, valor à direita e descrição expansível. Sem cards aninhados.
 */
export function NotionItemsEditor({ items, onChange, onOpenDetails, showItemValue = false }: Props) {
  // Cada item ganha um id estável local pra DnD funcionar com reorder.
  // Como ScopeItem não tem id, usamos índice + título como fallback.
  const ids = items.map((_, i) => `item-${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  }

  function update(idx: number, patch: Partial<ScopeItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...items, { title: "", description: "", value: 0 }]);
  }

  return (
    <div className="space-y-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((it, idx) => (
            <SortableItem
              key={ids[idx]}
              id={ids[idx]}
              index={idx}
              item={it}
              showValue={showItemValue}
              onChange={(patch) => update(idx, patch)}
              onRemove={() => remove(idx)}
              onOpenDetails={onOpenDetails ? () => onOpenDetails(idx) : undefined}
            />
          ))}
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum item ainda. Adicione o primeiro abaixo.
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="group mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Adicionar item</span>
      </button>
    </div>
  );
}

function SortableItem({
  id,
  index,
  item,
  showValue,
  onChange,
  onRemove,
  onOpenDetails,
}: {
  id: string;
  index: number;
  item: ScopeItem;
  showValue: boolean;
  onChange: (patch: Partial<ScopeItem>) => void;
  onRemove: () => void;
  onOpenDetails?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [expanded, setExpanded] = useState(Boolean(item.description));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-md border border-transparent hover:border-border/60 hover:bg-muted/20 transition",
        isDragging && "border-border/80 bg-muted/40 shadow-lg z-10 opacity-90",
      )}
    >
      <div className="flex items-start gap-1.5 px-1 py-1.5">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-1.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-muted-foreground transition cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Reordenar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Toggle expand */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <span className="mt-2 select-none font-mono text-[10px] text-muted-foreground/50 w-5 text-right">
          {index + 1}
        </span>

        {/* Conteúdo: título + valor inline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Input
              value={item.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Título do módulo"
              className="h-8 border-0 bg-transparent px-1 text-base font-medium shadow-none focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
            />
            {showValue && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.value || ""}
                  onChange={(e) => onChange({ value: parseFloat(e.target.value) || 0 })}
                  className="h-8 w-28 border-0 bg-transparent px-1 text-right tabular-nums font-mono text-sm shadow-none focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {expanded && (
            <div className="pl-1 pr-1 pb-1 pt-0.5 space-y-1.5">
              <Textarea
                value={item.description || ""}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Bullets curtos, um por linha…"
                className="min-h-[60px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              {showValue && item.value > 0 && (
                <div className="px-1 text-[10px] text-success/80 tabular-nums">
                  {formatBRL(item.value)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
          {onOpenDetails && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onOpenDetails}
              title="Detalhes do módulo (página pública)"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            title="Remover item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
