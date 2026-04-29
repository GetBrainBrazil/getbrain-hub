import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Agente "Arquiteto de Escopo" — extrai estrutura de um texto de escopo
 * livre escrito pelo time comercial e devolve listas prontas para
 * preencher os campos do deal:
 *  - deliverables
 *  - premises
 *  - acceptance_criteria
 *  - identified_risks
 *  - technical_stack
 *
 * Modelo: google/gemini-2.5-pro (top-tier em raciocínio + contexto longo).
 * Tool calling estruturado garante saída em JSON sempre válida.
 */

const SYSTEM_PROMPT = `Você é um Arquiteto de Soluções sênior, especialista em automação, IA e produtos digitais. Seu trabalho é transformar um texto livre de escopo (escrito pelo time comercial) em uma especificação ENXUTA, ACIONÁVEL e SEM ALUCINAÇÃO, dividida nas seguintes seções:

1. ENTREGÁVEIS (deliverables)
   - O que efetivamente é ENTREGUE ao cliente ao final.
   - Cada item: substantivo concreto + qualificador curto (ex.: "API REST de disparos com autenticação", "Painel de métricas com filtros por período").
   - Uma linha cada. Sem verbos no infinitivo no início ("Entregar...", "Criar..."). Vá direto ao artefato.

2. PREMISSAS (premises)
   - Coisas que ASSUMIMOS como verdade para o projeto rodar (acessos, integrações, dados disponíveis, decisões já tomadas pelo cliente).
   - Cada premissa em uma linha curta começando idealmente com "Cliente fornece...", "Existe...", "API X disponível...", etc.
   - Não confunda premissa com entregável.

3. CRITÉRIOS DE ACEITE (acceptance_criteria)
   - Testes objetivos de "está pronto" do ponto de vista do cliente.
   - Use SEMPRE o formato compacto: "Dado <contexto>, quando <ação>, então <resultado mensurável>".
   - Cabe em uma linha (ou duas no máximo). Sempre verificável (sim/não).

4. RISCOS IDENTIFICADOS (identified_risks)
   - O que pode dar errado e impactar prazo, custo ou qualidade.
   - Formato curto: "<causa> → <impacto>" (ex.: "Dependência de API externa instável → atrasos no disparo").
   - Não invente riscos genéricos sem base no texto/contexto.

5. STACK TÉCNICO (technical_stack)
   - Tecnologias mencionadas explicitamente no texto OU claramente implícitas pelo tipo de projeto descrito (ex.: "WhatsApp" → API oficial / Meta Cloud API).
   - Apenas o nome curto da tecnologia (ex.: "Next.js", "Supabase", "n8n", "OpenAI", "Twilio", "PostgreSQL").
   - Sem descrições. Apenas o nome.

REGRAS GERAIS — INVIOLÁVEIS:
- NÃO INVENTE itens que não tenham respaldo no texto do escopo ou no contexto fornecido. Prefira devolver lista vazia a alucinar.
- Cada item deve ter no MÁXIMO ~200 caracteres. Frases enxutas, sem floreio, sem emojis.
- Não duplique itens (mesmo conteúdo com palavras diferentes conta como duplicado — devolva apenas um).
- Mantenha ordem lógica/cronológica quando fizer sentido.
- Responda em PORTUGUÊS DO BRASIL.
- Se o texto do escopo for genérico demais, vago ou curto demais para uma seção específica, devolva lista vazia para ESSA seção.
- NUNCA escreva texto fora da chamada de função. Toda a resposta deve vir no tool call set_full_scope.`;

type AcceptanceCriterionInput = { text: string };

interface ScopePayload {
  deliverables: string[];
  premises: string[];
  acceptance_criteria: AcceptanceCriterionInput[];
  identified_risks: string[];
  technical_stack: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---------- Auth ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ---------- Body ----------
    const body = await req.json().catch(() => ({}));
    const scopeText = typeof body?.scope_text === "string" ? body.scope_text.trim() : "";
    if (!scopeText || scopeText.length < 10) {
      return json({ error: "scope_text deve ter ao menos 10 caracteres." }, 400);
    }

    // Contexto opcional do deal (somente leitura, ajuda o agente a entender o domínio)
    const businessContext =
      typeof body?.business_context === "string" ? body.business_context.trim() : "";
    const painDescription =
      typeof body?.pain_description === "string" ? body.pain_description.trim() : "";
    const projectType =
      typeof body?.project_type === "string" ? body.project_type.trim() : "";
    const painCategories: string[] = Array.isArray(body?.pain_categories)
      ? body.pain_categories.filter((c: unknown) => typeof c === "string")
      : [];

    const userPrompt = buildUserPrompt({
      scopeText,
      businessContext,
      painDescription,
      projectType,
      painCategories,
    });

