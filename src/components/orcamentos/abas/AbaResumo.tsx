import { Card } from "@/components/ui/card";
import {
  calculateScopeTotal,
  formatBRL,
  formatDateBR,
} from "@/lib/orcamentos/calculateTotal";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
}

export function AbaResumo({ proposal }: Props) {
  const total = calculateScopeTotal(proposal.scope_items);
  const monthly = proposal.maintenance_monthly_value || 0;
  const annual = total + monthly * 12;

  let validityLabel = "—";
  let validityClass = "text-muted-foreground";
  if (proposal.valid_until) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validDate = new Date(`${proposal.valid_until}T00:00:00`);
    const diffDays = Math.round(
      (validDate.getTime() - today.getTime()) / 86400000
    );
    if (diffDays < 0) {
      validityLabel = `Vencido há ${Math.abs(diffDays)} dia(s)`;
      validityClass = "text-amber-500";
    } else if (diffDays === 0) {
      validityLabel = "Vence hoje";
      validityClass = "text-amber-500";
    } else {
      validityLabel = `Vence em ${diffDays} dia(s)`;
      validityClass = "text-foreground";
    }
  }

  const items = Array.isArray(proposal.scope_items)
    ? (proposal.scope_items as any[])
    : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Total dos itens" value={formatBRL(total)} accent="success" />
        <Kpi
          label="Manutenção / mês"
          value={monthly > 0 ? formatBRL(monthly) : "—"}
          accent="primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Total no 1º ano" value={formatBRL(annual)} />
        <Kpi
          label={`Validade · ${formatDateBR(proposal.valid_until)}`}
          value={validityLabel}
          valueClassName={validityClass}
        />
      </div>

      <Card className="p-3 space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Itens da proposta
        </h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum item.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 border-b border-border last:border-b-0 pb-1.5 last:pb-0"
              >
                <span className="font-medium leading-tight">{it.title}</span>
                <span className="tabular-nums text-success font-semibold whitespace-nowrap">
                  {formatBRL(Number(it.value) || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  valueClassName,
}: {
  label: string;
  value: string;
  accent?: "success" | "primary";
  valueClassName?: string;
}) {
  const colorClass =
    valueClassName ??
    (accent === "success"
      ? "text-success"
      : accent === "primary"
        ? "text-primary"
        : "text-foreground");
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </Card>
  );
}
