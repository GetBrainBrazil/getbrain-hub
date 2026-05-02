// Edge function: generate-proposal-roadmap
// Gera um roadmap em fases priorizando "tempo até o cliente começar a usar".
// Cacheia em proposals.public_roadmap (jsonb).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Phase {
  number: number;
  title: string;
  duration_days: number;
  outcome: string; // o que o cliente passa a poder fazer ao final
  deliverables: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const proposalId = await getProposalIdFromJwt(req);
    if (!proposalId) return json({ error: "unauthorized" }, 401);
    const force = new URL(req.url).searchParams.get("force") === "1";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prop } = await admin
      .from("proposals")
      .select(
        `id, title, implementation_days, validation_days, public_roadmap, solution_overview`,
      )
      .eq("id", proposalId)
      .maybeSingle();
    if (!prop) return json({ error: "not_found" }, 404);

    if (prop.public_roadmap && !force) {
      return json({ roadmap: prop.public_roadmap, cached: true });
    }

    const { data: items } = await admin
      .from("proposal_items")
      .select(
        "description, detailed_description, deliverables, client_dependencies, order_index",
      )
      .eq("proposal_id", proposalId)
      .is("deleted_at", null)
      .order("order_index");

    if (!items || items.length === 0) {
      return json({ roadmap: { phases: [] }, cached: false });
    }

    const totalDays = (prop.implementation_days ?? 0) + (prop.validation_days ?? 0);
    const itemsList = items.map((it: any, i: number) =>
      `${i + 1}. ${it.description}` +
      (it.detailed_description ? `\n   ${String(it.detailed_description).slice(0, 280)}` : "") +
      (it.deliverables?.length
        ? `\n   Entregáveis: ${it.deliverables.slice(0, 4).join("; ")}`
        : "") +
      (it.client_dependencies?.length
        ? `\n   Depende do cliente: ${it.client_dependencies.slice(0, 2).join("; ")}`
        : "")
    ).join("\n\n");

    const systemPrompt =
      `Você organiza escopos de projeto de software em FASES DE ENTREGA priorizadas para o cliente começar a USAR o sistema o quanto antes (princípio: shape up, value first).

REGRAS:
- Retorne JSON válido no exato formato: {"phases": [{"number": 1, "title": "...", "duration_days": N, "outcome": "...", "deliverables": ["...", "..."]}]}
- 3 a 5 fases. Nunca mais que 5.
- A primeira fase é sempre "MVP" — o mínimo que o cliente já passa a usar.
- Cada título começa com um nome curto e potente, no estilo "Núcleo no ar", "Inteligência ligada", "Refinamento", "Escala". Sem palavras genéricas como "Fase de planejamento".
- "outcome" é UMA frase: o que o cliente passa a poder fazer ao final dessa fase. Concreto e observável.
- "deliverables" são 2-5 itens curtos (máx 8 palavras cada), descrições orientadas a benefício do cliente, NÃO a tarefa técnica.
- A soma de duration_days deve respeitar o total do projeto (~${totalDays} dias). Distribua de forma realista.
- Não invente entregas que não estão no escopo. Reorganize as existentes.
- Português do Brasil. Sem markdown. APENAS o JSON, sem comentários.`;

    const userPrompt = `Projeto: ${prop.title || "(sem título)"}
Duração total: ${totalDays} dias (${prop.implementation_days ?? 0} de implementação + ${prop.validation_days ?? 0} de validação)

ITENS DO ESCOPO (na ordem fornecida pelo orçamento — você pode reorganizar):

${itemsList}

${prop.solution_overview ? `\nVISÃO GERAL DA SOLUÇÃO:\n${prop.solution_overview.slice(0, 600)}` : ""}

Gere o JSON do roadmap agora.`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
        }),
      },
    );
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("AI roadmap error", aiRes.status, t);
      return json({ error: "ai_error" }, 502);
    }
    const aiData = await aiRes.json();
    let parsed: { phases: Phase[] } | null = null;
    try {
      parsed = JSON.parse(aiData?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      return json({ error: "invalid_json" }, 502);
    }
    if (!parsed?.phases || !Array.isArray(parsed.phases)) {
      return json({ error: "invalid_shape" }, 502);
    }

    await admin
      .from("proposals")
      .update({ public_roadmap: parsed })
      .eq("id", proposalId);

    return json({ roadmap: parsed, cached: false });
  } catch (e) {
    console.error("generate-roadmap error", e);
    return json({ error: "internal_error" }, 500);
  }
});

async function getProposalIdFromJwt(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const secret = Deno.env.get("PROPOSAL_ACCESS_JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const payload = await verify(token, key);
    return (payload as any)?.proposal_id ?? null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
