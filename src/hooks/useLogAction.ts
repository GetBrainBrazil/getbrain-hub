import { supabase } from "@/integrations/supabase/client";

export interface LogActionInput {
  acao: string;
  modulo?: string;
  tabela?: string;
  registro_id?: string | null;
  resumo?: string;
  metadata?: Record<string, unknown>;
}

/** Best-effort: insere uma linha em system_audit_logs. Erros são silenciados. */
export async function logAction(input: LogActionInput) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    if (!u) return;
    let nome: string | null = null;
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
    nome = prof?.full_name ?? u.email ?? null;
    await supabase.from("system_audit_logs" as any).insert({
      user_id: u.id,
      user_nome: nome,
      acao: input.acao,
      modulo: input.modulo ?? null,
      tabela: input.tabela ?? null,
      registro_id: input.registro_id ?? null,
      resumo: input.resumo ?? null,
      metadata: input.metadata ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* noop */
  }
}
