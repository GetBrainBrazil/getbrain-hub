import { supabase } from "@/integrations/supabase/client";
import { logProposalEvent } from "./auditLog";

/**
 * Hash da senha via edge function `hash-proposal-password` (bcrypt server-side)
 * e gravação na coluna `access_password_hash`. Substitui a antiga RPC
 * `set_proposal_password`.
 *
 * Registra evento `password_set` (primeira vez) ou `password_change` (já tinha hash).
 */
export async function setProposalPassword(params: {
  proposalId: string;
  plainPassword: string;
}): Promise<void> {
  const { proposalId, plainPassword } = params;
  if (!plainPassword || plainPassword.length < 4) {
    throw new Error("Senha precisa ter ao menos 4 caracteres");
  }

  // 1. Descobre se já existia hash (pra escolher event_type)
  const existing = await supabase
    .from("proposals" as any)
    .select("access_password_hash")
    .eq("id", proposalId)
    .maybeSingle();
  const hadPassword = !!(existing.data as any)?.access_password_hash;

  // 2. Hasheia via edge function
  const { data, error } = await supabase.functions.invoke(
    "hash-proposal-password",
    { body: { password: plainPassword } },
  );
  if (error) throw error;
  const hash = (data as any)?.hash as string | undefined;
  if (!hash) throw new Error("Falha ao gerar hash da senha");

  // 3. Grava
  const upd = await supabase
    .from("proposals" as any)
    .update({ access_password_hash: hash })
    .eq("id", proposalId);
  if (upd.error) throw upd.error;

  // 4. Audit
  await logProposalEvent({
    proposalId,
    eventType: hadPassword ? "password_change" : "password_set",
  }).catch(() => {});
}
