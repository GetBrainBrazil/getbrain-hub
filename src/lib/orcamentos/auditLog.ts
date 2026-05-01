import { supabase } from "@/integrations/supabase/client";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

/**
 * Resolve o `actor_id` (tabela `actors`) a partir do `auth.uid()` corrente.
 * Retorna null se não for possível mapear (logger não falha, só fica anônimo).
 */
async function getCurrentActorId(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  try {
    const { data } = await supabase
      .from("humans" as any)
      .select("actor_id")
      .eq("auth_user_id", uid)
      .maybeSingle();
    return (data as any)?.actor_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve o `organization_id` da proposta (audit_logs.organization_id é NOT NULL).
 */
async function getProposalOrgId(proposalId: string): Promise<string | null> {
  const { data } = await supabase
    .from("proposals" as any)
    .select("organization_id")
    .eq("id", proposalId)
    .maybeSingle();
  return (data as any)?.organization_id ?? null;
}

interface LogStatusChangeArgs {
  proposalId: string;
  proposalCode: string;
  from: ProposalStatus | string;
  to: ProposalStatus | string;
  reason?: string | null;
}

/**
 * Registra mudança de status de uma proposta em `audit_logs`.
 * Não bloqueia o fluxo principal — falhas só vão pro console.
 */
export async function logProposalStatusChange({
  proposalId,
  proposalCode,
  from,
  to,
  reason,
}: LogStatusChangeArgs): Promise<void> {
  try {
    const [actorId, orgId] = await Promise.all([
      getCurrentActorId(),
      getProposalOrgId(proposalId),
    ]);
    if (!orgId) {
      console.warn("[audit] proposta sem organization_id, log ignorado", proposalId);
      return;
    }
    const { error } = await supabase.from("audit_logs").insert({
      organization_id: orgId,
      actor_id: actorId,
      entity_type: "proposal",
      entity_id: proposalId,
      action: "status_change",
      changes: { status: { from, to } },
      metadata: {
        kind: "proposal_status_change",
        proposal_code: proposalCode,
        reason: reason || null,
      },
    });
    if (error) console.warn("[audit] falha ao gravar status_change:", error.message);
  } catch (e: any) {
    console.warn("[audit] erro inesperado:", e?.message);
  }
}
