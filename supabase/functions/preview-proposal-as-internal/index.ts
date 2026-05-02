// Edge function: preview-proposal-as-internal
// Authenticated endpoint. Lets internal users (Daniel & team) generate a short-lived
// JWT that the public PropostaPublica page accepts via ?preview=<jwt>, bypassing
// the password gate without ever exposing the bcrypt hash to the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PREVIEW_TTL_SECONDS = 5 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const proposalId = String(body?.proposal_id ?? "").trim();
    if (!proposalId) return json({ error: "missing_proposal_id" }, 400);

    // Validate proposal exists & user can read it (RLS via the user-scoped client)
    const { data: prop, error: propErr } = await supabase
      .from("proposals")
      .select("id, organization_id, access_token")
      .eq("id", proposalId)
      .is("deleted_at", null)
      .maybeSingle();
    if (propErr || !prop) return json({ error: "not_found" }, 404);

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
      {
        proposal_id: prop.id,
        preview: true,
        sub: userId,
        exp: getNumericDate(PREVIEW_TTL_SECONDS),
      },
      key,
    );

    // Audit log (admin client to bypass RLS on audit_logs insert)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("audit_logs").insert({
      organization_id: prop.organization_id,
      entity_type: "proposal",
      entity_id: prop.id,
      action: "status_change",
      changes: {},
      metadata: { kind: "preview_as_internal", user_id: userId },
    });

    return json({
      access_jwt: jwt,
      access_token: prop.access_token,
      expires_in: PREVIEW_TTL_SECONDS,
    });
  } catch (e) {
    console.error("preview-proposal-as-internal error", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
