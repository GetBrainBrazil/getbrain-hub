// Edge function: verify-proposal-access
// Public endpoint. Validates token + password from external client, applies rate limiting,
// returns a short-lived custom JWT for accessing proposal data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_WINDOW_MIN = 15;
const RATE_MAX_ATTEMPTS = 5;
const JWT_TTL_SECONDS = 12 * 60 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");
    if (!token || !password) return json({ error: "invalid_token" }, 400);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await sha256(ip);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Buscar proposta
    const { data: prop, error: propErr } = await admin
      .from("proposals")
      .select(
        "id, organization_id, status, expires_at, valid_until, access_password_hash, deleted_at",
      )
      .eq("access_token", token)
      .is("deleted_at", null)
      .maybeSingle();

    if (propErr || !prop) return json({ error: "invalid_token" }, 404);

    // Status válido (rascunho permitido para teste pelo autor antes de enviar)
    const validStatuses = ["rascunho", "enviada", "visualizada", "interesse_manifestado"];
    if (!validStatuses.includes(prop.status)) {
      return json({ error: "invalid_token" }, 403);
    }

    // Expiração
    const expiresAt = prop.expires_at ?? prop.valid_until;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return json({ error: "expired", expires_at: expiresAt }, 403);
    }

    // Rate limit: contar tentativas recentes desse ip_hash nessa proposta
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const { count } = await admin
      .from("proposal_access_attempts")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", prop.id)
      .eq("ip_hash", ipHash)
      .eq("success", false)
      .gte("attempted_at", since);

    if ((count ?? 0) >= RATE_MAX_ATTEMPTS) {
      return json({ error: "rate_limited" }, 429);
    }

    // Comparar senha (usar versão sync — Worker não disponível no edge runtime)
    const passwordOk = prop.access_password_hash
      ? bcrypt.compareSync(password, prop.access_password_hash)
      : false;

    // Registrar tentativa
    await admin.from("proposal_access_attempts").insert({
      proposal_id: prop.id,
      ip_hash: ipHash,
      success: passwordOk,
    });

    if (!passwordOk) return json({ error: "invalid_password" }, 401);

    // Gerar JWT custom
    const secret = Deno.env.get("PROPOSAL_ACCESS_JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      { proposal_id: prop.id, exp: getNumericDate(JWT_TTL_SECONDS) },
      key,
    );

    // Audit log
    await admin.from("audit_logs").insert({
      organization_id: prop.organization_id,
      entity_type: "proposal",
      entity_id: prop.id,
      action: "status_change",
      changes: {},
      metadata: { kind: "public_access_granted", ip_hash: ipHash },
    });

    return json({
      access_jwt: jwt,
      expires_in: JWT_TTL_SECONDS,
      proposal_id: prop.id,
    });
  } catch (e) {
    console.error("verify-proposal-access error", e);
    return json({ error: "internal_error" }, 500);
  }
});

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
