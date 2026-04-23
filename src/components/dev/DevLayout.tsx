/**
 * Layout do macro hub /dev (Tipo 2 — hub conforme ARCHITECTURE.md §6.X).
 * Cabeçalho com título, sprint selector e ações globais. Sub-aba na URL.
 */
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSprints } from "@/hooks/useTasks";
import { useDevHubStore } from "@/hooks/useDevHubStore";

const TABS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "kanban", label: "Kanban" },
  { value: "sprints", label: "Sprints" },
  { value: "backlog", label: "Backlog" },
];

export default function DevLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: sprints = [] } = useSprints();
  const selectedSprintId = useDevHubStore((s) => s.selectedSprintId);
  const setSelectedSprintId = useDevHubStore((s) => s.setSelectedSprintId);
  const onlyMine = useDevHubStore((s) => s.onlyMine);
  const setOnlyMine = useDevHubStore((s) => s.setOnlyMine);

  const currentTab =
    TABS.find((t) => location.pathname.startsWith(`/dev/${t.value}`))?.value ?? "dashboard";

  // Default: sprint ativa mais recente
  useEffect(() => {
    if (selectedSprintId || sprints.length === 0) return;
    const active = sprints.find((s) => s.status === "active") ?? sprints[0];
    if (active) setSelectedSprintId(active.id);
  }, [sprints, selectedSprintId, setSelectedSprintId]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-1 pb-12 animate-fade-in">
      {/* Header do hub */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Área Dev
            </h1>
            <p className="text-sm text-muted-foreground">
              Cockpit de engenharia GetBrain
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled title="Disponível em breve">
              <Plus className="h-4 w-4" /> Nova Sprint
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("dev:open-new-task"));
              }}
            >
              <Plus className="h-4 w-4" /> Nova Tarefa
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Sprint</Label>
            <Select
              value={selectedSprintId ?? ""}
              onValueChange={(v) => setSelectedSprintId(v || null)}
            >
              <SelectTrigger className="h-9 w-[320px] text-sm">
                <SelectValue placeholder="Selecionar sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-1.5">{s.code}</span>
                    {s.name}
                    {s.status === "active" && (
                      <span className="ml-2 text-[10px] text-emerald-400">● ativa</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="only-mine"
              checked={onlyMine}
              onCheckedChange={setOnlyMine}
            />
            <Label htmlFor="only-mine" className="text-xs text-muted-foreground">
              Minhas tarefas
            </Label>
          </div>
        </div>

        <Tabs
          value={currentTab}
          onValueChange={(v) => navigate(`/dev/${v}`)}
          className="w-full"
        >
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <Outlet />
    </div>
  );
}
