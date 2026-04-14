export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export type StatusType = "pendente" | "pago" | "atrasado" | "cancelado";

export function getStatusColor(status: StatusType) {
  switch (status) {
    case "pago": return "bg-success/10 text-success border-success/20";
    case "pendente": return "bg-warning/10 text-warning border-warning/20";
    case "atrasado": return "bg-destructive/10 text-destructive border-destructive/20";
    case "cancelado": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function getStatusLabel(status: StatusType) {
  switch (status) {
    case "pago": return "Pago";
    case "pendente": return "Pendente";
    case "atrasado": return "Atrasado";
    case "cancelado": return "Cancelado";
    default: return status;
  }
}
