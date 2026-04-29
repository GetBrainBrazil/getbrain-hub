import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você organiza descrições de escopo de projetos em bullets curtos e objetivos.

Regras:
- Cada bullet deve resumir UMA etapa, entrega ou item do escopo.
- IDEAL: uma única linha curta por bullet (frases enxutas, sem floreio).
- Use mais de uma linha apenas quando for absolutamente necessário para não perder informação crítica.
- Não invente itens que não estejam no texto fornecido.
- Não duplique itens.
- Mantenha a ordem lógica/cronológica do texto original quando fizer sentido.
- Responda em português do Brasil.
- Se o texto estiver vazio ou for genérico demais, devolva uma lista vazia.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Body
    const body = await req.json().catch(() => ({}));
    const scopeText = typeof body?.scope_text === "string" ? body.scope_text.trim() : "";
    if (!scopeText || scopeText.length < 10) {
      return json({ error: "scope_text deve ter ao menos 10 caracteres." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY não configurada." }, 500);
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: scopeText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_scope_bullets",
              description:
                "Devolve a lista organizada de bullets curtos do escopo, na ordem em que devem aparecer.",
              parameters: {
                type: "object",
                properties: {
                  bullets: {
                    type: "array",
                    items: { type: "string", minLength: 2, maxLength: 240 },
                    description:
                      "Lista de bullets curtos (preferencialmente uma linha cada) descrevendo o escopo.",
                  },
                },
                required: ["bullets"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_scope_bullets" } },
      }),
    });

    if (aiResp.status === 429) {
      return json(
        { error: "Limite de requisições atingido. Tente novamente em instantes." },
        429,
      );
    }
    if (aiResp.status === 402) {
      return json(
        {
          error:
            "Sem créditos de IA disponíveis. Adicione créditos em Configurações → Workspace → Uso.",
        },
        402,
      );
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text().catch(() => "");
      console.error("AI gateway error", aiResp.status, txt);
      return json({ error: "Falha ao chamar a IA." }, 500);
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let bullets: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(parsed?.bullets)) {
          bullets = parsed.bullets
            .map((b: unknown) => (typeof b === "string" ? b.trim() : ""))
            .filter((b: string) => b.length > 0);
        }
      } catch (e) {
        console.error("Erro parseando tool_call args", e);
      }
    }

    return json({ bullets });
  } catch (e) {
    console.error("organize-scope error", e);
    return json(
      { error: e instanceof Error ? e.message : "Erro desconhecido" },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
