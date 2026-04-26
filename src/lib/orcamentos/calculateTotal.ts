export interface ScopeItem {
  title: string;
  description?: string;
  value: number;
}

export function calculateScopeTotal(items: ScopeItem[] | unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it: any) => acc + (Number(it?.value) || 0), 0);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export type ProposalStatus =
  | "rascunho"
  | "enviado"
  | "aceito"
  | "recusado"
  | "expirado"
  | "cancelado";

/**
 * Status efetivo para exibição: 'enviado' com valid_until vencido vira 'expirado'.
 */
export function effectiveStatus(
  status: ProposalStatus,
  validUntil: string
): ProposalStatus {
  if (status === "enviado" && validUntil) {
    const today = new Date().toISOString().slice(0, 10);
    if (validUntil < today) return "expirado";
  }
  return status;
}