    // ---------- Lovable AI ----------
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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_full_scope",
              description:
                "Devolve a estrutura completa do escopo: entregáveis, premissas, critérios de aceite, riscos e stack técnico.",
              parameters: {
                type: "object",
                properties: {
                  deliverables: {
                    type: "array",
                    items: { type: "string", minLength: 2, maxLength: 240 },
                    description:
                      "Artefatos efetivamente entregues ao cliente. Substantivo + qualificador. Uma linha cada.",
                  },
                  premises: {
                    type: "array",
                    items: { type: "string", minLength: 2, maxLength: 240 },
                    description:
                      "Coisas assumidas como verdade para o projeto rodar (acessos, dados, decisões do cliente).",
                  },
                  acceptance_criteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", minLength: 8, maxLength: 320 },
                      },
                      required: ["text"],
                      additionalProperties: false,
                    },
                    description:
                      "Critérios objetivos de pronto, no formato 'Dado/Quando/Então' compacto.",
                  },
                  identified_risks: {
                    type: "array",
                    items: { type: "string", minLength: 2, maxLength: 240 },
                    description:
                      "Riscos no formato '<causa> → <impacto>'. Apenas riscos com base no texto/contexto.",
                  },
                  technical_stack: {
                    type: "array",
                    items: { type: "string", minLength: 1, maxLength: 60 },
                    description:
                      "Tecnologias previstas. Apenas o nome curto (ex.: 'Next.js', 'Supabase').",
                  },
                },
                required: [
                  "deliverables",
                  "premises",
                  "acceptance_criteria",
                  "identified_risks",
                  "technical_stack",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_full_scope" } },
      }),
    });

    if (aiResp.status === 429) {
      return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
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
    const parsed = safeParseToolCall(toolCall);
    const cleaned = sanitizeScope(parsed);

    return json(cleaned);
  } catch (e) {
    console.error("organize-scope error", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

// ============================================================
// Helpers
// ============================================================

function buildUserPrompt(input: {
  scopeText: string;
  businessContext: string;
  painDescription: string;
  projectType: string;
  painCategories: string[];
}): string {
  const parts: string[] = [];

  if (input.projectType) {
    parts.push(`TIPO DE PROJETO: ${input.projectType}`);
  }
  if (input.painCategories.length > 0) {
    parts.push(`CATEGORIAS DA DOR: ${input.painCategories.join(", ")}`);
  }
  if (input.painDescription) {
    parts.push(`DESCRIÇÃO DA DOR (contexto somente leitura, NÃO repita literalmente):\n${input.painDescription}`);
  }
  if (input.businessContext) {
    parts.push(`CONTEXTO DE NEGÓCIO (somente leitura):\n${input.businessContext}`);
  }

  parts.push(`TEXTO DO ESCOPO (fonte primária — use isto como verdade):\n${input.scopeText}`);

  parts.push(
    `Tarefa: produza as 5 listas (entregáveis, premissas, critérios de aceite, riscos, stack) seguindo TODAS as regras do system prompt. Devolva APENAS via tool call set_full_scope.`,
  );

  return parts.join("\n\n");
}

function safeParseToolCall(toolCall: any): Partial<ScopePayload> {
  if (!toolCall?.function?.arguments) return {};
  try {
    const parsed = JSON.parse(toolCall.function.arguments);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("Erro parseando tool_call args", e);
    return {};
  }
}

function sanitizeScope(raw: Partial<ScopePayload>): ScopePayload {
  const MAX_PER_LIST = 12;

  const cleanStringList = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of input) {
      if (typeof it !== "string") continue;
      const trimmed = it.trim().replace(/\s+/g, " ").slice(0, 240);
      if (trimmed.length < 2) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= MAX_PER_LIST) break;
    }
    return out;
  };

  const cleanCriteria = (input: unknown): AcceptanceCriterionInput[] => {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const out: AcceptanceCriterionInput[] = [];
    for (const it of input) {
      let text: string | null = null;
      if (typeof it === "string") {
        text = it;
      } else if (it && typeof it === "object" && typeof (it as any).text === "string") {
        text = (it as any).text;
      }
      if (!text) continue;
      const trimmed = text.trim().replace(/\s+/g, " ").slice(0, 320);
      if (trimmed.length < 8) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text: trimmed });
      if (out.length >= MAX_PER_LIST) break;
    }
    return out;
  };

  const cleanStack = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of input) {
      if (typeof it !== "string") continue;
      const trimmed = it.trim().replace(/\s+/g, " ").slice(0, 60);
      if (trimmed.length < 1) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= MAX_PER_LIST) break;
    }
    return out;
  };

  return {
    deliverables: cleanStringList(raw.deliverables),
    premises: cleanStringList(raw.premises),
    acceptance_criteria: cleanCriteria(raw.acceptance_criteria),
    identified_risks: cleanStringList(raw.identified_risks),
    technical_stack: cleanStack(raw.technical_stack),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
