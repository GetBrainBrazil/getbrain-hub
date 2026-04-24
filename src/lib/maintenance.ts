/**
 * Helpers for maintenance contracts.
 * Centralizes MRR / discount-expiration logic so every module
 * (project detail, contracts list, sales, drawer, operacional)
 * stays consistent.
 */

export type MaintenanceContractLike = {
  id?: string;
  status?: string | null;
  monthly_fee: number | string;
  monthly_fee_discount_percent?: number | string | null;
  discount_duration_months?: number | null;
  start_date?: string | null;
};

export type DiscountInfo = {
  /** discount currently being applied (false if expired or no discount) */
  active: boolean;
  /** there's a discount but it has no end date */
  indefinite: boolean;
  /** date when the discount stops applying (null if indefinite or none) */
  endsAt: Date | null;
  /** the discount % (0–100) regardless of vigency */
  pct: number;
  /** there is some discount configured (>0) */
  hasDiscount: boolean;
  /** discount was set but already past its end date */
  expired: boolean;
};

export function getDiscountInfo(
  contract: MaintenanceContractLike | null | undefined,
  atDate: Date = new Date(),
): DiscountInfo {
  if (!contract) {
    return { active: false, indefinite: false, endsAt: null, pct: 0, hasDiscount: false, expired: false };
  }
  const pct = Number(contract.monthly_fee_discount_percent || 0);
  if (pct <= 0) {
    return { active: false, indefinite: false, endsAt: null, pct: 0, hasDiscount: false, expired: false };
  }
  const months = contract.discount_duration_months;
  if (!months || months <= 0) {
    return { active: true, indefinite: true, endsAt: null, pct, hasDiscount: true, expired: false };
  }
  const start = contract.start_date ? new Date(contract.start_date) : new Date();
  const ends = new Date(start);
  ends.setMonth(ends.getMonth() + Number(months));
  const active = atDate <= ends;
  return { active, indefinite: false, endsAt: ends, pct, hasDiscount: true, expired: !active };
}

/** Effective monthly fee respecting discount vigency. */
export function getEffectiveMrr(
  contract: MaintenanceContractLike | null | undefined,
  atDate: Date = new Date(),
): number {
  if (!contract) return 0;
  const fee = Number(contract.monthly_fee || 0);
  if (!fee) return 0;
  const info = getDiscountInfo(contract, atDate);
  return info.active ? fee * (1 - info.pct / 100) : fee;
}

/** Sum of effective MRR for a list of contracts (filters by status === 'active'). */
export function sumActiveMrr(
  contracts: MaintenanceContractLike[] | null | undefined,
  atDate: Date = new Date(),
): number {
  if (!contracts?.length) return 0;
  return contracts
    .filter((c) => (c.status ?? "active") === "active")
    .reduce((sum, c) => sum + getEffectiveMrr(c, atDate), 0);
}

export function formatDiscountVigency(info: DiscountInfo, formatDate: (d: string) => string): string {
  if (!info.hasDiscount) return "";
  if (info.indefinite) return "indefinido";
  if (!info.endsAt) return "";
  const dateStr = formatDate(info.endsAt.toISOString().slice(0, 10));
  return info.active ? `até ${dateStr}` : `expirado em ${dateStr}`;
}
