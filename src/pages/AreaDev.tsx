import { useMemo, useState } from "react";
import { Plus, ListTodo, GitPullRequest, Bug, TrendingUp, Flag, Calendar, MoreHorizontal, Search, X, Link2, MessageSquare, GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { NovaTarefaDialog, type NovaTarefaPayload } from "@/components/area-dev/NovaTarefaDialog";

type Priority = "alta" | "media" | "baixa";
type TagType = "Bug" | "Feature" | "Refactor" | "Docs" | "Chore";

interface Assignee { name: string; full: string; color: string }
interface Comment { author: Assignee; text: string; when: string; type?: "comment" | "status" }

interface Task {
  id: string;
  title: string;
  tags: TagType[];
  priority: Priority;
  dueDate: string;
  assignees: Assignee[];
  project: string;
  description: string;
  comments: Comment[];
}

interface Column { id: string; title: string; tasks: Task[] }

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

const sparklineData = [{ v: 3 }, { v: 5 }, { v: 4 }, { v: 7 }, { v: 6 }, { v: 9 }, { v: 12 }];

const ME: Assignee = { name: "JM", full: "João Mendes", color: "bg-blue-500" };
const AR: Assignee = { name: "AR", full: "Ana Ribeiro", color: "bg-purple-500" };
const LP: Assignee = { name: "LP", full: "Lucas Pereira", color: "bg-emerald-500" };
const CS: Assignee = { name: "CS", full: "Camila Souza", color: "bg-pink-500" };

const PROJECTS = ["GetBrain Web", "App Mobile", "API Financeira"];

const sampleDesc = `### Contexto
O cálculo de juros do dashboard está aplicando taxa composta quando deveria ser simples para movimentações vencidas há menos de 30 dias.

### Critérios de aceite
- [ ] Aplicar juros simples para atrasos < 30 dias
- [ ] Aplicar juros compostos a partir de 30 dias
- [ ] Adicionar testes unitários cobrindo os dois cenários
- [ ] Atualizar tooltip de ajuda no card

### Links
- Issue original: #DEV-088
- PR relacionado: getbrain/web#412`;

const sampleComments: Comment[] = [
  { author: AR, text: "Movi para In Progress", when: "há 2 dias", type: "status" },
  { author: LP, text: "Confirmado o bug em produção. Vou começar pela camada de cálculo.", when: "há 1 dia" },
  { author: CS, text: "Deixei algumas referências no Notion sobre a fórmula correta.", when: "há 6 horas" },
];

const initialColumns: Column[] = [
  {
    id: "backlog", title: "Backlog", tasks: [
      { id: "DEV-110", title: "Refatorar serviço de notificações", tags: ["Refactor"], priority: "baixa", dueDate: "30/04", assignees: [ME], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-111", title: "Documentar API de extratos bancários", tags: ["Docs"], priority: "baixa", dueDate: "05/05", assignees: [AR], project: "API Financeira", description: sampleDesc, comments: sampleComments },
      { id: "DEV-112", title: "Migrar dependências legadas", tags: ["Chore"], priority: "media", dueDate: "12/05", assignees: [LP], project: "App Mobile", description: sampleDesc, comments: sampleComments },
    ],
  },
  {
    id: "todo", title: "To Do", tasks: [
      { id: "DEV-105", title: "Implementar relatório DRE consolidado", tags: ["Feature"], priority: "alta", dueDate: "22/04", assignees: [ME, CS], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-106", title: "Adicionar filtros persistentes em movimentações", tags: ["Feature"], priority: "media", dueDate: "25/04", assignees: [AR], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
    ],
  },
  {
    id: "progress", title: "In Progress", tasks: [
      { id: "DEV-102", title: "Ajustar cálculo de juros do dashboard", tags: ["Bug"], priority: "alta", dueDate: "20/04", assignees: [LP], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-103", title: "Tela de Folha de Pagamento", tags: ["Feature"], priority: "media", dueDate: "28/04", assignees: [ME, AR], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-104", title: "Otimizar query de listagem de movimentações", tags: ["Refactor"], priority: "media", dueDate: "26/04", assignees: [CS], project: "API Financeira", description: sampleDesc, comments: sampleComments },
    ],
  },
  {
    id: "review", title: "Code Review", tasks: [
      { id: "DEV-098", title: "Validação de CPF/CNPJ duplicado", tags: ["Bug"], priority: "alta", dueDate: "19/04", assignees: [ME], project: "API Financeira", description: sampleDesc, comments: sampleComments },
      { id: "DEV-099", title: "Wizard de importação de extratos", tags: ["Feature"], priority: "media", dueDate: "21/04", assignees: [LP, AR], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-100", title: "Componente de tooltip de ajuda", tags: ["Feature"], priority: "baixa", dueDate: "23/04", assignees: [CS], project: "App Mobile", description: sampleDesc, comments: sampleComments },
      { id: "DEV-101", title: "Refatorar contexto de autenticação", tags: ["Refactor"], priority: "media", dueDate: "24/04", assignees: [ME], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
    ],
  },
  {
    id: "done", title: "Done", tasks: [
      { id: "DEV-095", title: "Setup inicial do design system", tags: ["Chore"], priority: "baixa", dueDate: "10/04", assignees: [AR], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-096", title: "Página de configurações financeiras", tags: ["Feature"], priority: "media", dueDate: "12/04", assignees: [ME], project: "GetBrain Web", description: sampleDesc, comments: sampleComments },
      { id: "DEV-097", title: "Fix erro de fuso horário em datas", tags: ["Bug"], priority: "alta", dueDate: "14/04", assignees: [LP], project: "API Financeira", description: sampleDesc, comments: sampleComments },
    ],
  },
];

function KpiCard({ icon: Icon, label, value, valueClass, sparkline }: {
  icon: React.ElementType; label: string; value: string | number; valueClass?: string; sparkline?: boolean;
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

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const prio = priorityConfig[task.priority];
  return (
    <Card
      onClick={onClick}
      className="p-3 bg-card border-border/60 hover:border-accent/60 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground">{task.id}</span>
        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h4 className="text-sm font-medium text-foreground leading-snug mb-3 line-clamp-2">{task.title}</h4>
      <div className="flex flex-wrap gap-1 mb-3">
        {task.tags.map((tag) => (
          <Badge key={tag} variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", tagStyles[tag])}>{tag}</Badge>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flag className={cn("h-3 w-3", prio.color)} fill="currentColor" />
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{task.dueDate}</span>
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

function KanbanColumn({ column, onOpenTask }: { column: Column; onOpenTask: (t: Task) => void }) {
  return (
    <div className="flex flex-col w-72 shrink-0 bg-muted/30 rounded-lg p-3 max-h-[calc(100vh-400px)]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">{column.tasks.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
        {column.tasks.map((task) => (<TaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} />))}
      </div>
    </div>
  );
}

function TaskDetailDrawer({ task, columns, onClose, onStatusChange }: {
  task: Task | null; columns: Column[]; onClose: () => void; onStatusChange: (status: string) => void;
}) {
  const open = !!task;
  const currentColumn = useMemo(() => columns.find(c => c.tasks.some(t => t.id === task?.id))?.id ?? "", [columns, task]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[40vw] sm:min-w-[520px] p-0 flex flex-col gap-0">
        {task && (
          <>
            <div className="flex items-center justify-between gap-3 p-5 border-b">
              <div className="flex items-center gap-3 min-w-0">
                <a href="#" className="text-sm font-mono font-semibold text-accent hover:underline shrink-0">{task.id}</a>
                <Select value={currentColumn} onValueChange={onStatusChange}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (<SelectItem key={c.id} value={c.id} className="text-xs">{c.title}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                <h2 className="text-2xl font-bold font-display text-foreground leading-tight">{task.title}</h2>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40 border border-border/50">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Responsáveis</p>
                    <div className="space-y-1.5">
                      {task.assignees.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className={cn("text-[10px] font-semibold text-white", a.color)}>{a.name}</AvatarFallback></Avatar>
                          <span className="text-sm text-foreground">{a.full}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Prioridade</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Flag className={cn("h-3.5 w-3.5", priorityConfig[task.priority].color)} fill="currentColor" />
                      <span className="text-foreground">{priorityConfig[task.priority].label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Labels</p>
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map(tag => (<Badge key={tag} variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", tagStyles[tag])}>{tag}</Badge>))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Data de Entrega</p>
                    <div className="flex items-center gap-1.5 text-sm text-foreground"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{task.dueDate}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Descrição</h3>
                  <div className="prose prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono bg-muted/30 p-4 rounded-lg border border-border/50">
                    {task.description}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Atividade</h3>
                  <div className="space-y-3">
                    {task.comments.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5"><AvatarFallback className={cn("text-[10px] font-semibold text-white", c.author.color)}>{c.author.name}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-sm font-medium text-foreground">{c.author.full}</span>
                            <span className="text-xs text-muted-foreground">{c.when}</span>
                          </div>
                          <div className={cn("text-sm", c.type === "status" ? "text-muted-foreground italic flex items-center gap-1.5" : "text-foreground")}>
                            {c.type === "status" && <GitCommit className="h-3 w-3" />}
                            {c.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t p-4 bg-muted/20">
              <div className="flex gap-2">
                <Textarea placeholder="Adicionar um comentário..." className="min-h-[60px] resize-none text-sm" />
              </div>
              <div className="flex justify-end mt-2">
                <Button size="sm">Comentar</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function AreaDev() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [project, setProject] = useState<string>("all");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [query, setQuery] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return columns.map(col => ({
      ...col,
      tasks: col.tasks.filter(t => {
        if (project !== "all" && t.project !== project) return false;
        if (scope === "mine" && !t.assignees.some(a => a.name === ME.name)) return false;
        if (q && !`${t.id} ${t.title} ${t.tags.join(" ")}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    }));
  }, [columns, project, scope, query]);

  function handleStatusChange(newColId: string) {
    if (!activeTask) return;
    setColumns(prev => {
      const next = prev.map(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== activeTask.id) }));
      const target = next.find(c => c.id === newColId);
      if (target) target.tasks = [activeTask, ...target.tasks];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Área Dev — Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie tarefas, sprints e entregas da engenharia.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Novo Sprint</Button>
          <Button className="bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1.5" /> Nova Tarefa</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ListTodo} label="Tarefas Pendentes" value={12} />
        <KpiCard icon={GitPullRequest} label="PRs em Revisão" value={4} />
        <KpiCard icon={Bug} label="Bugs Críticos" value={2} valueClass="text-red-500" />
        <KpiCard icon={TrendingUp} label="Produtividade da Semana" value="" sparkline />
      </div>

      {/* Toolbar de filtros */}
      <div className="flex items-center gap-3 flex-wrap p-3 bg-card border border-border/50 rounded-lg shadow-sm">
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Todos os Projetos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Projetos</SelectItem>
            {PROJECTS.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>

        <div className="inline-flex items-center bg-muted rounded-md p-0.5">
          <button
            onClick={() => setScope("mine")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors", scope === "mine" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >Minhas Tarefas</button>
          <button
            onClick={() => setScope("all")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors", scope === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >Todas</button>
        </div>

        <div className="relative flex-1 min-w-[240px] ml-auto max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefas, tags ou IDs..."
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
        {filtered.map((col) => (<KanbanColumn key={col.id} column={col} onOpenTask={setActiveTask} />))}
      </div>

      <TaskDetailDrawer
        task={activeTask}
        columns={columns}
        onClose={() => setActiveTask(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
