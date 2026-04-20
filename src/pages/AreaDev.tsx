import { useState } from "react";
import { Plus, ListTodo, GitPullRequest, Bug, TrendingUp, Flag, Calendar, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type Priority = "alta" | "media" | "baixa";
type TagType = "Bug" | "Feature" | "Refactor" | "Docs" | "Chore";

interface Task {
  id: string;
  title: string;
  tags: TagType[];
  priority: Priority;
  dueDate: string;
  assignees: { name: string; color: string }[];
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const tagStyles: Record<TagType, string> = {
  Bug: "bg-red-500/15 text-red-400 border-red-500/30",
  Feature: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Refactor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Docs: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Chore: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const priorityConfig: Record<Priority, { color: string; label: string }> = {
  alta: { color: "text-red-500", label: "Alta" },
  media: { color: "text-amber-500", label: "Média" },
  baixa: { color: "text-emerald-500", label: "Baixa" },
};

const sparklineData = [
  { v: 3 }, { v: 5 }, { v: 4 }, { v: 7 }, { v: 6 }, { v: 9 }, { v: 12 },
];

const initialColumns: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    tasks: [
      { id: "DEV-110", title: "Refatorar serviço de notificações", tags: ["Refactor"], priority: "baixa", dueDate: "30/04", assignees: [{ name: "JM", color: "bg-blue-500" }] },
      { id: "DEV-111", title: "Documentar API de extratos bancários", tags: ["Docs"], priority: "baixa", dueDate: "05/05", assignees: [{ name: "AR", color: "bg-purple-500" }] },
      { id: "DEV-112", title: "Migrar dependências legadas", tags: ["Chore"], priority: "media", dueDate: "12/05", assignees: [{ name: "LP", color: "bg-emerald-500" }] },
    ],
  },
  {
    id: "todo",
    title: "To Do",
    tasks: [
      { id: "DEV-105", title: "Implementar relatório DRE consolidado", tags: ["Feature"], priority: "alta", dueDate: "22/04", assignees: [{ name: "JM", color: "bg-blue-500" }, { name: "CS", color: "bg-pink-500" }] },
      { id: "DEV-106", title: "Adicionar filtros persistentes em movimentações", tags: ["Feature"], priority: "media", dueDate: "25/04", assignees: [{ name: "AR", color: "bg-purple-500" }] },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    tasks: [
      { id: "DEV-102", title: "Ajustar cálculo de juros do dashboard", tags: ["Bug"], priority: "alta", dueDate: "20/04", assignees: [{ name: "LP", color: "bg-emerald-500" }] },
      { id: "DEV-103", title: "Tela de Folha de Pagamento", tags: ["Feature"], priority: "media", dueDate: "28/04", assignees: [{ name: "JM", color: "bg-blue-500" }, { name: "AR", color: "bg-purple-500" }] },
      { id: "DEV-104", title: "Otimizar query de listagem de movimentações", tags: ["Refactor"], priority: "media", dueDate: "26/04", assignees: [{ name: "CS", color: "bg-pink-500" }] },
    ],
  },
  {
    id: "review",
    title: "Code Review",
    tasks: [
      { id: "DEV-098", title: "Validação de CPF/CNPJ duplicado", tags: ["Bug"], priority: "alta", dueDate: "19/04", assignees: [{ name: "JM", color: "bg-blue-500" }] },
      { id: "DEV-099", title: "Wizard de importação de extratos", tags: ["Feature"], priority: "media", dueDate: "21/04", assignees: [{ name: "LP", color: "bg-emerald-500" }, { name: "AR", color: "bg-purple-500" }] },
      { id: "DEV-100", title: "Componente de tooltip de ajuda", tags: ["Feature"], priority: "baixa", dueDate: "23/04", assignees: [{ name: "CS", color: "bg-pink-500" }] },
      { id: "DEV-101", title: "Refatorar contexto de autenticação", tags: ["Refactor"], priority: "media", dueDate: "24/04", assignees: [{ name: "JM", color: "bg-blue-500" }] },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      { id: "DEV-095", title: "Setup inicial do design system", tags: ["Chore"], priority: "baixa", dueDate: "10/04", assignees: [{ name: "AR", color: "bg-purple-500" }] },
      { id: "DEV-096", title: "Página de configurações financeiras", tags: ["Feature"], priority: "media", dueDate: "12/04", assignees: [{ name: "JM", color: "bg-blue-500" }] },
      { id: "DEV-097", title: "Fix erro de fuso horário em datas", tags: ["Bug"], priority: "alta", dueDate: "14/04", assignees: [{ name: "LP", color: "bg-emerald-500" }] },
    ],
  },
];

function KpiCard({ icon: Icon, label, value, valueClass, sparkline }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  valueClass?: string;
  sparkline?: boolean;
}) {
  return (
    <Card className="p-5 bg-card border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
          {sparkline ? (
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold font-display tabular-nums text-emerald-500">+18</span>
              <div className="flex-1 h-10 -mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="v" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className={cn("text-3xl font-bold font-display tabular-nums", valueClass ?? "text-foreground")}>{value}</p>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", valueClass ? "bg-red-500/10" : "bg-accent/10")}>
          <Icon className={cn("h-5 w-5", valueClass ?? "text-accent")} />
        </div>
      </div>
    </Card>
  );
}

function TaskCard({ task }: { task: Task }) {
  const prio = priorityConfig[task.priority];
  return (
    <Card className="p-3 bg-card border-border/60 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground">{task.id}</span>
        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h4 className="text-sm font-medium text-foreground leading-snug mb-3 line-clamp-2">{task.title}</h4>
      <div className="flex flex-wrap gap-1 mb-3">
        {task.tags.map((tag) => (
          <Badge key={tag} variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", tagStyles[tag])}>
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flag className={cn("h-3 w-3", prio.color)} fill="currentColor" />
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {task.dueDate}
          </span>
        </div>
        <div className="flex -space-x-1.5">
          {task.assignees.map((a, i) => (
            <Avatar key={i} className="h-5 w-5 border-2 border-card">
              <AvatarFallback className={cn("text-[9px] font-semibold text-white", a.color)}>{a.name}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({ column }: { column: Column }) {
  return (
    <div className="flex flex-col w-72 shrink-0 bg-muted/30 rounded-lg p-3 max-h-[calc(100vh-340px)]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default function AreaDev() {
  const [columns] = useState<Column[]>(initialColumns);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Área Dev — Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie tarefas, sprints e entregas da engenharia.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Novo Sprint</Button>
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4 mr-1.5" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ListTodo} label="Tarefas Pendentes" value={12} />
        <KpiCard icon={GitPullRequest} label="PRs em Revisão" value={4} />
        <KpiCard icon={Bug} label="Bugs Críticos" value={2} valueClass="text-red-500" />
        <KpiCard icon={TrendingUp} label="Produtividade da Semana" value="" sparkline />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
        {columns.map((col) => (
          <KanbanColumn key={col.id} column={col} />
        ))}
      </div>
    </div>
  );
}
