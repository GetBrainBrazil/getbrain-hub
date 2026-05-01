// Edge function: proposal-chat
// Public endpoint protegido por access_jwt.
// Chat de IA contextualizado na proposta. Cada mensagem passa pelos filtros de output.
// Mantém sessão (proposal_chat_sessions) e mensagens (proposal_chat_messages).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import {
  estimateCostUsd,
  filterAiOutput,
  type FilterContext,
} from "../_shared/ai-output-filters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatBody {
  session_token: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

const FALLBACK_REPLY =
  "Sobre isso, é melhor falar com o Daniel diretamente. Quer que eu avise ele agora?";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const proposalId = await getProposalIdFromJwt(req);
    if (!proposalId) return json({ error: "unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as ChatBody;
    const userMsg = String(body.message ?? "").trim();
    const sessionToken = String(body.session_token ?? "").trim();
    if (!userMsg || !sessionToken) {
      return json({ error: "missing_fields" }, 400);
    }
    if (userMsg.length > 1000) {
      return json({ error: "message_too_long" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carrega proposta + items + settings
    const { data: prop } = await admin
      .from("proposals")
      .select(
        `id, organization_id, code, title, client_name, client_company_name,
         executive_summary, pain_context, solution_overview,
         maintenance_description, maintenance_monthly_value,
         implementation_days, validation_days, considerations, expires_at`,
      )
      .eq("id", proposalId)
      .maybeSingle();
    if (!prop) return json({ error: "proposal_not_found" }, 404);

    const { data: items } = await admin
      .from("proposal_items")
      .select(
        "description, quantity, unit_price, total, detailed_description, deliverables, acceptance_criteria, client_dependencies",
      )
      .eq("proposal_id", proposalId)
      .is("deleted_at", null)
      .order("order_index");

    const { data: settings } = await admin
      .from("proposal_ai_settings")
      .select(
        "chat_enabled, max_messages_per_session, chat_model, monthly_budget_usd, current_month_spend_usd",
      )
      .eq("organization_id", prop.organization_id)
      .maybeSingle();

    if (settings && !settings.chat_enabled) {
      return json({ error: "chat_disabled" }, 403);
    }
    const maxMsgs = settings?.max_messages_per_session ?? 20;
    const model = settings?.chat_model ?? "openai/gpt-5-mini";
    const budget = Number(settings?.monthly_budget_usd ?? 50);
    const spent = Number(settings?.current_month_spend_usd ?? 0);
    if (spent >= budget) {
      return json({ error: "budget_exceeded" }, 429);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await sha256(ip);
    const ua = req.headers.get("user-agent") ?? "";

    // Upsert session
    let { data: session } = await admin
      .from("proposal_chat_sessions")
      .select("id, message_count, escalated_to_whatsapp")
      .eq("proposal_id", proposalId)
      .eq("session_token", sessionToken)
      .maybeSingle();

    let sessionStarted = false;
    if (!session) {
      const { data: created, error: insErr } = await admin
        .from("proposal_chat_sessions")
        .insert({
          organization_id: prop.organization_id,
          proposal_id: proposalId,
          session_token: sessionToken,
          ip_hash: ipHash,
          user_agent: ua.slice(0, 500),
        })
        .select("id, message_count, escalated_to_whatsapp")
        .single();
      if (insErr) {
        console.error("session insert error", insErr);
        return json({ error: "session_insert_failed" }, 500);
      }
      session = created;
      sessionStarted = true;

      // Audit + notify Daniel sobre chat iniciado
      await admin.from("audit_logs").insert({
        organization_id: prop.organization_id,
        entity_type: "proposal",
        entity_id: proposalId,
        action: "chat_session_started",
        changes: { session_token: sessionToken },
      }).then(() => {}).catch(() => {});

      fireNotify(proposalId, "chat_started", { session_token: sessionToken });
    }

    if ((session.message_count ?? 0) >= maxMsgs) {
      return json({ error: "max_messages_reached", fallback: FALLBACK_REPLY }, 429);
    }

    // Salva mensagem do usuário
    await admin.from("proposal_chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: userMsg,
    });

    // Monta prompt
    const systemPrompt = buildSystemPrompt(prop, items ?? []);
    const recentHistory = (body.history ?? []).slice(-10);

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg },
    ];

    // Chama Lovable AI Gateway
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.5 }),
      },
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return json({ error: "rate_limited", fallback: FALLBACK_REPLY }, 429);
      }
      if (aiRes.status === 402) {
        return json({ error: "credits_exhausted", fallback: FALLBACK_REPLY }, 402);
      }
      return json({ error: "ai_error", fallback: FALLBACK_REPLY }, 502);
    }

    const aiData = await aiRes.json();
    const rawReply = aiData?.choices?.[0]?.message?.content?.trim() ?? "";
    const usage = aiData?.usage ?? {};
    const inputTokens = usage.prompt_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? 0;
    const cost = estimateCostUsd(model, inputTokens, outputTokens);

    // Filtros
    const filterCtx: FilterContext = {
      deliverables: (items ?? []).flatMap((it: any) => [
        it.description,
        ...(it.deliverables ?? []),
      ]),
      knownTotalBrl: (items ?? []).reduce(
        (acc: number, it: any) => acc + Number(it.total ?? 0),
        0,
      ),
      knownMonthlyBrl: prop.maintenance_monthly_value
        ? Number(prop.maintenance_monthly_value)
        : undefined,
      implementationDays: prop.implementation_days ?? undefined,
      validationDays: prop.validation_days ?? undefined,
    };

    const filtered = filterAiOutput(rawReply, filterCtx, { mode: "chat" });
    const finalReply = filtered.filteredOutput;

    // Detecta sugestão de escalation (palavras-chave do cliente OU fallback)
    const userWantsHuman = /\b(falar com o daniel|whats|whatsapp|humano|atendente|alguém|alguem)\b/i
      .test(userMsg);
    const escalationSuggested = !filtered.passed || userWantsHuman;

    // Salva resposta
    await admin.from("proposal_chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: finalReply,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      was_filtered: !filtered.passed,
      filter_reasons: filtered.reasons,
      was_escalation_suggested: escalationSuggested,
    });

    // Atualiza contador da sessão
    await admin
      .from("proposal_chat_sessions")
      .update({
        message_count: (session.message_count ?? 0) + 2,
      })
      .eq("id", session.id);

    // Atualiza spend
    if (cost > 0 && settings) {
      await admin
        .from("proposal_ai_settings")
        .update({
          current_month_spend_usd: spent + cost,
        })
        .eq("organization_id", prop.organization_id);
    }

    // Audit content filtered
    if (!filtered.passed) {
      await admin.from("audit_logs").insert({
        organization_id: prop.organization_id,
        entity_type: "proposal",
        entity_id: proposalId,
        action: "ai_content_filtered",
        changes: { reasons: filtered.reasons, where: "chat" },
      }).then(() => {}).catch(() => {});
    }

    return json({
      reply: finalReply,
      escalation_suggested: escalationSuggested,
      session_started: sessionStarted,
      filtered: !filtered.passed,
    });
  } catch (e) {
    console.error("proposal-chat error", e);
    return json({ error: "internal", fallback: FALLBACK_REPLY }, 500);
  }
});

