import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Repeat } from "lucide-react";
import { RecorrenciaKPICards } from "@/components/recorrencias/RecorrenciaKPICards";
import { RecorrenciaTabela } from "@/components/recorrencias/RecorrenciaTabela";
import { RecorrenciaDrawer } from "@/components/recorrencias/RecorrenciaDrawer";
import { NovaRecorrenciaModal } from "@/components/recorrencias/NovaRecorrenciaModal";
import { EditarRecorrenciaModal } from "@/components/recorrencias/EditarRecorrenciaModal";
import { AcaoCascataConfirm } from "@/components/recorrencias/AcaoCascataConfirm";
import { useRecurrences, type RecurrenceFilters, type RecurrenceRow } from "@/hooks/recorrencias/useRecurrences";
import { useUpdateRecurrenceStatus } from "@/hooks/recorrencias/useUpdateRecurrence";
import { usePersistedState } from "@/hooks/use-persisted-state";

const ACTION_TEXT: Record<string, { title: string; description: string; status: string; destructive?: boolean; confirm: string }> = {
  pause: {
    title: "Pausar recorrência",
    status: "pausada",
    confirm: "Pausar",
    description:
      "Pausar esta recorrência impede a geração de novas parcelas. Parcelas já criadas permanecem inalteradas. Você pode reativar a qualquer momento.",
  },
  resume: {
    title: "Reativar recorrência",
    status: "ativa",
    confirm: "Reativar",
    description:
      "Reativar esta recorrência irá retomar a geração de parcelas no horizonte de 12 meses.",
  },
  end: {
    title: "Encerrar recorrência",
    status: "encerrada",
    confirm: "Encerrar",
    destructive: true,
    description:
      "Encerrar marca esta recorrência como concluída naturalmente. Parcelas pendentes futuras serão removidas. Parcelas pagas e vencidas permanecem.",
  },
  cancel: {
    title: "Cancelar recorrência",
    status: "cancelada",
    confirm: "Cancelar recorrência",
    destructive: true,
    description:
      "Cancelar indica interrupção da série. Parcelas pendentes futuras serão removidas. Parcelas pagas e vencidas permanecem.",
  },
};

export default function Recorrencias() {
  const [filters, setFilters] = usePersistedState<RecurrenceFilters>("recorrencias:filters", {
    status: "ativa",
    type: "todas",
    direction: "todas",
    search: "",
    showDeleted: false,
  });
  const [novaOpen, setNovaOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState<RecurrenceRow | null>(null);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [actionRow, setActionRow] = useState<{ row: RecurrenceRow; action: keyof typeof ACTION_TEXT } | null>(null);

  const { data: rows = [], isLoading } = useRecurrences(filters);
  const statusMut = useUpdateRecurrenceStatus();

  // Counts per status (for tabs) — usa lista atual sem filtro de status
  const { data: allRows = [] } = useRecurrences({ ...filters, status: "todas" });
  const counts = {
    todas: allRows.length,
    ativa: allRows.filter((r) => r.status === "ativa").length,
    pausada: allRows.filter((r) => r.status === "pausada").length,
    encerrada: allRows.filter((r) => r.status === "encerrada").length,
    cancelada: allRows.filter((r) => r.status === "cancelada").length,
  };

  function setFilter<K extends keyof RecurrenceFilters>(k: K, v: RecurrenceFilters[K]) {
    setFilters((s) => ({ ...s, [k]: v }));
  }

  function handleAction(row: RecurrenceRow, action: "pause" | "resume" | "end" | "cancel" | "edit") {
    if (action === "edit") { setEditRow(row); return; }
    setActionRow({ row, action });
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recorrências</h1>
            <p className="text-sm text-muted-foreground">Séries financeiras: assinaturas, contratos e parcelamentos.</p>
          </div>
        </div>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Recorrência
        </Button>
      </header>

      <RecorrenciaKPICards />

      <Tabs value={filters.status || "todas"} onValueChange={(v) => setFilter("status", v as any)}>
        <TabsList>
          <TabsTrigger value="todas">Todas ({counts.todas})</TabsTrigger>
          <TabsTrigger value="ativa">Ativas ({counts.ativa})</TabsTrigger>
          <TabsTrigger value="pausada">Pausadas ({counts.pausada})</TabsTrigger>
          <TabsTrigger value="encerrada">Encerradas ({counts.encerrada})</TabsTrigger>
          <TabsTrigger value="cancelada">Canceladas ({counts.cancelada})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Label className="text-xs">Tipo</Label>
          <Select value={filters.type || "todas"} onValueChange={(v) => setFilter("type", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="recurrence">Recorrência</SelectItem>
              <SelectItem value="installment">Parcelamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Direção</Label>
          <Select value={filters.direction || "todas"} onValueChange={(v) => setFilter("direction", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Buscar</Label>
          <Input
            placeholder="Descrição ou código (REC-…)"
            value={filters.search || ""}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch
            checked={!!filters.showDeleted}
            onCheckedChange={(v) => setFilter("showDeleted", v)}
            id="show-deleted"
          />
          <Label htmlFor="show-deleted" className="text-xs cursor-pointer">Mostrar excluídas</Label>
        </div>
      </div>

      {!isLoading && rows.length === 0 && filters.status === "ativa" && !filters.search && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Repeat className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold">Nenhuma recorrência ativa</h3>
          <p className="text-sm text-muted-foreground">Crie sua primeira recorrência para automatizar gastos e receitas mensais.</p>
          <Button onClick={() => setNovaOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Criar primeira recorrência
          </Button>
        </div>
      )}

      <RecorrenciaTabela
        rows={rows}
        loading={isLoading}
        onRowClick={(r) => setDrawerRow(r)}
        onAction={handleAction}
      />

      <RecorrenciaDrawer row={drawerRow} open={!!drawerRow} onOpenChange={(v) => !v && setDrawerRow(null)} />

      <NovaRecorrenciaModal open={novaOpen} onOpenChange={setNovaOpen} />

      {editRow && (
        <EditarRecorrenciaModal
          open={!!editRow}
          onOpenChange={(v) => !v && setEditRow(null)}
          recurrence={editRow}
        />
      )}

      {actionRow && (
        <AcaoCascataConfirm
          open={!!actionRow}
          onOpenChange={(v) => !v && setActionRow(null)}
          title={ACTION_TEXT[actionRow.action].title}
          description={ACTION_TEXT[actionRow.action].description}
          confirmLabel={ACTION_TEXT[actionRow.action].confirm}
          destructive={ACTION_TEXT[actionRow.action].destructive}
          onConfirm={async () => { await statusMut.mutateAsync({ id: actionRow.row.id, status: ACTION_TEXT[actionRow.action].status }); }}
        />
      )}
    </div>
  );
}
