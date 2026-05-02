// Edge function: get-proposal-attachment-public
// Cliente público da proposta troca o JWT curto-prazo (emitido por verify-proposal-access)
// + um attachment_id, e recebe uma URL assinada (60s) pra baixar o arquivo do bucket privado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const accessJwt = String(body?.access_jwt ?? "").trim();
    const attachmentId = String(body?.attachment_id ?? "").trim();
    if (!accessJwt || !attachmentId) {
      return json({ error: "invalid_request" }, 400);
    }

    // Verifica o JWT custom emitido por verify-proposal-access
    const secret = Deno.env.get("PROPOSAL_ACCESS_JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    let proposalId: string;
    try {
      const payload = (await verify(accessJwt, key)) as { proposal_id: string };
      proposalId = payload.proposal_id;
    } catch {
      return json({ error: "invalid_jwt" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Garante que o anexo pertence à proposta liberada pelo JWT
    const { data: att, error: attErr } = await admin
      .from("proposal_attachments")
      .select("id, proposal_id, file_path, mime_type, label, show_in_web")
      .eq("id", attachmentId)
      .maybeSingle();

    if (attErr || !att) return json({ error: "not_found" }, 404);
    if (att.proposal_id !== proposalId) return json({ error: "forbidden" }, 403);
    if (att.show_in_web === false) return json({ error: "hidden" }, 403);

    const { data: signed, error: signErr } = await admin.storage
      .from("proposal-attachments")
      .createSignedUrl(att.file_path, SIGNED_URL_TTL);

    if (signErr || !signed?.signedUrl) {
      return json({ error: "sign_failed" }, 500);
    }

    return json({
      signed_url: signed.signedUrl,
      mime_type: att.mime_type,
      label: att.label,
      expires_in: SIGNED_URL_TTL,
    });
  } catch (e) {
    console.error("get-proposal-attachment-public error", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
