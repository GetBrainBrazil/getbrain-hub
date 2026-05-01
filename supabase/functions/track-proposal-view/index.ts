// Edge function: track-proposal-view
// Public endpoint protegido por access_jwt (mesmo padrão de get-proposal-public-data).
// Registra views, eventos (pdf_download, manifested_interest) e dispara notify-daniel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EventType =
  | "view"
  | "pdf_download"
  | "section_viewed"
  | "interest_manifested";

interface TrackBody {
  event: EventType;
  session_token: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const proposalId = await getProposalIdFromJwt(req);
    if (!proposalId) return json({ error: "unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as TrackBody;
    if (!body.event || !body.session_token) {
      return json({ error: "missing_fields" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await sha256(ip);
    const ua = req.headers.get("user-agent") ?? "";

    const { data: prop } = await admin
      .from("proposals")
      .select("id, organization_id, status")
      .eq("id", proposalId)
      .maybeSingle();
    if (!prop) return json({ error: "proposal_not_found" }, 404);

    let isFirstView = false;

    if (body.event === "view") {
      // Upsert por (proposal_id, session_token)
      const { data: existing } = await admin
        .from("proposal_views")
        .select("id, duration_seconds, sections_viewed")
        .eq("proposal_id", proposalId)
        .eq("session_token", body.session_token)
        .maybeSingle();

      if (existing) {
        await admin
          .from("proposal_views")
          .update({
            duration_seconds: Number(body.metadata?.duration_seconds ?? 0) ||
              existing.duration_seconds,
            sections_viewed: body.metadata?.sections_viewed ??
              existing.sections_viewed,
          })
          .eq("id", existing.id);
      } else {
        await admin.from("proposal_views").insert({
          proposal_id: proposalId,
          session_token: body.session_token,
          ip_hash: ipHash,
          user_agent: ua.slice(0, 500),
          duration_seconds: Number(body.metadata?.duration_seconds ?? 0),
        });

        // Verificar se foi a primeira view absoluta
        const { count } = await admin
          .from("proposal_views")
          .select("id", { count: "exact", head: true })
          .eq("proposal_id", proposalId);
        isFirstView = (count ?? 0) <= 1;

        // Atualizar status da proposta para 'visualizada' se ainda for 'enviada'
        if (prop.status === "enviada") {
          await admin
            .from("proposals")
            .update({
              status: "visualizada",
              first_viewed_at: new Date().toISOString(),
            })
            .eq("id", proposalId);
        }
      }
    } else if (body.event === "pdf_download") {
      await admin
        .from("proposal_views")
        .update({ pdf_downloaded: true })
        .eq("proposal_id", proposalId)
        .eq("session_token", body.session_token);
    }

    // Registrar evento sempre
    await admin.from("proposal_events").insert({
      proposal_id: proposalId,
      event_type: body.event,
      metadata: body.metadata ?? {},
      session_token: body.session_token,
    });

    // Audit log para eventos relevantes
    if (body.event === "interest_manifested") {
      await admin.from("audit_logs").insert({
        organization_id: prop.organization_id,
        entity_type: "proposal",
        entity_id: proposalId,
        action: "interest_manifested",
        changes: { metadata: body.metadata ?? {} },
      }).then(() => {}).catch(() => {});

      // Atualizar status para 'interesse_manifestado'
      if (
        prop.status === "enviada" || prop.status === "visualizada"
      ) {
        await admin
          .from("proposals")
          .update({ status: "interesse_manifestado" })
          .eq("id", proposalId);
      }
    }

    // Disparar notificações em background
    const kindMap: Partial<Record<EventType, string>> = {
      view: isFirstView ? "first_view" : "",
      pdf_download: "pdf_download",
      interest_manifested: "manifested_interest",
    };
    const kind = kindMap[body.event];
    if (kind) {
      // fire-and-forget
      fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-daniel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
            }`,
          },
          body: JSON.stringify({
            proposal_id: proposalId,
            kind,
            context: body.metadata ?? {},
          }),
        },
      ).catch((e) => console.error("notify-daniel dispatch failed", e));
    }

    return json({ ok: true, first_view: isFirstView });
  } catch (e) {
    console.error("track-proposal-view error", e);
    return json({ error: "internal" }, 500);
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
