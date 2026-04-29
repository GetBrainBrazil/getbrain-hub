import { supabase } from "@/integrations/supabase/client";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export interface CreateDraftProposalInput {
  dealId?: string | null;
  companyId: string;
  companyName: string;
  validityDays?: number;
}

/**
 * Cria um rascunho de proposta vinculado (opcionalmente) a um deal/empresa.
 * Retorna o ID da nova proposta. Compartilhado entre o NovoOrcamentoModal e
 * o gating de "Proposta na Mesa" no pipeline do CRM.
 */
export async function createDraftProposal({
  dealId,
  companyId,
  companyName,
  validityDays = 30,
}: CreateDraftProposalInput): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;
  const validUntil = new Date(Date.now() + validityDays * 86400000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("proposals" as any)
    .insert({
      organization_id: ORG_ID,
      deal_id: dealId || null,
      company_id: companyId,
      status: "rascunho",
      client_company_name: companyName,
      scope_items: [],
      valid_until: validUntil,
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as any).id as string;
}
