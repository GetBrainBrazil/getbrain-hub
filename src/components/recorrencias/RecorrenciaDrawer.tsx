import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ExternalLink } from "lucide-react";
import type { RecurrenceRow } from "@/hooks/recorrencias/useRecurrences";
import { FREQ_LABEL, type Frequency } from "@/lib/recorrencias/preview";

interface Props {
  row: RecurrenceRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RecorrenciaDrawer({ row, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  if (!row) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[40%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{row.code}</span>
            <span>{row.description}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{row.type === "recurrence" ? "Recorrência" : "Parcelamento"}</Badge>
            <Badge variant="outline">{row.direction === "receita" ? "Receita" : "Despesa"}</Badge>
            <Badge variant="outline">{FREQ_LABEL[row.frequency as Frequency] ?? row.frequency}</Badge>
            <Badge variant="outline">{row.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor" value={formatCurrency(Number(row.amount))} />
            <Field label="Próximo venc." value={row.next_due ? formatDate(row.next_due) : "—"} />
            <Field label="Início" value={formatDate(row.start_date)} />
            <Field label="Fim" value={row.end_date ? formatDate(row.end_date) : "—"} />
            {row.type === "installment" && (
              <Field
                label="Parcelas"
                value={`${row.installments_paid ?? 0} / ${row.installments_total_count ?? row.total_installments ?? 0}`}
              />
            )}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Vínculos</h4>
            {row.cliente && <Field label="Cliente" value={row.cliente.nome} />}
            {row.fornecedor && <Field label="Fornecedor" value={row.fornecedor.nome} />}
            {row.projeto && <Field label="Projeto" value={`${row.projeto.code} — ${row.projeto.name}`} />}
            {row.categoria && <Field label="Categoria" value={row.categoria.nome} />}
          </div>
          <Button className="w-full" onClick={() => { onOpenChange(false); navigate(`/financeiro/recorrencias/${row.id}`); }}>
            <ExternalLink className="h-4 w-4 mr-2" /> Ver tela completa
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}
