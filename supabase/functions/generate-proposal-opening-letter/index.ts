// Edge function: generate-proposal-opening-letter
// Public endpoint protegido por access_jwt.
// Gera (e cacheia em proposals.public_opening_letter) uma carta de abertura
// editorial com IA, focada em impacto e retenção do lead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        `id, code, title, client_name, client_company_name, company_id,
         executive_summary, pain_context, solution_overview,
         implementation_value, maintenance_monthly_value, public_opening_letter`,
      )
      .eq("id", proposalId)
      .maybeSingle();
    if (!prop) return json({ error: "not_found" }, 404);

    if (prop.public_opening_letter && !force) {
      return json({ letter: prop.public_opening_letter, cached: true });
    }

    // contato primário
    let firstName: string | null = null;
    if (prop.company_id) {
      const { data: cps } = await admin
        .from("company_people")
        .select("is_primary_contact, person:people(full_name, deleted_at)")
        .eq("company_id", prop.company_id)
        .is("ended_at", null)
        .order("is_primary_contact", { ascending: false })
        .limit(5);
      const primary = (cps ?? []).find((r: any) =>
        r.is_primary_contact && r.person && !r.person.deleted_at
      ) ?? (cps ?? []).find((r: any) => r.person && !r.person.deleted_at);
      const fn = (primary as any)?.person?.full_name;
      if (fn) firstName = String(fn).split(/\s+/)[0];
    }

    const clientLabel = prop.client_name || prop.client_company_name || "você";
    const greeting = firstName ? `Olá, ${firstName}` : `Olá`;

    const systemPrompt =
      `Você é Daniel, fundador da GetBrain (consultoria de IA aplicada e engenharia sob medida).
Escreva uma CARTA DE ABERTURA editorial em primeira pessoa para anteceder uma proposta comercial.

REGRAS ABSOLUTAS:
- 3 a 4 parágrafos curtos (cada um 2-3 frases). Nunca passe de 180 palavras totais.
- Tom consultivo, confiante e próximo. Nada de marketês ("solução robusta", "experiência única", "transformação digital").
- NÃO repita números, valores, prazos. A carta é sobre VISÃO e SENSAÇÃO, não sobre fatos.
- Comece com "${greeting}," (com vírgula).
- Termine com uma frase de convite para a leitura ("Boa leitura.", "Vamos juntos.", ou similar — escolha a mais natural).
- NÃO assine — a assinatura aparece em outro lugar da página.
- NÃO use markdown (sem **, sem #, sem listas). Texto corrido em parágrafos separados por linha em branco.
- Português do Brasil, sem regionalismos pesados.

OBJETIVO: causar impacto e retenção. Quem lê deve sentir que essa proposta foi pensada para a empresa dele, não copiada de outro cliente.`;

    const userPrompt = `Empresa do cliente: ${clientLabel}
${prop.title ? `Título da proposta: ${prop.title}` : ""}
${prop.pain_context ? `\nO que entendi da dor deles:\n${prop.pain_context.slice(0, 800)}` : ""}
${prop.solution_overview ? `\nO que vamos construir:\n${prop.solution_overview.slice(0, 800)}` : ""}

Escreva a carta agora.`;

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
          temperature: 0.7,
        }),
      },
    );

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "ai_error", status: aiRes.status }, 502);
    }
    const aiData = await aiRes.json();
    const letter = String(aiData?.choices?.[0]?.message?.content ?? "").trim();
    if (!letter) return json({ error: "empty_reply" }, 502);

    await admin
      .from("proposals")
      .update({ public_opening_letter: letter })
      .eq("id", proposalId);

    return json({ letter, cached: false });
  } catch (e) {
    console.error("generate-opening-letter error", e);
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
