import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CrmHubState {
  ownerFilter: string[];
  sourceFilter: string[];
  valueRange: [number, number] | null;
  search: string;
  dashboardPeriod: number;
  calendarTypes: string[];
  calendarOwners: string[];
  calendarStatuses: string[];
  setOwnerFilter: (ids: string[]) => void;
  setSourceFilter: (sources: string[]) => void;
  setValueRange: (range: [number, number] | null) => void;
  setSearch: (value: string) => void;
  setDashboardPeriod: (days: number) => void;
  setCalendarTypes: (types: string[]) => void;
  setCalendarOwners: (owners: string[]) => void;
  setCalendarStatuses: (statuses: string[]) => void;
  resetFilters: () => void;
}

export const useCrmHubStore = create<CrmHubState>()(
  persist(
    (set) => ({
      ownerFilter: [],
      sourceFilter: [],
      valueRange: null,
      search: '',
      dashboardPeriod: 90,
      calendarTypes: [],
      calendarOwners: [],
      calendarStatuses: [],
      setOwnerFilter: (ids) => set({ ownerFilter: ids }),
      setSourceFilter: (sources) => set({ sourceFilter: sources }),
      setValueRange: (range) => set({ valueRange: range }),
      setSearch: (value) => set({ search: value }),
      setDashboardPeriod: (days) => set({ dashboardPeriod: days }),
      setCalendarTypes: (types) => set({ calendarTypes: types }),
      setCalendarOwners: (owners) => set({ calendarOwners: owners }),
      setCalendarStatuses: (statuses) => set({ calendarStatuses: statuses }),
      resetFilters: () => set({ ownerFilter: [], sourceFilter: [], valueRange: null, search: '' }),
    }),
    { name: 'getbrain-crm-hub-filters' },
  ),
);
