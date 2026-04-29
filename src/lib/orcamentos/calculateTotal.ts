export interface ScopeItem {
  title: string;
  description?: string;
  value: number;
}

/** Item canônico vindo da tabela proposal_items */
export interface ProposalItemRow {
  id: string;
  proposal_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  order_index: number;
}

export function calculateScopeTotal(items: ScopeItem[] | unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it: any) => acc + (Number(it?.value) || 0), 0);
}

export function calculateItemsTotal(items: ProposalItemRow[] | undefined | null): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
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

/**
 * Status novo (enum proposal_status no banco).
 * O legado ('enviado'|'aceito'|'recusado'|'cancelado') NÃO existe mais — ficou
 * mapeado pela migration de 10A para os novos valores.
 */
export type ProposalStatus =
  | "rascunho"
  | "enviada"
  | "visualizada"
  | "interesse_manifestado"
  | "expirada"
  | "convertida"
  | "recusada";

/** Helper: normaliza status legado caso ainda chegue de cache antigo. */
const VALID_STATUS = new Set<ProposalStatus>([
  "rascunho",
  "enviada",
  "visualizada",
  "interesse_manifestado",
  "expirada",
  "convertida",
  "recusada",
]);

export function normalizeProposalStatus(s: string | null | undefined): ProposalStatus {
  if (!s) return "rascunho";
  // Mapeamento legado → novo
  switch (s) {
    case "enviado":
      return "enviada";
    case "aceito":
      return "convertida";
    case "recusado":
    case "cancelado":
      return "recusada";
    case "expirado":
      return "expirada";
  }
  return VALID_STATUS.has(s as ProposalStatus) ? (s as ProposalStatus) : "rascunho";
}

/**
 * Status efetivo para exibição: 'enviada' com expires_at vencido vira 'expirada'.
 */
export function effectiveStatus(
  status: ProposalStatus | string,
  expiresAt: string | null | undefined
): ProposalStatus {
  const s = normalizeProposalStatus(status);
  if (s === "enviada" && expiresAt) {
    const today = new Date().toISOString().slice(0, 10);
    if (expiresAt < today) return "expirada";
  }
  return s;
}
