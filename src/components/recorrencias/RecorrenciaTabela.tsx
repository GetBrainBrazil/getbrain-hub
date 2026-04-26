import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Pause, Play, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { FREQ_LABEL, type Frequency } from "@/lib/recorrencias/preview";
import type { RecurrenceRow } from "@/hooks/recorrencias/useRecurrences";

interface Props {
  rows: RecurrenceRow[];
  loading?: boolean;
  onRowClick: (row: RecurrenceRow) => void;
  onAction?: (row: RecurrenceRow, action: "pause" | "resume" | "end" | "cancel" | "edit") => void;
}

const STATUS_STYLE: Record<string, string> = {
  ativa: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  pausada: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  encerrada: "bg-muted text-muted-foreground border-border",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

type SortKey = "code" | "description" | "amount" | "next_due" | "status";

export function RecorrenciaTabela({ rows, loading, onRowClick, onAction }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "code", dir: "desc" });
  const [page, setPage] = useState(0);
  const PAGE = 20;

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a: any, b: any) => {
      const va = a[sort.key] ?? "";
      const vb = b[sort.key] ?? "";
      if (typeof va === "number" && typeof vb === "number") return sort.dir === "asc" ? va - vb : vb - va;
      return sort.dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [rows, sort]);

  const paged = sorted.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE));

  function header(key: SortKey, label: string, className?: string) {
    return (
      <TableHead
        className={cn("cursor-pointer select-none", className)}
        onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))}
      >
        {label} {sort.key === key && (sort.dir === "asc" ? "↑" : "↓")}
      </TableHead>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {header("code", "Código")}
              {header("description", "Descrição")}
              <TableHead>Tipo</TableHead>
              <TableHead>Direção</TableHead>
              {header("amount", "Valor", "text-right")}
              <TableHead>Frequência</TableHead>
              {header("next_due", "Próx. venc.")}
              <TableHead>Progresso</TableHead>
              {header("status", "Status")}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!loading && paged.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Nenhuma recorrência encontrada</TableCell></TableRow>
            )}
            {paged.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onRowClick(r)}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="font-medium">{r.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={r.type === "recurrence" ? "border-cyan-500/40 text-cyan-400" : "border-purple-500/40 text-purple-400"}>
                    {r.type === "recurrence" ? "Recorrência" : "Parcelamento"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={r.direction === "receita" ? "border-emerald-500/40 text-emerald-400" : "border-orange-500/40 text-orange-400"}>
                    {r.direction === "receita" ? "Receita" : "Despesa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(Number(r.amount))}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{FREQ_LABEL[(r.frequency as Frequency)] ?? r.frequency}</TableCell>
                <TableCell className="text-sm tabular-nums">{r.next_due ? formatDate(r.next_due) : "—"}</TableCell>
                <TableCell className="text-sm tabular-nums">
                  {r.type === "installment"
                    ? `${r.installments_paid ?? 0}/${r.installments_total_count ?? r.total_installments ?? 0}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_STYLE[r.status] || ""}>{STATUS_LABEL[r.status] || r.status}</Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    {r.status === "ativa" && (
                      <Button size="icon" variant="ghost" title="Pausar" onClick={() => onAction?.(r, "pause")}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {r.status === "pausada" && (
                      <Button size="icon" variant="ghost" title="Reativar" onClick={() => onAction?.(r, "resume")}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {(r.status === "ativa" || r.status === "pausada") && (
                      <>
                        <Button size="icon" variant="ghost" title="Encerrar" onClick={() => onAction?.(r, "end")}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Cancelar" onClick={() => onAction?.(r, "cancel")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => onAction?.(r, "edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 text-xs text-muted-foreground">
          <span>Página {page + 1} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
