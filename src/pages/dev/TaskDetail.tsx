/**
 * Página tela cheia da task — /dev/tasks/:code (padrão §6.Y do ARCHITECTURE).
 * Layout 70/30: descrição+atividade à esquerda, sidebar de metadata à direita.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, X, MoreVertical, Copy, ExternalLink, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTaskByCode, useUpdateTaskFields } from "@/hooks/useTaskDetail";
import { TaskDescriptionPane } from "@/components/dev/TaskDescriptionPane";
import { TaskActivityPane } from "@/components/dev/TaskActivityPane";
import { TaskMetadataSidebar } from "@/components/dev/TaskMetadataSidebar";
import { TYPE_ICON, TYPE_LABEL, daysSince, projectColorClass } from "@/lib/tasks-helpers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TaskDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading, error } = useTaskByCode(code);
  const update = useUpdateTaskFields(task?.id, code);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    if (task && !editingTitle) setTitleDraft(task.title);
  }, [task?.title, editingTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => navigate("/dev/kanban");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-4 px-1 py-2 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold font-display">Task não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O código <span className="font-mono">{code}</span> não corresponde a nenhuma task ativa.
        </p>
        <Button onClick={goBack}>
          <ArrowLeft className="h-4 w-4" /> Voltar para Kanban
        </Button>
      </div>
    );
  }

  const saveTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === task.title) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    update.mutate({ title: next });
    setEditingTitle(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/dev/tasks/${task.code}`);
    toast.success("Link copiado");
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-[1600px] px-1 pb-12 animate-fade-in">
        {/* Breadcrumb + close */}
        <div className="mb-3 flex items-center justify-between">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/dev/kanban" className="hover:text-foreground transition-colors">
              Área Dev
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/dev/kanban" className="hover:text-foreground transition-colors">
              Kanban
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-mono text-foreground">{task.code}</span>
          </nav>
          <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8" aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Header denso */}
        <header className="mb-6 space-y-3 rounded-lg border border-border bg-card/30 p-3 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-muted-foreground">{task.code}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">
              {TYPE_ICON[task.type]} {TYPE_LABEL[task.type]}
            </span>
            {task.project && (
              <>
                <span className="text-muted-foreground">·</span>
                <Link to={`/projetos/${task.project.id}`}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-6 cursor-pointer gap-1.5 font-mono text-[11px]",
                      projectColorClass(task.project.id),
                    )}
                  >
                    <span className="font-semibold">{task.project.code}</span>
                    {task.project.name}
                  </Badge>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
                }}
                className="text-xl sm:text-2xl font-semibold h-auto py-1 font-display"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="flex-1 cursor-text text-xl sm:text-2xl font-semibold leading-tight text-foreground font-display hover:text-foreground/90 break-words"
                title="Clique para editar"
              >
                {task.title}
              </h1>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={goBack}>
                  <ExternalLink className="h-3.5 w-3.5" /> Ir para Kanban
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Duplicar (em breve)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Estados excepcionais */}
          {(task.is_blocked || task.rework_count > 0 || task.status === "done" || task.status === "cancelled") && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {task.is_blocked && task.blocked_since && (
                <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-400">
                  <Lock className="h-3 w-3" /> Bloqueada há {daysSince(task.blocked_since)} dia(s)
                </span>
              )}
              {task.rework_count > 0 && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                  🔁 Reabriu {task.rework_count} {task.rework_count === 1 ? "vez" : "vezes"}
                </span>
              )}
              {task.status === "done" && task.completed_at && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                  ✓ Concluída em {new Date(task.completed_at).toLocaleDateString("pt-BR")}
                </span>
              )}
              {task.status === "cancelled" && (
                <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground">
                  ✗ Cancelada
                </span>
              )}
            </div>
          )}
        </header>

        {/* 70/30 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger
                  value="description"
                  className="shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground shadow-none sm:px-4 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Descrição
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground shadow-none sm:px-4 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Atividade
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-5">
                <TaskDescriptionPane task={task} />
              </TabsContent>
              <TabsContent value="activity" className="mt-5">
                <TaskActivityPane taskId={task.id} />
              </TabsContent>
            </Tabs>
          </div>

          <TaskMetadataSidebar task={task} />
        </div>
      </div>
    </TooltipProvider>
  );
}
