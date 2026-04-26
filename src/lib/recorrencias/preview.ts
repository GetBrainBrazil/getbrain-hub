import { addMonths } from "date-fns";

export type Frequency =
  | "mensal"
  | "bimestral"
  | "trimestral"
  | "semestral"
  | "anual";

export const FREQ_MONTHS: Record<Frequency, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const FREQ_LABEL: Record<Frequency, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export interface PreviewItem {
  index: number; // 1-based
  date: Date;
  amount: number;
}

export interface PreviewArgs {
  type: "recurrence" | "installment";
  startDate: string; // ISO yyyy-mm-dd
  amount: number;
  frequency: Frequency;
  totalInstallments?: number | null;
  endDate?: string | null;
  limit?: number;
}

/** Calcula as primeiras N parcelas de uma série (client-side preview). */
export function buildPreview({
  type,
  startDate,
  amount,
  frequency,
  totalInstallments,
  endDate,
  limit = 6,
}: PreviewArgs): { items: PreviewItem[]; totalCount: number; totalAmount: number } {
  if (!startDate || !amount || amount <= 0) {
    return { items: [], totalCount: 0, totalAmount: 0 };
  }
  const step = FREQ_MONTHS[frequency] ?? 1;
  const start = new Date(startDate + "T12:00:00");
  if (Number.isNaN(start.getTime())) return { items: [], totalCount: 0, totalAmount: 0 };

  let totalCount: number;
  if (type === "installment") {
    totalCount = Math.max(1, Math.floor(totalInstallments || 0));
  } else if (endDate) {
    const end = new Date(endDate + "T12:00:00");
    if (Number.isNaN(end.getTime()) || end < start) {
      totalCount = 0;
    } else {
      // inclusive start
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalCount = Math.floor(months / step) + 1;
    }
  } else {
    // open-ended: estimate 12 to display
    totalCount = 12;
  }

  const take = Math.min(limit, totalCount);
  const items: PreviewItem[] = [];
  for (let i = 0; i < take; i++) {
    items.push({
      index: i + 1,
      date: addMonths(start, i * step),
      amount,
    });
  }

  const totalAmount =
    type === "installment"
      ? amount * (totalInstallments || 0)
      : amount * (endDate ? totalCount : 12);

  return { items, totalCount, totalAmount };
}
