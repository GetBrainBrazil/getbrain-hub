// Filtros de output da IA (10C-3 Mudança 4)
// Linha de defesa após a IA responder, antes de chegar no cliente/proposta.
// Cada filtro retorna { passed, reason? }. Combinador retorna lista de razões.

export type FilterReason =
  | "mentioned_discount"
  | "out_of_scope_deliverable"
  | "price_mismatch"
  | "duration_mismatch"
  | "prompt_injection_detected";

export interface FilterContext {
  /** Lista de deliverables/itens que a proposta cobre. Strings em pt-BR. */
  deliverables: string[];
  /** Soma total esperada (R$). Usado para detectar preços inventados. */
  knownTotalBrl?: number;
  /** Mensalidade de manutenção (R$). */
  knownMonthlyBrl?: number;
  /** Prazos reais da proposta. */
  implementationDays?: number;
  validationDays?: number;
}

export interface FilterResult {
  passed: boolean;
  filteredOutput: string;
  reasons: FilterReason[];
}

// ----------- Filtro 1: desconto -----------
const DISCOUNT_PATTERNS = [
  /\bdesconto[s]?\b/i,
  /\bpromo(?:[çc][ãa]o|cional)\b/i,
  /\b\d{1,2}\s*%\s*off\b/i,
  /\boff\s+\d{1,2}\s*%/i,
  /\bredu(?:[çc][ãa]o)\s+de\s+pre[çc]o\b/i,
  /\bcondi[çc][ãa]o\s+especial\b/i,
];
function hasDiscountMention(text: string): boolean {
  return DISCOUNT_PATTERNS.some((re) => re.test(text));
}

// ----------- Filtro 2: deliverables fora do escopo -----------
// Heurística simples por keywords comuns.
const COMMON_DELIVERABLE_KEYWORDS = [
  "app mobile", "aplicativo", "android", "ios",
  "integração com whatsapp", "bot whatsapp",
  "website", "site institucional",
  "loja virtual", "ecommerce", "e-commerce",
  "dashboard analítico", "relatório customizado",
  "modelo de ia", "treinamento de modelo",
  "marketplace",
];
function detectOutOfScope(text: string, deliverables: string[]): boolean {
  const lower = text.toLowerCase();
  const allowed = deliverables.map((d) => d.toLowerCase()).join(" ");
  for (const kw of COMMON_DELIVERABLE_KEYWORDS) {
    if (lower.includes(kw) && !allowed.includes(kw)) {
      return true;
    }
  }
  return false;
}

// ----------- Filtro 3: preço inventado -----------
const PRICE_PATTERNS = [
  /R\$\s*([\d.,]+)/gi,
  /(\d+[\d.,]*)\s*(?:mil|k)\b/gi,
];
function extractPrices(text: string): number[] {
  const prices: number[] = [];
  for (const re of PRICE_PATTERNS) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1].replace(/\./g, "").replace(",", ".");
      const n = parseFloat(raw);
      if (!isNaN(n) && n > 0) {
        // se tinha "mil/k", multiplicar por 1000
        const isThousands = /\b(mil|k)\b/i.test(m[0]);
        prices.push(isThousands ? n * 1000 : n);
      }
    }
  }
  return prices;
}
function hasPriceMismatch(text: string, ctx: FilterContext): boolean {
  const known = [ctx.knownTotalBrl, ctx.knownMonthlyBrl].filter(
    (v): v is number => typeof v === "number" && v > 0,
  );
  if (known.length === 0) return false;
  const found = extractPrices(text);
  // Permite valores com tolerância de ±5%.
  return found.some((p) => {
    if (p < 100) return false; // ignora valores pequenos (não parecem preço total)
    return !known.some((k) => Math.abs(p - k) / k < 0.05);
  });
}

// ----------- Filtro 4: prazo inventado -----------
const DURATION_RE = /(\d{1,3})\s*(dias?|semanas?|meses?)/gi;
function hasDurationMismatch(text: string, ctx: FilterContext): boolean {
  const knownDays = [ctx.implementationDays, ctx.validationDays].filter(
    (v): v is number => typeof v === "number" && v > 0,
  );
  if (knownDays.length === 0) return false;

  let m;
  DURATION_RE.lastIndex = 0;
  while ((m = DURATION_RE.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    let days = n;
    if (unit.startsWith("semana")) days = n * 7;
    else if (unit.startsWith("mes") || unit.startsWith("mês")) days = n * 30;
    if (days < 3) continue; // ignora "1 dia" etc
    const tolerance = 0.2;
    const matches = knownDays.some((k) => Math.abs(days - k) / k < tolerance);
    if (!matches) return true;
  }
  return false;
}

// ----------- Filtro 5: prompt injection vazado -----------
const INJECTION_PATTERNS = [
  /ignore\s+(?:previous|all|prior)\s+instructions/i,
  /system\s*:/i,
  /you\s+are\s+now\b/i,
  /\bas\s+an?\s+ai\b/i,
  /pretend\s+to\s+be/i,
  /esque[çc]a\s+(?:as\s+)?instru[çc][õo]es/i,
  /você\s+agora\s+é/i,
];
function hasInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

// ----------- Combinador -----------
export const FALLBACK_CHAT =
  "Sobre isso, é melhor falar com o Daniel diretamente. Quer abrir o WhatsApp?";

export function filterAiOutput(
  text: string,
  ctx: FilterContext,
  options: { mode: "chat" | "generation" } = { mode: "chat" },
): FilterResult {
  const reasons: FilterReason[] = [];

  if (hasInjection(text)) reasons.push("prompt_injection_detected");
  if (hasDiscountMention(text)) reasons.push("mentioned_discount");
  if (detectOutOfScope(text, ctx.deliverables)) reasons.push("out_of_scope_deliverable");
  if (hasPriceMismatch(text, ctx)) reasons.push("price_mismatch");
  if (hasDurationMismatch(text, ctx)) reasons.push("duration_mismatch");

  if (reasons.length === 0) {
    return { passed: true, filteredOutput: text, reasons: [] };
  }

  // Prompt injection sempre bloqueia tudo.
  if (reasons.includes("prompt_injection_detected")) {
    return {
      passed: false,
      filteredOutput:
        options.mode === "chat"
          ? FALLBACK_CHAT
          : "[conteúdo removido por validação automática]",
      reasons,
    };
  }

  if (options.mode === "chat") {
    return { passed: false, filteredOutput: FALLBACK_CHAT, reasons };
  }

  // Modo geração: substitui trechos problemáticos por placeholder, mantém estrutura.
  return {
    passed: false,
    filteredOutput:
      "[trecho removido pela validação — revisar manualmente antes de enviar]",
    reasons,
  };
}

// ----------- Cálculo de custo (USD) -----------
// Tabela básica de modelos via Lovable AI Gateway.
// Valores em USD por 1M de tokens. Mantido aqui pra centralizar.
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "openai/gpt-5": { input: 2.5, output: 10.0 },
  "openai/gpt-5-mini": { input: 0.25, output: 2.0 },
  "openai/gpt-5-nano": { input: 0.05, output: 0.4 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "google/gemini-2.5-flash-lite": { input: 0.075, output: 0.3 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING["openai/gpt-5-mini"];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
