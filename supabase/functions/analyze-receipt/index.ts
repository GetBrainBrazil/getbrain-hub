const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const PROMPT = `Analise este comprovante de pagamento bancário brasileiro e extraia os seguintes dados em formato JSON:
{
  "valor": número (valor da transação em reais, sem formatação),
  "data": "DD/MM/AAAA" (data da transação),
  "tipo": "entrada" ou "saida" (se é um recebimento ou pagamento),
  "destinatario_nome": "nome do destinatário/beneficiário",
  "destinatario_documento": "CPF ou CNPJ do destinatário se visível",
  "remetente_nome": "nome do remetente/pagador",
  "remetente_documento": "CPF ou CNPJ do remetente se visível",
  "id_transacao": "ID da transação, código E2E, ou código de autenticação se visível",
  "tipo_transacao": "PIX, TED, DOC, Boleto ou Transferência",
  "banco_origem": "nome do banco de origem se visível",
  "banco_destino": "nome do banco de destino se visível",
  "descricao": "descrição breve da transação baseada nos dados"
}
Retorne APENAS o JSON, sem markdown, sem explicação.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, mimeType } = await req.json();
    if (!image || !mimeType) {
      return new Response(JSON.stringify({ error: "image e mimeType são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUri = `data:${mimeType};base64,${image}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error", openaiRes.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI ${openaiRes.status}`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await openaiRes.json();
    let content: string = json.choices?.[0]?.message?.content ?? "";
    // Strip eventual ```json fences
    content = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Parse error", content);
      return new Response(JSON.stringify({ error: "Resposta não-JSON da IA", raw: content }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("analyze-receipt error", err);
    return new Response(JSON.stringify({ error: err?.message || "erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
