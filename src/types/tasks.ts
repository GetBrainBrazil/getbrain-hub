export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskTypeKind = "feature" | "bug" | "chore" | "refactor" | "docs" | "research";
export type SprintStatus = "planned" | "active" | "completed" | "cancelled";

export interface TaskAssignee {
  id: string;
  task_id: string;
  actor_id: string;
  role: string | null;
  is_primary: boolean;
  actor?: { id: string; type: "human" | "ai_agent"; display_name: string; avatar_url: string | null } | null;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  description: string | null;
  project_id: string;
  sprint_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskTypeKind;
  estimated_hours: number | null;
  actual_hours: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_since: string | null;
  started_at: string | null;
  completed_at: string | null;
  rework_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignees?: TaskAssignee[];
  project?: { id: string; code: string; name: string } | null;
}

export interface Sprint {
  id: string;
  code: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  start_date: string;
  end_date: string;
  actual_end_date: string | null;
}

export const TASK_STATUS_COLUMNS: { id: TaskStatus; title: string; dot: string }[] = [
  { id: "todo", title: "To Do", dot: "bg-blue-400" },
  { id: "in_progress", title: "In Progress", dot: "bg-amber-400" },
  { id: "in_review", title: "Code Review", dot: "bg-purple-400" },
  { id: "done", title: "Done", dot: "bg-emerald-500" },
];

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const TASK_PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "text-slate-400",
  medium: "text-blue-400",
  high: "text-amber-500",
  urgent: "text-red-500",
};

export const TASK_TYPE_LABEL: Record<TaskTypeKind, string> = {
  feature: "Feature",
  bug: "Bug",
  chore: "Chore",
  refactor: "Refactor",
  docs: "Docs",
  research: "Research",
};

export const TASK_TYPE_CLASS: Record<TaskTypeKind, string> = {
  feature: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  bug: "bg-red-500/15 text-red-400 border-red-500/30",
  chore: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  refactor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  docs: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  research: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};
