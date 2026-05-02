// Edge function: generate-proposal-content
// Gera conteúdo de proposta usando Lovable AI Gateway (OpenAI gpt-5).
// Aplica filtros de output e registra em proposal_ai_generations.
//
// Auth: requer JWT do Supabase (uso interno do app).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  filterAiOutput,
  estimateCostUsd,
  type FilterContext,
} from "../_shared/ai-output-filters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type GenerationType =
  | "full_content"
  | "executive_summary"
  | "pain_context"
  | "solution_overview"
  | "item_description"
  | "item_descriptions_batch";

interface ReqBody {
  proposal_id: string;
  generation_type: GenerationType;
  item_id?: string;
  /** Para item_descriptions_batch: títulos dos módulos do scope_items JSON. */
  scope_titles?: string[];
  /** Para item_descriptions_batch: índices a processar (default: todos). */
  item_indices?: number[];
}

const SYSTEM_PROMPT = `Você é assistente comercial da GetBrain, empresa brasileira que constrói sistemas personalizados com IA integrada.

Sua tarefa: gerar conteúdo profissional para proposta comercial baseado APENAS nos dados fornecidos.

REGRAS ABSOLUTAS:
1. NUNCA invente preços, prazos, datas, ou escopos não mencionados nos dados.
2. NUNCA prometa funcionalidades que não estão na lista de deliverables.
3. NUNCA mencione concorrentes ou faça comparações.
4. NUNCA ofereça desconto, promoção, ou condição comercial.
5. Se faltar informação para um campo, deixe vazio ou genérico — NÃO invente.
6. Tom: profissional, direto, brasileiro (PT-BR), sem rebuscamento.
7. Use "você" não "vós".
8. NUNCA use emoji.
9. Sem markdown pesado. Texto corrido em parágrafos curtos. Listas com hífen apenas quando útil.`;

function describeType(t: GenerationType): string {
  switch (t) {
    case "full_content":
      return "TUDO: resumo executivo, contexto da dor, visão da solução e descrições detalhadas de cada item. Retorne em JSON com as chaves indicadas.";
    case "executive_summary":
      return "RESUMO EXECUTIVO (2-3 parágrafos curtos). O que vamos entregar, em linguagem que o decisor entende. Sem detalhe técnico.";
    case "pain_context":
      return "CONTEXTO DA DOR: descreva o problema do cliente que esta proposta resolve, baseado nos dados do deal. 2-3 parágrafos.";
    case "solution_overview":
      return "VISÃO DA SOLUÇÃO: como vamos resolver o problema, em alto nível. Sem repetir lista de itens. 2-3 parágrafos.";
    case "item_description":
      return "DESCRIÇÃO DETALHADA DO ITEM: 2-4 frases explicando o que esse item entrega e o valor que gera. Sem inventar funcionalidade.";
    case "item_descriptions_batch":
      return "DESCRIÇÕES DOS MÓDULOS: para CADA módulo da lista 'modulos_escopo' fornecida, gere 2-3 frases curtas, práticas e específicas explicando o que aquele módulo entrega no contexto deste cliente. Use o título do módulo + o contexto do deal (dor, escopo, entregáveis). Sem inventar funcionalidade fora do escopo.";
  }
}

