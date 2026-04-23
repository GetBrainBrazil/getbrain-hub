/**
 * Estado compartilhado do macro hub /dev (sprint selecionada + filtros).
 *
 * Por que Zustand e não URL params: o hub tem 6+ filtros (sprint, projetos,
 * assignees, tipos, prioridades, busca, "minhas tarefas"). Codificar tudo
 * na URL polui a barra e atrapalha deep-link compartilhável. URL guarda só
 * a sub-aba (Tabs do React Router); o resto vive aqui e persiste durante a
 * sessão ao trocar de aba do hub (Dashboard ↔ Kanban ↔ Sprints ↔ Backlog).
 */
import { create } from "zustand";
import type { TaskPriority, TaskTypeKind } from "@/types/tasks";

interface DevHubState {
  selectedSprintId: string | null;
  projectFilter: string[];
  assigneeFilter: string[];
  typeFilter: TaskTypeKind[];
  priorityFilter: TaskPriority[];
  search: string;
  onlyMine: boolean;
  setSelectedSprintId: (id: string | null) => void;
  setProjectFilter: (ids: string[]) => void;
  setAssigneeFilter: (ids: string[]) => void;
  setTypeFilter: (types: TaskTypeKind[]) => void;
  setPriorityFilter: (prios: TaskPriority[]) => void;
  setSearch: (s: string) => void;
  setOnlyMine: (v: boolean) => void;
  resetFilters: () => void;
}

export const useDevHubStore = create<DevHubState>((set) => ({
  selectedSprintId: null,
  projectFilter: [],
  assigneeFilter: [],
  typeFilter: [],
  priorityFilter: [],
  search: "",
  onlyMine: false,
  setSelectedSprintId: (id) => set({ selectedSprintId: id }),
  setProjectFilter: (ids) => set({ projectFilter: ids }),
  setAssigneeFilter: (ids) => set({ assigneeFilter: ids }),
  setTypeFilter: (types) => set({ typeFilter: types }),
  setPriorityFilter: (prios) => set({ priorityFilter: prios }),
  setSearch: (s) => set({ search: s }),
  setOnlyMine: (v) => set({ onlyMine: v }),
  resetFilters: () =>
    set({
      projectFilter: [],
      assigneeFilter: [],
      typeFilter: [],
      priorityFilter: [],
      search: "",
      onlyMine: false,
    }),
}));
