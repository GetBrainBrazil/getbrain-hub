import { supabase } from "@/integrations/supabase/client";

export type GenerationType =
  | "full_content"
  | "executive_summary"
  | "pain_context"
  | "solution_overview"
  | "item_description";

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
      };
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

/** Custo médio aproximado de uma chamada full_content (R$). Usado no modal. */
export function estimateGenerationCostBrl(type: GenerationType): number {
  const usd =
    type === "full_content"
      ? 0.03
      : type === "item_description"
      ? 0.005
      : 0.01;
  return usd * 5.5; // câmbio aproximado pra exibição
}