function expectedFormat(t: GenerationType): string {
  if (t === "full_content") {
    return `JSON com a forma exata:
{
  "executive_summary": "...",
  "pain_context": "...",
  "solution_overview": "...",
  "item_descriptions": [{"item_id": "...", "detailed_description": "..."}]
}
Retorne APENAS o JSON, sem markdown, sem explicação extra.`;
  }
  if (t === "item_descriptions_batch") {
    return `JSON com a forma exata:
{
  "descriptions": [
    {"index": 0, "text": "descrição de 2-3 frases para o módulo de índice 0"},
    {"index": 1, "text": "..."}
  ]
}
O array DEVE ter exatamente um objeto por índice solicitado em "indices_a_gerar". Retorne APENAS o JSON, sem markdown, sem explicação extra.`;
  }
  return "Texto puro em português. Sem markdown. Sem aspas envolvendo a resposta.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Cliente com JWT do user pra checar identidade
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "invalid_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente service-role pra ler/escrever
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: ReqBody = await req.json();
    if (!body.proposal_id || !body.generation_type) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar proposta + items + deal vinculado
    const { data: proposal, error: pErr } = await admin
      .from("proposals")
      .select("*")
      .eq("id", body.proposal_id)
      .is("deleted_at", null)
      .single();
    if (pErr || !proposal) {
      return new Response(JSON.stringify({ error: "proposal_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Settings + budget
    const { data: settings } = await admin
      .from("proposal_ai_settings")
      .select("*")
      .eq("organization_id", proposal.organization_id)
      .single();
    if (!settings || !settings.generation_enabled) {
      return new Response(JSON.stringify({ error: "ai_disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      Number(settings.current_month_spend_usd) >=
      Number(settings.monthly_budget_usd)
    ) {
      return new Response(
        JSON.stringify({ error: "budget_exceeded" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Items canônicos
    const { data: items } = await admin
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposal.id)
      .order("order_index");

    // Deal vinculado (opcional)
    let deal: any = null;
    if (proposal.deal_id) {
      const { data: d } = await admin
        .from("deals")
        .select(
          "title,pain_description,scope_summary,deliverables,acceptance_criteria,business_context,scope_in,scope_out,project_type_v2"
        )
        .eq("id", proposal.deal_id)
        .single();
      deal = d;
    }

    // Para batch de descrições de módulos: usar scope_titles do body OU
    // tentar derivar do JSON proposal.scope_items.
    let scopeModulesForBatch: Array<{ index: number; title: string }> = [];
    let indicesToGenerate: number[] = [];
    if (body.generation_type === "item_descriptions_batch") {
      let titles: string[] = [];
      if (Array.isArray(body.scope_titles) && body.scope_titles.length > 0) {
        titles = body.scope_titles.map((t) => String(t ?? "").trim());
      } else if (Array.isArray((proposal as any).scope_items)) {
        titles = ((proposal as any).scope_items as any[]).map((it) =>
          String(it?.title ?? "").trim()
        );
      }
      if (titles.length === 0) {
        return new Response(
          JSON.stringify({ error: "no_scope_items" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      scopeModulesForBatch = titles.map((title, index) => ({ index, title }));
      indicesToGenerate =
        Array.isArray(body.item_indices) && body.item_indices.length > 0
          ? body.item_indices.filter((i) => i >= 0 && i < titles.length)
          : titles.map((_, i) => i);
      if (indicesToGenerate.length === 0) {
        return new Response(
          JSON.stringify({ error: "no_indices" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const dataPayload: Record<string, unknown> = {
      cliente: proposal.client_company_name,
      cidade_cliente: proposal.client_city,
      titulo_proposta: proposal.title,
      itens: (items ?? []).map((it: any) => ({
        id: it.id,
        descricao: it.description,
        quantidade: Number(it.quantity),
        valor_unitario: Number(it.unit_price),
      })),
      total_brl:
        (items ?? []).reduce(
          (s: number, it: any) =>
            s + Number(it.quantity) * Number(it.unit_price),
          0
        ),
      manutencao_mensal_brl: proposal.maintenance_monthly_value
        ? Number(proposal.maintenance_monthly_value)
        : null,
      manutencao_descricao: proposal.maintenance_description,
      prazo_implementacao_dias: proposal.implementation_days,
      prazo_validacao_dias: proposal.validation_days,
      consideracoes: proposal.considerations,
      deal: deal
        ? {
            tipo_projeto: deal.project_type_v2,
            dor_descricao: deal.pain_description,
            contexto_negocio: deal.business_context,
            escopo_resumo: deal.scope_summary,
            escopo_in: deal.scope_in,
            escopo_out: deal.scope_out,
            entregaveis: deal.deliverables,
            criterios_aceite: deal.acceptance_criteria,
          }
        : null,
    };

    if (body.generation_type === "item_descriptions_batch") {
      dataPayload.modulos_escopo = scopeModulesForBatch;
      dataPayload.indices_a_gerar = indicesToGenerate;
    }

    const promptUser = [
      `DADOS DA PROPOSTA:\n${JSON.stringify(dataPayload, null, 2)}`,
      `\nGERE: ${describeType(body.generation_type)}`,
      `\nFORMATO DE SAÍDA: ${expectedFormat(body.generation_type)}`,
    ].join("\n");

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${promptUser}`;

    const model = settings.generation_model || "openai/gpt-5";

    // Chamar Lovable AI Gateway
    const aiResp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptUser },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "Aguarde alguns segundos e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "credits_exhausted", message: "Créditos do gateway IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "ai_gateway_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiResp.json();
    const rawContent: string = aiJson.choices?.[0]?.message?.content ?? "";
    const usage = aiJson.usage ?? {};
    const inputTokens = Number(usage.prompt_tokens ?? 0);
    const outputTokens = Number(usage.completion_tokens ?? 0);
    const cost = estimateCostUsd(model, inputTokens, outputTokens);

    // Aplicar filtros
    const filterCtx: FilterContext = {
      deliverables: [
        ...(items ?? []).map((it: any) => it.description ?? ""),
        ...(deal?.deliverables ?? []),
        proposal.maintenance_description ?? "",
      ].filter(Boolean),
      knownTotalBrl: dataPayload.total_brl || undefined,
      knownMonthlyBrl: dataPayload.manutencao_mensal_brl || undefined,
      implementationDays: proposal.implementation_days ?? undefined,
      validationDays: proposal.validation_days ?? undefined,
    };

    const filterResult = filterAiOutput(rawContent, filterCtx, {
      mode: "generation",
    });

    // Persistir no log de gerações
    await admin.from("proposal_ai_generations").insert({
      organization_id: proposal.organization_id,
      proposal_id: proposal.id,
      generation_type: body.generation_type,
      model,
      prompt_used: fullPrompt,
      output_raw: rawContent,
      output_used: filterResult.filteredOutput,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      was_filtered: !filterResult.passed,
      filter_reasons: filterResult.reasons,
      triggered_by: userData.user.id,
      created_by: userData.user.id,
      updated_by: userData.user.id,
    });

    // Atualizar gasto mensal
    await admin
      .from("proposal_ai_settings")
      .update({
        current_month_spend_usd:
          Number(settings.current_month_spend_usd) + cost,
      })
      .eq("id", settings.id);

    // Audit log
    await admin.from("audit_logs").insert({
      organization_id: proposal.organization_id,
      entity_type: "proposal",
      entity_id: proposal.id,
      action: "ai_content_generated",
      changes: {},
      metadata: {
        generation_type: body.generation_type,
        model,
        cost_usd: cost,
        was_filtered: !filterResult.passed,
        filter_reasons: filterResult.reasons,
      },
    });

    // Tenta parsear JSON pra full_content
    let parsedContent: any = filterResult.filteredOutput;
    if (body.generation_type === "full_content") {
      try {
        // Remove possíveis cercas markdown
        const cleaned = filterResult.filteredOutput
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/, "")
          .replace(/```\s*$/, "")
          .trim();
        parsedContent = JSON.parse(cleaned);
      } catch (_e) {
        // mantém string crua, frontend lida
      }
    }

    return new Response(
      JSON.stringify({
        content: parsedContent,
        was_filtered: !filterResult.passed,
        filter_reasons: filterResult.reasons,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          cost_usd: cost,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("generate-proposal-content error:", err);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
