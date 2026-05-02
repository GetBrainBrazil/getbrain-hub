/**
 * Helpers de formatação usados nos templates de PDF.
 * Centralizados aqui pra evitar dependências circulares com src/lib/formatters.
 */

export function formatBRL(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
  } catch {
    return String(iso);
  }
}
