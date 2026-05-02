/**
 * Seletor visual entre 2 layouts da seção Investimento na página pública.
 * Cada card mostra um wireframe do resultado para o cliente entender a escolha.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type InvestmentLayout = "total_first" | "installments_first";

interface Props {
  value: InvestmentLayout;
  onChange: (v: InvestmentLayout) => void;
}

export function InvestmentLayoutPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <LayoutCard
        active={value === "total_first"}
        onClick={() => onChange("total_first")}
        title="Total em destaque"
        subtitle="Valor cheio grande, parcelas embaixo"
      >
        <div className="space-y-2 text-left">
          <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground/70">
            Investimento total
          </div>
          <div className="font-serif text-2xl tabular-nums text-foreground leading-none">
            R$ 4.000
          </div>
          <div className="h-px bg-border/60" />
          <div className="text-[10px] text-muted-foreground tabular-nums">
            7× <span className="text-foreground/80">de R$ 571,43</span>
          </div>
        </div>
      </LayoutCard>

      <LayoutCard
        active={value === "installments_first"}
        onClick={() => onChange("installments_first")}
        title="Parcela em destaque"
        subtitle="Valor por mês grande, total embaixo"
      >
        <div className="space-y-2 text-left">
          <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground/70">
            Por mês
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="font-serif text-2xl tabular-nums text-foreground leading-none">
              R$ 571
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">em 7×</span>
          </div>
          <div className="h-px bg-border/60" />
          <div className="text-[10px] text-muted-foreground tabular-nums">
            Total <span className="text-foreground/80">R$ 4.000</span>
          </div>
        </div>
      </LayoutCard>
    </div>
  );
}

function LayoutCard({
  active, onClick, title, subtitle, children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative text-left p-4 rounded-xl border-2 transition-all bg-background/60",
        active
          ? "border-accent ring-2 ring-accent/20 shadow-sm"
          : "border-border/60 hover:border-border hover:bg-background",
      )}
    >
      {active && (
        <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
          <Check className="h-3 w-3" />
        </span>
      )}
      <div className="mb-3">
        <div className="text-xs font-semibold text-foreground">{title}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      <div className="rounded-md bg-muted/40 border border-border/40 p-3">
        {children}
      </div>
    </button>
  );
}
