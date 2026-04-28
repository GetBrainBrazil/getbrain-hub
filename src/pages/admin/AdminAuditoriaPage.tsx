import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, History, Loader2 } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useUnifiedAudit, UnifiedAuditEntry } from "@/hooks/admin/useUnifiedAudit";
import { AuditFeedItem } from "@/components/admin/auditoria/AuditFeedItem";
import { AuditDetailDrawer } from "@/components/admin/auditoria/AuditDetailDrawer";
import { MODULE_LABEL, ACTION_LEGEND, ACTION_COLORS } from "@/lib/audit/formatters";
import { cn } from "@/lib/utils";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const that = new Date(d); that.setHours(0,0,0,0);
  if (that.getTime() === today.getTime()) return "Hoje";
  if (that.getTime() === yest.getTime()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function AdminAuditoriaPage() {
  const [params] = useSearchParams();
  const entityType = params.get("entity_type") ?? undefined;
  const entityId = params.get("entity_id") ?? undefined;

  const [search, setSearch] = usePersistedState("admin:audit:search", "");
  const [moduleFilter, setModuleFilter] = usePersistedState<string>("admin:audit:module", "all");
  const [actionFilter, setActionFilter] = usePersistedState<string>("admin:audit:action", "all");
  const [userFilter, setUserFilter] = usePersistedState<string>("admin:audit:user", "all");
  const [periodo, setPeriodo] = usePersistedState<string>("admin:audit:periodo", "7d");
  const [selected, setSelected] = useState<UnifiedAuditEntry | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (periodo === "hoje") { const f = new Date(now); f.setHours(0,0,0,0); return { from: f.toISOString(), to: undefined }; }
    if (periodo === "7d") { const f = new Date(now); f.setDate(f.getDate() - 7); return { from: f.toISOString(), to: undefined }; }
    if (periodo === "30d") { const f = new Date(now); f.setDate(f.getDate() - 30); return { from: f.toISOString(), to: undefined }; }
    if (periodo === "90d") { const f = new Date(now); f.setDate(f.getDate() - 90); return { from: f.toISOString(), to: undefined }; }
    return { from: undefined as string | undefined, to: undefined as string | undefined };
  }, [periodo]);

  const { data: entries = [], isLoading } = useUnifiedAudit({
    module: moduleFilter as any,
    action: actionFilter as any,
    userId: userFilter,
    from, to,
    search: search || undefined,
    entityType, entityId,
  });
  const { data: usuarios = [] } = useUsuarios();

  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedAuditEntry[]>();
    for (const e of entries) {
      const key = dayLabel(e.created_at);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [entries]);

  const exportCsv = () => {
    const header = ["data_hora", "usuario", "modulo", "submodulo", "acao", "codigo", "titulo", "campos"];
    const rows = entries.map((e) => [
      new Date(e.created_at).toISOString(),
      e.actor?.name ?? "",
      MODULE_LABEL[e.module],
      e.submoduleLabel,
      e.rawAction,
      e.entity_code ?? "",
      (e.entity_title ?? e.summary ?? "").replace(/[\n\r,;]/g, " "),
      e.changes ? Object.keys(e.changes).join("|") : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auditoria-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const hasFilter = !!(search || (moduleFilter !== "all") || (actionFilter !== "all") || (userFilter !== "all") || entityType);
  const clear = () => { setSearch(""); setModuleFilter("all"); setActionFilter("all"); setUserFilter("all"); setPeriodo("7d"); };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><History className="h-5 w-5" /> Auditoria</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entityType ? `Mostrando histórico apenas deste registro.` : "Tudo que aconteceu no sistema: quem fez, onde, quando e o que mudou."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Legenda das cores - sticky no topo */}
      <div className="sticky top-0 z-30 -mx-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground bg-background/95 supports-[backdrop-filter]:bg-background/70 backdrop-blur border border-border rounded-md px-3 py-2 shadow-sm">
        <span className="font-medium text-foreground">Legenda:</span>
        {ACTION_LEGEND.map((l) => (
          <span key={l.action} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", ACTION_COLORS[l.action])} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Filtros */}
      <Card className="p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, título, campo ou usuário…" className="pl-9 h-10" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Setor do sistema" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              <SelectItem value="crm">CRM (vendas)</SelectItem>
              <SelectItem value="projetos">Projetos</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="admin">Admin (usuários, acessos)</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Tipo de ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="create">Criação</SelectItem>
              <SelectItem value="update">Alteração</SelectItem>
              <SelectItem value="status_change">Mudança de status</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
              <SelectItem value="login">Acesso ao sistema</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Usuário" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="todas">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilter && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">Limpar filtros</Button>
          </div>
        )}
      </Card>

      {/* Feed */}
      <Card className="p-2 sm:p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 capitalize">{day}</h3>
                <div className="space-y-0.5">
                  {items.map((e) => (
                    <AuditFeedItem key={`${e.source}:${e.id}`} entry={e} onClick={() => setSelected(e)} />
                  ))}
                </div>
              </div>
            ))}
            {entries.length >= 200 && (
              <p className="text-center text-xs text-muted-foreground py-3">
                Mostrando os 200 registros mais recentes. Refine os filtros para ver mais.
              </p>
            )}
          </div>
        )}
      </Card>

      <AuditDetailDrawer entry={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