function buildSystemPrompt(prop: any, items: any[]): string {
  const itemsList = items.map((it) =>
    `- ${it.description} — R$ ${Number(it.total).toFixed(2)}` +
    (it.detailed_description ? `\n  ${it.detailed_description}` : "")
  ).join("\n");

  return `Você é o assistente virtual da GetBrain, ajudando o cliente a entender uma proposta comercial específica.

REGRAS ABSOLUTAS:
1. NUNCA invente preços, prazos, descontos ou itens que não estão na proposta abaixo.
2. NUNCA ofereça descontos, condições especiais ou negociações de preço.
3. Se o cliente pedir algo fora do escopo, diga que isso precisa ser conversado com o Daniel.
4. Para perguntas de pagamento, contrato, prazo de pagamento, ou qualquer detalhe comercial não documentado abaixo, responda: "Sobre isso, é melhor falar com o Daniel diretamente."
5. Seja conciso (máx 4 frases por resposta), tom profissional e amigável, em português do Brasil.
6. Se o cliente demonstrar interesse em fechar, sugira: "Posso avisar o Daniel que você quer avançar?"

PROPOSTA: ${prop.title ?? "(sem título)"} (${prop.code})
Cliente: ${prop.client_name || prop.client_company_name}
${prop.executive_summary ? `\nResumo: ${prop.executive_summary}` : ""}
${prop.pain_context ? `\nContexto: ${prop.pain_context}` : ""}
${prop.solution_overview ? `\nSolução: ${prop.solution_overview}` : ""}

ITENS DA PROPOSTA:
${itemsList || "(nenhum)"}

VALORES:
- Total one-time: R$ ${
    items.reduce((a, it) => a + Number(it.total ?? 0), 0).toFixed(2)
  }
${
    prop.maintenance_monthly_value
      ? `- Manutenção mensal: R$ ${Number(prop.maintenance_monthly_value).toFixed(2)}`
      : ""
  }

PRAZOS:
- Implementação: ${prop.implementation_days ?? "?"} dias
- Validação: ${prop.validation_days ?? "?"} dias

Responda apenas sobre o conteúdo desta proposta.`;
}

function fireNotify(
  proposalId: string,
  kind: string,
  context: Record<string, unknown>,
) {
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-daniel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ proposal_id: proposalId, kind, context }),
  }).catch((e) => console.error("notify-daniel dispatch", e));
}

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

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
