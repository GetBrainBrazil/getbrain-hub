import type { TaskPriority, TaskTypeKind } from "@/types/tasks";

/** Cor da barra lateral do card por prioridade.
 *  Apenas urgent/high mostram barra (medium/low ficam transparentes). */
export const PRIORITY_BAR_CLASS: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-transparent",
  low: "bg-transparent",
};

/** Paleta de cor determinística para chips de label. */
const LABEL_COLORS = [
  "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
];
export function labelColorClass(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}

/** Tempo relativo curto em pt-BR (ex: "há 3h", "há 2 dias"). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `há ${m} ${m === 1 ? "mês" : "meses"}`;
  const y = Math.floor(m / 12);
  return `há ${y} ${y === 1 ? "ano" : "anos"}`;
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const TYPE_ICON: Record<TaskTypeKind, string> = {
  bug: "🐛",
  feature: "✨",
  refactor: "🔧",
  docs: "📚",
  research: "🔬",
  chore: "🧹",
};

export const TYPE_LABEL: Record<TaskTypeKind, string> = {
  bug: "Bug",
  feature: "Feature",
  refactor: "Refactor",
  docs: "Docs",
  research: "Research",
  chore: "Chore",
};

/** Hash determinístico → paleta para chip de projeto. */
const PROJECT_COLORS = [
  "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
];
export function projectColorClass(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500",
  "bg-pink-500", "bg-amber-500", "bg-cyan-500",
];
export function actorColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/** Consumo de horas (%); null se sem estimativa. */
export function hoursConsumptionPct(actual: number, estimated: number | null): number | null {
  if (!estimated || estimated <= 0) return null;
  return (actual / estimated) * 100;
}

export function hoursToneClass(actual: number, estimated: number | null): string {
  const pct = hoursConsumptionPct(actual, estimated);
  if (pct == null) return "text-muted-foreground";
  if (pct > 100) return "text-red-400";
  if (pct >= 80) return "text-amber-400";
  return "text-emerald-400";
}

/** Dias entre uma data ISO e hoje (positivo = passado). */
export function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  return Math.floor((Date.now() - t) / 86_400_000);
}

/** Cor + texto auxiliar do due_date. */
export function dueDateInfo(due: string | null, isDone: boolean): {
  label: string;
  className: string;
  suffix?: string;
} | null {
  if (!due) return null;
  const d = new Date(due);
  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const label = `${day}/${month}`;
  const diff = Math.floor((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (diff < 0 && !isDone) {
    return { label, className: "text-red-400", suffix: "atrasada" };
  }
  if (diff <= 3) return { label, className: "text-amber-400" };
  return { label, className: "text-muted-foreground" };
}
