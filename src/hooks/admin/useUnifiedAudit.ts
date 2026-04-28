import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuditAction, AuditModule, normalizeAction, resolveModule } from "@/lib/audit/formatters";

export type UnifiedAuditEntry = {
  id: string;
  source: "audit_logs" | "system_audit_logs";
  module: AuditModule;
  submoduleLabel: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_code: string | null;
  entity_title: string | null;
  action: AuditAction;
  rawAction: string;
  actor: { id: string | null; name: string; avatar_url: string | null } | null;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  summary: string | null;
  created_at: string;
};

export interface UnifiedAuditFilters {
  module?: AuditModule | "all";
  action?: AuditAction | "all";
  userId?: string | "all";
  from?: string;
  to?: string;
  search?: string;
  entityType?: string;
  entityId?: string;
}

const PAGE = 100;

async function resolveActorsByAuthUser(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { name: string; avatar_url: string | null }>();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);
  return new Map((data ?? []).map((p: any) => [p.id, { name: p.full_name ?? "Usuário", avatar_url: p.avatar_url }]));
}

async function resolveActorsByActorId(actorIds: string[]) {
  if (actorIds.length === 0) return new Map<string, { name: string; avatar_url: string | null }>();
  const { data } = await supabase
    .from("actors")
    .select("id, display_name, avatar_url")
    .in("id", actorIds);
  return new Map((data ?? []).map((a: any) => [a.id, { name: a.display_name ?? "Usuário", avatar_url: a.avatar_url }]));
}

async function resolveEntityCodes(grouped: Record<string, string[]>) {
  // grouped: { deals: [id1,id2], projects: [...], movimentacoes: [...] }
  const out = new Map<string, { code: string | null; title: string | null }>();
  await Promise.all(
    Object.entries(grouped).map(async ([table, ids]) => {
      if (ids.length === 0) return;
      const codeCol = ["deals", "leads", "projects", "financial_recurrences"].includes(table) ? "code" : null;
      const titleCol = ["deals", "leads", "projects"].includes(table)
        ? table === "projects" ? "name" : "title"
        : ["movimentacoes", "deal_activities", "deal_dependencies"].includes(table)
          ? "descricao"
          : ["companies"].includes(table) ? "legal_name"
          : ["clientes", "fornecedores", "colaboradores", "categorias", "centros_custo", "contas_bancarias", "cargos", "profiles"].includes(table) ? "nome"
          : null;
      const fields = ["id", codeCol, titleCol].filter(Boolean).join(", ");
      try {
        const { data } = await supabase.from(table as any).select(fields).in("id", ids);
        (data ?? []).forEach((r: any) => {
          out.set(`${table}:${r.id}`, {
            code: codeCol ? r[codeCol] ?? null : null,
            title: titleCol ? r[titleCol] ?? null : (r.full_name ?? null),
          });
        });
      } catch {
        // table may not exist; ignore
      }
    }),
  );
  return out;
}

