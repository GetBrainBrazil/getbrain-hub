import { CatalogProduct, BILLING_UNITS } from "@/hooks/catalogo/useCatalog";
import { formatCurrency } from "@/lib/formatters";

const unitSuffix = (u: string) => {
  const found = BILLING_UNITS.find((b) => b.value === u);
  if (!found || u === "unica") return "";
  return ` / ${found.label.replace(/^Por /i, "").toLowerCase()}`;
};

export function PriceDisplay({ product }: { product: Pick<CatalogProduct, "price_mode" | "price_value" | "price_min" | "price_max" | "billing_unit"> }) {
  const suffix = unitSuffix(product.billing_unit);
  if (product.price_mode === "on_request") {
    return <span className="text-muted-foreground">Sob consulta</span>;
  }
  if (product.price_mode === "range") {
    return (
      <span className="font-mono text-sm">
        {formatCurrency(product.price_min ?? 0)} – {formatCurrency(product.price_max ?? 0)}
        {suffix}
      </span>
    );
  }
  const prefix = product.price_mode === "suggested" ? "~ " : "";
  return (
    <span className="font-mono text-sm">
      {prefix}
      {formatCurrency(product.price_value ?? 0)}
      {suffix}
    </span>
  );
}
