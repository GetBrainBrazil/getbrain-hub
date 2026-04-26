import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildPreview, type PreviewArgs, FREQ_LABEL } from "@/lib/recorrencias/preview";
import { Card } from "@/components/ui/card";

interface Props extends PreviewArgs {}

export function PreviewParcelas(args: Props) {
  const { items, totalCount, totalAmount } = buildPreview({ ...args, limit: 6 });
  const isInstallment = args.type === "installment";

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Preencha valor, frequência e início para ver a prévia.
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prévia das próximas parcelas
        </h4>
        <span className="text-[11px] text-muted-foreground">{FREQ_LABEL[args.frequency]}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((it) => (
          <li key={it.index} className="flex items-center justify-between tabular-nums">
            <span className="text-muted-foreground">
              {isInstallment
                ? `Parcela ${it.index}/${args.totalInstallments}`
                : `Vencimento`}{" "}
              <span className="text-foreground">{formatDate(it.date)}</span>
            </span>
            <span className="font-medium">{formatCurrency(it.amount)}</span>
          </li>
        ))}
        {totalCount > items.length && (
          <li className="text-[11px] text-muted-foreground italic">
            ... e mais {totalCount - items.length} {isInstallment ? "parcelas" : "vencimentos"}
          </li>
        )}
      </ul>
      <div className="border-t border-border/50 pt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {isInstallment ? "Total da série" : "Estimativa anual"}
        </span>
        <span className="font-bold tabular-nums">{formatCurrency(totalAmount)}</span>
      </div>
    </Card>
  );
}
