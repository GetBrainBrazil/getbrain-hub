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

/** Máscara progressiva de CEP brasileiro: 00000-000 (máx 8 dígitos). */
export function formatCEP(value: string | null | undefined): string {
  if (!value) return "";
  const d = String(value).replace(/\D/g, "").slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Sigla de UF: maiúsculas, máx 2 letras. */
export function formatUF(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

/**
 * Formata um número de telefone com detecção automática de DDI.
 *
 * Regras:
 *  - 12 ou 13 dígitos começando com `55` → `+55 (DD) NNNNN-NNNN`.
 *  - Até 11 dígitos → formato nacional BR progressivo.
 *  - 12+ dígitos com outro DDI → `+CC NNNN NNNN…` (genérico).
 */
export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return "";
  const raw = String(value).replace(/\D/g, "").slice(0, 15);
  if (!raw) return "";

  if ((raw.length === 12 || raw.length === 13) && raw.startsWith("55")) {
    return `+55 ${formatBrNational(raw.slice(2))}`;
  }
  if (raw.length <= 11) {
    return formatBrNational(raw);
  }
  // DDI estrangeiro (heurística: 2 dígitos de país)
  const cc = raw.slice(0, 2);
  const rest = raw.slice(2);
  return `+${cc} ${rest.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}`;
}

/** Formata até 11 dígitos no padrão nacional brasileiro (com digitação parcial). */
function formatBrNational(d: string): string {
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Formata uma string de dígitos como valor monetário BRL para exibição em inputs.
 * Ex.: "150000" -> "R$ 1.500,00"
 */
export function maskCurrencyBRL(input: string): string {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte uma string mascarada (R$ 1.500,00) ou número de volta para Number. */
export function parseCurrencyBRL(input: string | number | null | undefined): number | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") return input;
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return null;
  return parseInt(digits, 10) / 100;
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
