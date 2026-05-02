import { supabase } from "@/integrations/supabase/client";

export type GenerationType =
  | "full_content"
  | "executive_summary"
  | "pain_context"
  | "solution_overview"
  | "item_description"
  | "item_descriptions_batch";

export interface GenerationResult {
  content:
    | string
    | {
        executive_summary?: string;
        pain_context?: string;
        solution_overview?: string;
        item_descriptions?: Array<{
          item_id: string;
          detailed_description: string;
        }>;
        descriptions?: Array<{ index: number; text: string }>;
      };
  was_filtered: boolean;
  filter_reasons: string[];
  tokens: { input: number; output: number; cost_usd: number };
}

export interface BatchDescriptionsResult {
  descriptions: Array<{ index: number; text: string }>;
  was_filtered: boolean;
  filter_reasons: string[];
  tokens: { input: number; output: number; cost_usd: number };
}

/**
 * Chama a edge function generate-proposal-content.
 * Lança erro com message friendly em pt-BR para casos conhecidos.
 */
export async function generateProposalContent(params: {
  proposalId: string;
  generationType: GenerationType;
  itemId?: string;
}): Promise<GenerationResult> {
  const { data, error } = await supabase.functions.invoke(
    "generate-proposal-content",
    {
      body: {
        proposal_id: params.proposalId,
        generation_type: params.generationType,
        item_id: params.itemId,
      },
    }
  );

  if (error) {
    const ctx: any = (error as any).context;
    const code = ctx?.error || ctx?.body?.error;
    if (code === "ai_disabled") {
      throw new Error("IA está desabilitada nas configurações.");
    }
    if (code === "budget_exceeded") {
      throw new Error("Limite mensal de IA atingido.");
    }
    if (code === "rate_limited") {
      throw new Error("Muitas requisições. Aguarde alguns segundos.");
    }
    if (code === "credits_exhausted") {
      throw new Error("Créditos do gateway IA esgotados.");
    }
    throw new Error(error.message || "Falha ao gerar conteúdo");
  }

  return data as GenerationResult;
}

/** Custo médio aproximado em R$. Para batch, multiplica por itemCount. */
export function estimateGenerationCostBrl(
  type: GenerationType,
  itemCount = 1,
): number {
  const usd =
    type === "full_content"
      ? 0.03
      : type === "item_description"
      ? 0.005
      : type === "item_descriptions_batch"
      ? 0.005 * Math.max(1, itemCount)
      : 0.01;
  return usd * 5.5; // câmbio aproximado pra exibição
}

/**
 * Variante batch: gera descrição curta para vários módulos do escopo de uma
 * única vez. Retorna lista [{index, text}].
 */
export async function generateItemDescriptionsBatch(params: {
  proposalId: string;
  scopeTitles: string[];
  itemIndices?: number[];
}): Promise<BatchDescriptionsResult> {
  const { data, error } = await supabase.functions.invoke(
    "generate-proposal-content",
    {
      body: {
        proposal_id: params.proposalId,
        generation_type: "item_descriptions_batch",
        scope_titles: params.scopeTitles,
        item_indices: params.itemIndices,
      },
    },
  );

  if (error) {
    const ctx: any = (error as any).context;
    const code = ctx?.error || ctx?.body?.error;
    if (code === "ai_disabled") throw new Error("IA está desabilitada nas configurações.");
    if (code === "budget_exceeded") throw new Error("Limite mensal de IA atingido.");
    if (code === "rate_limited") throw new Error("Muitas requisições. Aguarde alguns segundos.");
    if (code === "credits_exhausted") throw new Error("Créditos do gateway IA esgotados.");
    if (code === "no_scope_items") throw new Error("Nenhum módulo no escopo para gerar.");
    throw new Error(error.message || "Falha ao gerar descrições");
  }

  const result = data as GenerationResult;
  const content = result.content as { descriptions?: Array<{ index: number; text: string }> };
  const descriptions = Array.isArray(content?.descriptions) ? content.descriptions : [];
  return {
    descriptions,
    was_filtered: result.was_filtered,
    filter_reasons: result.filter_reasons,
    tokens: result.tokens,
  };
}
