import { supabase } from "@/integrations/supabase/client";
import { setProposalPassword } from "@/lib/orcamentos/proposalPassword";
import { logProposalEvent } from "@/lib/orcamentos/auditLog";

export interface CreateProposalFromDealResult {
  proposalId: string;
  proposalCode: string;
  defaultPasswordPlain: string;
  itemsImported: number;
}

export interface CreateProposalFromDealConflict {
  conflict: true;
  existingProposalId: string;
  existingProposalCode: string;
  message: string;
}

/**
 * Cria uma proposta a partir de um deal do CRM.
 *
 * Fluxo:
 * 1. Chama a RPC `create_proposal_from_deal` que importa dor/solução/escopo do deal,
 *    cria proposal + proposal_items, vincula bidirecionalmente e gera senha padrão.
 * 2. Se a RPC retornar `conflict: true` e `forceNewVersion === false`, repassa o
 *    conflito pra UI decidir.
 * 3. Após criação, faz o hash bcrypt da senha padrão via edge function
 *    `hash-proposal-password` e grava em `access_password_hash`.
 */
export async function createProposalFromDeal(
  dealId: string,
  forceNewVersion = false
): Promise<CreateProposalFromDealResult | CreateProposalFromDealConflict> {
  const { data, error } = await supabase.rpc(
    "create_proposal_from_deal" as any,
    {
      p_deal_id: dealId,
      p_force_new_version: forceNewVersion,
    }
  );

  if (error) throw error;
  const payload = data as any;

  if (payload?.conflict === true) {
    return {
      conflict: true,
      existingProposalId: payload.existing_proposal_id,
      existingProposalCode: payload.existing_proposal_code,
      message: payload.message,
    };
  }

  const proposalId = payload.proposal_id as string;
  const defaultPassword = payload.default_password_plain as string;

  // Hash da senha padrão (bcrypt via edge function) e gravação em access_password_hash.
  // Falha aqui não invalida a proposta — Daniel pode regenerar depois.
  try {
    await setProposalPassword({ proposalId, plainPassword: defaultPassword });
    await logProposalEvent({
      proposalId,
      eventType: "password_set",
      metadata: { source: "auto_default" },
    });
  } catch (e) {
    // Loga mas não derruba — UI já redireciona pro editor onde Daniel pode editar a senha.
    console.warn("[createProposalFromDeal] hash da senha falhou:", e);
  }

  return {
    proposalId,
    proposalCode: payload.proposal_code as string,
    defaultPasswordPlain: defaultPassword,
    itemsImported: payload.items_imported as number,
  };
}
