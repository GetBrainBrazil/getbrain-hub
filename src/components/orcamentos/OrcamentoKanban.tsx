import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OrcamentoKanbanColumn } from "./OrcamentoKanbanColumn";
import { OrcamentoKanbanCard } from "./OrcamentoKanbanCard";
import { useUpdateProposal } from "@/hooks/orcamentos/useUpdateProposal";
import type { ProposalRow } from "@/hooks/orcamentos/useProposals";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";
import { effectiveStatus } from "@/lib/orcamentos/calculateTotal";
import { logProposalStatusChange } from "@/lib/orcamentos/auditLog";
import { useQueryClient } from "@tanstack/react-query";

type ColumnId = "rascunho" | "enviada" | "convertida" | "recusada" | "expirada";

interface Props {
  rows: ProposalRow[];
  onCardClick: (row: ProposalRow) => void;
}

interface PendingMove {
  row: ProposalRow;
  target: ColumnId;
}

export function OrcamentoKanban({ rows, onCardClick }: Props) {
  const update = useUpdateProposal();
  const qc = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const [activeRow, setActiveRow] = useState<ProposalRow | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Particiona por coluna
  const columns = useMemo(() => {
    const buckets: Record<ColumnId, ProposalRow[]> = {
      rascunho: [],
      enviada: [],
      convertida: [],
      recusada: [],
      expirada: [],
    };
    for (const r of rows) {
      const eff = effectiveStatus(r.status, r.valid_until);
      const colId: ColumnId = (["rascunho","enviada","convertida","recusada","expirada"].includes(eff) ? eff : "rascunho") as ColumnId;
      if (buckets[colId]) buckets[colId].push(r);
    }
    return buckets;
  }, [rows]);

  function handleDragStart(e: DragStartEvent) {
    const r = e.active.data.current?.proposal as ProposalRow | undefined;
    setActiveRow(r ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveRow(null);
    const target = e.over?.id as ColumnId | undefined;
    const row = e.active.data.current?.proposal as ProposalRow | undefined;
    if (!target || !row) return;

    // Coluna de origem (efetiva)
    const sourceEff = effectiveStatus(row.status, row.valid_until) as ColumnId;
    if (sourceEff === target) return;

    if (target === "expirada") {
      toast.error("Status 'expirada' é automático — ajuste a validade");
      return;
    }

    setPending({ row, target });
    setRejectionReason("");
  }

  async function applyMove() {
    if (!pending) return;
    const { row, target } = pending;
    const payload: Record<string, any> = { status: target as ProposalStatus };

    if (target === "enviada") {
      payload.sent_at = new Date().toISOString();
    } else if (target === "convertida") {
      payload.accepted_at = new Date().toISOString();
    } else if (target === "recusada") {
      payload.rejected_at = new Date().toISOString();
      payload.rejection_reason = rejectionReason.trim() || null;
    } else if (target === "rascunho") {
      payload.sent_at = null;
      payload.accepted_at = null;
      payload.rejected_at = null;
      payload.rejection_reason = null;
    }

    try {
      await update.mutateAsync({ id: row.id, payload });
      const fromEff = effectiveStatus(row.status, row.valid_until);
      await logProposalStatusChange({
        proposalId: row.id,
        proposalCode: row.code,
        from: fromEff,
        to: target,
        reason: target === "recusada" ? rejectionReason.trim() || null : null,
      });
      qc.invalidateQueries({ queryKey: ["proposal_audit", row.id] });
      toast.success(`Movido para ${LABEL[target]}`);
    } catch {
      // toast já vem do hook
    } finally {
      setPending(null);
      setRejectionReason("");
    }
  }

  function cancel() {
    setPending(null);
    setRejectionReason("");
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveRow(null)}
      >
        <div className="h-[calc(100vh-18rem)] min-h-[480px]">
          <div className="flex gap-3 h-full overflow-x-auto overflow-y-hidden pb-2">
            <OrcamentoKanbanColumn
              id="rascunho"
              label="Rascunho"
              rows={columns.rascunho}
              onCardClick={onCardClick}
            />
            <OrcamentoKanbanColumn
              id="enviada"
              label="Enviada"
              rows={columns.enviada}
              onCardClick={onCardClick}
              accentClass="text-primary"
            />
            <OrcamentoKanbanColumn
              id="convertida"
              label="Convertida"
              rows={columns.convertida}
              onCardClick={onCardClick}
              accentClass="text-success"
            />
            <OrcamentoKanbanColumn
              id="recusada"
              label="Recusada"
              rows={columns.recusada}
              onCardClick={onCardClick}
              accentClass="text-destructive"
            />
            <OrcamentoKanbanColumn
              id="expirada"
              label="Expirada"
              rows={columns.expirada}
              onCardClick={onCardClick}
              derived
              accentClass="text-amber-500"
            />
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeRow ? (
            <div className="w-[260px]">
              <OrcamentoKanbanCard proposal={activeRow} onClick={() => {}} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={!!pending} onOpenChange={(o) => !o && cancel()}>
        <DialogContent>
          {pending && <MoveDialogBody pending={pending} reason={rejectionReason} setReason={setRejectionReason} />}
          <DialogFooter>
            <Button variant="outline" onClick={cancel}>
              Cancelar
            </Button>
            <Button
              onClick={applyMove}
              disabled={
                update.isPending ||
                (pending?.target === "recusada" && !rejectionReason.trim())
              }
              variant={pending?.target === "recusada" ? "destructive" : "default"}
            >
              {update.isPending ? "Salvando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const LABEL: Record<ColumnId, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  convertida: "Convertida",
  recusada: "Recusada",
  expirada: "Expirada",
};

function MoveDialogBody({
  pending,
  reason,
  setReason,
}: {
  pending: PendingMove;
  reason: string;
  setReason: (v: string) => void;
}) {
  const { row, target } = pending;
  if (target === "enviada") {
    return (
      <DialogHeader>
        <DialogTitle>Marcar {row.code} como enviado?</DialogTitle>
        <DialogDescription>
          A data de envio será preenchida com agora. Você poderá editar a
          proposta normalmente.
        </DialogDescription>
      </DialogHeader>
    );
  }
  if (target === "convertida") {
    return (
      <DialogHeader>
        <DialogTitle>Marcar {row.code} como aceita?</DialogTitle>
        <DialogDescription>
          ⚠️ Marcar como aceito <strong>NÃO</strong> cria projeto/parcelas
          automaticamente. Você precisa criar o projeto manualmente. Confirmar?
        </DialogDescription>
      </DialogHeader>
    );
  }
  if (target === "recusada") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Marcar {row.code} como recusada?</DialogTitle>
          <DialogDescription>
            Informe o motivo da recusa para registro histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Motivo da recusa *</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: cliente escolheu concorrente, fora do orçamento…"
            rows={3}
            autoFocus
          />
        </div>
      </>
    );
  }
  if (target === "rascunho") {
    return (
      <DialogHeader>
        <DialogTitle>Voltar {row.code} para rascunho?</DialogTitle>
        <DialogDescription>
          As datas de envio, aceite e recusa serão limpas. O motivo da recusa
          (se houver) também será apagado.
        </DialogDescription>
      </DialogHeader>
    );
  }
  return null;
}
