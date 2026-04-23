/**
 * Cabeçalho do Dashboard de Engenharia.
 * Controle principal: troca de sprint. Filtros adicionais ficam no store
 * compartilhado do hub (já existem no Kanban) e refletem aqui via chips.
 */
import { useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardScope, type SprintLite } from "@/hooks/dashboard/useDashboardScope";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function describeSprint(s: SprintLite): string {
  const tag =
    s.status === "active"
      ? "atual"
      : s.status === "completed"
        ? "encerrada"
        : s.status === "planned"
          ? "planejada"
          : s.status;
  const start = format(parseISO(s.start_date), "dd/MM", { locale: ptBR });
  const end = format(parseISO(s.end_date), "dd/MM", { locale: ptBR });
  return `${s.code} (${tag}) · ${start}–${end}`;
}

export function DashboardHeader() {
  const { sprints, current, previous, selectedSprintId, setSelectedSprintId } =
    useDashboardScope();
  const qc = useQueryClient();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    qc.invalidateQueries({ queryKey: ["dashboard-metrics-recent"] });
    qc.invalidateQueries({ queryKey: ["dashboard-alerts"] });
    qc.invalidateQueries({ queryKey: ["reworked-tasks"] });
    qc.invalidateQueries({ queryKey: ["sprint-burndown"] });
    qc.invalidateQueries({ queryKey: ["dev-accuracy"] });
    qc.invalidateQueries({ queryKey: ["top-deviations"] });
    qc.invalidateQueries({ queryKey: ["deviation-by-type"] });
    qc.invalidateQueries({ queryKey: ["cycle-by-type"] });
    qc.invalidateQueries({ queryKey: ["completions-per-day"] });
  };

  return (
    <header className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Dashboard de Engenharia</h1>
        <p className="text-sm text-muted-foreground">
          Cockpit completo da produção. Troque a sprint para recalcular tudo.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sprint
          </label>
          <Select
            value={selectedSprintId ?? undefined}
            onValueChange={(v) => setSelectedSprintId(v)}
          >
            <SelectTrigger className="h-9 w-[320px]">
              <SelectValue placeholder="Selecione a sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {describeSprint(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {previous && (
          <Badge variant="outline" className="h-6 gap-1">
            <span className="text-[10px] uppercase text-muted-foreground">vs</span>
            <span className="font-mono text-[11px]">{previous.code}</span>
          </Badge>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {current && (
        <div className="text-[11px] text-muted-foreground">
          {current.name} · {format(parseISO(current.start_date), "dd 'de' MMM", { locale: ptBR })} →{" "}
          {format(parseISO(current.end_date), "dd 'de' MMM yyyy", { locale: ptBR })}
        </div>
      )}
    </header>
  );
}
