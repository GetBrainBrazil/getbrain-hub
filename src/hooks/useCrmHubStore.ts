import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CrmHubState {
  ownerFilter: string[];
  sourceFilter: string[];
  valueRange: [number, number] | null;
  search: string;
  setOwnerFilter: (ids: string[]) => void;
  setSourceFilter: (sources: string[]) => void;
  setValueRange: (range: [number, number] | null) => void;
  setSearch: (value: string) => void;
  resetFilters: () => void;
}

export const useCrmHubStore = create<CrmHubState>()(
  persist(
    (set) => ({
      ownerFilter: [],
      sourceFilter: [],
      valueRange: null,
      search: '',
      setOwnerFilter: (ids) => set({ ownerFilter: ids }),
      setSourceFilter: (sources) => set({ sourceFilter: sources }),
      setValueRange: (range) => set({ valueRange: range }),
      setSearch: (value) => set({ search: value }),
      resetFilters: () => set({ ownerFilter: [], sourceFilter: [], valueRange: null, search: '' }),
    }),
    { name: 'getbrain-crm-hub-filters' },
  ),
);
