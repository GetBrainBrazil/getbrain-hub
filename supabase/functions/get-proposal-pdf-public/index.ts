// Edge function: get-proposal-pdf-public
// Returns a short-lived signed URL for the most recent PDF version of the proposal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL_PUBLIC = 15 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const proposalId = await getProposalIdFromJwt(req);
    if (!proposalId) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: version, error } = await admin
      .from("proposal_versions")
      .select("pdf_storage_path")
      .eq("proposal_id", proposalId)
      .is("deleted_at", null)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !version?.pdf_storage_path) {
      return json({ error: "no_pdf_available" }, 404);
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("proposals")
      .createSignedUrl(version.pdf_storage_path, SIGNED_URL_TTL_PUBLIC);

    if (signErr || !signed?.signedUrl) {
      return json({ error: "signing_failed" }, 500);
    }

    return json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL_PUBLIC });
  } catch (e) {
    console.error("get-proposal-pdf-public error", e);
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
