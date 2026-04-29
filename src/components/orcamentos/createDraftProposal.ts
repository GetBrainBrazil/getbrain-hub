import { supabase } from "@/integrations/supabase/client";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export interface CreateDraftProposalInput {
  dealId?: string | null;
  companyId: string;
  companyName: string;
  validityDays?: number;
  /** Valor de implementação (one-time). Vira o primeiro item do escopo. */
  implementationValue?: number | null;
  /** Label do item de implementação no escopo. */
  implementationLabel?: string;
  /** Valor mensal recorrente (MRR). Vira `maintenance_monthly_value`. */
  mrrValue?: number | null;
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
  implementationValue,
  implementationLabel = "Implementação",
  mrrValue,
}: CreateDraftProposalInput): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;
  const validUntil = new Date(Date.now() + validityDays * 86400000)
    .toISOString()
    .slice(0, 10);

  const scopeItems =
    implementationValue && implementationValue > 0
      ? [{ title: implementationLabel, description: "", value: Number(implementationValue) }]
      : [];

  const maintenanceMonthly =
    mrrValue && mrrValue > 0 ? Number(mrrValue) : null;

  const { data, error } = await supabase
    .from("proposals" as any)
    .insert({
      organization_id: ORG_ID,
      deal_id: dealId || null,
      company_id: companyId,
      status: "rascunho",
      client_company_name: companyName,
      scope_items: scopeItems, // legado — mantido por compat com PDF preview
      maintenance_monthly_value: maintenanceMonthly,
      valid_until: validUntil,
      expires_at: validUntil,
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();

  if (error) throw error;
  const proposalId = (data as any).id as string;

  // Espelha em proposal_items (tabela canônica do schema 10A)
  if (scopeItems.length > 0) {
    const itemRows = scopeItems.map((it, i) => ({
      proposal_id: proposalId,
      description: it.title,
      quantity: 1,
      unit_price: it.value,
      order_index: i,
      created_by: uid,
      updated_by: uid,
    }));
    await supabase.from("proposal_items" as any).insert(itemRows);
  }

  return proposalId;
}