export function useUnifiedAudit(filters: UnifiedAuditFilters = {}) {
  return useQuery({
    queryKey: ["unified-audit", filters],
    queryFn: async (): Promise<UnifiedAuditEntry[]> => {
      // 1) audit_logs (CRM, projetos, financeiro)
      let q1 = supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, actor_id, changes, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (filters.from) q1 = q1.gte("created_at", filters.from);
      if (filters.to) q1 = q1.lte("created_at", filters.to);
      if (filters.entityType) q1 = q1.eq("entity_type", filters.entityType);
      if (filters.entityId) q1 = q1.eq("entity_id", filters.entityId);

      // 2) system_audit_logs (admin, auth)
      let q2 = supabase
        .from("system_audit_logs" as any)
        .select("id, user_id, user_nome, acao, modulo, tabela, registro_id, resumo, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (filters.from) q2 = q2.gte("created_at", filters.from);
      if (filters.to) q2 = q2.lte("created_at", filters.to);

      const [{ data: r1, error: e1 }, { data: r2, error: e2 }] = await Promise.all([q1, q2]);
      if (e1) throw e1;
      if (e2) throw e2;

      const rows1 = (r1 ?? []) as any[];
      const rows2 = (r2 ?? []) as any[];

      // Resolve actors
      const actorIds = Array.from(new Set(rows1.map((r) => r.actor_id).filter(Boolean)));
      const userIds = Array.from(new Set(rows2.map((r) => r.user_id).filter(Boolean)));
      const [actorMap, userMap] = await Promise.all([
        resolveActorsByActorId(actorIds),
        resolveActorsByAuthUser(userIds),
      ]);

      // Resolve entity codes/titles
      const grouped: Record<string, string[]> = {};
      rows1.forEach((r) => {
        if (r.entity_type && r.entity_id) {
          (grouped[r.entity_type] ??= []).push(r.entity_id);
        }
      });
      rows2.forEach((r) => {
        if (r.tabela && r.registro_id) {
          (grouped[r.tabela] ??= []).push(r.registro_id);
        }
      });
      // dedupe
      Object.keys(grouped).forEach((k) => (grouped[k] = Array.from(new Set(grouped[k]))));
      const entityMap = await resolveEntityCodes(grouped);

      const merged: UnifiedAuditEntry[] = [];

      for (const r of rows1) {
        const actor = r.actor_id ? actorMap.get(r.actor_id) : null;
        const ent = r.entity_type && r.entity_id ? entityMap.get(`${r.entity_type}:${r.entity_id}`) : null;
        const mod = resolveModule(r.entity_type);
        merged.push({
          id: r.id,
          source: "audit_logs",
          module: mod.module,
          submoduleLabel: mod.submoduleLabel,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
          entity_code: ent?.code ?? null,
          entity_title: ent?.title ?? null,
          action: normalizeAction(r.action),
          rawAction: r.action,
          actor: actor ? { id: r.actor_id, name: actor.name, avatar_url: actor.avatar_url } : null,
          changes: r.changes ?? null,
          metadata: r.metadata ?? null,
          summary: null,
          created_at: r.created_at,
        });
      }

      for (const r of rows2) {
        const user = r.user_id ? userMap.get(r.user_id) : null;
        const ent = r.tabela && r.registro_id ? entityMap.get(`${r.tabela}:${r.registro_id}`) : null;
        const mod = resolveModule(r.tabela ?? r.modulo?.toLowerCase());
        merged.push({
          id: r.id,
          source: "system_audit_logs",
          module: mod.module,
          submoduleLabel: mod.submoduleLabel,
          entity_type: r.tabela ?? null,
          entity_id: r.registro_id ?? null,
          entity_code: ent?.code ?? null,
          entity_title: ent?.title ?? null,
          action: normalizeAction(r.acao),
          rawAction: r.acao,
          actor: { id: r.user_id, name: user?.name ?? r.user_nome ?? "Usuário", avatar_url: user?.avatar_url ?? null },
          changes: null,
          metadata: r.metadata ?? null,
          summary: r.resumo ?? null,
          created_at: r.created_at,
        });
      }

      // Sort by date desc
      merged.sort((a, b) => b.created_at.localeCompare(a.created_at));

      // Apply client-side filters
      let result = merged;
      if (filters.module && filters.module !== "all") result = result.filter((e) => e.module === filters.module);
      if (filters.action && filters.action !== "all") result = result.filter((e) => e.action === filters.action);
      if (filters.userId && filters.userId !== "all") {
        result = result.filter((e) => e.actor?.id === filters.userId);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        result = result.filter((e) =>
          (e.entity_code ?? "").toLowerCase().includes(s)
          || (e.entity_title ?? "").toLowerCase().includes(s)
          || (e.actor?.name ?? "").toLowerCase().includes(s)
          || (e.summary ?? "").toLowerCase().includes(s)
          || (e.changes ? JSON.stringify(e.changes).toLowerCase().includes(s) : false),
        );
      }

      return result;
    },
    staleTime: 30_000,
  });
}
