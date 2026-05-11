import { CatalogProduct } from "@/hooks/catalogo/useCatalog";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type Product = Pick<
  CatalogProduct,
  | "archetype"
  | "setup_value"
  | "setup_adjustable"
  | "recurring_value"
  | "recurring_adjustable"
  | "oneshot_value"
  | "oneshot_adjustable"
>;

function Row({
  label,
  value,
  adjustable,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  adjustable?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">
        {adjustable && <span className="text-muted-foreground mr-0.5">~</span>}
        {formatCurrency(value ?? 0)}
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </span>
    </div>
  );
}

export function PriceBlockDisplay({ product, className }: { product: Product; className?: string }) {
  const { archetype } = product;
  return (
    <div className={cn("space-y-1", className)}>
      {archetype === "aggregator" && (
        <div className="text-xs italic text-muted-foreground">
          Calculado na cesta
          <div className="text-[10px] not-italic">A partir dos itens selecionados</div>
        </div>
      )}
      {archetype === "one_shot" && (
        <Row label="Preço único" value={product.oneshot_value} adjustable={product.oneshot_adjustable} />
      )}
      {archetype === "saas" && (
        <Row label="Mensalidade" value={product.recurring_value} adjustable={product.recurring_adjustable} suffix="/mês" />
      )}
      {archetype === "with_maintenance" && (
        <>
          <Row label="Setup" value={product.setup_value} adjustable={product.setup_adjustable} />
          <Row label="Manutenção" value={product.recurring_value} adjustable={product.recurring_adjustable} suffix="/mês" />
        </>
      )}
      {archetype === "hybrid" && (
        <>
          <Row label="Setup" value={product.setup_value} adjustable={product.setup_adjustable} />
          <Row label="Mensalidade" value={product.recurring_value} adjustable={product.recurring_adjustable} suffix="/mês" />
        </>
      )}
    </div>
  );
}
