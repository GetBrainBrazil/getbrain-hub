/**
 * useFinanceHubStore — estado global persistido do dashboard financeiro.
 * Filtros sobrevivem a refresh / troca de aba (mem://preference/filter-persistence).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FinancePeriodPreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_30"
  | "last_90"
  | "last_12m"
  | "ytd"
  | "last_year"
  | "custom";

export type FinanceCompareOption = "previous_period" | "previous_year" | "none";
export type FinanceRegime = "competencia" | "caixa";
export type FinanceScenario = "otimista" | "realista" | "pessimista";
export type FinanceProjectionHorizon = 30 | 60 | 90 | 180;

interface FinanceHubState {
  period: FinancePeriodPreset;
  customStart: string | null;
  customEnd: string | null;
  compareWith: FinanceCompareOption;
  regime: FinanceRegime;
  accountFilter: string[];
  projectFilter: string[];
  categoryFilter: string[];
  // Bloco fluxo projetado
  scenario: FinanceScenario;
  horizon: FinanceProjectionHorizon;

  setPeriod: (p: FinancePeriodPreset) => void;
  setCustomRange: (start: string | null, end: string | null) => void;
  setCompareWith: (c: FinanceCompareOption) => void;
  setRegime: (r: FinanceRegime) => void;
  setAccountFilter: (ids: string[]) => void;
  setProjectFilter: (ids: string[]) => void;
  setCategoryFilter: (ids: string[]) => void;
  setScenario: (s: FinanceScenario) => void;
  setHorizon: (h: FinanceProjectionHorizon) => void;
  resetFilters: () => void;
}

export const useFinanceHubStore = create<FinanceHubState>()(
  persist(
    (set) => ({
      period: "this_month",
      customStart: null,
      customEnd: null,
      compareWith: "previous_period",
      regime: "competencia",
      accountFilter: [],
      projectFilter: [],
      categoryFilter: [],
      scenario: "realista",
      horizon: 90,

      setPeriod: (period) => set({ period }),
      setCustomRange: (customStart, customEnd) => set({ customStart, customEnd }),
      setCompareWith: (compareWith) => set({ compareWith }),
      setRegime: (regime) => set({ regime }),
      setAccountFilter: (accountFilter) => set({ accountFilter }),
      setProjectFilter: (projectFilter) => set({ projectFilter }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setScenario: (scenario) => set({ scenario }),
      setHorizon: (horizon) => set({ horizon }),
      resetFilters: () =>
        set({
          accountFilter: [],
          projectFilter: [],
          categoryFilter: [],
        }),
    }),
    { name: "getbrain-finance-hub-filters" },
  ),
);

/* ---------------------------------------------------------------- */
/* Helpers de período                                               */
/* ---------------------------------------------------------------- */

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function resolvePeriod(
  preset: FinancePeriodPreset,
  customStart: string | null,
  customEnd: string | null,
): PeriodRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case "today":
      return { start: today, end: endOfDay(today), label: "Hoje" };
    case "this_week": {
      const dow = today.getDay();
      const start = addDays(today, -dow);
      return { start, end: endOfDay(addDays(start, 6)), label: "Esta semana" };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      return { start, end, label: "Este mês" };
    }
    case "last_30":
      return { start: addDays(today, -29), end: endOfDay(today), label: "Últimos 30 dias" };
    case "last_90":
      return { start: addDays(today, -89), end: endOfDay(today), label: "Últimos 90 dias" };
    case "last_12m":
      return { start: addDays(today, -364), end: endOfDay(today), label: "Últimos 12 meses" };
    case "ytd": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end: endOfDay(today), label: "Este ano (YTD)" };
    }
    case "last_year": {
      const y = today.getFullYear() - 1;
      return {
        start: new Date(y, 0, 1),
        end: endOfDay(new Date(y, 11, 31)),
        label: "Ano passado",
      };
    }
    case "custom": {
      if (customStart && customEnd) {
        return {
          start: startOfDay(new Date(customStart)),
          end: endOfDay(new Date(customEnd)),
          label: "Período custom",
        };
      }
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: endOfDay(today),
        label: "Este mês",
      };
    }
  }
}

export function resolveCompareRange(
  current: PeriodRange,
  compare: FinanceCompareOption,
): PeriodRange | null {
  if (compare === "none") return null;
  const durMs = current.end.getTime() - current.start.getTime();
  const dayMs = 86400000;
  const days = Math.round(durMs / dayMs);

  if (compare === "previous_period") {
    const end = addDays(current.start, -1);
    const start = addDays(end, -days);
    return { start: startOfDay(start), end: endOfDay(end), label: "Período anterior" };
  }
  // previous_year
  const start = new Date(current.start);
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date(current.end);
  end.setFullYear(end.getFullYear() - 1);
  return { start: startOfDay(start), end: endOfDay(end), label: "Mesmo período ano passado" };
}

export const toISODate = (d: Date) => d.toISOString().slice(0, 10);
