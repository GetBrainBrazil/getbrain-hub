import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useUsuarios } from "@/hooks/useUsuarios";
import { usePersistedState } from "@/hooks/use-persisted-state";

const ACOES_BADGE: Record<string, string> = {
  Login: "bg-emerald-100 text-emerald-700",
  create: "bg-blue-100 text-blue-700",
  update: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
  password_change: "bg-violet-100 text-violet-700",
};

export default function AdminLogsPage() {
  const [search, setSearch] = usePersistedState("admin:logs:search", "");
  const [userId, setUserId] = usePersistedState("admin:logs:user", "all");
  const [tabela, setTabela] = usePersistedState("admin:logs:tabela", "all");
  const [acao, setAcao] = usePersistedState("admin:logs:acao", "all");
  const [periodo, setPeriodo] = usePersistedState("admin:logs:periodo", "todas");

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (periodo === "hoje") {
      const f = new Date(now); f.setHours(0,0,0,0);
      return { from: f.toISOString(), to: undefined };
    }
    if (periodo === "7d") {
      const f = new Date(now); f.setDate(f.getDate() - 7);
      return { from: f.toISOString(), to: undefined };
    }
    if (periodo === "30d") {
      const f = new Date(now); f.setDate(f.getDate() - 30);
      return { from: f.toISOString(), to: undefined };
    }
    return { from: undefined as string | undefined, to: undefined as string | undefined };
  }, [periodo]);

  const { data: logs = [], isLoading } = useAuditLogs({
    search: search || undefined,
    user_id: userId === "all" ? undefined : userId,
    tabela: tabela === "all" ? undefined : tabela,
    acao: acao === "all" ? undefined : acao,
    from, to,
  }, 500);
  const { data: usuarios = [] } = useUsuarios();

  const tabelas = useMemo(() => Array.from(new Set(logs.map(l => l.tabela).filter(Boolean) as string[])).sort(), [logs]);
  const acoes = useMemo(() => Array.from(new Set(logs.map(l => l.acao))).sort(), [logs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" className="pl-9 h-10" />
        </div>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tabela} onValueChange={setTabela}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tabelas</SelectItem>
            {tabelas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            {acoes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as datas</SelectItem>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-muted/30">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
                <th className="text-left px-4 py-3 font-medium">Usuário</th>
                <th className="text-left px-4 py-3 font-medium">Ação</th>
                <th className="text-left px-4 py-3 font-medium">Módulo</th>
                <th className="text-left px-4 py-3 font-medium">Resumo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum registro encontrado</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}
                  </td>
                  <td className="px-4 py-3">{l.user_nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${ACOES_BADGE[l.acao] ?? "bg-muted text-foreground"} rounded-full`} variant="outline">
                      {l.acao}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.modulo ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.resumo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
